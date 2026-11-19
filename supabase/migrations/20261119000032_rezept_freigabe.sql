-- Rezept-Freigabe und Kennzeichnung «aus Entwurf» (Plan Datenkette, Aufgabe 1).
-- Entscheide Dominik (19.11.2026):
--   Freigeben dürfen nur Admins; auch eine Freigabe zurücknehmen darf nur ein Admin.
--   «Geprüft» setzen dürfen alle Angemeldeten (die Prüfung geschieht in der Küche).
--   Ein freigegebenes Rezept bleibt beim Speichern freigegeben: rezept_speichern fasst den Status nicht an.
-- Die Views planung_* rechnen weiterhin mit jedem Rezept, zeigen aber dessen Status,
-- damit die App Werte aus nicht freigegebenen Rezepten wie Annahmen kennzeichnet.

-- 1. Schutz auf der Tabelle: gilt auch für direkte Änderungen über die API (Policy rezept_aendern erlaubt sie). ----
create function public.rezept_status_pruefen()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Migrationen und Importer laufen ohne angemeldeten Benutzer und bleiben ausgenommen.
  if (select auth.uid()) is null then
    return new;
  end if;
  if ((tg_op = 'INSERT' and new.status = 'freigegeben')
      or (tg_op = 'UPDATE' and new.status is distinct from old.status and 'freigegeben' in (old.status, new.status)))
     and not ist_admin() then
    raise exception 'Nur Administratoren dürfen ein Rezept freigeben oder eine Freigabe zurücknehmen.' using errcode = '42501';
  end if;
  return new;
end
$$;
revoke execute on function public.rezept_status_pruefen() from public, anon;

create trigger rezept_status_pruefen
  before insert or update of status on public.rezept
  for each row execute function public.rezept_status_pruefen();

-- 2. Status setzen, mit Prüfung des geladenen Stands wie rezept_speichern. -------------------------------------
create function public.rezept_status_setzen(p_rezept uuid, p_status text, p_geaendert_am timestamptz)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  alt rezept%rowtype;
  neu timestamptz := clock_timestamp();
begin
  if p_status is null or p_status not in ('entwurf', 'geprueft', 'freigegeben') then
    raise exception 'Unbekannter Status «%». Erlaubt sind entwurf, geprueft, freigegeben.', coalesce(p_status, '') using errcode = '22023';
  end if;
  select * into alt from rezept where id = p_rezept for update;
  if not found then
    raise exception 'Rezept nicht gefunden';
  end if;
  if alt.geaendert_am is distinct from p_geaendert_am then
    raise exception 'Das Rezept wurde inzwischen geändert. Bitte neu laden und den Status erneut setzen.' using errcode = '40001';
  end if;
  -- Wer freigeben darf, prüft der Trigger rezept_status_pruefen.
  update rezept set status = p_status, geaendert_am = neu where id = p_rezept;
  return jsonb_build_object('id', p_rezept, 'status', p_status, 'geaendert_am', neu);
end
$$;
revoke execute on function public.rezept_status_setzen(uuid, text, timestamptz) from public, anon;
grant execute on function public.rezept_status_setzen(uuid, text, timestamptz) to authenticated;

comment on function public.rezept_status_setzen(uuid, text, timestamptz) is
  'Status eines Rezepts setzen (entwurf, geprueft, freigegeben). Lehnt ab, wenn der geladene Stand nicht mehr gilt. Freigeben und Freigabe zurücknehmen nur für Admins.';

-- 3. Planung: Status des Rezepts mitgeben. Neue Spalten stehen am Schluss, der Rest ist unverändert (Migration 24). ---
create or replace view public.planung_produktion_schritt with (security_invoker = true) as
select b.saison_id, b.bezug_typ, b.bezug, b.sortierung, b.bedarf_am, b.komponente_id, b.einheit, b.menge,
       r.id as rezept_id, s.id as schritt_id, g.reihenfolge as gruppe_nr, s.reihenfolge as schritt_nr, s.text as schritt,
       s.rolle, s.geraet_id, ge.name as geraet,
       d.pro_durchgang_g, d.durchgaenge,
       s.ruest_min + d.durchgaenge * coalesce(s.aktiv_min, 0) as aktiv_min,
       case when s.geraet_id is not null then d.durchgaenge * (coalesce(s.aktiv_min, 0) + coalesce(s.unbeaufsichtigt_min, 0)) end as geraet_min,
       case
         when d.menge_g is null then '[Menge]'
         when d.pro_durchgang_g is null then 'Menge pro Durchgang und Ergibt-Menge fehlen'
         else trim_scale(round(d.menge_g / 1000, 3)) || ' kg ÷ ' || trim_scale(round(d.pro_durchgang_g / 1000, 3)) || ' kg = '
              || d.durchgaenge || ' Durchgänge; ' || trim_scale(s.ruest_min) || ' min Rüstzeit + ' || d.durchgaenge || ' × '
              || trim_scale(coalesce(s.aktiv_min, 0)) || ' min'
       end as herleitung,
       r.status as rezept_status
from planung_bedarf b
join komponente k on k.id = b.komponente_id
join rezept r on r.id = k.rezept_id
join zutatengruppe g on g.rezept_id = r.id
join schritt s on s.gruppe_id = g.id and coalesce(s.ort, 'zentralkueche') = 'zentralkueche'
left join geraet ge on ge.id = s.geraet_id
cross join lateral (
  select m.menge_g, p.pro_durchgang_g, ceil(m.menge_g / p.pro_durchgang_g)::int as durchgaenge
  from (select case when b.einheit in ('kg', 'l') then b.menge * 1000 end as menge_g) m,
       (select nullif(coalesce(s.menge_pro_durchgang_g, r.ergibt_g), 0) as pro_durchgang_g) p
) d;

create or replace view public.planung_produktion_komponente with (security_invoker = true) as
with x as (
  select saison_id, bezug, komponente_id, einheit,
         count(*) as schritte,
         count(*) filter (where durchgaenge is null) as ohne_durchgang,
         max(durchgaenge) as durchgaenge,
         case when count(*) filter (where aktiv_min is null) = 0 then sum(aktiv_min) end as aktiv_min,
         case when count(*) filter (where geraet_id is not null and geraet_min is null) = 0 then sum(geraet_min) end as geraet_min,
         string_agg(herleitung, ' | ' order by gruppe_nr, schritt_nr) as herleitung
  from planung_produktion_schritt
  group by saison_id, bezug, komponente_id, einheit
)
select b.saison_id, b.bezug_typ, b.bezug, b.sortierung, b.bedarf_am, b.komponente_id, z.name as komponente, z.kategorie,
       b.einheit, b.menge, b.einheit = 'l' as liter_annahme,
       z.rezept_id, r.name as rezept, r.slug as rezept_slug,
       x.schritte, x.durchgaenge, x.aktiv_min, x.geraet_min,
       case
         when z.rezept_id is null then 'kein Rezept'
         when b.menge is null then 'Menge fehlt'
         when b.einheit = 'Stk' then 'Stück nicht umrechenbar'
         when coalesce(x.schritte, 0) = 0 then 'keine Schritte'
         when x.ohne_durchgang > 0 then 'Durchgang fehlt'
         else 'gerechnet'
       end as status,
       x.herleitung,
       r.status as rezept_status
from planung_bedarf b
join komponente_zuteilung z on z.id = b.komponente_id
left join rezept r on r.id = z.rezept_id
left join x on x.saison_id = b.saison_id and x.bezug = b.bezug and x.komponente_id = b.komponente_id and x.einheit = b.einheit;

-- Summen pro Rolle und Gerät: wie viele der Komponenten aus einem nicht freigegebenen Rezept stammen (Entwurf oder geprüft).
create or replace view public.planung_produktion_rolle with (security_invoker = true) as
select saison_id, bezug_typ, bezug, sortierung, bedarf_am, coalesce(rolle, '[Rolle]') as rolle,
       sum(aktiv_min) as aktiv_min, count(distinct komponente_id) as komponenten,
       count(distinct komponente_id) filter (where rezept_status <> 'freigegeben') as komponenten_nicht_freigegeben
from planung_produktion_schritt
where aktiv_min is not null
group by saison_id, bezug_typ, bezug, sortierung, bedarf_am, coalesce(rolle, '[Rolle]');

create or replace view public.planung_produktion_geraet with (security_invoker = true) as
select saison_id, bezug_typ, bezug, sortierung, bedarf_am, geraet_id, geraet,
       sum(geraet_min) as geraet_min, sum(durchgaenge) as durchgaenge, count(distinct komponente_id) as komponenten,
       count(distinct komponente_id) filter (where rezept_status <> 'freigegeben') as komponenten_nicht_freigegeben
from planung_produktion_schritt
where geraet_min is not null
group by saison_id, bezug_typ, bezug, sortierung, bedarf_am, geraet_id, geraet;

create or replace view public.planung_service_komponente with (security_invoker = true) as
with bedarf as (
  select s.id as service_id, s.anlass_id, a.saison_id, s.name as service, s.reihenfolge, s.datum, mk.komponente_id,
         case mk.einheit when 'g' then 'kg' when 'ml' then 'l' else 'Stk' end as einheit,
         sum(s.gaeste * mg.anteil) as portionen,
         case when count(*) filter (where mk.menge_pro_gast is null) = 0
              then sum(s.gaeste * mg.anteil * mk.menge_pro_gast / case when mk.einheit = 'Stk' then 1 else 1000 end)
         end as menge
  from service s
  join anlass a on a.id = s.anlass_id
  join menuelinie_gericht mg on mg.menuelinie_id = s.menuelinie_id
  join menuelinie_komponente mk on mk.linie_gericht_id = mg.id
  where mk.komponente_id is not null
  group by s.id, s.anlass_id, a.saison_id, s.name, s.reihenfolge, s.datum, mk.komponente_id,
           case mk.einheit when 'g' then 'kg' when 'ml' then 'l' else 'Stk' end
), vo as (
  select g.rezept_id, s.ruest_min, s.aktiv_min, s.unbeaufsichtigt_min, s.menge_pro_durchgang_g, s.geraet_id
  from schritt s
  join zutatengruppe g on g.id = s.gruppe_id
  where s.ort = 'vor_ort'
)
select b.service_id, b.anlass_id, b.saison_id, b.service, b.reihenfolge, b.datum, b.komponente_id, z.name as komponente, z.kategorie,
       b.einheit, b.menge, b.einheit = 'l' as liter_annahme, round(b.portionen, 1) as portionen,
       z.rezept_id, r.name as rezept, r.slug as rezept_slug,
       gb.name as gebinde, r.fuellmenge_g, n.gebinde_anzahl,
       round((m.menge_g + n.gebinde_anzahl * gb.tara_g) / 1000, 2) as gewicht_kg,
       n.gebinde_anzahl * gb.volumen_l as volumen_l,
       v.schritte as vorort_schritte, v.aktiv_min as vorort_aktiv_min, v.geraet_min as vorort_geraet_min,
       round(b.portionen / 100 * r.service_min_pro_100, 1) as ausgabe_min, r.service_rolle,
       case
         when z.rezept_id is null then 'kein Rezept'
         when b.menge is null then 'Menge fehlt'
         when b.einheit = 'Stk' then 'Stück nicht umrechenbar'
         when r.fuellmenge_g is null then 'Füllmenge fehlt'
         else 'gerechnet'
       end as status,
       case when n.gebinde_anzahl is not null
            then trim_scale(round(m.menge_g / 1000, 3)) || ' kg ÷ ' || trim_scale(round(r.fuellmenge_g / 1000, 3)) || ' kg = ' || n.gebinde_anzahl || ' ' || coalesce(gb.name, '[Gebinde]')
       end as herleitung,
       r.status as rezept_status
from bedarf b
join komponente_zuteilung z on z.id = b.komponente_id
left join rezept r on r.id = z.rezept_id
left join gebinde gb on gb.id = r.gebinde_id
cross join lateral (select case when b.einheit in ('kg', 'l') then b.menge * 1000 end as menge_g) m
cross join lateral (select ceil(m.menge_g / r.fuellmenge_g)::int as gebinde_anzahl) n
left join lateral (
  select count(*) as schritte,
         sum(vo.ruest_min + ceil(m.menge_g / nullif(coalesce(vo.menge_pro_durchgang_g, r.ergibt_g), 0)) * coalesce(vo.aktiv_min, 0)) as aktiv_min,
         sum(case when vo.geraet_id is not null
                  then ceil(m.menge_g / nullif(coalesce(vo.menge_pro_durchgang_g, r.ergibt_g), 0)) * (coalesce(vo.aktiv_min, 0) + coalesce(vo.unbeaufsichtigt_min, 0)) end) as geraet_min
  from vo
  where vo.rezept_id = r.id
) v on true;

-- 4. Leitstand: Rezepte der Saison und wie viele davon freigegeben sind. ---------------------------------------
--    Rezepte der Saison = Rezepte, die mit einer Komponente im Bedarf eines Anlasses der Saison verknüpft sind.
create view public.leitstand_rezepte with (security_invoker = true) as
select a.saison_id,
       count(distinct r.id)::int as rezepte,
       (count(distinct r.id) filter (where r.status = 'freigegeben'))::int as freigegeben
from anlass_komponente_bedarf b
join anlass a on a.id = b.anlass_id
join komponente k on k.id = b.komponente_id
join rezept r on r.id = k.rezept_id
where a.saison_id is not null
group by a.saison_id;

comment on view public.leitstand_rezepte is 'Leitstand: Rezepte der Komponenten im Bedarf der Saison und wie viele davon freigegeben sind.';
