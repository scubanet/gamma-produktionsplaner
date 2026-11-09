# Supabase – Pilot-Datenbank

Stand: 09.11.2026

| | |
| --- | --- |
| Projekt | Gamma (`oqmtocxemtcsvtzmswwx`), Organisation Weckherlin |
| Region | Central Europe (Zürich), `eu-central-2` |
| API-URL | https://oqmtocxemtcsvtzmswwx.supabase.co |
| Zweck | Pilot Winter 2026/27. Danach Umzug auf einen eigenen Server von GAMMA (selbst gehostetes Supabase). |

## Aufbau

- `supabase/migrations/` ist die massgebende Quelle für das Schema. `db/*.sql` bleibt als Archiv des Proof of Concept.
- Alle Tabellen haben Row Level Security. Im Pilot dürfen angemeldete Benutzer alles lesen und schreiben (`pilot_angemeldet`), anonyme Zugriffe nichts. Rollen pro Abteilung folgen.
- Import-Funktionen liegen im Schema `importer` und sind über die API nicht erreichbar.
- Nur Standard-PostgreSQL und offene Supabase-Funktionen, damit der Umzug auf den GAMMA-Server ohne Umbau geht.

| Migration | Inhalt |
| --- | --- |
| 01 basisschema | Rezepte, Zutaten, Schritte, Artikel, Geräte (PoC) |
| 02 kostenmodell | Löhne, Energie, Fixkosten, Anlass, Deckungsbeitrag |
| 03 gamma_katalog_planung | Katalog, Systemzuteilung, Prüfregeln, Verkauf/Quantum, Saison, Services, Menülinien, Karten, Wellen, Views |
| 04 stammdaten_importer | Produktionssysteme, Quantumtabelle, Betriebe, Kategorien, Saison und 5 Anlässe, Import-Funktionen |
| 05 rezept_importer | Import der Rezeptbibliothek |
| 06 fk_indizes | Indizes auf Fremdschlüsseln |

## Importiert

| Quelle | Bereich | Anzahl |
| --- | --- | --- |
| Systemzuteilung Winter Collection 2026/27 | Preisliste | 669 Artikel (670 Zeilen, 1 Doppeleintrag) |
| | Komponenten | 493 (310 ok, 130 offen, 53 Zukauf) |
| | Gerichte | 300, mit 696 Gericht-Komponenten (alle Verweise aufgelöst) |
| | Blatt Spengler Cup | 6 Menülinien, 11 Spiele à 550 Gäste, 128 Gerichte, 344 Komponentenzeilen |
| F&B Spengler Cup 2026 | Barkarte Loft 23 | 64 Positionen |
| Verkaufstool Gamma TEST | Quantumtabelle, Faktoren, Warenkosten-Schätzung | 40 Werte, 2 Betriebe, 16 Kategorien |
| rezepte.json | Rezeptbibliothek | 14 Rezepte, 163 Zutaten, 96 Schritte |

Manuell zugeordnet beim Import (Menütext → Katalog):

- «Blumenkohlcrèmesuppe mit Kräuteröl» → GW070 Blumenkohlcrèmesuppe (automatisch wäre GW069 gewählt worden)
- «Klassische Crèmeschnitte» → Dessert «Cremeschnitte»

Prüfen: «Geräucherter Saibling mit Couscous und Gurke» → GW054, «Waffeln mit Honig» → «Waffeln, Bündner-Nusstortenfüllung, Rahm», «Bündner Nusstorte» → GW191 Engadiner Nusstorte. Die Zuordnung folgt den Komponentenzeilen, auf die das Blatt Spengler Cup verweist.

## Berechnungen (Views)

- `komponente_zuteilung`: Status und Haltbarkeit wie Spalten AA und AM der Systemzuteilung
- `komponente_pruefhinweis`: die drei Prüfregeln aus dem Blatt Legende
- `wellen_anzahl(saison, haltbarkeit)`: Produktionswellen wie Hilfstabelle im Blatt Produktionsplan
- `anlass_komponente_bedarf`: Gäste × Anteil × Menge pro Gast
- `produktionsliste`: Menge, Haltbarkeit, Wellen, Start pro Komponente und Saison
- `gericht_warenkosten`: Hauptartikel × Menge pro Portion + Zuschlag 20 %

## Erneut importieren

`supabase/import/tools/parse.py` und `parse2.py` lesen die Excel und erzeugen die Dateien `supabase/import/0*.sql`. Diese rufen die Funktionen im Schema `importer` auf. Bestehende Zeilen werden nicht doppelt angelegt.
