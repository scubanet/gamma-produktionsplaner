-- Stufe «Küche» (20.11.2026).
-- Entscheide Dominik (20.11.2026): Neben Admin und Benutzer gibt es die Stufe «Küche». Sie liest Produktion, Rezepte,
-- Küchenpass, Lager, Einkaufsmengen, Leitstand, Systemzuteilung, Katalog und Anlässe, aber keine Offerten, keine
-- Rentabilität und keine Preise. Schreiben darf sie nur: produzierte Speisen abhaken, Etiketten anlegen, einlagern und
-- nicht produzierte Etiketten ausbuchen. Rezepte ändert sie nicht (auch nicht auf «Geprüft»).
--
-- Preisschutz in zwei Schritten (Entscheid): Diese Migration sperrt für «Küche» alles Schreiben und das Lesen der
-- reinen Geld-Tabellen. Preise, die als Spalte in einer sonst nötigen Tabelle stehen (artikel.preis_pro_einheit,
-- anlass.umsatz_netto_chf, Mietpreise, Faktor), blendet die App aus; über die Schnittstelle bleiben sie für «Küche»
-- lesbar, bis ein späterer Umbau auch das verhindert.
--
--  1. app_kueche, ist_kueche(), stufe()
--  2. Zugriffsregeln aller Tabellen: lesen wie bisher, schreiben nicht für «Küche»
--  3. Reine Geld-Tabellen: für «Küche» nicht lesbar
--  4. Abhaken: «Küche» darf produktion_aufgabe schreiben, aber «Zuständig» nicht ändern und nichts löschen
--  5. Rezepte: anlegen und ändern nicht für «Küche»

-- 1. Stufe --------------------------------------------------------------------------------------------------------
-- Wer in app_kueche steht, hat die Stufe «Küche». Wer in app_admin steht, ist Admin (das geht vor). Alle anderen
-- angemeldeten Benutzer haben die Stufe «Benutzer». Geschrieben wird die Tabelle nur von der Benutzerverwaltung
-- (Edge Function mit Service-Schlüssel), wie app_admin.
create table public.app_kueche (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  erstellt_am timestamptz not null default now()
);
comment on table public.app_kueche is 'Benutzer der Stufe «Küche»: lesen ohne Preise, abhaken, Etiketten und Lager. Admin (app_admin) geht vor.';
alter table public.app_kueche enable row level security;
create policy app_kueche_eigene_zeile on public.app_kueche
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.app_kueche from anon;
revoke insert, update, delete, truncate on public.app_kueche from authenticated;

create function public.ist_kueche()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from app_kueche where user_id = (select auth.uid()))
     and not exists (select 1 from app_admin where user_id = (select auth.uid()));
$$;
comment on function public.ist_kueche() is 'Hat der angemeldete Benutzer die Stufe «Küche»? Admin geht vor.';

create function public.stufe()
returns text
language sql
stable
set search_path = public
as $$
  select case when ist_admin() then 'admin' when ist_kueche() then 'kueche' else 'benutzer' end;
$$;
comment on function public.stufe() is 'Stufe des angemeldeten Benutzers: admin, benutzer oder kueche. Die App liest sie einmal nach der Anmeldung.';

revoke execute on function public.ist_kueche() from public, anon;
revoke execute on function public.stufe() from public, anon;
grant execute on function public.ist_kueche() to authenticated;
grant execute on function public.stufe() to authenticated;

-- 2. Zugriffsregeln: lesen wie bisher, schreiben nicht für «Küche» ------------------------------------------------
-- Jede Tabelle mit der Pilot-Regel (alles für alle Angemeldeten) bekommt stattdessen vier Regeln: lesen für alle,
-- anlegen, ändern und löschen für alle ausser «Küche». Für Admin und Benutzer ändert sich nichts.
do $$
declare
  t record;
begin
  for t in select tablename from pg_policies where schemaname = 'public' and policyname = 'pilot_angemeldet' order by tablename loop
    execute format('drop policy pilot_angemeldet on public.%I', t.tablename);
    execute format('create policy lesen on public.%I for select to authenticated using (true)', t.tablename);
    execute format('create policy anlegen on public.%I for insert to authenticated with check (not (select public.ist_kueche()))', t.tablename);
    execute format('create policy aendern on public.%I for update to authenticated using (not (select public.ist_kueche())) with check (not (select public.ist_kueche()))', t.tablename);
    execute format('create policy loeschen on public.%I for delete to authenticated using (not (select public.ist_kueche()))', t.tablename);
  end loop;
end $$;

-- 3. Reine Geld-Tabellen: für «Küche» nicht lesbar ----------------------------------------------------------------
-- Diese Tabellen speisen nur Offerten, Kalkulation und Rentabilität (geprüft über die Abhängigkeiten der Views);
-- keine Seite, die «Küche» sieht, braucht sie. Die Views darauf liefern für «Küche» keine Zeilen oder leere Beträge.
do $$
declare
  t text;
begin
  foreach t in array array['lohnsatz', 'energiepreis', 'fixkosten', 'anlass_kosten', 'artikel_preis', 'offerte_gericht', 'anlass_personal', 'anlass_geraet', 'karte_position'] loop
    execute format('drop policy lesen on public.%I', t);
    execute format('create policy lesen on public.%I for select to authenticated using (not (select public.ist_kueche()))', t);
  end loop;
end $$;

-- 4. Abhaken ------------------------------------------------------------------------------------------------------
-- «Küche» hakt ab: produktion_aufgabe anlegen und ändern ist für sie erlaubt, löschen nicht.
drop policy anlegen on public.produktion_aufgabe;
drop policy aendern on public.produktion_aufgabe;
create policy anlegen on public.produktion_aufgabe for insert to authenticated with check (true);
create policy aendern on public.produktion_aufgabe for update to authenticated using (true) with check (true);

-- «Zuständig» gehört zur Planung: «Küche» kann es nicht setzen oder ändern, auch wenn sie es mitschickt.
-- Saison, Komponente und Welle einer Zeile kann sie nicht ändern: sonst liesse sich eine Zeile samt «Zuständig» und
-- Häkchen auf eine andere Welle verschieben (faktisch löschen). Der Upsert der App schickt dieselben Schlüssel.
create function public.produktion_aufgabe_kueche()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if ist_kueche() then
    if tg_op = 'INSERT' then
      new.zustaendig := null;
    else
      if (new.saison_id, new.komponente_id, new.welle_nr) is distinct from (old.saison_id, old.komponente_id, old.welle_nr) then
        raise exception 'Saison, Komponente und Welle einer Aufgabe lassen sich nicht ändern.' using errcode = '42501';
      end if;
      new.zustaendig := old.zustaendig;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.produktion_aufgabe_kueche() from public, anon, authenticated;

-- Läuft vor produktion_aufgabe_stempel (Trigger feuern in der Reihenfolge ihrer Namen).
create trigger produktion_aufgabe_kueche
  before insert or update on public.produktion_aufgabe
  for each row execute function public.produktion_aufgabe_kueche();

-- 5. Rezepte ------------------------------------------------------------------------------------------------------
-- Lesen und Löschen (nur Admin) bleiben wie in Migration 19. Anlegen und Ändern nicht für «Küche»; damit entfällt
-- für sie auch «Geprüft» setzen (rezept_status_setzen ändert die Tabelle mit den Rechten des Aufrufers).
drop policy rezept_anlegen on public.rezept;
drop policy rezept_aendern on public.rezept;
create policy rezept_anlegen on public.rezept for insert to authenticated with check (not (select public.ist_kueche()));
create policy rezept_aendern on public.rezept for update to authenticated using (not (select public.ist_kueche())) with check (not (select public.ist_kueche()));

-- Kontrolle: Nach dieser Migration gibt es die Pilot-Regel nicht mehr, und jede Tabelle hat eine Regel zum Lesen.
do $$
declare
  n integer;
begin
  select count(*) into n from pg_policies where schemaname = 'public' and policyname = 'pilot_angemeldet';
  if n > 0 then
    raise exception 'Es gibt noch % Tabellen mit der Pilot-Regel.', n;
  end if;
  select count(*) into n
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.cmd in ('SELECT', 'ALL'));
  if n > 0 then
    raise exception '% Tabellen haben keine Regel zum Lesen.', n;
  end if;
end $$;
