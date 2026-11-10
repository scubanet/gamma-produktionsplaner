# Supabase – Pilot-Datenbank

Stand: 10.11.2026

| | |
| --- | --- |
| Projekt | Gamma (`oqmtocxemtcsvtzmswwx`), Organisation Weckherlin |
| Region | Central Europe (Zürich), `eu-central-2` |
| API-URL | https://oqmtocxemtcsvtzmswwx.supabase.co |
| Zweck | Pilot Winter 2026/27. Danach Umzug auf einen eigenen Server von GAMMA (selbst gehostetes Supabase). |
| Umfang | 44 Tabellen, 28 Views, 15 Funktionen, 17 Migrationen |

## Aufbau

- `supabase/migrations/` ist die massgebende Quelle für das Schema. `db/*.sql` bleibt als Archiv des Proof of Concept.
- Alle Tabellen haben Row Level Security. Im Pilot dürfen angemeldete Benutzer alles lesen und schreiben (Policy `pilot_angemeldet`), anonyme Zugriffe nichts. Rollen pro Abteilung folgen.
- Alle Views laufen mit `security_invoker = true`. Funktionen, die die App aufruft, sind nur für `authenticated` freigegeben.
- Import-Funktionen liegen im Schema `importer` und sind über die API nicht erreichbar.
- Nur Standard-PostgreSQL und offene Supabase-Funktionen, damit der Umzug auf den GAMMA-Server ohne Umbau geht.
- Die App rechnet nicht selbst: Mengen, Preise, Termine, Prüfhinweise und Herleitungstexte kommen aus Views und Funktionen.
- Eine unvollständige Zahl wird nie als Total ausgegeben. Fehlt ein Teil (Preis, Lohnsatz, Service-Datum), ist das Ergebnis leer und die App zeigt einen Platzhalter wie `[Preis]` oder `[Menge]`.

## Migrationen

| Migration | Inhalt |
| --- | --- |
| 01 basisschema | Rezepte, Zutaten, Schritte, Artikel, Geräte (PoC) |
| 02 kostenmodell | Löhne, Energie, Fixkosten, Anlass, Kosten pro Anlass |
| 03 gamma_katalog_planung | Katalog, Systemzuteilung, Prüfregeln, Verkauf/Quantum, Saison, Services, Menülinien, Karten, Wellen, Views |
| 04 stammdaten_importer | Produktionssysteme, Quantumtabelle, Betriebe, Kategorien, Saison und 5 Anlässe, Import-Funktionen |
| 05 rezept_importer | Import der Rezeptbibliothek |
| 06 fk_indizes | Indizes auf Fremdschlüsseln |
| 07 komponente_pruefung | Prüfung der Systemzuteilung beim Speichern: Codes gegen die Stammtabellen, TK nur als Lagerung, Lagerung Tage ab 1 |
| 08 rezept_skalierung | Skalierung der Rezeptkarte: `rezept_faktor`, `rezept_zutaten_skaliert`, `rezept_komponenten_skaliert` |
| 09 rezept_skalierung_nachbesserung | Annahme-Felder auf `rezept` (Ergebnis-Menge, Portionen), feinere Rundung, Herleitung der Komponenten-Chargen |
| 10 offerte | Kunde und Offertnummer auf `anlass`, Tabelle `offerte_gericht`, Views `offerte_position` und `offerte_summe` |
| 11 anlass_pflege | Menge pro Gast darf fehlen, `menuelinie_gericht_hinzufuegen`, `offerte_bestaetigen`, `karte_kopieren`, Übersichts-Views |
| 12 wellen_einkauf | `wellen_termine`, Bedarf pro Service, Wellen-Vorschlag und Wellenplan, Lieferant mit Liefertagen, Einkaufs-Views |
| 13 ressourcen_rentabilitaet | `anlass_personal`, `anlass_geraet`, Kalkulation pro Anlass, Monatsergebnis; ersetzt die PoC-Views für den Deckungsbeitrag |
| 14 rezepte_my_recipes | Daten: 171 Rezepte aus dem Paprika-Export «My Recipes» über `importer.rezepte` |
| 15 rezept_pflege | Wertebereiche auf `rezept` und `zutat`, Funktion `rezept_speichern` für die Pflege in der App |
| 16 rezept_name | `rezept_speichern` nimmt auch den Namen; der Slug bleibt unverändert |
| 17 rezept_quelle | `rezept_speichern` nimmt auch die Quelle |

Die Versionen in der Datenbank entsprechen den Dateinamen (`20261109000001` bis `20261110000017`).

### Neue Migration einspielen

1. Datei in `supabase/migrations/` anlegen (Zeitstempel-Präfix).
2. Im Repo-Wurzelordner `supabase db push` ausführen und mit `Y` bestätigen. Im Pilot macht das Dominik im Terminal.
3. Typen neu erzeugen: `cd app && npm run types`, dann `npm run typecheck`. Die Datei `app/lib/database.types.ts` committen.

Eine eingespielte Migration wird nicht mehr geändert. Korrekturen kommen als neue Migration (Beispiel: 09 nach 08).

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
| My Recipes (Paprika-Export, 186 Rezepte) | Rezeptbibliothek | 171 Rezepte, 1761 Zutaten, 626 Schritte |

Manuell zugeordnet beim Import (Menütext → Katalog):

- «Blumenkohlcrèmesuppe mit Kräuteröl» → GW070 Blumenkohlcrèmesuppe (automatisch wäre GW069 gewählt worden)
- «Klassische Crèmeschnitte» → Dessert «Cremeschnitte»

Import «My Recipes» (`supabase/import/tools/paprika.py`, Migration 14):

- Nicht importiert: 12 Rezepte ohne Zutaten und 3, die es schon gab (Sugo, Truffaux, Quiche aux Oignons). Bilder und Bewertungen werden nicht übernommen.
- g und kg genau. ml, dl und l als Gramm (1 ml = 1 g), als Annahme markiert (116 Zutaten). EL, TL, Cup, Bund und Stück ohne Menge, die Originalangabe steht in `zutat.notiz` (911 Zutaten).
- 44 Rezepte mit Portionenzahl sind Gerichte, 127 Komponenten. Portionsgrösse, Ergibt-Menge, Basiszutat, Zeiten und Geräte fehlen und stehen pro Rezept als offener Punkt.
- Notizen und Beschreibung liegen in `rezept.besonderes`, eine Ertragsangabe als Text in `rezept.chargengroesse`. «ß» ist durch «ss» ersetzt.
- Auffällig im Original: «French Dressing 3» mit 400 dl Geflügelbouillon (40 kg).

Prüfen: «Geräucherter Saibling mit Couscous und Gurke» → GW054, «Waffeln mit Honig» → «Waffeln, Bündner-Nusstortenfüllung, Rahm», «Bündner Nusstorte» → GW191 Engadiner Nusstorte. Die Zuordnung folgt den Komponentenzeilen, auf die das Blatt Spengler Cup verweist.

Noch leer (in der App zu erfassen): Lohnsätze, Strompreis, Fixkosten, Lieferanten, Bestand und Mietpreis der Geräte, Datum der 11 Spiele des Spengler Cup. Erst 5 Komponenten haben einen Hauptartikel; keine Zutat und kein Katalog-Gericht ist mit einem Rezept oder Artikel verknüpft. Diese Verknüpfungen macht Dominik von Hand.

## Berechnungen

### Katalog und Systemzuteilung

- `komponente_zuteilung`: Status (offen, ok, Zukauf) und Haltbarkeit wie Spalten AA und AM der Systemzuteilung
- `komponente_pruefhinweis`: die drei Prüfregeln aus dem Blatt Legende (rot, gelb)
- `gericht_warenkosten`: Hauptartikel × Menge pro Portion + Zuschlag (`wk_zuschlag`)

### Rezepte

- `zutat_skaliert`: Skalierungs-Prozent gegen die Basiszutat
- `rezept_zeit`: aktive und unbeaufsichtigte Minuten
- `rezept_faktor(rezept, wert)`: Faktor aus Portionen (Gericht) oder Chargen (Komponente), mit Herleitung
- `rezept_zutaten_skaliert(rezept, wert)`, `rezept_komponenten_skaliert(rezept, wert)`: skalierte Mengen
- `rezept_speichern(rezept, geaendert_am, …)`: speichert Name, Quelle, Typ, Basis, Mengen in Gramm, Basiszutat und erledigte offene Punkte in einem Schritt. Lehnt ab, wenn der geladene Stand (`geaendert_am`) nicht mehr gilt oder ein Typwechsel bestehende Verknüpfungen bricht. Ein Gericht braucht Basisportionen; Mengen sind über 0 oder leer.
- `rezept_kosten_waren`, `rezept_kosten_arbeit_energie`: aus dem PoC; liefern erst Werte, wenn Zutaten mit Artikeln verknüpft und Lohnsätze erfasst sind

### Offerte

- `offerte_position`: pro Gericht Menge pro Gast (Quantum × Anteil), Warenkosten (Artikel, sonst Schätzung CHF/kg der Kategorie), Preis (× Faktor des Betriebs), Herleitung
- `offerte_summe`: Preis pro Gast (gerundet nach `vk_rundung_chf`), Total exkl. MWST, MWST, Warenkosten, Deckungsbeitrag
- `offerte_bestaetigen(anlass, saison)`: macht aus der Offerte einen bestätigten Anlass mit Menülinie «Menü» und einem Service

### Anlass und Produktion

- `anlass_uebersicht`, `menuelinie_gaeste`, `karte_uebersicht`: Zahlen für die Listen
- `menuelinie_gericht_hinzufuegen(linie, gericht, anteil)`: Gericht aus dem Katalog mit seinen Komponenten in eine Menülinie; `karte_kopieren(karte, anlass, name)`
- `anlass_komponente_bedarf`: Gäste × Anteil × Menge pro Gast je Menülinie
- `service_komponente_bedarf`: derselbe Bedarf je Service (mit Datum)
- `produktionsliste`: Menge, Haltbarkeit, Wellen, Start pro Komponente und Saison; `zeilen_ohne_menge` zeigt fehlende Mengen
- `wellen_anzahl(saison, haltbarkeit)`: Anzahl Produktionswellen wie die Hilfstabelle im Blatt Produktionsplan
- `wellen_termine(saison, haltbarkeit)`: die Termine dazu (erste Welle am Tag vor der Anlieferung, danach alle «Haltbarkeit» Tage). Migration 12 prüft beim Einspielen, dass die Anzahl mit `wellen_anzahl` übereinstimmt.
- `wellen_vorschlag`: Komponente × Welle mit Menge nach Service-Datum; `wellenplan_uebernehmen(saison)` speichert ihn in `produktionswelle` und `welle_komponente`
- `wellenplan`: gespeicherter Plan mit Prüfhinweisen (rot, gelb); `wellen_uebersicht`: Zahlen pro Saison

### Einkauf

- `lieferant_bestelltermin(lieferant, liefern_bis)`: letzter Liefertag bis zum Datum und Bestellschluss dafür
- `wellen_aktuell`: Datum aus dem Plan, Menge immer aktuell aus dem Vorschlag
- `einkauf_position`: Bedarf pro Welle bzw. Anlass und Komponente, mit Hauptartikel, Menge, Kosten, Liefertermin und Bestellschluss
- `einkauf_artikel`: Einkaufsliste nach Lieferant und Artikel; `einkauf_summe`: Zahlen pro Saison

### Ressourcen und Rentabilität

- `anlass_personal_kosten`: Stunden × Lohnsatz der Rolle am Anlassdatum; Freelancer als Zusatzbedarf
- `geraet_zuteilung()`, `anlass_geraet_bedarf`: eigener Bestand gegen den Bedarf gleichzeitiger Anlässe, Zusatzbedarf Miete und Mietkosten
- `anlass_kostenart`: pro Kostenart berechnet, Plan von Hand, Ist; `anlass_kosten_setzen(anlass, art, plan, ist)` schreibt Plan und Ist
- `anlass_kalkulation`: Umsatz, variable Kosten, Deckungsbeitrag, Fixkosten-Anteil, Ergebnis pro Anlass
- `anlass_deckungsbeitrag`, `monat_ergebnis`: Deckungsbeitrag pro Anlass und Monatsergebnis mit Break-even

## Einstellungen (Tabelle `einstellung`)

| Schlüssel | Wert | Bedeutung |
| --- | --- | --- |
| `wk_zuschlag` | 0.20 | Zuschlag auf die Warenkosten, solange keine Rezepte vorliegen (Annahme) |
| `mwst_satz` | 0.081 | MWST-Normalsatz |
| `vk_rundung_chf` | 0.05 | Rundung des Preises pro Gast (Annahme) |
| `einkauf_vorlauf_tage` | 1 | Ware trifft so viele Tage vor Bedarf ein (Annahme) |
| `db_ziel_pct` | 35 | Zielwert Deckungsbeitrag in % (Annahme, festzulegen) |

## Erneut importieren

`supabase/import/tools/parse.py` und `parse2.py` lesen die Excel und erzeugen die Dateien `supabase/import/0*.sql`. Diese rufen die Funktionen im Schema `importer` auf. Bestehende Zeilen werden nicht doppelt angelegt und in der App gepflegte Werte nicht überschrieben.
