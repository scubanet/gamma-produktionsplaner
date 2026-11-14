# Übergabe an Claude Code

Stand: 14.11.2026. Die acht Aufgaben der ersten Übergabe sind gebaut; dazu Checkliste pro Welle und schnellere Datenerfassung (siehe unten). Ziel bleibt der Pilot mit White Turf im Februar 2027. Der Spengler Cup (26.–31.12.2026) läuft noch über die Excel; die App rechnet parallel mit, als Abgleich.

## Was da ist

| Bereich | Wo | Stand |
| --- | --- | --- |
| Konzept | Dokument «Plattform, Datenbank und Einbau der GAMMA-Excel» (Link im README), `docs/Loesungsvorschlag_Produktionsplanung_GAMMA.pdf` | freigegeben für den Pilot |
| Datenbank | Supabase «Gamma» (`oqmtocxemtcsvtzmswwx`, Zürich), `supabase/migrations/` | 26 Migrationen (26 noch einzuspielen), siehe `docs/supabase.md` |
| App | `app/` (Next.js, statischer Export), Ziel `gamma.atoll-os.com` | alle Screens gebaut, 95 Tests, Auslieferung über GitHub Actions |
| Design System | `design-system/` (Tokens, Komponenten, Brand Book), Version 0.8 | verbindlich für jede UI, Änderungen in `CHANGELOG.md` |
| Mockups | `mockups/*.dc.html` | Vorlage, die App ist massgebend |
| Anleitung | `docs/anleitung.md` | Bedienung pro Modul |
| Rezepte | Tabellen `rezept` … `schritt` | 185 Rezepte: 14 aus `rezepte/rezepte.json`, 171 aus dem Paprika-Export «My Recipes» |

## Screens

| Route | Inhalt | Aufgabe |
| --- | --- | --- |
| `/anmelden` | Anmeldung mit E-Mail-Link, nur bestehende Benutzer | 1 |
| `/` | Leitstand | 1 |
| `/produktion` | Produktionsliste pro Saison mit Herleitung, Kontrollwerten, Export Excel und PDF | 2 |
| `/produktion/aufwand` | Aufwand aus den Rezepten: Produktion pro Welle, Logistik und Service pro Spiel | neu |
| `/produktion/wellen` | Wellen-Vorschlag, übernehmen, Datum ändern, Prüfhinweise; Erledigt und Zuständig pro Komponente und Welle | 7 |
| `/systemzuteilung` | Komponenten mit Status und Prüfhinweisen, Zuteilung bearbeiten | 3 |
| `/katalog` | Gerichte mit Komponenten, Verknüpfung zu Rezepten | 4 |
| `/rezepte`, `/rezepte/bearbeiten` | Rezeptkarte mit Skalierung nach Portionen oder Chargen; Pflegeseite für Kopf, Gruppen, Zutaten, Schritte und offene Punkte (ändern, hinzufügen, löschen), neues Rezept anlegen, Rezept löschen (nur Admin) | 4 |
| `/offerten`, `/offerten/bearbeiten`, `/offerten/druck` | Offerte mit Preis pro Gast, Deckungsbeitrag, Druckansicht | 5 |
| `/anlaesse`, `/anlaesse/bearbeiten`, `/anlaesse/karte` | Anlass mit Services, Menülinien, Getränke- und Barkarten | 6 |
| `/einkauf`, `/einkauf/lieferanten`, `/einkauf/zuordnen` | Einkaufsliste nach Lieferant und Artikel mit Bestellschluss, Lieferanten pflegen, Hauptartikel mit Vorschlägen zuordnen | 7 |
| `/ressourcen` | Personal und Geräte pro Anlass, Zusatzbedarf Freelancer und Miete | 8 |
| `/rentabilitaet` | Kalkulation pro Anlass, Monatsergebnis, Break-even | 8 |
| `/benutzer` | Benutzerverwaltung für Admins: Zugang anlegen, sperren, Admin-Recht (Edge Function `benutzer`) | neu |
| `/stammdaten` | Lohnsätze, Strompreis, Fixkosten, Geräte, Einstellungen | 8 |

## Nachtrag 14.11.2026

- **Checkliste pro Welle** (Migration 21): Abgehakt wird pro Komponente und Welle im Wellenplan. Die Produktionsliste zeigt bei mehreren Wellen den Stand («2 von 3 Wellen»), bei einer Welle oder ohne Welle das Häkchen direkt. Zuständig lässt sich pro Welle oder für alle Wellen setzen. Alte Häkchen von Komponenten mit Wellen werden nicht übernommen (welche Welle gemeint war, ist unbekannt); am 14.11. gab es keines.
- **Daten der Services in einem Dialog** (Anlass bearbeiten → Services → «Daten erfassen»): alle Spiele auf einmal statt einzeln.
- **Artikel zuordnen** (Migration 22, `/einkauf/zuordnen`): Die Datenbank schlägt pro Komponente ohne Hauptartikel bis zu drei Artikel nach Ähnlichkeit des Namens vor; ein Klick ordnet zu. Die Verknüpfung bleibt ein Entscheid von Hand.
- **Reihenfolge beim Ausliefern:** zuerst `supabase db push` (Migrationen 21 und 22), dann `cd app && npm run types` (die Typen in `database.types.ts` sind für 21 und 22 von Hand nachgeführt und sollen danach gleich herauskommen), erst dann `git push`. Sonst läuft die neue App gegen die alte Datenbank.
- Tests: Auf Node 22 schlagen 6 ältere Tests wegen des Tausender-Apostrophs fehl (' statt ’). Ob sie mit Node 24 (wie im Workflow) laufen, wurde am 14.11. nicht geprüft.

## Vom Rezept zu Produktion, Logistik und Service (ab 14.11.2026)

Ziel von Dominik: Ausgehend vom Rezept rechnet die App Produktion, Logistik und Service. Basisrezepte (Komponenten) tragen Aufwand, Geräte und Gebinde; Gerichte setzen sie für den Anlass zusammen. Entwurf der Bildschirme: https://claude.ai/artifact/5YJeDKrEEiZx9ck7u4wLjC

- **Etappe 1, gebaut (Migration 23):** Rezept bearbeiten mit Karte «Planung: Gebinde und Service» und pro Schritt Ort, Rolle, Rüstzeit, Menge pro Durchgang. Rezeptkarte mit Karte «Planung»: was erfasst ist, was fehlt, Systemzuteilung der verknüpften Komponenten, Komponente verknüpfen oder lösen.
- **Etappe 2, gebaut (Migration 24):** Seite `/produktion/aufwand` «Aufwand aus den Rezepten»: Produktion pro Welle (Durchgänge, aktive Zeit, Stunden pro Rolle, Belegung der Geräte), Logistik und Service pro Spiel (Gebinde, Gewicht, Volumen, vor Ort, Ausgabe). Gebinde in den Stammdaten pflegbar. Noch offen: die Zahlen in Ressourcen und Rentabilität übernehmen (heute Handeingabe), Fahrzeuge.
- **Etappe 3, gebaut (Migration 25):** Karte «Geschirr und Besteck» unter Anlass bearbeiten: Standard übernehmen, Positionen übersteuern oder ergänzen, Bedarf mit eigenem Bestand, Miete, Körben und Gewicht. Stammdaten «Geschirr und Besteck» (Artikel) und «Standard Geschirr» (pro Angebotsform und Gang). Entscheid Dominik: Wechselfaktor pro Anlass, mit Standard, der übersteuert werden kann. Der Standard ist leer und von Dominik festzulegen. Noch offen: Mietkosten in die Kalkulation des Anlasses, gleichzeitige Anlässe beim Bestand, Geschirr in die Logistik (Fahrzeuge).
- Entscheide Dominik: Rezepte basieren auf 10 Portionen. Gebinde ist die IFCO-Box, für gekühlt und TK. Die Systemzuteilung bleibt massgebend für Lagerung und Regeneration.
- Annahme, noch zu bestätigen: Aufwand der Ausgabe im Service in Minuten pro 100 Portionen.
- Pilot: zehn Komponenten von Spiel 1 (Rindsentrecote, Kartoffelgratin, Portweinjus, Kürbis, Risotto, Erbsencrèmesuppe, Sellerie-Apfel-Suppe, Gerstensalat, Gerösteter Blumenkohl, Vitello Tonnato). Am 14.11. hat keine ein verknüpftes Rezept, und Lagerung und Regeneration sind in der Systemzuteilung bei allen leer.

## Kontrollwerte aus der Excel

Müssen nach jeder Änderung gleich herauskommen (zuletzt geprüft nach Migration 19):

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
- Rezepte löschen: nur Admins (Admin-Liste, zuerst nur Dominik); verknüpfte Rezepte werden abgelehnt; Löschen ist endgültig.
- Import «My Recipes»: alle Rezepte mit Zutaten; g und kg genau; ml, dl, l als Gramm mit Annahme; EL, TL, Stück ohne Menge, Original in der Notiz; mit Portionenzahl Gericht, sonst Komponente.

## Noch nicht gebaut

- Vollkosten pro Gericht (Waren, Arbeit, Energie aus dem Rezept)
- Die zwei Diagramme im Mockup Rentabilität
- Excel-Export für Wellen und Einkauf
- Bestellungen speichern und verfolgen
- Rezept: Reihenfolge von Zutaten und Schritten ändern, Warnung bei ungespeicherten Änderungen
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

- Migrationen spielt Dominik im Terminal ein (`supabase db push --remote`, bestätigen; seit CLI 3 zielt der Befehl ohne `--remote` auf die lokale Datenbank). Danach `cd app && npm run types`, Typprüfung und Tests.
- Prüfen in der Datenbank nur lesend. Nichts direkt im Dashboard ändern.
- Die Commits liegen lokal auf `main`. Auf den Server (`git push`) schiebt Dominik selbst.
- Lokaler Start: `npm --prefix app run dev`, dann `http://localhost:3000`.
- Nach jeder Aufgabe: Typprüfung, Tests, Kontrollwerte prüfen, Commit auf Deutsch, kurzer Stand an Dominik.

## Auslieferung

`gamma.atoll-os.com` liegt bei Infomaniak (Webhosting, Apache). Der Workflow `.github/workflows/ausliefern.yml` baut die App bei jedem Push auf `main` und lädt `app/out/` per FTPS hoch. Die nötigen Secrets stehen im Kopf der Workflow-Datei. `app/public/.htaccess` regelt HTTPS, 404-Seite und Cache. In Supabase muss `https://gamma.atoll-os.com` als Site URL und Redirect URL eingetragen sein.
