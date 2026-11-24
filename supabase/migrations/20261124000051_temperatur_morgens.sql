-- Temperaturkontrolle: eine Messung pro Tag, am Morgen (24.11.2026).
-- Entscheid Dominik (24.11.2026): gemessen wird nur am Morgen. Ersetzt die Annahme «2 Messungen pro Tag» aus Migration 50.
alter table public.kuehlstelle alter column messungen_pro_tag set default 1;
comment on column public.kuehlstelle.messungen_pro_tag is 'Soll-Anzahl Messungen pro Tag. Standard 1 (am Morgen, Entscheid Dominik 24.11.2026), pro Kühlstelle übersteuerbar.';
update public.kuehlstelle set messungen_pro_tag = 1 where messungen_pro_tag = 2;
