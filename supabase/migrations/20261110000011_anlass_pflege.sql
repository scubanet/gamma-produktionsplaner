-- Anlass, Menülinien, Services und Karten pflegen (Aufgabe 6).
-- Entscheide Dominik 10.11.2026:
--   Gericht aus dem Katalog in eine Menülinie: Menge pro Gast je Komponente aus der Systemzuteilung
--   (Menge pro Portion in kg → g bzw. ml), sonst leer = [Menge], die Küche trägt sie ein.
--   Offerte bestätigen: Status bestätigt, Saison, Gerichte werden Menülinie «Menü» mit einem Service für alle Gäste.
--   Karten pro Anlass pflegen, bestehende Karte als Vorlage kopieren, drucken.

-- 1. Menge pro Gast darf fehlen (wird von Hand nachgetragen) ------------------
alter table public.menuelinie_komponente alter column menge_pro_gast drop not null;
alter table public.menuelinie_komponente
  add constraint menuelinie_komponente_menge_check check (menge_pro_gast is null or menge_pro_gast >= 0);
alter table public.service
  add constraint service_gaeste_check check (gaeste >= 0);

-- 2. Produktionsliste: kein Teil-Total, wenn eine Menge fehlt ------------------
-- Gleiche Spalten wie bisher, dazu zeilen_ohne_menge am Ende. Kontrollwerte unverändert (keine Menge fehlt heute).
create or replace view public.produktionsliste with (security_invoker = true) as
with bedarf as (
  select a.saison_id, b_1.komponente_id, b_1.einheit_total,
         case when count(*) filter (where b_1.menge_total is null) = 0 then sum(b_1.menge_total) end as menge_total,
         count(*) filter (where b_1.menge_total is null) as zeilen_ohne_menge
  from anlass_komponente_bedarf b_1
  join anlass a on a.id = b_1.anlass_id
  where b_1.komponente_id is not null
  group by a.saison_id, b_1.komponente_id, b_1.einheit_total
)
select b.saison_id, k.kategorie, k.name as komponente, k.status, b.menge_total, b.einheit_total, k.haltbarkeit_tage,
  wellen_anzahl(b.saison_id, k.haltbarkeit_tage) as wellen,
  case when k.haltbarkeit_tage is not null
       then greatest(s.produktion_ab, (select min(anlass.datum - anlass.vorlauf_tage) from anlass where anlass.saison_id = b.saison_id) - k.haltbarkeit_tage)
  end as start_ab,
  k.id as komponente_id,
  b.zeilen_ohne_menge
from bedarf b
join komponente_zuteilung k on k.id = b.komponente_id
join saison s on s.id = b.saison_id;

-- 3. Gericht aus dem Katalog in eine Menülinie ---------------------------------
create function public.menuelinie_gericht_hinzufuegen(p_linie uuid, p_gericht uuid, p_anteil numeric default 1)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_anteil is not null and (p_anteil <= 0 or p_anteil > 1) then
    raise exception 'Anteil muss über 0 und höchstens 100 %% sein' using errcode = '23514';
  end if;

  insert into menuelinie_gericht (menuelinie_id, gang, bezeichnung, gericht_id, anteil, reihenfolge)
  select p_linie, coalesce(g.gang, '[Gang]'), regexp_replace(g.name, '^(GW|SC)\d+\s+', ''), g.id, coalesce(p_anteil, 1),
         (select coalesce(max(reihenfolge), 0) + 1 from menuelinie_gericht where menuelinie_id = p_linie)
  from gericht_katalog g
  where g.id = p_gericht
  returning id into v_id;

  if v_id is null then
    raise exception 'Gericht nicht im Katalog' using errcode = 'P0002';
  end if;

  -- Komponenten des Gerichts. Einheit je Komponente: die Einheit, mit der sie in Menülinien schon geführt wird
  -- (g, ml oder Stk), sonst die Einheit des Mengentyps. Menge pro Portion steht in der Systemzuteilung in kg bzw. l;
  -- bei Stk gibt es keine Umrechnung, die Menge bleibt leer [Menge].
  insert into menuelinie_komponente (linie_gericht_id, komponente_id, bezeichnung, menge_pro_gast, einheit, reihenfolge)
  select v_id, gk.komponente_id, gk.bezeichnung,
         case when e.einheit = 'Stk' then null else round(gk.menge_pro_portion * 1000, 1) end,
         e.einheit, gk.reihenfolge
  from gericht_komponente gk
  join gericht_katalog g on g.id = gk.gericht_id
  left join mengentyp mt on mt.code = g.mengentyp
  cross join lateral (
    select coalesce(
      (select mk.einheit from menuelinie_komponente mk
       where mk.komponente_id = gk.komponente_id and gk.komponente_id is not null
       group by mk.einheit order by count(*) desc, mk.einheit limit 1),
      mt.einheit, 'g') as einheit
  ) e
  where gk.gericht_id = p_gericht;

  return v_id;
end
$$;

-- 4. Offerte bestätigen ----------------------------------------------------------
create function public.offerte_bestaetigen(p_anlass uuid, p_saison uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  a anlass%rowtype;
  v_linie uuid;
  p record;
begin
  select * into a from anlass where id = p_anlass for update;
  if not found then
    raise exception 'Offerte nicht gefunden' using errcode = 'P0002';
  end if;
  if a.status <> 'offerte' then
    raise exception 'Nur Offerten können bestätigt werden (Status %)', a.status using errcode = '23514';
  end if;
  if a.gaeste is null or a.gaeste < 1 then
    raise exception 'Gäste fehlen in der Offerte' using errcode = '23514';
  end if;
  if a.datum is null then
    raise exception 'Datum fehlt in der Offerte' using errcode = '23514';
  end if;
  if not exists (select 1 from saison where id = p_saison) then
    raise exception 'Saison wählen' using errcode = '23514';
  end if;
  if not exists (select 1 from offerte_gericht where anlass_id = p_anlass) then
    raise exception 'Offerte hat keine Gerichte' using errcode = '23514';
  end if;
  select bezeichnung, mengentyp into p from offerte_position where anlass_id = p_anlass and anteil_wirksam <= 0 limit 1;
  if found then
    raise exception 'Anteil von «%» ist 0 %%: Anteile im Mengentyp % prüfen', p.bezeichnung, p.mengentyp using errcode = '23514';
  end if;

  update anlass set status = 'bestaetigt', saison_id = p_saison where id = p_anlass;

  insert into menuelinie (anlass_id, name, reihenfolge) values (p_anlass, 'Menü', 1) returning id into v_linie;

  for p in
    select op.gericht_id, op.anteil_wirksam
    from offerte_position op
    left join mengentyp mt on mt.code = op.mengentyp
    where op.anlass_id = p_anlass
    order by mt.reihenfolge, op.reihenfolge
  loop
    perform menuelinie_gericht_hinzufuegen(v_linie, p.gericht_id, p.anteil_wirksam);
  end loop;

  insert into service (anlass_id, menuelinie_id, name, datum, gaeste, reihenfolge)
  values (p_anlass, v_linie, 'Service', a.datum, a.gaeste, 1);

  return p_anlass;
end
$$;

-- 5. Karte als Vorlage kopieren --------------------------------------------------
create function public.karte_kopieren(p_karte uuid, p_anlass uuid, p_name text default null)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into karte (anlass_id, name)
  select p_anlass, coalesce(nullif(trim(p_name), ''), k.name)
  from karte k
  where k.id = p_karte
  returning id into v_id;

  if v_id is null then
    raise exception 'Karte nicht gefunden' using errcode = 'P0002';
  end if;

  insert into karte_position (karte_id, rubrik, name, menge, preis_chf, reihenfolge)
  select v_id, rubrik, name, menge, preis_chf, reihenfolge
  from karte_position
  where karte_id = p_karte;

  return v_id;
end
$$;

-- 6. Übersicht der Anlässe: Gäste aus den Services, Anzahl Menülinien und Karten ------------
create view public.anlass_uebersicht with (security_invoker = true) as
select a.id, a.nummer, a.name, a.kunde, a.datum, a.datum_bis, a.ort, a.status, a.saison_id, s.name as saison,
       (select count(*) from service sv where sv.anlass_id = a.id) as services,
       (select sum(sv.gaeste) from service sv where sv.anlass_id = a.id) as gaeste_services,
       (select count(*) from menuelinie l where l.anlass_id = a.id) as menuelinien,
       (select count(*) from karte k where k.anlass_id = a.id) as karten
from anlass a
left join saison s on s.id = a.saison_id;

-- Karten mit Anzahl Positionen (Vorlagen und Liste im Anlass).
create view public.karte_uebersicht with (security_invoker = true) as
select k.id, k.name, k.anlass_id, a.name as anlass,
       (select count(*) from karte_position p where p.karte_id = k.id) as positionen,
       (select count(*) from karte_position p where p.karte_id = k.id and p.preis_chf is null) as positionen_ohne_preis
from karte k
left join anlass a on a.id = k.anlass_id;

-- Gäste pro Menülinie (Summe ihrer Services), für die Herleitung im Anlass.
create view public.menuelinie_gaeste with (security_invoker = true) as
select l.id as menuelinie_id, l.anlass_id, l.name,
       count(sv.id) as services,
       coalesce(sum(sv.gaeste), 0) as gaeste,
       string_agg(sv.name || ' ' || sv.gaeste, ' + ' order by sv.reihenfolge) as herleitung
from menuelinie l
left join service sv on sv.menuelinie_id = l.id
group by l.id, l.anlass_id, l.name;

-- Nur angemeldete Benutzer (Pilot: alle Angemeldeten dürfen alles, wie die RLS-Policies).
revoke execute on function public.menuelinie_gericht_hinzufuegen(uuid, uuid, numeric) from public, anon;
revoke execute on function public.offerte_bestaetigen(uuid, uuid) from public, anon;
revoke execute on function public.karte_kopieren(uuid, uuid, text) from public, anon;
grant execute on function public.menuelinie_gericht_hinzufuegen(uuid, uuid, numeric) to authenticated;
grant execute on function public.offerte_bestaetigen(uuid, uuid) to authenticated;
grant execute on function public.karte_kopieren(uuid, uuid, text) to authenticated;
