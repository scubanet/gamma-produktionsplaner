-- Lagerung «trocken, bis 18 °C» und Regeneration «Kombi-Steamer» (Wunsch Dominik, 14.11.2026).
--
-- 1. EcoNoma-Produkte lagern ungekühlt: trocken und bis höchstens +18 °C. Neue Lagerart neben 0–2 °C und TK.
--    Annahme: trocken schliesst 0–2 °C und TK aus (eine Komponente liegt nicht gleichzeitig im Trockenlager und im Kühlraum).
--    Annahme: Der rote Prüfhinweis «Lagerung über 3 Tage ohne Kühlung» gilt nicht für trocken gelagerte Komponenten.
--    Eine eigene Haltbarkeit für EcoNoma ist nicht hinterlegt: «Lagerung Tage» pro Komponente erfassen.
-- 2. Kombi-Steamer als Regenerationsgerät, direkt nach dem Steamer.

alter table public.komponente
  add column lager_trocken boolean not null default false;
alter table public.komponente
  add constraint komponente_lager_trocken_check check (not (lager_trocken and (lager_0_2 or lager_tk)));

comment on column public.komponente.lager_trocken is 'Lagerung trocken, bis höchstens +18 °C (z.B. EcoNoma). Schliesst 0–2 °C und TK aus.';

-- View: gleiche Spalten wie bisher, lager_trocken am Schluss (create or replace erlaubt nur neue Spalten am Ende).
create or replace view public.komponente_zuteilung with (security_invoker = true) as
select k.id, k.kollektion_id, k.kategorie, k.quelle_zeile, k.name, k.cf_stufe, k.produktion,
  k.lager_0_2, k.lager_tk, k.lager_gedeckt, k.lager_tage, k.regeneration, k.bemerkung, k.hauptartikel_id, k.rezept_id,
  case
    when k.cf_stufe in (4, 5) then 'Zukauf'
    when cardinality(k.produktion) = 0 then 'offen'
    else 'ok'
  end as status,
  case
    when k.cf_stufe in (4, 5) then null
    when coalesce(k.lager_tage, 0) > 0 then k.lager_tage
    when k.lager_tk then (select haltbarkeit_tage from public.produktionssystem where code = 'TK')
    else nullif((select max(p.haltbarkeit_tage) from public.produktionssystem p
                 where p.code = any (k.produktion) and p.code <> 'Minute'), 0)
  end as haltbarkeit_tage,
  (k.produktion = array['Minute']) as nur_vor_ort,
  k.lager_trocken
from public.komponente k;

create or replace view public.komponente_pruefhinweis with (security_invoker = true) as
select k.id as komponente_id, k.kategorie, k.name, r.code, r.farbe, r.text
from public.komponente_zuteilung k
join public.pruefregel r on
     (r.code = 'fng_ohne_gedeckt' and 'FNG' = any (k.produktion) and not k.lager_gedeckt)
  or (r.code = 'lagerung_ohne_kuehlung' and coalesce(k.lager_tage, 0) > 3 and not (k.lager_0_2 or k.lager_tk or k.lager_trocken))
  or (r.code = 'lange_haltbarkeit_ohne_tk' and k.haltbarkeit_tage >= 21 and not k.lager_tk);

update public.pruefregel
   set text = 'Lagerung über 3 Tage ohne 0 bis 2 °C, TK oder trocken bis 18 °C'
 where code = 'lagerung_ohne_kuehlung';

-- Kombi-Steamer nach dem Steamer einreihen.
update public.regenerationsart set reihenfolge = reihenfolge + 1 where reihenfolge >= 3;
insert into public.regenerationsart (code, name, reihenfolge) values ('Kombi-Steamer', 'Kombi-Steamer', 3);
