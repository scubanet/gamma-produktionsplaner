-- Planung aus dem Rezept, Etappe 2 (Entscheide Dominik, 14.11.2026):
--   Produktion in Hünenberg rechnet pro Welle (Menge der Welle), Komponenten ohne Welle pro Anlass.
--   Logistik und Service rechnen pro Service (Spiel).
--   Liter werden als Kilogramm gerechnet (1 l = 1 kg, Annahme). Stück lassen sich nicht umrechnen.
--   Ein Schritt ohne Ort zählt als Zentralküche; nur Schritte mit Ort «vor_ort» gehören zum Service.
-- Durchgänge = Menge ÷ Menge pro Durchgang, aufgerundet; ohne Menge pro Durchgang gilt die Ergibt-Menge des Rezepts.
-- Aktiv = Rüstzeit + Durchgänge × aktiv pro Durchgang. Gerät belegt = Durchgänge × (aktiv + unbeaufsichtigt).
-- Fehlt eine Angabe, bleibt das Ergebnis leer und der Status nennt, was fehlt.

-- 1. Bedarf für die Produktion: Wellen und Komponenten ohne Welle (gleiche Quelle wie der Einkauf) ----------
create view public.planung_bedarf with (security_invoker = true) as
select wa.saison_id, 'welle'::text as bezug_typ, wa.bezug, wa.nr as sortierung, wa.datum as bedarf_am,
       wa.komponente_id, wa.einheit, wa.menge
from wellen_aktuell wa
union all
select a.saison_id, 'anlass', a.name, 1000 + (dense_rank() over (order by a.datum, a.id))::int, a.datum - a.vorlauf_tage,
       b.komponente_id, b.einheit_total, b.menge
from (
  select b0.anlass_id, b0.komponente_id, b0.einheit_total,
         case when count(*) filter (where b0.menge_total is null) = 0 then sum(b0.menge_total) end as menge
  from anlass_komponente_bedarf b0
  join komponente_zuteilung z0 on z0.id = b0.komponente_id
  where z0.haltbarkeit_tage is null
  group by b0.anlass_id, b0.komponente_id, b0.einheit_total
) b
join anlass a on a.id = b.anlass_id
where a.saison_id is not null;

-- 2. Produktion pro Schritt ---------------------------------------------------------------------------
create view public.planung_produktion_schritt with (security_invoker = true) as
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
       end as herleitung
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

-- 3. Produktion pro Komponente, auch ohne Rezept (Status sagt, was fehlt) ----------------------------------
create view public.planung_produktion_komponente with (security_invoker = true) as
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
       x.herleitung
from planung_bedarf b
join komponente_zuteilung z on z.id = b.komponente_id
left join rezept r on r.id = z.rezept_id
left join x on x.saison_id = b.saison_id and x.bezug = b.bezug and x.komponente_id = b.komponente_id and x.einheit = b.einheit;

-- 4. Stunden pro Rolle und Belegung pro Gerät, je Welle oder Anlass (nur gerechnete Schritte) -----------------
create view public.planung_produktion_rolle with (security_invoker = true) as
select saison_id, bezug_typ, bezug, sortierung, bedarf_am, coalesce(rolle, '[Rolle]') as rolle,
       sum(aktiv_min) as aktiv_min, count(distinct komponente_id) as komponenten
from planung_produktion_schritt
where aktiv_min is not null
group by saison_id, bezug_typ, bezug, sortierung, bedarf_am, coalesce(rolle, '[Rolle]');

create view public.planung_produktion_geraet with (security_invoker = true) as
select saison_id, bezug_typ, bezug, sortierung, bedarf_am, geraet_id, geraet,
       sum(geraet_min) as geraet_min, sum(durchgaenge) as durchgaenge, count(distinct komponente_id) as komponenten
from planung_produktion_schritt
where geraet_min is not null
group by saison_id, bezug_typ, bezug, sortierung, bedarf_am, geraet_id, geraet;

-- 5. Logistik und Service pro Service und Komponente -----------------------------------------------------
-- Gebinde = Menge ÷ Füllmenge, aufgerundet. Gewicht = Menge + Gebinde × Tara. Ausgabe = Portionen ÷ 100 × Minuten pro 100.
create view public.planung_service_komponente with (security_invoker = true) as
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
       end as herleitung
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
