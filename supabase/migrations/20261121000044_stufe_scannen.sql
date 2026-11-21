-- Stufe «Scannen» (21.11.2026), Aufgabe S1 aus docs/plan-scan-app.md.
-- Entscheide Dominik: Es gibt eine eigene Stufe «Scannen» (20.11.2026). Sie packt, scannt und schlägt nach und darf
-- die Planungstabellen lesen, aus denen die Packliste das Soll rechnet (21.11.2026). Sie schreibt nichts direkt;
-- Kisten, Ein- und Auspacken und Scans laufen über Funktionen, die mit dem Packen-Kern (S2) kommen.
--
-- Wie bei «Küche» (Migration 43) gilt der Preisschutz Schritt 1: Preise, die als Spalte in einer lesbaren Tabelle
-- stehen (anlass.umsatz_netto_chf), sind über die Schnittstelle lesbar, bis Schritt 2 gebaut ist.
--
--  1. app_scannen, ist_scannen(), ist_planer(), stufe()
--  2. Schreiben: nur Admin und Benutzer (ist_planer); abhaken weiterhin auch «Küche», nicht «Scannen»
--  3. Lesen: «Scannen» liest nur die Tabellen der Liste; Geld-Tabellen lesen nur Admin und Benutzer
--  4. lager_recht: Rechte fürs Packen; Etiketten, Einlagern und Ausbuchen nicht für «Scannen»
--  5. etiketten_erstellen prüft das Recht (bisher nur «angemeldet»)
--  6. Kontrolle

-- 1. Stufe --------------------------------------------------------------------------------------------------------
-- Gebaut wie app_kueche. Reihenfolge: Admin geht vor, danach Küche, danach Scannen. Geschrieben wird die Tabelle nur
-- von der Benutzerverwaltung (Edge Function mit Service-Schlüssel).
create table public.app_scannen (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  erstellt_am timestamptz not null default now()
);
comment on table public.app_scannen is 'Benutzer der Stufe «Scannen»: packen, scannen, nachschlagen. Admin (app_admin) und Küche (app_kueche) gehen vor.';
alter table public.app_scannen enable row level security;
create policy app_scannen_eigene_zeile on public.app_scannen
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.app_scannen from anon;
revoke insert, update, delete, truncate on public.app_scannen from authenticated;

create function public.ist_scannen()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from app_scannen where user_id = (select auth.uid()))
     and not exists (select 1 from app_admin where user_id = (select auth.uid()))
     and not exists (select 1 from app_kueche where user_id = (select auth.uid()));
$$;
comment on function public.ist_scannen() is 'Hat der angemeldete Benutzer die Stufe «Scannen»? Admin und Küche gehen vor.';

create or replace function public.stufe()
returns text
language sql
stable
set search_path = public
as $$
  select case when ist_admin() then 'admin' when ist_kueche() then 'kueche' when ist_scannen() then 'scannen' else 'benutzer' end;
$$;
comment on function public.stufe() is 'Stufe des angemeldeten Benutzers: admin, benutzer, kueche oder scannen. Die App liest sie einmal nach der Anmeldung.';

-- Admin oder Benutzer: plant, schreibt und sieht Preise. Eine weitere Stufe ist damit von selbst ausgeschlossen.
create function public.ist_planer()
returns boolean
language sql
stable
set search_path = public
as $$
  select (select auth.uid()) is not null and not ist_kueche() and not ist_scannen();
$$;
comment on function public.ist_planer() is 'Hat der angemeldete Benutzer die Stufe Admin oder Benutzer? Baustein für die Zugriffsregeln (schreiben, Geld-Tabellen lesen).';

revoke execute on function public.ist_scannen() from public, anon;
revoke execute on function public.ist_planer() from public, anon;
grant execute on function public.ist_scannen() to authenticated;
grant execute on function public.ist_planer() to authenticated;

-- 2. Schreiben ----------------------------------------------------------------------------------------------------
-- Jede Regel zum Anlegen, Ändern und Löschen, die bisher «nicht Küche» verlangte, verlangt neu «Admin oder Benutzer».
-- Für Admin, Benutzer und Küche ändert sich nichts. Die Namen der Regeln bleiben (auch rezept_anlegen, rezept_aendern).
do $$
declare
  p record;
begin
  for p in
    select tablename, policyname, cmd from pg_policies
    where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE')
      and (coalesce(qual, '') like '%ist_kueche%' or coalesce(with_check, '') like '%ist_kueche%')
    order by tablename, policyname
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    if p.cmd = 'INSERT' then
      execute format('create policy %I on public.%I for insert to authenticated with check ((select public.ist_planer()))', p.policyname, p.tablename);
    elsif p.cmd = 'UPDATE' then
      execute format('create policy %I on public.%I for update to authenticated using ((select public.ist_planer())) with check ((select public.ist_planer()))', p.policyname, p.tablename);
    else
      execute format('create policy %I on public.%I for delete to authenticated using ((select public.ist_planer()))', p.policyname, p.tablename);
    end if;
  end loop;
end $$;

-- Abhaken: weiterhin Admin, Benutzer und Küche, nicht «Scannen».
drop policy anlegen on public.produktion_aufgabe;
drop policy aendern on public.produktion_aufgabe;
create policy anlegen on public.produktion_aufgabe for insert to authenticated with check (not (select public.ist_scannen()));
create policy aendern on public.produktion_aufgabe for update to authenticated using (not (select public.ist_scannen())) with check (not (select public.ist_scannen()));

-- 3. Lesen --------------------------------------------------------------------------------------------------------
-- «Scannen» liest nur, was Packliste, Lager und Nachschlagen brauchen (geprüft über die Abhängigkeiten der Views
-- service_komponente_bedarf, lager_bedarf, lager_einheit, etikett_beutel, komponente_zuteilung):
--   Spiel:       anlass, service, menuelinie
--   Soll:        menuelinie_gericht, menuelinie_komponente, komponente, produktionssystem, regenerationsart
--   Lager:       produkt, charge, lagereinheit, lagerbewegung, gebinde
-- Alle anderen Tabellen sind für «Scannen» nicht lesbar. Die Geld-Tabellen aus Migration 43 lesen nur Admin und Benutzer.
-- Neue Tabellen: «lesen» mit true, wenn «Scannen» sie braucht, sonst mit not ist_scannen().
do $$
declare
  p record;
  lesbar constant text[] := array['anlass', 'service', 'menuelinie', 'menuelinie_gericht', 'menuelinie_komponente', 'komponente',
                                  'produktionssystem', 'regenerationsart', 'produkt', 'charge', 'lagereinheit', 'lagerbewegung', 'gebinde'];
begin
  for p in
    select tablename, policyname, qual from pg_policies
    where schemaname = 'public' and cmd = 'SELECT' and policyname in ('lesen', 'rezept_lesen')
    order by tablename
  loop
    if p.qual like '%ist_kueche%' then
      execute format('drop policy %I on public.%I', p.policyname, p.tablename);
      execute format('create policy %I on public.%I for select to authenticated using ((select public.ist_planer()))', p.policyname, p.tablename);
    elsif p.qual = 'true' and not (p.tablename = any (lesbar)) then
      execute format('drop policy %I on public.%I', p.policyname, p.tablename);
      execute format('create policy %I on public.%I for select to authenticated using (not (select public.ist_scannen()))', p.policyname, p.tablename);
    end if;
  end loop;
end $$;

-- 4. Rechte des Lagers --------------------------------------------------------------------------------------------
-- Neu: etikett_erstellen (bisher ohne Prüfung), packen (Kiste anlegen, ein- und auspacken, Verladen und Ankunft
-- scannen: alle Stufen) und spiel_abschliessen (nur Admin, bis Punkt 11 der Spezifikation entschieden ist).
-- «Scannen» erstellt keine Beutel-Etiketten, lagert nicht ein und bucht nichts aus.
create or replace function public.lager_recht(p_recht text)
returns boolean
language sql
stable
set search_path = public
as $$
  select (select auth.uid()) is not null
     and case p_recht
           when 'etikett_erstellen' then not ist_scannen()
           when 'einlagern' then not ist_scannen()
           when 'etikett_stornieren' then not ist_scannen()
           when 'entsorgen' then ist_admin()
           when 'packen' then true
           when 'spiel_abschliessen' then ist_admin()
           else false
         end;
$$;
comment on function public.lager_recht(text) is 'Darf der angemeldete Benutzer das? Rechte: etikett_erstellen, einlagern, etikett_stornieren, entsorgen, packen, spiel_abschliessen. Einzige Stelle für die Rechte des Lagers.';

-- 5. Etiketten anlegen: Recht prüfen ------------------------------------------------------------------------------
-- Unverändert aus Migration 41 bis auf die Prüfung lager_recht('etikett_erstellen') am Anfang.
create or replace function public.etiketten_erstellen(
  p_saison uuid, p_komponente uuid, p_welle integer, p_anzahl integer, p_menge numeric, p_einheit text,
  p_produziert_am date default null, p_verbrauchen_bis date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_benutzer uuid := auth.uid();
  v_aufgabe produktion_aufgabe%rowtype;
  v_produkt uuid;
  v_tage integer;
  v_produziert date;
  v_bis date;
  v_annahme boolean := false;
  v_charge uuid;
  v_charge_bis date;
  v_start integer;
  v_einheit uuid;
  v_serie text;
  v_serien text[] := '{}';
  i integer;
  versuch integer;
begin
  if v_benutzer is null then
    raise exception 'Nicht angemeldet.' using errcode = '42501';
  end if;
  if not lager_recht('etikett_erstellen') then
    raise exception 'Keine Berechtigung, Etiketten zu erstellen.' using errcode = '42501';
  end if;
  if p_anzahl is null or p_anzahl < 1 or p_anzahl > 500 then
    raise exception 'Anzahl Beutel: eine ganze Zahl von 1 bis 500.' using errcode = '22023';
  end if;
  if p_menge is null or p_menge <= 0 then
    raise exception 'Menge pro Beutel: eine Zahl über 0.' using errcode = '22023';
  end if;
  if p_einheit is null or p_einheit not in ('kg', 'l', 'Stk') then
    raise exception 'Einheit: kg, l oder Stk.' using errcode = '22023';
  end if;

  select * into v_aufgabe from produktion_aufgabe a
  where a.saison_id = p_saison and a.komponente_id = p_komponente and a.welle_nr = p_welle
  for update;
  if not found or v_aufgabe.erledigt_am is null then
    raise exception 'Etiketten gibt es erst, wenn die Zeile im Küchenpass abgehakt ist.' using errcode = '23514';
  end if;

  select k.produkt_id, z.haltbarkeit_tage into v_produkt, v_tage
  from komponente k join komponente_zuteilung z on z.id = k.id
  where k.id = p_komponente;
  if v_produkt is null then
    raise exception 'Diese Komponente ist noch keinem Produkt zugeordnet.' using errcode = '23514';
  end if;

  v_produziert := coalesce(v_aufgabe.produziert_am, (v_aufgabe.erledigt_am at time zone 'Europe/Zurich')::date);
  if p_produziert_am is not null and p_produziert_am <> v_produziert then
    if p_produziert_am > v_produziert then
      raise exception 'Das Produktionsdatum lässt sich nur auf einen früheren Tag korrigieren.' using errcode = '23514';
    end if;
    v_produziert := p_produziert_am;
    v_annahme := true;
  end if;

  select c.id, c.verbrauchen_bis into v_charge, v_charge_bis from charge c
  where c.komponente_id = p_komponente and c.saison_id = p_saison and c.welle_nr = p_welle and c.produziert_am = v_produziert;

  if v_charge is not null then
    -- Anhängen: das beim ersten Mal festgehaltene Verbrauchsdatum bleibt gültig, auch wenn die Systemzuteilung seither geändert hat.
    if p_verbrauchen_bis is not null and p_verbrauchen_bis <> v_charge_bis then
      raise exception 'Für diesen Produktionstag gibt es schon Beutel, verbrauchen bis %. Weitere Beutel bekommen dasselbe Datum.', to_char(v_charge_bis, 'DD.MM.YYYY') using errcode = '23514';
    end if;
    v_bis := v_charge_bis;
  else
    if v_tage is not null then
      v_bis := v_produziert + v_tage;
      if p_verbrauchen_bis is not null and p_verbrauchen_bis <> v_bis then
        if p_verbrauchen_bis > v_bis then
          raise exception 'Das Verbrauchsdatum lässt sich nur kürzen, nicht über die Haltbarkeit hinaus verlängern.' using errcode = '23514';
        end if;
        v_bis := p_verbrauchen_bis;
        v_annahme := true;
      end if;
    elsif p_verbrauchen_bis is not null then
      v_bis := p_verbrauchen_bis;
      v_annahme := true;
    else
      raise exception 'Die Haltbarkeit fehlt: bitte das Verbrauchsdatum von Hand setzen.' using errcode = '23514';
    end if;
    if v_bis < v_produziert then
      raise exception 'Das Verbrauchsdatum liegt vor dem Produktionsdatum.' using errcode = '23514';
    end if;
    insert into charge (produkt_id, komponente_id, saison_id, welle_nr, produziert_am, haltbarkeit_tage, verbrauchen_bis, datum_annahme, erstellt_von)
    values (v_produkt, p_komponente, p_saison, p_welle, v_produziert, v_tage, v_bis, v_annahme, v_benutzer)
    returning id into v_charge;
  end if;

  select coalesce(max(e.laufnummer), 0) into v_start from lagereinheit e where e.charge_id = v_charge;

  for i in 1..p_anzahl loop
    versuch := 0;
    loop
      versuch := versuch + 1;
      select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') into v_serie from generate_series(1, 8);
      exit when not exists (select 1 from lagereinheit e where e.seriennummer = v_serie);
      if versuch > 20 then
        raise exception 'Keine freie Seriennummer gefunden, bitte nochmals versuchen.' using errcode = '40001';
      end if;
    end loop;
    insert into lagereinheit (charge_id, seriennummer, laufnummer, menge, einheit)
    values (v_charge, v_serie, v_start + i, p_menge, p_einheit)
    returning id into v_einheit;
    insert into lagerbewegung (lagereinheit_id, art, benutzer) values (v_einheit, 'eingang', v_benutzer);
    insert into druckauftrag (lagereinheit_id, erstellt_von) values (v_einheit, v_benutzer);
    v_serien := v_serien || v_serie;
  end loop;

  return jsonb_build_object('charge_id', v_charge, 'anzahl', p_anzahl, 'produziert_am', v_produziert,
                            'verbrauchen_bis', v_bis, 'seriennummern', to_jsonb(v_serien));
end
$$;

comment on function public.etiketten_erstellen(uuid, uuid, integer, integer, numeric, text, date, date) is 'Legt für eine abgehakte Zeile der Checkliste Charge, Beutel (im Lager), Lagerbewegung und Druckaufträge an. Einzige Stelle, die Beutel anlegt. Nicht für die Stufe «Scannen».';

-- 6. Kontrolle ----------------------------------------------------------------------------------------------------
do $$
declare
  n integer;
  ist text[];
  soll constant text[] := array['anlass', 'charge', 'gebinde', 'komponente', 'lagerbewegung', 'lagereinheit', 'menuelinie', 'menuelinie_gericht',
                                'menuelinie_komponente', 'produkt', 'produktionssystem', 'regenerationsart', 'service'];
begin
  -- Keine Regel verweist mehr direkt auf ist_kueche (der Trigger produktion_aufgabe_kueche braucht die Funktion weiter).
  select count(*) into n from pg_policies
  where schemaname = 'public' and (coalesce(qual, '') like '%ist_kueche%' or coalesce(with_check, '') like '%ist_kueche%');
  if n > 0 then
    raise exception '% Regeln verweisen noch auf ist_kueche.', n;
  end if;
  -- «Scannen» liest genau die Tabellen der Liste.
  select array_agg(tablename::text order by tablename::text collate "C") into ist from pg_policies
  where schemaname = 'public' and cmd = 'SELECT' and qual = 'true';
  if ist is distinct from soll then
    raise exception 'Für «Scannen» lesbar sind %, erwartet %.', ist, soll;
  end if;
  -- Jede Tabelle hat weiterhin eine Regel zum Lesen.
  select count(*) into n
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.cmd in ('SELECT', 'ALL'));
  if n > 0 then
    raise exception '% Tabellen haben keine Regel zum Lesen.', n;
  end if;
  -- «Scannen» schreibt in keine Tabelle direkt.
  select count(*) into n from pg_policies
  where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and coalesce(qual, '') || coalesce(with_check, '') not like '%ist_planer%'
    and coalesce(qual, '') || coalesce(with_check, '') not like '%ist_scannen%'
    and coalesce(qual, '') || coalesce(with_check, '') not like '%ist_admin%';
  if n > 0 then
    raise exception '% Schreib-Regeln schliessen «Scannen» nicht aus.', n;
  end if;
end $$;
