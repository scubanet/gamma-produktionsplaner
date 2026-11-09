-- Stammdaten aus den GAMMA-Excel und Import-Funktionen

insert into einstellung (schluessel, wert, bemerkung) values
  ('wk_zuschlag', 0.20, 'Zuschlag für Saucen, Garnitur, Fett, Gewürze und Garverlust, solange keine Rezepte vorliegen. Annahme GP, mit Gamma klären');

insert into produktionssystem (code, name, haltbarkeit_tage, reihenfolge, bemerkung) values
  ('FNG',    'Freeze''n''go, gedeckt gekühlt', 3,   1, 'Einheit in Vorlage unklar (Tage oder Monate), klären'),
  ('SF',     'Schockfrosten',                 180, 2, 'Legende 6 bis 12 Monate, gerechnet mit 6 Monaten'),
  ('SV',     'Sous-vide',                     21,  3, '21 Tage nur mit Laboranalyse'),
  ('Past.',  'Pasteurisieren',                21,  4, '21 Tage nur mit Laboranalyse'),
  ('HF',     'Hot-Fill',                      21,  5, '21 Tage nur mit Laboranalyse'),
  ('NTG',    'Niedertemperaturgaren',         3,   6, 'Annahme gedeckt gekühlt 0 bis 2 °C, Marco prüft'),
  ('ÜNG',    'Übernachtgaren',                3,   7, 'Annahme gedeckt gekühlt 0 bis 2 °C, Marco prüft'),
  ('Minute', 'à la minute vor Ort',           0,   8, 'keine Vorproduktion in Hünenberg'),
  ('TK',     'Tiefkühllagerung (nach jeder Produktion)', 180, 9, 'TK übersteuert die Produktion');

insert into regenerationsart (code, name, reihenfolge) values
  ('BS', 'Bankettsystem', 1), ('Steamer', 'Steamer inkl. Drucksteamer', 2), ('Grill', 'Grill inkl. Griddel', 3),
  ('Herd', 'Herd', 4), ('Salamander', 'Salamander', 5), ('SV', 'Sous-vide-Bad', 6),
  ('Fritteuse', 'Fritteuse', 7), ('Auftauen', 'Auftauen', 8);

insert into pruefregel (code, farbe, text) values
  ('fng_ohne_gedeckt',          'rot',  'Freeze''n''go ohne gedecktes Kühlen'),
  ('lagerung_ohne_kuehlung',    'rot',  'Lagerung über 3 Tage ohne 0 bis 2 °C oder TK'),
  ('lange_haltbarkeit_ohne_tk', 'gelb', '21 Tage und mehr ohne TK: nur mit Laboranalyse');

insert into betrieb (code, name, faktor_vk, quelle) values
  ('catering',       'Catering',       3.5, 'Angabe Philipp 05.11.2026'),
  ('theater_casino', 'Theater Casino', 4.0, 'Angabe Philipp 05.11.2026');

insert into angebotsform (code, name, reihenfolge) values
  ('menue_3', '3-Gang-Menü', 1), ('buffet', 'Buffet', 2), ('live_station', 'Live Station', 3), ('flying_dinner', 'Flying Dinner', 4);

insert into mengentyp (code, einheit, reihenfolge) values
  ('Vorspeise', 'g', 1), ('Suppe', 'ml', 2), ('Hauptgang Fleisch und Fisch', 'g', 3), ('Hauptgang Vegi und Pasta', 'g', 4),
  ('Beilage', 'g', 5), ('Gemüse', 'g', 6), ('Sauce', 'ml', 7), ('Dessert', 'g', 8), ('Brot', 'g', 9), ('Spezialität', 'g', 10);

-- Quantumtabelle Gamma, Mittelwerte (Verkaufstool, Blatt Annahmen)
insert into quantum (angebotsform, mengentyp, menge_pro_gast)
select a, m, v from (values
  ('Vorspeise', 110, 250, 150, 40), ('Suppe', 200, 150, 150, 50),
  ('Hauptgang Fleisch und Fisch', 170, 225, 150, 80), ('Hauptgang Vegi und Pasta', 250, 175, 200, 80),
  ('Beilage', 130, 110, 110, 45), ('Gemüse', 80, 70, 70, 40), ('Sauce', 75, 75, 75, 30),
  ('Dessert', 130, 100, 100, 30), ('Brot', 80, 90, 80, 0), ('Spezialität', 50, 80, 80, 30)
) t(m, menue_3, buffet, live_station, flying_dinner)
cross join lateral (values ('menue_3', menue_3), ('buffet', buffet), ('live_station', live_station), ('flying_dinner', flying_dinner)) q(a, v);

-- Kategorien = Blätter der Systemzuteilung, Warenkosten-Schätzung pro kg aus dem Verkaufstool
insert into kategorie (code, reihenfolge, wk_chf_pro_kg_schaetzung) values
  ('Basiskomponenten', 0, null), ('Special_Livestation', 1, 35), ('Brot & Butter', 2, 6), ('Salat', 3, 7),
  ('Kalte Vegi Vorspeise', 4, 12), ('Kalte Fleischvorspeise', 5, 35), ('Kalte Fischvorspeise', 6, 40),
  ('Terrine_Pastete', 7, 30), ('Suppe', 8, 3), ('Vegi Hauptgang', 9, 9), ('Fleisch', 10, 30), ('Fisch', 11, 38),
  ('Pasta', 12, 6), ('Stärkebeilage', 13, 3), ('Gemüse', 14, 5), ('Sauce', 15, 6), ('Dessert', 16, 10);

insert into kollektion (name, stand) values ('Winter Collection 2026/27', '2026-11-02');

insert into saison (name, kollektion_id, produktion_ab)
select 'Winter 2026/27', id, '2026-10-19' from kollektion where name = 'Winter Collection 2026/27';

insert into anlass (nummer, name, saison_id, ort, datum, datum_bis, vorlauf_tage, gaeste, serviceart, betrieb, angebotsform, status, bemerkung)
select v.nummer, v.name, s.id, v.ort, v.von::date, v.bis::date, 1, v.gaeste, v.serviceart, v.betrieb, v.angebotsform, 'bestaetigt', v.bem
from saison s, (values
  ('W-2026-01', 'Spengler Cup',        'Davos',      '2026-12-26', '2026-12-31', 550,  'buffet', 'catering', 'buffet', '6 Turniertage, 11 Spiele à 550 Gäste, Final 31.12. um 12 Uhr. Anlieferung über Weihnachten klären.'),
  ('W-2027-01', 'Snow Polo World Cup', 'St. Moritz', '2027-01-22', '2027-01-24', null, null, 'catering', null, null),
  ('W-2027-02', 'White Turf 1',        'St. Moritz', '2027-02-06', '2027-02-07', null, null, 'catering', null, 'Sa Family Day, So Rennsonntag'),
  ('W-2027-03', 'White Turf 2',        'St. Moritz', '2027-02-13', '2027-02-14', null, null, 'catering', null, 'Sa Family Day, So Rennsonntag'),
  ('W-2027-04', 'White Turf 3',        'St. Moritz', '2027-02-20', '2027-02-21', null, null, 'catering', null, 'Sa Family Day, So Rennsonntag')
) v(nummer, name, ort, von, bis, gaeste, serviceart, betrieb, angebotsform, bem)
where s.name = 'Winter 2026/27';

-- Import-Funktionen (nur für Admin/Service, nicht über die API erreichbar) -----------------
create schema importer;
revoke all on schema importer from public, anon, authenticated;

-- Preisliste: [[Artikeltext, Einheit, Preis, Artikelnummer, 'D'|'S'], …]
create function importer.artikel(d jsonb, p_stand date)
returns int language plpgsql set search_path = public as $$
declare n int;
begin
  insert into artikel (name, einheit, preis_pro_einheit, artikelnummer, preisquelle, gebinde_g, preis_chf)
  select distinct on (e->>0, coalesce(e->>1, ''))
    e->>0, e->>1, (e->>2)::numeric, e->>3,
    case e->>4 when 'S' then 'Spezialpreis Fleisch' else 'Durchschnittspreis' end,
    case when e->>1 in ('kg', 'l') then 1000 end,
    case when e->>1 in ('kg', 'l') then (e->>2)::numeric end
  from jsonb_array_elements(d) e
  on conflict (name, coalesce(einheit, '')) do update
    set preis_pro_einheit = excluded.preis_pro_einheit, artikelnummer = excluded.artikelnummer,
        preisquelle = excluded.preisquelle, gebinde_g = excluded.gebinde_g, preis_chf = excluded.preis_chf;
  get diagnostics n = row_count;
  insert into artikel_preis (artikel_id, gueltig_ab, preis_pro_einheit, quelle)
  select id, p_stand, preis_pro_einheit, preisquelle from artikel where preis_pro_einheit is not null
  on conflict (artikel_id, gueltig_ab) do update set preis_pro_einheit = excluded.preis_pro_einheit;
  return n;
end $$;

-- Systemzuteilung, kompakt: meta (Blätter, Bemerkungen, Gänge, Mengentypen), K (Komponenten), G (Gerichte), L (Gericht→Komponente)
-- K: [blatt, zeile, name, cf, produktion_bits, lager_bits, tage, regeneration_bits, bemerkung_idx, 'Artikel | Einheit']
-- G: [blatt, zeile, name, gang_idx, mengentyp_idx]
-- L: [blatt, gericht_zeile, pos, verweis_blatt|null, komponente_zeile, menge_pro_portion]
create function importer.katalog_teil(p_kollektion uuid, meta jsonb, teil text, d jsonb)
returns int language plpgsql set search_path = public as $$
declare n int;
  pr text[] := array['FNG','SF','SV','Past.','HF','NTG','ÜNG','Minute'];
  rg text[] := array['BS','Steamer','Grill','Herd','Salamander','SV','Fritteuse','Auftauen'];
begin
  if teil = 'K' then
    insert into komponente (kollektion_id, kategorie, quelle_zeile, name, cf_stufe, produktion, lager_0_2, lager_tk, lager_gedeckt,
                            lager_tage, regeneration, bemerkung, hauptartikel_id)
    select p_kollektion, meta->'sheets'->>((e->>0)::int), (e->>1)::int, e->>2, (e->>3)::smallint,
      array(select pr[i] from generate_series(1, 8) i where ((e->>4)::int >> (i - 1)) & 1 = 1),
      ((e->>5)::int & 1) = 1, ((e->>5)::int & 2) = 2, ((e->>5)::int & 4) = 4,
      (e->>6)::int,
      array(select rg[i] from generate_series(1, 8) i where ((e->>7)::int >> (i - 1)) & 1 = 1),
      meta->'bem'->>((e->>8)::int),
      (select a.id from artikel a where e->>9 is not null
         and a.name = split_part(e->>9, ' | ', 1) and coalesce(a.einheit, '') = split_part(e->>9, ' | ', 2) limit 1)
    from jsonb_array_elements(d) e
    on conflict (kollektion_id, kategorie, quelle_zeile) do nothing;
  elsif teil = 'G' then
    insert into gericht_katalog (kollektion_id, kategorie, quelle_zeile, name, code, gang, mengentyp)
    select p_kollektion, meta->'sheets'->>((e->>0)::int), (e->>1)::int, e->>2,
      substring(e->>2 from '^((?:GW|SC)\d+)\s'),
      meta->'gang'->>((e->>3)::int), meta->'mt'->>((e->>4)::int)
    from jsonb_array_elements(d) e
    on conflict (kollektion_id, kategorie, quelle_zeile) do nothing;
  elsif teil = 'L' then
    insert into gericht_komponente (gericht_id, reihenfolge, komponente_id, bezeichnung, verweis_kategorie, menge_pro_portion)
    select g.id, (e->>2)::int, k.id, k.name, meta->'sheets'->>((e->>3)::int), (e->>5)::numeric
    from jsonb_array_elements(d) e
    join gericht_katalog g on g.kollektion_id = p_kollektion
      and g.kategorie = meta->'sheets'->>((e->>0)::int) and g.quelle_zeile = (e->>1)::int
    join komponente k on k.kollektion_id = p_kollektion
      and k.kategorie = coalesce(meta->'sheets'->>((e->>3)::int), meta->'sheets'->>((e->>0)::int))
      and k.quelle_zeile = (e->>4)::int
    on conflict (gericht_id, reihenfolge) do nothing;
  end if;
  get diagnostics n = row_count;
  return n;
end $$;

-- Menülinien eines Anlasses (Blatt Spengler Cup)
-- services: [[service_name, linie_name, reihenfolge], …]
-- zeilen:   [[linie, gang, gericht_text, anteil, komponente, menge, einheit, blatt, zeile, gericht_blatt|null, gericht_zeile|null], …]
create function importer.menuelinien(p_anlass text, p_gaeste int, services jsonb, zeilen jsonb)
returns int language plpgsql set search_path = public as $$
declare a uuid; kol uuid; n int;
begin
  select an.id, s.kollektion_id into a, kol from anlass an join saison s on s.id = an.saison_id where an.nummer = p_anlass;
  insert into menuelinie (anlass_id, name, reihenfolge)
  select a, e->>1, min((e->>2)::int) from jsonb_array_elements(services) e
  group by e->>1 on conflict do nothing;
  insert into service (anlass_id, menuelinie_id, name, gaeste, reihenfolge)
  select a, (select id from menuelinie where anlass_id = a and name = e->>1), e->>0, p_gaeste, (e->>2)::int
  from jsonb_array_elements(services) e on conflict do nothing;
  insert into menuelinie_gericht (menuelinie_id, gang, bezeichnung, gericht_id, anteil, reihenfolge)
  select l.id, x.gang, x.txt, g.id, x.anteil, x.o
  from (select e->>0 as linie, e->>1 as gang, e->>2 as txt, (e->>3)::numeric as anteil, e->>9 as gb, (e->>10)::int as gz,
               min(ord) as o
        from jsonb_array_elements(zeilen) with ordinality t(e, ord)
        group by 1, 2, 3, 4, 5, 6) x
  join menuelinie l on l.anlass_id = a and l.name = x.linie
  left join gericht_katalog g on g.kollektion_id = kol and g.kategorie = x.gb and g.quelle_zeile = x.gz;
  insert into menuelinie_komponente (linie_gericht_id, komponente_id, bezeichnung, menge_pro_gast, einheit, reihenfolge)
  select mg.id, k.id, e->>4, (e->>5)::numeric, e->>6, ord
  from jsonb_array_elements(zeilen) with ordinality t(e, ord)
  join menuelinie l on l.anlass_id = a and l.name = e->>0
  join menuelinie_gericht mg on mg.menuelinie_id = l.id and mg.bezeichnung = e->>2 and mg.gang = e->>1
  left join komponente k on k.kollektion_id = kol and k.kategorie = e->>7 and k.quelle_zeile = (e->>8)::int;
  get diagnostics n = row_count;
  return n;
end $$;

-- Getränke- und Barkarten: [[karte, rubrik, name, menge, preis], …]
create function importer.karten(p_anlass text, d jsonb)
returns int language plpgsql set search_path = public as $$
declare a uuid; n int;
begin
  select id into a from anlass where nummer = p_anlass;
  insert into karte (anlass_id, name)
  select distinct a, e->>0 from jsonb_array_elements(d) e
  where not exists (select 1 from karte where anlass_id = a and name = e->>0);
  insert into karte_position (karte_id, rubrik, name, menge, preis_chf, reihenfolge)
  select (select id from karte where anlass_id = a and name = e->>0), e->>1, e->>2, e->>3, (e->>4)::numeric, ord
  from jsonb_array_elements(d) with ordinality t(e, ord);
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on all functions in schema importer from public, anon, authenticated;
