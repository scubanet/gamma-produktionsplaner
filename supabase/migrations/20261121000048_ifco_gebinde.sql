-- IFCO-Kisten als Gebinde (21.11.2026). Auftrag Dominik: alle zehn Typen aus dem Datenblatt eintragen.
-- Quelle: Datenblatt «Black Lift Lock (Europe)», IFCO-DS1003-CH-DE, 02/2022 (IFCO SYSTEMS (Schweiz) GmbH).
-- Länge, Breite, Höhe = Aussenmass. Das Volumen steht nicht im Datenblatt und bleibt leer (nicht geschätzt).
-- Temperaturbereich laut Datenblatt: −10 °C bis +60 °C.
--
-- Der bisherige Eintrag «IFCO-Box» (ohne Typ, ohne Tara) bleibt unverändert: an ihm hängen die Rezepte.
-- Weil es jetzt mehrere aktive Gebinde gibt, verlangt kiste_erstellen die Wahl des Gebindes.

alter table public.gebinde add column max_beladung_kg numeric(6,2) check (max_beladung_kg > 0);
comment on column public.gebinde.max_beladung_kg is 'Höchstbeladung laut Hersteller in kg. Nur Angabe; die App prüft sie nicht.';

insert into public.gebinde (name, laenge_mm, breite_mm, hoehe_mm, tara_g, max_beladung_kg, bemerkung) values
  ('IFCO 400 × 300 × 119 mm (BLL4310)', 400, 300, 119, 840, 5, 'IFCO Black Lift Lock, Typ BLL4310. Innenmass 377 × 272 × 107 mm, Stapelhöhe 110 mm. Tara mit Toleranz ±2 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 400 × 300 × 162 mm (BLL4314)', 400, 300, 162, 985, 7, 'IFCO Black Lift Lock, Typ BLL4314. Innenmass 377 × 272 × 150 mm, Stapelhöhe 153 mm. Tara mit Toleranz ±2 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 400 × 300 × 226 mm (BLL4320)', 400, 300, 226, 1310, 8, 'IFCO Black Lift Lock, Typ BLL4320. Innenmass 377 × 272 × 216 mm, Stapelhöhe 219 mm. Tara mit Toleranz ±2 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 600 × 400 × 93 mm (BLL6408)', 600, 400, 93, 1255, 6, 'IFCO Black Lift Lock, Typ BLL6408. Innenmass 577 × 372 × 83 mm, Stapelhöhe 86 mm. Tara mit Toleranz ±1,5 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 600 × 400 × 117 mm (BLL6410)', 600, 400, 117, 1360, 10, 'IFCO Black Lift Lock, Typ BLL6410. Innenmass 577 × 372 × 107 mm, Stapelhöhe 110 mm. Tara mit Toleranz ±1,5 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 600 × 400 × 152 mm (BLL6413)', 600, 400, 152, 1540, 12, 'IFCO Black Lift Lock, Typ BLL6413. Innenmass 577 × 372 × 141 mm, Stapelhöhe 145 mm. Tara mit Toleranz ±1,5 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 600 × 400 × 184 mm (BLL6416)', 600, 400, 184, 1680, 15, 'IFCO Black Lift Lock, Typ BLL6416. Innenmass 577 × 372 × 174 mm, Stapelhöhe 177 mm. Tara mit Toleranz ±1,5 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 600 × 400 × 199 mm (BLL6418)', 600, 400, 199, 1725, 18, 'IFCO Black Lift Lock, Typ BLL6418. Innenmass 577 × 372 × 189 mm, Stapelhöhe 192 mm. Tara mit Toleranz ±1,5 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 600 × 400 × 216 mm (BLL6420)', 600, 400, 216, 1830, 20, 'IFCO Black Lift Lock, Typ BLL6420. Innenmass 577 × 372 × 206 mm, Stapelhöhe 209 mm. Tara mit Toleranz ±1,5 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.'),
  ('IFCO 600 × 400 × 238 mm (BLL6424)', 600, 400, 238, 2000, 20, 'IFCO Black Lift Lock, Typ BLL6424. Innenmass 577 × 372 × 228 mm, Stapelhöhe 231 mm. Tara mit Toleranz ±1,5 %. Quelle: Datenblatt IFCO-DS1003-CH-DE, 02/2022.');
