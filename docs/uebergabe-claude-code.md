# Übergabe an Claude Code

Stand: 10.11.2026. Die acht Aufgaben der ersten Übergabe sind gebaut. Ziel bleibt der Pilot mit White Turf im Februar 2027. Der Spengler Cup (26.–31.12.2026) läuft noch über die Excel; die App rechnet parallel mit, als Abgleich.

## Was da ist

| Bereich | Wo | Stand |
| --- | --- | --- |
| Konzept | Dokument «Plattform, Datenbank und Einbau der GAMMA-Excel» (Link im README), `docs/Loesungsvorschlag_Produktionsplanung_GAMMA.pdf` | freigegeben für den Pilot |
| Datenbank | Supabase «Gamma» (`oqmtocxemtcsvtzmswwx`, Zürich), `supabase/migrations/` | 15 Migrationen, siehe `docs/supabase.md` |
| App | `app/` (Next.js, statischer Export), Ziel `gamma.atoll-os.com` | alle Screens gebaut, 80 Tests, noch nicht ausgeliefert |
| Design System | `design-system/` (Tokens, Komponenten, Brand Book), Version 0.7 | verbindlich für jede UI, Änderungen in `CHANGELOG.md` |
| Mockups | `mockups/*.dc.html` | Vorlage, die App ist massgebend |
| Rezepte | Tabellen `rezept` … `schritt` | 185 Rezepte: 14 aus `rezepte/rezepte.json`, 171 aus dem Paprika-Export «My Recipes» |

## Screens

| Route | Inhalt | Aufgabe |
| --- | --- | --- |
| `/anmelden` | Anmeldung mit E-Mail-Link, nur bestehende Benutzer | 1 |
| `/` | Leitstand | 1 |
| `/produktion` | Produktionsliste pro Saison mit Herleitung, Kontrollwerten, Export Excel und PDF | 2 |
| `/produktion/wellen` | Wellen-Vorschlag, übernehmen, Datum ändern, Prüfhinweise | 7 |
| `/systemzuteilung` | Komponenten mit Status und Prüfhinweisen, Zuteilung bearbeiten | 3 |
| `/katalog` | Gerichte mit Komponenten, Verknüpfung zu Rezepten | 4 |
| `/rezepte` | Rezeptkarte mit Skalierung nach Portionen oder Chargen; Bearbeiten von Typ, Basis, Mengen in Gramm, Basiszutat, offenen Punkten | 4 |
| `/offerten`, `/offerten/bearbeiten`, `/offerten/druck` | Offerte mit Preis pro Gast, Deckungsbeitrag, Druckansicht | 5 |
| `/anlaesse`, `/anlaesse/bearbeiten`, `/anlaesse/karte` | Anlass mit Services, Menülinien, Getränke- und Barkarten | 6 |
| `/einkauf`, `/einkauf/lieferanten` | Einkaufsliste nach Lieferant und Artikel mit Bestellschluss, Lieferanten pflegen | 7 |
| `/ressourcen` | Personal und Geräte pro Anlass, Zusatzbedarf Freelancer und Miete | 8 |
| `/rentabilitaet` | Kalkulation pro Anlass, Monatsergebnis, Break-even | 8 |
| `/stammdaten` | Lohnsätze, Strompreis, Fixkosten, Geräte, Einstellungen | 8 |

## Kontrollwerte aus der Excel

Müssen nach jeder Änderung gleich herauskommen (zuletzt geprüft nach Migration 15):

- Bündner Trockenfleisch, Spengler Cup gesamt: 181.5 kg (30 g × 6'050 Gäste)
- Rindsentrecote, Menülinie «Spiel 1 und 6»: 79.2 kg (120 g × 1'100 Gäste × 60 %)
- Bunter Blattsalat, Menülinie «Spiel 1 und 6»: 27.5 kg
- Haltbarkeit 21 Tage ergibt 3 Wellen in der Saison Winter 2026/27, 3 Tage ergibt 8, 180 Tage ergibt 1
- Komponenten-Status: 310 ok, 130 offen, 53 Zukauf

## Entscheide von Dominik

- Offerte: Gänge mit mehreren Gerichten werden gleich verteilt. Warenkosten aus dem Artikel, sonst Schätzung CHF/kg der Kategorie. Preise exkl. MWST, 8.1 % separat. Deckungsbeitrag der Offerte nur gegen Warenkosten.
- Anlass: Gerichte aus dem Katalog, sonst von Hand. Eine bestätigte Offerte wird als Menülinie übernommen. Karten pflegen und drucken.
- Wellen: Menge nach Service-Datum. Vorschlag übernehmen, Datum danach änderbar.
- Einkauf: Menge über den Hauptartikel; Zukauf pro Anlass; alles ohne Artikel bleibt offen. Lieferanten mit Liefertagen und Bestellschluss (Logik aus der bestehenden Bestell-App).
- Ressourcen: Personal und Geräte von Hand pro Anlass. Umsatz aus der Offerte, sonst von Hand.
- Verknüpfungen Katalog ↔ Rezept und Zutat ↔ Artikel macht Dominik von Hand.
- Import «My Recipes»: alle Rezepte mit Zutaten; g und kg genau; ml, dl, l als Gramm mit Annahme; EL, TL, Stück ohne Menge, Original in der Notiz; mit Portionenzahl Gericht, sonst Komponente.

## Noch nicht gebaut

- Vollkosten pro Gericht (Waren, Arbeit, Energie aus dem Rezept)
- Die zwei Diagramme im Mockup Rentabilität
- Excel-Export für Wellen und Einkauf
- Bestellungen speichern und verfolgen
- Rezept: Bezeichnung, Notiz und Schritte ändern, Zutaten hinzufügen oder löschen, neues Rezept anlegen. «Besonders zu beachten» ist nur lesbar (dem Design System fehlt ein mehrzeiliges Textfeld)
- Rollen und Rechte pro Abteilung
- Auslieferung auf `gamma.atoll-os.com`

## Daten, die noch fehlen

Ohne diese Werte zeigt die App Platzhalter statt Zahlen:

1. Datum der 11 Spiele des Spengler Cup (Services): nötig für Wellen-Mengen und Einkauf.
2. Lieferanten mit Liefertagen und Bestellschluss; Lieferant und Hauptartikel pro Komponente (erst 5 von 493).
3. Lohnsätze pro Rolle, Strompreis, Fixkosten pro Monat, Bestand und Mietpreis der Geräte.
4. Bei den importierten Rezepten: Basiszutat, Ergibt-Menge oder Portionsgrösse, Mengen in Gramm (911 von 1761 Zutaten haben nur die Originalangabe).

## Offene Punkte (nicht selbst entscheiden)

- Lagerung 0 Tage: heute ab 1 Tag erlaubt; gibt es Komponenten, die am selben Tag produziert und serviert werden?
- Folgewellen: einen Tag früher produzieren, damit die Ware am Vortag bereit ist?
- Zukauf pro Tag statt pro Anlass bestellen?
- Welche Gästezahl gilt für den Umsatz, wenn Offerte und Services abweichen?
- Texte für Gültigkeit und Konditionen im Kunden-PDF der Offerte.
- Zielwert Deckungsbeitrag (heute 35 % als Annahme).
- Platz der Systemzuteilung in der Navigation.
- Rollen und Rechte; wer den GAMMA-Server betreut; Anbindung an Warenwirtschaft oder ERP.
- Annahmen aus den Excel mit Philipp und dem Küchenchef bestätigen: Haltbarkeiten, Zuschlag 20 %, Warenkosten pro kg.
- Drei unsichere Zuordnungen Menütext → Katalog, siehe `docs/supabase.md`.
- Importierte Rezepte: private und GAMMA-Rezepte liegen jetzt zusammen; doppelte prüfen («Multi Purpose Dough» und «Allzweck-Hefeteig», «Swee Chilli Sauce» und «Sweet Chili Sauce», dreimal «Aloo Gobi»).

## Arbeitsweise

- Migrationen spielt Dominik im Terminal ein (`supabase db push`, mit `Y` bestätigen). Danach `cd app && npm run types`, Typprüfung und Tests.
- Prüfen in der Datenbank nur lesend. Nichts direkt im Dashboard ändern.
- Die Commits liegen lokal auf `main`. Auf den Server (`git push`) schiebt Dominik selbst.
- Lokaler Start: `npm --prefix app run dev`, dann `http://localhost:3000`.
- Nach jeder Aufgabe: Typprüfung, Tests, Kontrollwerte prüfen, Commit auf Deutsch, kurzer Stand an Dominik.
