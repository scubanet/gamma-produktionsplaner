-- Produktionssystem «Frisch»: frische Produkte, die nur gekühlt werden (Entscheid Dominik, 18.11.2026).
--
-- Beispiele: Thonsauce für Vitello, Salatsauce. Bisher gab es dafür kein System, die Komponente blieb «offen».
-- Standard 3 Tage wie die anderen gekühlten Systeme (FNG, NTG, ÜNG); pro Komponente übersteuerbar mit «Lagerung Tage».
-- Reihenfolge: vor «Minute» und «TK».

update public.produktionssystem set reihenfolge = reihenfolge + 1 where code in ('Minute', 'TK');

insert into public.produktionssystem (code, name, haltbarkeit_tage, reihenfolge, bemerkung) values
  ('Frisch', 'Frisch, nur gekühlt 0 bis 2 °C', 3, 8, 'nicht aus der Excel: Annahme Dominik 18.11.2026, pro Komponente mit Lagerung Tage anpassen');
