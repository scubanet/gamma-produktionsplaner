-- Lagerung: «Economat» ersetzt «gedeckt» (Entscheid Dominik, 14.11.2026).
--
-- Economat = Trockenlager, bis höchstens +18 °C (Spalte lager_trocken aus Migration 27).
-- «gedeckt» wird in der App nicht mehr erfasst; es war bei keiner Komponente gesetzt.
-- Damit fällt der rote Prüfhinweis «Freeze'n'go ohne gedecktes Kühlen» weg (er hing an «gedeckt», 17 Komponenten).
-- Die Spalte lager_gedeckt bleibt in der Tabelle stehen: Sie zu löschen hiesse, neun abhängige Views neu aufzubauen.

comment on column public.komponente.lager_gedeckt is 'Nicht mehr verwendet (seit 14.11.2026 durch Economat ersetzt).';
comment on column public.komponente.lager_trocken is 'Lagerung im Economat: trocken, bis höchstens +18 °C. Schliesst 0–2 °C und TK aus.';

create or replace view public.komponente_pruefhinweis with (security_invoker = true) as
select k.id as komponente_id, k.kategorie, k.name, r.code, r.farbe, r.text
from public.komponente_zuteilung k
join public.pruefregel r on
     (r.code = 'lagerung_ohne_kuehlung' and coalesce(k.lager_tage, 0) > 3 and not (k.lager_0_2 or k.lager_tk or k.lager_trocken))
  or (r.code = 'lange_haltbarkeit_ohne_tk' and k.haltbarkeit_tage >= 21 and not k.lager_tk);

delete from public.pruefregel where code = 'fng_ohne_gedeckt';
update public.pruefregel
   set text = 'Lagerung über 3 Tage ohne 0 bis 2 °C, TK oder Economat'
 where code = 'lagerung_ohne_kuehlung';
