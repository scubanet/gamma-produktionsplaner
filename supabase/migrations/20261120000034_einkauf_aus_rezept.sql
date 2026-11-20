-- Einkauf aus dem Rezept (20.11.2026, Plan Datenkette, Aufgabe 3).
-- Bisher: Komponentenmenge × (1 + Verlust) über den Hauptartikel der Komponente (Migration 12), als Annahme vermerkt.
-- Neu: Hat das Rezept der Komponente verknüpfte Zutaten, rechnet der Einkauf über das Rezept:
--   Bedarf der Komponente ÷ Ergibt-Menge des Rezepts = Faktor; Zutat × Faktor = Zutatenmenge; über zutat.artikel_id zum Artikel.
-- Entscheid Dominik (20.11.2026): Auch ein Rezept im Entwurf zählt, mit Kennzeichnung (rezept_status, nicht_freigegeben).
-- Sonst gilt der bisherige Weg über den Hauptartikel; Zukauf bleibt unverändert.
-- Eine Zutat ohne Artikel oder ohne Menge bleibt als offene Zutat sichtbar; die Position ist dann unvollständig und hat keine Kosten.

drop view public.einkauf_summe;
drop view public.einkauf_artikel;
drop view public.einkauf_position;

-- 1. Bedarf pro Welle oder Anlass (unverändert aus Migration 12, als eigene View für beide Wege) ------------------
create view public.einkauf_bedarf with (security_invoker = true) as
with e as (
  select coalesce((select wert from einstellung where schluessel = 'einkauf_vorlauf_tage'), 1)::int as vorlauf
), bedarf as (
  select wa.saison_id, 'welle'::text as bezug_typ, wa.bezug, wa.nr as sortierung, wa.quelle,
         wa.datum as bedarf_am, wa.komponente_id, wa.einheit, wa.menge
  from wellen_aktuell wa
  union all
  select a.saison_id, 'anlass', a.name, 1000 + (dense_rank() over (order by a.datum, a.id))::int, 'anlass',
         a.datum - a.vorlauf_tage, b.komponente_id, b.einheit_total, b.menge
  from (
    select b0.anlass_id, b0.komponente_id, b0.einheit_total,
           case when count(*) filter (where b0.menge_total is null) = 0 then sum(b0.menge_total) end as menge
    from anlass_komponente_bedarf b0
    join komponente_zuteilung z0 on z0.id = b0.komponente_id
    where z0.haltbarkeit_tage is null
    group by b0.anlass_id, b0.komponente_id, b0.einheit_total
  ) b
  join anlass a on a.id = b.anlass_id
  where a.saison_id is not null
)
select b.saison_id, b.bezug_typ, b.bezug, b.sortierung, b.quelle, b.bedarf_am, b.bedarf_am - e.vorlauf as liefern_bis,
       e.vorlauf, b.komponente_id, b.einheit, b.menge
from bedarf b
cross join e;

comment on view public.einkauf_bedarf is 'Einkauf: Bedarf pro Welle (Produktionstag) oder Anlass (Anlieferung) und Komponente; Grundlage für einkauf_position und einkauf_zutat.';

-- 2. Zutaten aus dem Rezept ------------------------------------------------------------------------------------
-- Eine Zeile pro Bedarf und Zutat, Unterrezepte (zutat.komponente_id zeigt auf ein Rezept) aufgelöst.
-- Die Komponentenmenge gilt in Gramm: kg × 1000, l × 1000 (Annahme 1 l = 1 kg, wie in der Planung); Stück lässt sich nicht umrechnen.
-- Artikelmenge nur für Artikel in kg, Liter oder Gramm; Gebinde (Flasche, Dose, Tetrapack …) haben kein Gewicht hinterlegt.
create view public.einkauf_zutat with (security_invoker = true) as
with recursive b as (
  select eb.saison_id, eb.bezug_typ, eb.bezug, eb.sortierung, eb.quelle, eb.bedarf_am, eb.liefern_bis,
         eb.komponente_id, eb.einheit, eb.menge, z.name as komponente, z.rezept_id,
         case when eb.einheit in ('kg', 'l') then eb.menge * 1000 end as menge_g
  from einkauf_bedarf eb
  join komponente_zuteilung z on z.id = eb.komponente_id
  where z.rezept_id is not null and z.status <> 'Zukauf'
), baum as (
  select b.saison_id, b.bezug_typ, b.bezug, b.komponente_id, b.einheit, b.rezept_id, 1 as tiefe,
         b.menge_g / nullif(case when r.typ = 'gericht' then r.basis_portionen * r.portion_g else r.ergibt_g end, 0) as faktor
  from b
  join rezept r on r.id = b.rezept_id
  union all
  select t.saison_id, t.bezug_typ, t.bezug, t.komponente_id, t.einheit, z.komponente_id, t.tiefe + 1,
         z.menge_g * t.faktor / nullif(case when r.typ = 'gericht' then r.basis_portionen * r.portion_g else r.ergibt_g end, 0)
  from baum t
  join zutatengruppe g on g.rezept_id = t.rezept_id
  join zutat z on z.gruppe_id = g.id and z.komponente_id is not null
  join rezept r on r.id = z.komponente_id
  where t.tiefe < 5
), x as (
  select b.saison_id, b.bezug_typ, b.bezug, b.sortierung, b.quelle, b.bedarf_am, b.liefern_bis,
         b.komponente_id, b.komponente, b.einheit, b.menge as menge_komponente,
         b.rezept_id, rw.name as rezept, rw.status as rezept_status,
         r.id as zutat_rezept_id, r.name as zutat_rezept, t.tiefe, t.faktor,
         z.id as zutat_id, z.bezeichnung as zutat, z.menge_g as menge_basis_g, z.annahme as zutat_annahme,
         round(z.menge_g * t.faktor, 1) as menge_zutat_g,
         a.id as artikel_id, a.name as artikel, a.artikelnummer, a.einheit as artikel_einheit, a.preis_pro_einheit,
         coalesce(a.verlust_pct, 0) as verlust_pct, a.lieferant_id, l.name as lieferant,
         case
           when a.einheit in ('kg', 'Liter', 'l') then round(z.menge_g * t.faktor / 1000 * (1 + coalesce(a.verlust_pct, 0) / 100), 3)
           when a.einheit = 'Gramm' then round(z.menge_g * t.faktor * (1 + coalesce(a.verlust_pct, 0) / 100), 1)
         end as menge_artikel,
         case when r.typ = 'gericht' then r.basis_portionen * r.portion_g else r.ergibt_g end as ergibt_g
  from baum t
  join b on b.saison_id = t.saison_id and b.bezug_typ = t.bezug_typ and b.bezug = t.bezug
        and b.komponente_id = t.komponente_id and b.einheit = t.einheit
  join rezept rw on rw.id = b.rezept_id
  join rezept r on r.id = t.rezept_id
  join zutatengruppe g on g.rezept_id = t.rezept_id
  join zutat z on z.gruppe_id = g.id and z.komponente_id is null
  left join artikel a on a.id = z.artikel_id
  left join lieferant l on l.id = a.lieferant_id
)
select saison_id, bezug_typ, bezug, sortierung, quelle, bedarf_am, liefern_bis,
       komponente_id, komponente, einheit, menge_komponente, rezept_id, rezept, rezept_status,
       zutat_rezept_id, zutat_rezept, zutat_id, zutat, menge_basis_g, menge_zutat_g,
       artikel_id, artikel, artikelnummer, artikel_einheit, preis_pro_einheit, verlust_pct,
       menge_artikel, round(menge_artikel * preis_pro_einheit, 2) as kosten_chf,
       lieferant_id, lieferant,
       -- Annahme: Rezept nicht freigegeben, Menge der Zutat als Annahme vermerkt, oder Liter als Kilogramm gerechnet.
       (rezept_status <> 'freigegeben' or zutat_annahme or einheit = 'l' or coalesce(artikel_einheit in ('Liter', 'l'), false)) as annahme,
       case
         when artikel_id is null then 'kein Artikel'
         when menge_komponente is null then 'Menge der Komponente fehlt'
         when einheit = 'Stk' then 'Stück nicht umrechenbar'
         when faktor is null then 'Ergibt-Menge des Rezepts fehlt'
         when menge_basis_g is null then 'Menge der Zutat fehlt'
         when menge_artikel is null then 'Einheit ' || coalesce(artikel_einheit, '[Einheit]') || ': Menge von Hand'
       end as offen_grund,
       concat_ws('; ',
         coalesce(trim_scale(menge_komponente) || ' ' || einheit, '[Menge]') || ' ' || komponente || ' ÷ '
           || coalesce(trim_scale(ergibt_g) || ' g', '[Menge]') || ' je Charge'
           || case when tiefe > 1 then ' (über Unterrezept ' || zutat_rezept || ')' else '' end
           || coalesce(' = Faktor ' || trim_scale(round(faktor, 3)), ''),
         zutat || ' ' || coalesce(trim_scale(menge_basis_g) || ' g', '[Menge]')
           || coalesce(' × ' || trim_scale(round(faktor, 3)) || ' = ' || trim_scale(menge_zutat_g) || ' g', ''),
         case
           when artikel_id is null then 'kein Artikel verknüpft'
           when menge_artikel is null and menge_zutat_g is not null
             then artikel || ' in ' || coalesce(artikel_einheit, '[Einheit]') || ': Menge von Hand'
           when menge_artikel is not null
             then artikel || ': ' || trim_scale(menge_artikel) || ' ' || artikel_einheit
                  || case when verlust_pct <> 0 then ' inkl. ' || trim_scale(verlust_pct) || ' % Verlust' else '' end
                  || coalesce(' × CHF ' || to_char(preis_pro_einheit, 'FM999999990.00') || ' = CHF '
                              || to_char(round(menge_artikel * preis_pro_einheit, 2), 'FM999999990.00'), '; [Preis]')
         end,
         case when rezept_status <> 'freigegeben' then 'Rezept ' || rezept_status end
       ) as herleitung
from x;

comment on view public.einkauf_zutat is 'Einkauf aus dem Rezept: pro Bedarf (Welle oder Anlass) und Zutat die Zutatenmenge und, wenn verknüpft und umrechenbar, die Artikelmenge. offen_grund nennt, was fehlt.';

-- 3. Positionen: eine Zeile pro Bedarf und Komponente, mit dem gewählten Weg ----------------------------------------
-- weg: rezept (Rezept mit mindestens einer verknüpften Zutat), hauptartikel (bisheriger Weg), zukauf, offen.
-- typ wie bisher artikel / zukauf / offen, neu rezept.
create view public.einkauf_position with (security_invoker = true) as
with za as (
  select saison_id, bezug_typ, bezug, komponente_id, einheit,
         min(rezept_id::text)::uuid as rezept_id, min(rezept) as rezept, min(rezept_status) as rezept_status,
         count(*)::int as zutaten,
         count(artikel_id)::int as zutaten_mit_artikel,
         count(*) filter (where artikel_id is null)::int as zutaten_ohne_artikel,
         count(*) filter (where artikel_id is not null and menge_artikel is null)::int as zutaten_ohne_menge,
         case when count(*) filter (where kosten_chf is null) = 0 then sum(kosten_chf) end as kosten_chf,
         string_agg(zutat, ', ' order by zutat) filter (where artikel_id is null) as namen_ohne_artikel,
         string_agg(zutat || ' (' || offen_grund || ')', ', ' order by zutat) filter (where artikel_id is not null and menge_artikel is null) as namen_ohne_menge
  from einkauf_zutat
  group by saison_id, bezug_typ, bezug, komponente_id, einheit
), m as (
  select b.*, z.name as komponente, z.kategorie, z.status, z.nur_vor_ort,
         za.rezept_id, za.rezept, za.rezept_status, za.zutaten, za.zutaten_mit_artikel, za.zutaten_ohne_artikel, za.zutaten_ohne_menge,
         za.kosten_chf as kosten_rezept, za.namen_ohne_artikel, za.namen_ohne_menge,
         coalesce(za.zutaten_mit_artikel, 0) > 0 as ueber_rezept,
         ar.id as h_artikel_id, ar.name as h_artikel, ar.artikelnummer as h_artikelnummer, ar.einheit as h_einheit,
         ar.preis_pro_einheit as h_preis, coalesce(ar.verlust_pct, 0) as h_verlust,
         l.id as h_lieferant_id, l.name as h_lieferant,
         -- Nur gleiche Einheiten: kg ↔ kg, l ↔ Liter, Stk ↔ Stk. Gebinde (Schale, Bund …) lassen sich nicht umrechnen.
         coalesce((b.einheit = 'kg' and ar.einheit = 'kg') or (b.einheit = 'l' and ar.einheit in ('Liter', 'l')) or (b.einheit = 'Stk' and ar.einheit = 'Stk'), false) as umrechenbar
  from einkauf_bedarf b
  join komponente_zuteilung z on z.id = b.komponente_id
  left join za on za.saison_id = b.saison_id and za.bezug_typ = b.bezug_typ and za.bezug = b.bezug
              and za.komponente_id = b.komponente_id and za.einheit = b.einheit
  left join artikel ar on ar.id = z.hauptartikel_id
  left join lieferant l on l.id = ar.lieferant_id
), r as (
  select m.*,
         case when m.ueber_rezept then 'rezept' when m.h_artikel_id is not null then 'hauptartikel'
              when m.status = 'Zukauf' then 'zukauf' else 'offen' end as weg,
         case when not m.ueber_rezept and m.umrechenbar then round(m.menge * (1 + m.h_verlust / 100), 3) end as h_menge,
         t.liefertermin, t.bestellen_bis
  from m
  left join lateral lieferant_bestelltermin(case when m.ueber_rezept then null else m.h_lieferant_id end, m.liefern_bis) t on true
)
select saison_id, bezug_typ, bezug, sortierung, quelle, bedarf_am, liefern_bis,
       komponente_id, komponente, kategorie, status, nur_vor_ort,
       case weg when 'hauptartikel' then 'artikel' else weg end as typ,
       menge as menge_komponente, einheit,
       case when weg = 'hauptartikel' then h_artikel_id end as artikel_id,
       case when weg = 'hauptartikel' then h_artikel end as artikel,
       case when weg = 'hauptartikel' then h_artikelnummer end as artikelnummer,
       case when weg = 'hauptartikel' then h_einheit end as artikel_einheit,
       case when weg = 'hauptartikel' then h_preis end as preis_pro_einheit,
       case when weg = 'hauptartikel' then h_verlust end as verlust_pct,
       h_menge as menge_artikel,
       case weg when 'rezept' then kosten_rezept when 'hauptartikel' then round(h_menge * h_preis, 2) end as kosten_chf,
       case when weg = 'hauptartikel' then h_lieferant_id end as lieferant_id,
       case when weg = 'hauptartikel' then h_lieferant end as lieferant,
       liefertermin, bestellen_bis,
       concat_ws('; ',
         case bezug_typ
           when 'welle' then 'Bedarf der ' || bezug || ' am Produktionstag ' || coalesce(to_char(bedarf_am, 'DD.MM.YYYY'), '[Datum]')
           else 'Bedarf des ganzen Anlasses ' || bezug || ' zur Anlieferung am ' || coalesce(to_char(bedarf_am, 'DD.MM.YYYY'), '[Datum]')
                || ' (Annahme: keine Verteilung auf die Tage)'
         end,
         case
           when weg = 'rezept' then 'über das Rezept ' || rezept || ' (' || rezept_status || '): ' || zutaten_mit_artikel || ' von ' || zutaten || ' Zutaten verknüpft'
                || coalesce('; ohne Artikel: ' || namen_ohne_artikel, '')
                || coalesce('; Menge von Hand: ' || namen_ohne_menge, '')
                || coalesce('; Kosten CHF ' || to_char(kosten_rezept, 'FM999999990.00'), '; Kosten [Preis], weil unvollständig')
           when weg = 'zukauf' then 'Zukauf: Artikel [Artikel] zuordnen'
           when weg = 'offen' then 'kein Rezept mit verknüpften Zutaten und kein Hauptartikel'
           when menge is null then 'Menge der Komponente fehlt'
           when not umrechenbar then 'Einheit ' || einheit || ' der Komponente passt nicht zu ' || coalesce(h_einheit, '[Einheit]') || ' des Artikels: Menge von Hand'
           else trim_scale(menge) || ' ' || einheit || ' × (1 + ' || trim_scale(h_verlust) || ' % Verlust) = ' || trim_scale(h_menge) || ' ' || h_einheit
                || coalesce(' × CHF ' || to_char(h_preis, 'FM999999990.00') || ' = CHF ' || to_char(round(h_menge * h_preis, 2), 'FM999999990.00'), '; [Preis]')
                || ' (Annahme: Hauptartikel statt Rezept)'
         end,
         case when weg = 'hauptartikel' and bedarf_am is not null
              then 'Lieferung bis ' || to_char(liefern_bis, 'DD.MM.YYYY') || ' (' || vorlauf || ' Tag(e) vor Bedarf)'
                   || case when h_lieferant_id is null then '; [Lieferant]'
                           when liefertermin is null then '; Liefertage von ' || h_lieferant || ' fehlen'
                           else '; ' || h_lieferant || ' liefert am ' || to_char(liefertermin, 'DD.MM.YYYY')
                                || ', bestellen bis ' || to_char(bestellen_bis, 'DD.MM.YYYY HH24') || ' Uhr' end
         end
       ) as herleitung,
       weg, rezept_id, rezept, rezept_status,
       coalesce(zutaten, 0) as zutaten,
       coalesce(zutaten_ohne_artikel, 0) as zutaten_ohne_artikel,
       coalesce(zutaten_ohne_menge, 0) as zutaten_ohne_menge
from r;

comment on view public.einkauf_position is 'Einkauf: pro Bedarf und Komponente der gewählte Weg (rezept, hauptartikel, zukauf, offen) mit Herleitung. Bei weg = rezept stehen die Artikel in einkauf_zutat.';

-- 4. Einkaufsliste nach Artikel: beide Wege zusammen, pro Bezug, Lieferant und Artikel ---------------------------
create view public.einkauf_artikel with (security_invoker = true) as
with zeilen as (
  select saison_id, bezug_typ, bezug, sortierung, quelle, bedarf_am, liefern_bis,
         lieferant_id, lieferant, artikel_id, artikel, artikelnummer, artikel_einheit, preis_pro_einheit,
         komponente, menge_artikel, kosten_chf, herleitung, 'hauptartikel'::text as weg, true as annahme, false as nicht_freigegeben
  from einkauf_position
  where weg = 'hauptartikel'
  union all
  select z.saison_id, z.bezug_typ, z.bezug, z.sortierung, z.quelle, z.bedarf_am, z.liefern_bis,
         z.lieferant_id, z.lieferant, z.artikel_id, z.artikel, z.artikelnummer, z.artikel_einheit, z.preis_pro_einheit,
         z.komponente, z.menge_artikel, z.kosten_chf, z.herleitung, 'rezept', z.annahme, z.rezept_status <> 'freigegeben'
  from einkauf_zutat z
  where z.artikel_id is not null
), g as (
  select saison_id, bezug_typ, bezug, sortierung, quelle, bedarf_am, liefern_bis,
         lieferant_id, lieferant, artikel_id, artikel, artikelnummer, artikel_einheit, preis_pro_einheit,
         count(distinct komponente) as komponenten,
         string_agg(distinct komponente, ', ' order by komponente) as komponenten_namen,
         case when count(*) filter (where menge_artikel is null) = 0 then sum(menge_artikel) end as menge_artikel,
         case when count(*) filter (where kosten_chf is null) = 0 then sum(kosten_chf) end as kosten_chf,
         string_agg(komponente || ': ' || herleitung, ' | ' order by komponente) as herleitung,
         string_agg(distinct weg, ', ' order by weg) as wege,
         bool_or(annahme) as annahme,
         count(distinct komponente) filter (where nicht_freigegeben) as komponenten_nicht_freigegeben
  from zeilen
  group by saison_id, bezug_typ, bezug, sortierung, quelle, bedarf_am, liefern_bis,
           lieferant_id, lieferant, artikel_id, artikel, artikelnummer, artikel_einheit, preis_pro_einheit
)
select g.saison_id, g.bezug_typ, g.bezug, g.sortierung, g.quelle, g.bedarf_am, g.liefern_bis,
       g.lieferant_id, g.lieferant, g.artikel_id, g.artikel, g.artikelnummer, g.artikel_einheit, g.preis_pro_einheit,
       g.komponenten, g.komponenten_namen, g.menge_artikel, g.kosten_chf,
       t.liefertermin, t.bestellen_bis, g.herleitung, g.wege, g.annahme, g.komponenten_nicht_freigegeben
from g
left join lateral lieferant_bestelltermin(g.lieferant_id, g.liefern_bis) t on true;

comment on view public.einkauf_artikel is 'Einkaufsliste: pro Bezug, Lieferant und Artikel die Menge aus beiden Wegen (Rezept und Hauptartikel). Eine unvollständige Menge oder Summe ist leer.';

-- 5. Summe pro Saison --------------------------------------------------------------------------------------
-- Kosten nur über Positionen mit Kosten; die Zahl der Positionen ohne Kosten steht daneben.
-- positionen_artikel zählt beide Wege (Rezept und Hauptartikel). bestellen_bis ist Ortszeit (Europe/Zurich) ohne Zeitzone.
create view public.einkauf_summe with (security_invoker = true) as
select s.id as saison_id, s.name as saison,
       count(p.komponente_id) filter (where p.typ in ('artikel', 'rezept')) as positionen_artikel,
       count(p.komponente_id) filter (where p.typ in ('artikel', 'rezept') and p.kosten_chf is null) as positionen_artikel_ohne_kosten,
       count(p.komponente_id) filter (where p.typ = 'zukauf') as positionen_zukauf,
       count(p.komponente_id) filter (where p.typ = 'offen') as positionen_offen,
       count(p.komponente_id) filter (where p.quelle = 'vorschlag_neu') as positionen_nicht_im_plan,
       sum(p.kosten_chf) filter (where p.typ in ('artikel', 'rezept')) as kosten_chf,
       (select min(a.bestellen_bis) from einkauf_artikel a
        where a.saison_id = s.id and a.bestellen_bis >= (now() at time zone 'Europe/Zurich')) as naechster_bestellschluss,
       (select count(distinct a.bestellen_bis) from einkauf_artikel a
        where a.saison_id = s.id and a.bestellen_bis < (now() at time zone 'Europe/Zurich')) as bestellschluesse_vorbei,
       coalesce(bool_or(p.quelle = 'vorschlag'), false) as aus_vorschlag,
       count(p.komponente_id) filter (where p.typ = 'rezept') as positionen_rezept,
       count(p.komponente_id) filter (where p.typ = 'rezept' and (p.zutaten_ohne_artikel > 0 or p.zutaten_ohne_menge > 0)) as positionen_rezept_unvollstaendig,
       count(p.komponente_id) filter (where p.typ = 'rezept' and p.rezept_status <> 'freigegeben') as positionen_rezept_nicht_freigegeben
from saison s
left join einkauf_position p on p.saison_id = s.id
group by s.id, s.name;

grant select on public.einkauf_bedarf, public.einkauf_zutat, public.einkauf_position, public.einkauf_artikel, public.einkauf_summe to authenticated;
