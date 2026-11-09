-- Fehlende Indizes auf Fremdschlüsseln (Supabase Advisor)
create index on anlass (angebotsform);
create index on anlass (betrieb);
create index on gericht_katalog (kategorie);
create index on gericht_komponente (verweis_kategorie);
create index on komponente (kategorie);
create index on quantum (mengentyp);
create index on saison (kollektion_id);
