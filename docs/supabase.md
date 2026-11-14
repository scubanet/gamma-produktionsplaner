# Supabase – Pilot-Datenbank

Stand: 14.11.2026

| | |
| --- | --- |
| Projekt | Gamma (`oqmtocxemtcsvtzmswwx`), Organisation Weckherlin |
| Region | Central Europe (Zürich), `eu-central-2` |
| API-URL | https://oqmtocxemtcsvtzmswwx.supabase.co |
| Zweck | Pilot Winter 2026/27. Danach Umzug auf einen eigenen Server von GAMMA (selbst gehostetes Supabase). |
| Umfang | 46 Tabellen, 29 Views, 20 Funktionen, 22 Migrationen (21 und 22 am 14.11.2026 geschrieben, mit `supabase db push` einzuspielen) |

## Aufbau

- `supabase/migrations/` ist die massgebende Quelle für das Schema. `db/*.sql` bleibt als Archiv des Proof of Concept.
- Alle Tabellen haben Row Level Security. Im Pilot dürfen angemeldete Benutzer alles lesen und schreiben (Policy `pilot_angemeldet`), anonyme Zugriffe nichts. Rollen pro Abteilung folgen.
- Ausnahme: Rezepte löschen dürfen nur Admins. Die Tabelle `app_admin` führt die Benutzer mit Admin-Rechten; jeder sieht darin nur seine eigene Zeile, geschrieben wird sie nur per Migration oder SQL (`insert into app_admin (user_id, bemerkung) …`). `rezept` hat darum eigene Policies statt `pilot_angemeldet`.
- Alle Views laufen mit `security_invoker = true`. Funktionen, die die App aufruft, sind nur für `authenticated` freigegeben.
- Import-Funktionen liegen im Schema `importer` und sind über die API nicht erreichbar.
- Nur Standard-PostgreSQL und offene Supabase-Funktionen, damit der Umzug auf den GAMMA-Server ohne Umbau geht.
- Die App rechnet nicht selbst: Mengen, Preise, Termine, Prüfhinweise und Herleitungstexte kommen aus Views und Funktionen.
- Eine unvollständige Zahl wird nie als Total ausgegeben. Fehlt ein Teil (Preis, Lohnsatz, Service-Datum), ist das Ergebnis leer und die App zeigt einen Platzhalter wie `[Preis]` oder `[Menge]`.

## Benutzerverwaltung (Edge Function `benutzer`)

- `supabase/functions/benutzer/index.ts`: Zugang anlegen, Benutzer auflisten, sperren und entsperren, Admin-Recht geben und entziehen. Nur für Benutzer in `app_admin`; die Funktion prüft das Token der App und arbeitet dann mit dem Service-Schlüssel, der den Server nie verlässt.
- Ausliefern: `supabase functions deploy benutzer` im Repo-Wurzelordner. Die Funktion gehört nicht zu den Migrationen und wird nicht vom Workflow «Ausliefern» verteilt.
- Ein neuer Zugang hat kein Passwort und eine bestätigte Adresse; die Person meldet sich mit dem Anmeldelink an. Sperren setzt eine Sperre von rund 100 Jahren, gelöscht wird nichts.
- Schutz: Niemand sperrt sich selbst oder entzieht sich selbst das Admin-Recht; so bleibt immer mindestens ein Admin.
- Erlaubte Herkunft (CORS): `https://gamma.atoll-os.com` und `http://localhost:3000`. Beim Umzug auf den GAMMA-Server die Adresse in der Funktion anpassen.
- Rollen und Rechte pro Abteilung gibt es weiterhin nicht (Entscheid Dominik, 14.11.2026: nur Zugang verwalten).

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
| 18 rezept_ganz_speichern | `rezept_speichern` nimmt das ganze Rezept als jsonb-Dokument und legt neue Rezepte an (`rezept_slug`); Wertebereiche auf `schritt` |
| 19 rezept_loeschen | Admin-Liste `app_admin`, `ist_admin()`, `rezept_loeschen`; auf `rezept` darf nur ein Admin löschen |
| 20 produktion_checkliste | Tabelle `produktion_aufgabe`: Zuständig und Erledigt pro Komponente und Saison. Version `20261110185525` (siehe unten) |
| 21 checkliste_pro_welle | `produktion_aufgabe` mit `welle_nr` (0 = ohne Welle), View `produktion_checkliste`, `wellenplan` mit `vorschlag_nr` |
| 22 artikel_vorschlag | Erweiterung `pg_trgm`, Funktion `komponente_artikel_vorschlag` (Vorschläge für den Hauptartikel) |
| 26 bedarf_pro_spiel | View `service_gericht_bedarf`: Bedarf pro Service, Gericht und Komponente für die Produktionsliste pro Spiel |
| 25 geschirr | Tabellen `service_artikel`, `geschirr_standard`, `anlass_geschirr`, Funktion `anlass_geschirr_vorschlagen`, View `anlass_geschirr_bedarf` |
| 24 planung_aus_rezept | Views `planung_bedarf`, `planung_produktion_schritt`, `planung_produktion_komponente`, `planung_produktion_rolle`, `planung_produktion_geraet`, `planung_service_komponente` |
| 23 rezept_planung | Tabelle `gebinde` (IFCO-Box), `rezept` mit Gebinde, Verpackung, Füllmenge und Service-Aufwand, `schritt` mit Rüstzeit und Menge pro Durchgang, `rezept_speichern` nimmt die neuen Felder |

Die Versionen in der Datenbank entsprechen den Dateinamen. Migration 20 wurde nicht mit `supabase db push` eingespielt und trägt darum einen Zeitstempel (`20261110185525`); die Datei heisst seit dem 14.11.2026 gleich. Neue Migrationen immer mit `supabase db push` einspielen, sonst passen Datei und Datenbank nicht zusammen.

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
- `rezept_speichern(rezept, geaendert_am, daten jsonb)`: speichert das ganze Rezept (Kopf, Gruppen, Zutaten, Schritte, erledigte offene Punkte) in einem Schritt und gibt `{id, slug, geaendert_am}` zurück. Das Dokument ist vollständig: Gruppen, Zutaten und Schritte, die fehlen, werden gelöscht; Einträge mit `id` werden geändert, ohne `id` neu angelegt. `rezept` null legt ein neues Rezept an. Lehnt ab, wenn der geladene Stand (`geaendert_am`) nicht mehr gilt oder ein Typwechsel bestehende Verknüpfungen bricht. Ein Gericht braucht Basisportionen; Mengen sind über 0 oder leer, Minuten ab 0.
- Planung im Rezept (Migration 23, Etappe 1 von 3): `schritt.ruest_min` fällt einmal an; `aktiv_min` und `unbeaufsichtigt_min` gelten pro Durchgang; `schritt.menge_pro_durchgang_g` ist die Menge, die das Gerät in einem Durchgang fasst (leer = eine Basis-Charge). `rezept.gebinde_id`, `verpackung`, `fuellmenge_g` für die Logistik, `rezept.service_min_pro_100` und `service_rolle` für die Ausgabe vor Ort (Minuten pro 100 Portionen). Regenerieren vor Ort ist ein Schritt mit `ort = 'vor_ort'`. Lagerung, Haltbarkeit und Regeneration bleiben in der Systemzuteilung der Komponente (massgebend) und erscheinen im Rezept über `komponente.rezept_id`. Fehlt ein neuer Schlüssel im Dokument von `rezept_speichern`, bleibt der gespeicherte Wert. Die Berechnung pro Anlass (Durchgänge, Stunden, Gebinde) folgt in Etappe 2.
- `rezept_loeschen(rezept)`: löscht ein Rezept endgültig samt Gruppen, Zutaten, Schritten und offenen Punkten. Nur für Admins (`ist_admin()`); lehnt ab und nennt die Stelle, solange das Rezept in Katalog, Systemzuteilung, Anlass oder einem anderen Rezept verwendet wird.
- `rezept_slug(name)`: Adresse (Slug) für ein neues Rezept aus dem Namen
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
- `service_gericht_bedarf`: Bedarf je Service, Gericht und Komponente mit Datum und Anlieferung. Die Produktionsliste filtert damit pro Spiel, auch wenn mehrere Spiele dieselbe Menülinie haben. Kontrollwert: Rindsentrecote Spiel 1 und Spiel 6 je 39.6 kg, zusammen 79.2 kg wie die Menülinie
- `produktionsliste`: Menge, Haltbarkeit, Wellen, Start pro Komponente und Saison; `zeilen_ohne_menge` zeigt fehlende Mengen
- `wellen_anzahl(saison, haltbarkeit)`: Anzahl Produktionswellen wie die Hilfstabelle im Blatt Produktionsplan
- `wellen_termine(saison, haltbarkeit)`: die Termine dazu (erste Welle am Tag vor der Anlieferung, danach alle «Haltbarkeit» Tage). Migration 12 prüft beim Einspielen, dass die Anzahl mit `wellen_anzahl` übereinstimmt.
- `wellen_vorschlag`: Komponente × Welle mit Menge nach Service-Datum; `wellenplan_uebernehmen(saison)` speichert ihn in `produktionswelle` und `welle_komponente`
- `wellenplan`: gespeicherter Plan mit Prüfhinweisen (rot, gelb); `wellen_uebersicht`: Zahlen pro Saison
- `produktion_checkliste`: eine Zeile pro Saison, Komponente und Welle mit Produktionstag (aus dem Plan, sonst aus dem Vorschlag), Zuständig und Erledigt. `welle_nr` ist die Welle der Komponente im Vorschlag; Komponenten ohne Welle (Zukauf, offen, nur vor Ort) haben `welle_nr` 0. Geschrieben wird in `produktion_aufgabe`; Zeitpunkt und Person des Häkchens setzt ein Trigger. Die Einträge bleiben erhalten, wenn der Vorschlag neu übernommen wird. Annahme: Ändern sich Anlassdaten oder Haltbarkeit, verschieben sich die Wellen-Nummern.

### Einkauf

- `lieferant_bestelltermin(lieferant, liefern_bis)`: letzter Liefertag bis zum Datum und Bestellschluss dafür
- `wellen_aktuell`: Datum aus dem Plan, Menge immer aktuell aus dem Vorschlag
- `einkauf_position`: Bedarf pro Welle bzw. Anlass und Komponente, mit Hauptartikel, Menge, Kosten, Liefertermin und Bestellschluss
- `einkauf_artikel`: Einkaufsliste nach Lieferant und Artikel; `einkauf_summe`: Zahlen pro Saison
- `komponente_artikel_vorschlag(saison, anzahl, schwelle)`: Komponenten der Saison ohne Hauptartikel mit den ähnlichsten aktiven Artikeln nach dem Namen (`pg_trgm`, Standard 3 Vorschläge ab Ähnlichkeit 0.5). Schlägt nur vor; zugeordnet wird von Hand. Probelauf 14.11.2026: 249 Komponenten ohne Hauptartikel

### Planung aus dem Rezept (Migration 24)

- `planung_bedarf`: Bedarf für die Produktion, pro Welle (`wellen_aktuell`) und für Komponenten ohne Welle pro Anlass. Gleiche Quelle wie der Einkauf.
- `planung_produktion_schritt`: pro Bezug, Komponente und Arbeitsschritt der Zentralküche. Durchgänge = Menge ÷ Menge pro Durchgang, aufgerundet (ohne Angabe die Ergibt-Menge des Rezepts). Aktiv = Rüstzeit + Durchgänge × aktiv. Gerät belegt = Durchgänge × (aktiv + unbeaufsichtigt). Ein Schritt ohne Ort zählt zur Zentralküche.
- `planung_produktion_komponente`: eine Zeile pro Bezug und Komponente, auch ohne Rezept. `status`: gerechnet, kein Rezept, Menge fehlt, Stück nicht umrechenbar, keine Schritte, Durchgang fehlt.
- `planung_produktion_rolle`, `planung_produktion_geraet`: aktive Zeit pro Rolle und Belegung pro Gerät, nur gerechnete Schritte.
- `planung_service_komponente`: pro Service und Komponente. Gebinde = Menge ÷ Füllmenge, aufgerundet; Gewicht = Menge + Gebinde × Tara; Volumen = Gebinde × Volumen; vor Ort aus den Schritten mit Ort `vor_ort`; Ausgabe = Portionen ÷ 100 × Minuten pro 100 Portionen.
- Entscheide Dominik (14.11.2026): Produktion pro Welle, Logistik und Service pro Service. Liter als Kilogramm (1 l = 1 kg, Annahme, in der App gestrichelt). Stück werden nicht umgerechnet.
- Kontrollwert aus dem Probelauf (Testrezept, nicht gespeichert): Kartoffelgratin 99 kg in Welle 1 bei 12 kg pro Durchgang = 9 Durchgänge; 30 min Rüstzeit + 9 × (25 + 5 + 5) min = 345 min aktiv. Spiel 1: 33 kg ÷ 12 kg = 3 Gebinde, 330 Portionen × 15 min ÷ 100 = 49.5 min Ausgabe.

### Geschirr und Besteck (Migration 25)

- `service_artikel`: Teller, Besteck, Gläser, Material für die Ausgabe mit eigenem Bestand, Mietpreis pro Stück und Anlass, Stück pro Korb und Gewicht.
- `geschirr_standard`: Vorschlag pro Angebotsform und Gang (Stück pro Gast, Wechselfaktor, Reserve). Leer angelegt; Dominik legt die Werte in den Stammdaten fest.
- `anlass_geschirr`: Positionen am Anlass, entweder pro Gast (mit Gang) oder als feste Stückzahl (ohne Gang, für die Ausgabe). Eine Position pro Anlass, Gang und Artikel.
- `anlass_geschirr_vorschlagen(anlass)`: übernimmt den Standard der Angebotsform für die Gänge, die im Menü des Anlasses vorkommen. Bestehende Positionen bleiben.
- `anlass_geschirr_bedarf`: Bedarf = Gäste × Stück pro Gast × Wechselfaktor × (1 + Reserve), aufgerundet; eigener Bestand zuerst, der Rest Miete; Mietkosten, Körbe, Gewicht. Annahme: Gäste = grösster Service des Anlasses (dazwischen wird abgewaschen). Gleichzeitige Anlässe sind beim Bestand noch nicht berücksichtigt.
- Kontrollwert aus dem Probelauf (nicht gespeichert): 550 Gäste × 1 × 1.5 + 10 % = 908 Stück; bei 600 im Bestand 308 Miete.

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
