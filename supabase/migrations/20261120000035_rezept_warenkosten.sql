-- Warenkosten pro Rezept (20.11.2026, Plan Datenkette, Aufgabe 4, Grundlage).
-- Summe der Zutaten × Artikelpreis inklusive Verlust des Artikels, Unterrezepte aufgelöst, pro Charge und pro Kilogramm.
-- Gleiche Umrechnung wie im Einkauf (einkauf_zutat, Migration 34): nur Artikel in kg, Liter oder Gramm.
-- Entscheid Dominik (20.11.2026): Der Zuschlag von 20 % (wk_zuschlag) entfällt beim Weg über das Rezept.
-- Eine unvollständige Summe ist leer: fehlt einer Zutat der Artikel, der Preis oder eine umrechenbare Einheit, gibt es keine Kosten.
-- Die ältere View rezept_kosten_waren (Migration 02) summiert nur die verknüpften Zutaten und bleibt für die Rezeptkarte bestehen.
create view public.rezept_warenkosten with (security_invoker = true) as
with recursive baum as (
  select r.id as wurzel_id, r.id as rezept_id, 1::numeric as faktor, 1 as tiefe
  from rezept r
  union all
  -- zutat.komponente_id zeigt auf ein Rezept (Unterrezept): Anteil = Menge der Zutat ÷ Ergibt-Menge des Unterrezepts.
  select t.wurzel_id, z.komponente_id,
         t.faktor * z.menge_g / nullif(case when r.typ = 'gericht' then r.basis_portionen * r.portion_g else r.ergibt_g end, 0),
         t.tiefe + 1
  from baum t
  join zutatengruppe g on g.rezept_id = t.rezept_id
  join zutat z on z.gruppe_id = g.id and z.komponente_id is not null
  join rezept r on r.id = z.komponente_id
  where t.tiefe < 5
), z as (
  select t.wurzel_id, r.status as zutat_rezept_status, zt.annahme as zutat_annahme, a.einheit,
         case
           when a.einheit in ('kg', 'Liter', 'l') then zt.menge_g * t.faktor / 1000 * (1 + coalesce(a.verlust_pct, 0) / 100) * a.preis_pro_einheit
           when a.einheit = 'Gramm' then zt.menge_g * t.faktor * (1 + coalesce(a.verlust_pct, 0) / 100) * a.preis_pro_einheit
         end as chf
  from baum t
  join rezept r on r.id = t.rezept_id
  join zutatengruppe g on g.rezept_id = t.rezept_id
  join zutat zt on zt.gruppe_id = g.id and zt.komponente_id is null
  left join artikel a on a.id = zt.artikel_id
), s as (
  select wurzel_id,
         count(*)::int as zutaten,
         count(*) filter (where chf is null)::int as zutaten_ohne_kosten,
         case when count(*) filter (where chf is null) = 0 then sum(chf) end as waren_chf,
         coalesce(bool_or(zutat_annahme or einheit in ('Liter', 'l')), false) as annahme,
         count(*) filter (where zutat_rezept_status <> 'freigegeben')::int as zutaten_nicht_freigegeben
  from z
  group by wurzel_id
), e as (
  select r.id, r.name, r.status, r.ergibt_annahme,
         case when r.typ = 'gericht' then r.basis_portionen * r.portion_g else r.ergibt_g end as ergibt_g
  from rezept r
)
select e.id as rezept_id, e.name, e.status,
       coalesce(s.zutaten, 0) as zutaten,
       coalesce(s.zutaten_ohne_kosten, 0) as zutaten_ohne_kosten,
       round(s.waren_chf, 2) as waren_chf,
       e.ergibt_g,
       -- Vier Stellen: Der Wert wird mit Mengen in kg weitergerechnet (Anlass), zwei Stellen gäben dort Rundungsfehler.
       round(s.waren_chf / nullif(e.ergibt_g, 0) * 1000, 4) as chf_pro_kg,
       -- Annahme: Rezept oder ein Unterrezept nicht freigegeben, Ergibt-Menge oder Zutatenmenge als Annahme vermerkt, Liter als Kilogramm gerechnet.
       (coalesce(s.annahme, false) or e.status <> 'freigegeben' or coalesce(s.zutaten_nicht_freigegeben, 0) > 0 or e.ergibt_annahme) as annahme,
       case
         when coalesce(s.zutaten, 0) = 0 then 'keine Zutaten'
         when s.zutaten_ohne_kosten > 0 then s.zutaten_ohne_kosten || ' von ' || s.zutaten || ' Zutaten ohne Artikel, Preis oder umrechenbare Einheit: Kosten [Preis]'
         else s.zutaten || ' Zutaten × Artikelpreis = CHF ' || to_char(round(s.waren_chf, 2), 'FM999999990.00') || ' je Charge'
              || coalesce(' ÷ ' || trim_scale(e.ergibt_g) || ' g = CHF ' || trim_scale(round(s.waren_chf / nullif(e.ergibt_g, 0) * 1000, 4)) || ' / kg', '; Ergibt-Menge [Menge]')
              || ' (ohne Zuschlag)'
       end as herleitung
from e
left join s on s.wurzel_id = e.id;

comment on view public.rezept_warenkosten is 'Warenkosten pro Rezept: Zutaten × Artikelpreis inkl. Verlust, Unterrezepte aufgelöst, je Charge und je kg, ohne Zuschlag. Leer, solange eine Zutat keine Kosten hat.';

grant select on public.rezept_warenkosten to authenticated;
