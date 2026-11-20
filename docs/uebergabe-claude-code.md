# Übergabe an Claude Code

Stand: 14.11.2026. Die acht Aufgaben der ersten Übergabe sind gebaut; dazu Checkliste pro Welle und schnellere Datenerfassung (siehe unten). Ziel bleibt der Pilot mit White Turf im Februar 2027. Der Spengler Cup (26.–31.12.2026) läuft noch über die Excel; die App rechnet parallel mit, als Abgleich.

## Was da ist

| Bereich | Wo | Stand |
| --- | --- | --- |
| Konzept | Dokument «Plattform, Datenbank und Einbau der GAMMA-Excel» (Link im README), `docs/Loesungsvorschlag_Produktionsplanung_GAMMA.pdf` | freigegeben für den Pilot |
| Datenbank | Supabase «Gamma» (`oqmtocxemtcsvtzmswwx`, Zürich), `supabase/migrations/` | 26 Migrationen (26 noch einzuspielen), siehe `docs/supabase.md` |
| App | `app/` (Next.js, statischer Export), Ziel `gamma.atoll-os.com` | alle Screens gebaut, 161 Tests, Auslieferung über GitHub Actions |
| Design System | `design-system/` (Tokens, Komponenten, Brand Book), Version 0.14 (Look nach gammacatering.com, Navigation oben, Detailspalte, Küchenpass) | verbindlich für jede UI, Änderungen in `CHANGELOG.md` |
| UI/UX | `docs/plan-ui-ux-look-d.md` | Plan vom 15.11.2026: elf Aufgaben aus der UI/UX-Prüfung, Struktur der Variante D; Aufgaben 1 bis 9 und 11 gebaut, 10 zurückgestellt |
| Mockups | `mockups/*.dc.html` | Vorlage, die App ist massgebend |
| Anleitung | `docs/anleitung.md` | Bedienung pro Modul, Stand 15.11.2026 mit neuer Navigation |
| Rezepte | Tabellen `rezept` … `schritt` | 185 Rezepte: 14 aus `rezepte/rezepte.json`, 171 aus dem Paprika-Export «My Recipes» |

## Screens

| Route | Inhalt | Aufgabe |
| --- | --- | --- |
| `/anmelden` | Anmeldung mit E-Mail-Link, nur bestehende Benutzer | 1 |
| `/` | Leitstand | 1 |
| `/produktion` | Produktionsliste pro Saison mit Herleitung, Kontrollwerten, Export Excel und PDF | 2 |
| `/produktion/aufwand` | Aufwand aus den Rezepten: Produktion pro Welle, Logistik und Service pro Spiel | neu |
| `/kueche` | Küchenpass: eine Welle zum Abhaken am Posten, für Handy und Tablet; Startseite der Web-App auf dem Home-Bildschirm | neu |
| `/produktion/wellen` | Wellen-Vorschlag, übernehmen, Datum ändern, Prüfhinweise; Erledigt und Zuständig pro Komponente und Welle | 7 |
| `/systemzuteilung` | Komponenten mit Status und Prüfhinweisen, Zuteilung bearbeiten | 3 |
| `/katalog` | Gerichte mit Komponenten, Verknüpfung zu Rezepten | 4 |
| `/rezepte`, `/rezepte/bearbeiten` | Rezeptkarte mit Skalierung nach Portionen oder Chargen; Pflegeseite für Kopf, Gruppen, Zutaten, Schritte und offene Punkte (ändern, hinzufügen, löschen), neues Rezept anlegen, Rezept löschen (nur Admin); Status Entwurf, Geprüft, Freigegeben mit Filter in der Liste, freigeben nur Admin | 4 |
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
- Tests: Auf Node 22 schlugen 6 ältere Tests wegen des Tausender-Apostrophs fehl (' statt ’). Seit 16.11. setzt `zahlDeCh` das Zeichen fest; alle Tests laufen auf Node 22.

## Nachtrag 16.11.2026: Härtung

Prüfung von Datenbank, Anmeldung, Edge Function, App und Auslieferung. Die Berater von Supabase melden nichts ausser «Leaked Password Protection» (ohne Bedeutung, Anmeldung läuft ohne Passwort). Geändert und committet, noch nicht ausgeliefert:

- **Migration 30** (`haertung_anon`): nimmt der Rolle `anon` alle Rechte im Schema `public`, auch für künftige Objekte. Bisher sperrte nur Row Level Security. Die Migration prüft sich selbst und bricht ab, falls `authenticated` etwas verliert. Einspielen mit `supabase db push --remote`; die Typen ändern sich nicht.
- **Edge Function `benutzer`**: nur POST, gesperrte Admins sofort abgewiesen, Länge von Name und E-Mail auch auf dem Server geprüft, unerwartete Fehler nur noch im Protokoll. Ausliefern mit `supabase functions deploy benutzer`.
- **`app/public/.htaccess`**: HSTS, Content Security Policy (nur eigene Dateien, Google Fonts, Supabase), kein Einbetten in fremde Seiten, versteckte Dateien gesperrt. Nach dem Ausliefern jede Seite einmal öffnen; meldet die Browser-Konsole «Content Security Policy», die Zeile in der `.htaccess` anpassen. Beim Umzug auf den GAMMA-Server die Supabase-Adresse in `connect-src` ersetzen.
- **App**: Tausenderzeichen überall gleich (`zahlDeCh` in `lib/format.ts`), damit laufen die 6 Tests auch auf Node 22; Ziel nach der Anmeldung strenger geprüft (`sichererPfad`); Fehlerseite `app/app/error.tsx` statt leerem Bildschirm.
- **Workflow**: Tests laufen vor dem Bauen; die FTP-Action ist auf einen Commit festgelegt.

Von Dominik zu prüfen (im Dashboard, nicht im Repo):

1. Authentication → Sign In / Providers: «Allow new users to sign up» muss aus sein. Sonst kann sich jede Person mit dem Publishable Key selbst einen Zugang anlegen und sieht und ändert alles, weil die Policies für jeden angemeldeten Benutzer gelten.
2. Authentication → URL Configuration: als Redirect URL nur `https://gamma.atoll-os.com/**` und für die Entwicklung `http://localhost:3000/**`, keine Platzhalter für andere Adressen.
3. Sperren wirkt erst, wenn das Token abläuft (höchstens eine Stunde, Einstellung «JWT expiry»).

Offen, nicht selbst entschieden: Rechte pro Rolle (heute darf jeder angemeldete Benutzer alles ausser Rezepte löschen und Benutzer verwalten, auch Lohnsätze lesen und ändern); Schriften selbst ausliefern statt von Google laden; automatische Sicherung der Datenbank ausserhalb von Supabase.

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
- Haltbarkeit 21 Tage ergibt 3 Wellen in der Saison Winter 2026/27, 3 Tage ergibt 8, 180 Tage ergibt 1 (Stand 20.11.2026: die App rechnet bei 3 Tagen 10 statt 8, siehe `docs/plan-datenkette.md`, Aufgabe 6)
- Komponenten-Status: kein Kontrollwert mehr (seit 20.11.2026; er ändert sich mit jeder Zuteilung, Stand 311 ok, 129 offen, 53 Zukauf)

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

## Nachtrag 19.11.2026: Plan Datenkette

Kritische Durchsicht von Repo und Datenbank: `docs/plan-datenkette.md`. Zwölf Aufgaben und die Datenerfassung durch Dominik; Ziel ist der Durchstich von Spiel 1 mit echten Zahlen. Die Etiketten folgen danach.

**Aufgabe 1 gebaut (Migration 32, `rezept_freigabe`), committet, noch nicht ausgeliefert:**

- Status eines Rezepts setzen: Funktion `rezept_status_setzen`, Knöpfe «Geprüft», «Freigeben», «Zurück auf Entwurf» auf Rezeptkarte und Pflegeseite (`app/components/rezepte/RezeptStatus.tsx`), Filter nach Status in der Rezeptliste.
- Entscheide Dominik: «Geprüft» dürfen alle Angemeldeten setzen; freigeben und eine Freigabe zurücknehmen nur Admins (Trigger `rezept_status_pruefen`, gilt auch für direkte Änderungen über die API). Ein freigegebenes Rezept bleibt beim Speichern freigegeben.
- Aufwand: Werte und Summen aus nicht freigegebenen Rezepten sind gestrichelt wie Annahmen. Produktionsliste: der Rezept-Link trägt «Rezept Entwurf» oder «Rezept Geprüft». Leitstand: «x / y Rezepte der Saison freigegeben» (View `leitstand_rezepte`). Der Küchenpass zeigt keine Werte aus Rezepten und ist unverändert.
- **Reihenfolge beim Ausliefern:** zuerst `supabase db push --remote` (Migration 32), dann `cd app && npm run types` (die Typen sind von Hand nachgeführt und sollen gleich herauskommen), erst dann `git push`. Ohne die Migration lädt der Leitstand nicht (View `leitstand_rezepte` fehlt) und die Knöpfe zum Status melden einen Fehler.
- Nicht geprüft: Die Migration lief in keiner Datenbank (lokal kein Postgres-Server, Docker nicht gestartet). Vor dem Einspielen `supabase db push --remote --dry-run`. Nach dem Einspielen prüfen: als Nicht-Admin lehnt «Freigeben» ab; Kontrollwerte im Aufwand unverändert.

## Nachtrag 20.11.2026: Premium-Schliff

Plan `docs/plan-premium-schliff.md`, Aufgaben 0 bis 8 gebaut und committet, noch nicht ausgeliefert. Design System 0.21, 180 Tests. Keine Migration, keine Änderung an der Datenbank.

- Marke als Komponente `Brand`, Bildmarke in `design-system/assets/bildmarke.svg` (Platzhalter). Tausch gegen das Logo von GAMMA: Datei ersetzen, `cd app && npm run icons`.
- Anmeldeseite neu gesetzt; Kopfzeile bleibt oben stehen, Benutzer-Menü statt E-Mail und Knopf.
- Bewegung, Skelett beim Laden, leere Zustände mit nächstem Schritt, eigener Dialog bei ungespeicherten Änderungen.
- Fehlermeldungen: `app/lib/fehler.ts`. Deutsche Meldungen aus `raise exception` bleiben; neue Funktionen der Datenbank sollen ihre Meldungen weiter auf Deutsch schreiben.
- Offen: Aufgabe 9 (Abnahme mit Bildern, Dominik sieht sie durch), Mailvorlage im Dashboard neu eintragen, Design-System-Artifact nachführen, Befunde N1, N8, N9, N10 im Plan.

## Nachtrag 20.11.2026: Datenkette, Aufgabe 2

Zutaten mit Artikeln verknüpfen: Seite `/einkauf/zutaten/`, Migration 33 (`zutat_artikel`), committet, noch nicht ausgeliefert.

- **Reihenfolge beim Ausliefern:** zuerst `supabase db push --remote` (Migrationen 32 und 33), dann `cd app && npm run types` (die Typen sind von Hand nachgeführt und sollen gleich herauskommen), erst dann `git push`. Ohne Migration 33 meldet die Seite «Die Datenbank ist nicht auf dem Stand der App»; die Einkaufsliste lädt trotzdem und zeigt den Zähler als Platzhalter.
- Nicht geprüft: Migration 33 lief in keiner Datenbank. Nach dem Einspielen prüfen: eine Bezeichnung verknüpfen, der Zähler steigt um die gemeldete Zahl; «Lösen» stellt den Stand wieder her.
- Offene Frage im Plan `docs/plan-datenkette.md`: Grundzutaten ohne Artikel und «Wasser».

## Nachtrag 20.11.2026: Datenkette, Aufgabe 3

Einkauf aus dem Rezept: Migration 34 (`einkauf_aus_rezept`), committet, noch nicht ausgeliefert. Details und Kontrollwert in `docs/plan-datenkette.md`.

- **Reihenfolge beim Ausliefern:** `supabase db push --remote` (Migrationen 32, 33, 34), dann `cd app && npm run types`, dann `git push`. Die App läuft auch gegen die Datenbank ohne Migration 34 (Einkaufsliste wie bisher), aber nicht umgekehrt geprüft.
- Migration 33 wurde vor dem Einspielen korrigiert: `saison_rezepte` löst Unterrezepte jetzt richtig auf (`zutat.komponente_id` zeigt auf `rezept`, nicht auf `komponente`).
- Nach dem Einspielen prüfen: Einkaufsliste zeigt Artikel aus den Rezepten; Gemüsestreifen im Spengler Cup CHF 25.21; die Kontrollwerte der Produktion (181.5 kg, 79.2 kg, 27.5 kg) sind unverändert (Migration 34 fasst nur den Einkauf an).

## Nachtrag 20.11.2026: Datenkette, Aufgabe 4 (Grundlage)

Migration 35 (`rezept_warenkosten`): Warenkosten pro Rezept je Charge und je kg, ohne Zuschlag. Nur die View, noch keine Anzeige. Die Quelle «rezept» in der Offerte ist nicht gebaut; die offene Frage (Menge pro Komponente) steht in `docs/plan-datenkette.md`. Einspielen zusammen mit 32 bis 34.

## Nachtrag 20.11.2026: Datenkette, Aufgabe 4 (Anlass)

Migration 36 (`anlass_warenkosten`): Warenkosten des Anlasses aus den Menülinien über die Rezepte. Die Kalkulation übernimmt sie für die Kostenart Waren erst, wenn jede Komponente Kosten hat; bis dahin steht der Stand in der Herleitung. Keine Änderung an der App. Einspielen zusammen mit 32 bis 35. Nach dem Einspielen prüfen: Ressourcen, Spengler Cup, Zeile «Waren» zeigt «aus den Rezepten erst 4 von 251 Komponenten mit Kosten».

## Nachtrag 20.11.2026: Migrationen 32 bis 36 eingespielt

`supabase db push --remote` lief ohne Fehler, `npm run types` ist nachgezogen (Typen jetzt aus der Datenbank). Die Hinweise «noch nicht ausgeliefert» in den Nachträgen oben gelten für die Datenbank nicht mehr; die App selbst ist erst mit `git push` live. Stand und geprüfte Werte: `docs/plan-datenkette.md`, Abschnitt «Stand nach dem Einspielen».

## Nachtrag 20.11.2026: Datenkette, Aufgabe 6

Produktionsliste pro Anlass: Migration 37 (`produktionsliste_anlass`) und Feld «Anlass» in der Produktionsliste, committet, noch nicht ausgeliefert. Reihenfolge: `supabase db push --remote`, `cd app && npm run types`, `git push`. Ohne Migration 37 zeigt die Seite kein Feld «Anlass» und läuft wie bisher. Nach dem Einspielen prüfen: «Spengler Cup» wählen ergibt 251 Zeilen wie «Alle Anlässe»; «White Turf 1» zeigt «hat noch keine Menülinie».

## Nachtrag 20.11.2026: Durchsicht und Migration 38

Unabhängige Durchsicht der Arbeit des Tages, Ergebnis und offene Punkte in `docs/plan-datenkette.md`, Abschnitt «Durchsicht vom 20.11.2026». Korrekturen committet: Migration 38 (`durchsicht_korrekturen`, noch einzuspielen) und App. Reihenfolge: `supabase db push --remote`, `cd app && npm run types`, `git push`. Die Abfragen von Migration 38 liefen lesend gegen die Datenbank und liefern dieselben Zahlen wie vorher (253 Positionen, 1205 Zutatenzeilen, 187 Artikelzeilen, Gemüsestreifen CHF 25.21). Die App läuft auch gegen die Datenbank ohne Migration 38.


## Nachtrag 20.11.2026: Sechs UX-Massnahmen

Aus der UX-Durchsicht (33 Vorschläge) sind die sechs kleinen mit hoher Wirkung gebaut, ohne Migration:

- **Handy:** Keine Seite läuft bei 390 und 320 px mehr über (gemessen mit geladenen Daten, alle Seiten). Ursache waren versteckte Texte (`pl-sr`) in breiten Tabellen und lange Titel. Design System 0.25.
- **Küchenpass lädt nach:** jede Minute und wenn die App wieder sichtbar wird; «Stand HH:MM» und «Aktualisieren». Ein Häkchen, das gerade gespeichert wird oder seit dem Start des Nachladens gespeichert wurde, überschreibt das Nachladen nicht (`standUebernehmen` in `lib/kueche.ts`).
- **Löschen nie ohne Rückfrage:** `components/Bestaetigen.tsx` (`useBestaetigen`) vor Menülinie löschen, Gericht und Service entfernen, Stammdaten löschen, Zutat lösen. Fokus steht auf «Abbrechen».
- **Zutaten zuordnen schneller:** Saison direkt aus `saison`, nach dem Verknüpfen verschwindet die Zeile sofort und nur Zähler und verknüpfte Liste laden neu; Fokus auf die nächste Zeile; «Artikel suchen» öffnet mit der Bezeichnung im Suchfeld.
- **«Bearbeiten» bleibt sichtbar:** in Produktionsliste und Systemzuteilung steht der Knopf direkt neben dem Namen (statt Spalten auszublenden: so fehlt im Druck nichts und nichts springt).
- **Fehler als Alarm:** Fehlermeldungen tragen `role="alert"`.

Geprüft: Typen, Lint, 200 Tests, Build; im Browser nur lesend (Dialoge geöffnet und abgebrochen). Nicht geprüft, weil es in die Pilot-Datenbank schreibt: Verknüpfen, Lösen, Löschen und Abhaken selbst.

Ladezeit Einkauf: siehe Nachtrag «Migration 39». Die zuerst notierten «rund 20 s» waren ein Messfehler (viele Seiten gleichzeitig geladen).

## Nachtrag 20.11.2026: Migration 39, Einkaufsliste in einer Abfrage

- Gemessen (Abfragen der Seite ohne Entwicklungs-Verdoppelung, Pilot-Datenbank): `/einkauf/` holte Summe, Artikel, Positionen und Zähler in vier Abfragen, zusammen 1,2 bis 1,6 s; die Summe allein 0,75 bis 1,1 s, weil jede View den Unterbau (`einkauf_bedarf`, `einkauf_zutat`) neu rechnet.
- Migration 39: Funktion `einkauf_liste(p_saison)` rechnet Positionen und Artikel je einmal und gibt alles als ein jsonb zurück. `einkauf_summe_von` enthält die Regeln der Summe an einer Stelle; die View `einkauf_summe` benützt sie (gleiche Spalten).
- Lesend gegen die Pilot-Datenbank geprüft (als `authenticated`, ohne DDL): gleiche Summe, 187 Artikelzeilen und 253 Positionen identisch zur bisherigen Abfrage, Rechenzeit rund 0,2 s. Die Funktion selbst ist damit noch nicht gelaufen, nur ihre Abfrage.
- `/einkauf/zuordnen/` liest die Saison aus der Tabelle `saison` statt aus `einkauf_summe`.
- **Reihenfolge beim Ausliefern zwingend:** `supabase db push --remote`, dann `cd app && npm run types`, dann `git push`. Anders als bei 34, 37 und 38 läuft `/einkauf/` nicht ohne Migration 39: die Seite ruft nur noch `einkauf_liste` (ohne sie Fehler PGRST202, «Einkauf nicht geladen»).
- Nach dem Einspielen: Ladezeit neu messen, Typen aus der Datenbank erzeugen und mit den von Hand nachgeführten vergleichen.
- **Eingespielt am 20.11.2026.** Danach geprüft (als `authenticated`): `einkauf_liste()` gleich den Views (Summe, 187 Artikelzeilen, 253 Positionen), rund 0,2 s; unbekannte Saison gibt null; `anon` darf nicht ausführen. Erzeugte Typen gleich den von Hand nachgeführten. `/einkauf/` lädt lokal (Entwicklungsversion) in 1,3 s statt 2,8 s; `/einkauf/zuordnen/` unverändert 3,3 s (dort bestimmt `komponente_artikel_vorschlag` die Zeit).

## Nachtrag 20.11.2026: UX-Runde 2 (Ränge 6, 7, 14, 15)

- **Zutaten zuordnen (Rang 6, Stufe 1):** Ein Vorschlag-Knopf fragt ab 10 betroffenen Zutaten nach (mit «auch ausserhalb der Saison» zählen diese mit). Nach dem Verknüpfen steht «Rückgängig» unter der Meldung; es löst alle Zutaten dieser Bezeichnung mit diesem Artikel, auch früher verknüpfte, und sagt das in der Rückfrage. Die Prozentzahl heisst «Name ähnlich: 60 %» (auch auf «Artikel zuordnen»). Stufe 2 (Rangfolge und Schwelle der Vorschläge in der Datenbank) wartet auf den Entscheid zu Grundzutaten (Salz, Zucker, Wasser).
- **Rezepte am Handy (Rang 7, kleinste Fassung):** Ist ein Rezept gewählt und bricht die Zeile um, steht die Karte vor der Liste; «Anderes Rezept wählen» springt zur Liste, nach der Wahl springt die Seite zum Kopf. Die Reihenfolge im Dokument bleibt Liste vor Karte (Tastatur). Ausbau (Liste hinter einem Knopf) nicht gebaut.
- **Offerte (Rang 14):** Solange die Summen laden, Skelett in Kacheln, Tabelle und Herleitung; «[Preis]» und «[Gäste]» nur, wenn geladen und der Wert fehlt.
- **Tab-Titel (Rang 15):** `useSeitentitel` im Gerüst setzt den Titel aus der Überschrift («Einkaufsliste – Produktionsplaner», beim Rezept dessen Name).
- Kachel «Nächster Bestellschluss»: `[Bestelltermin]` bricht um. Design System 0.26.

Geprüft: Typen, Lint, Tests, Build; im Browser lesend (Rückfrage geöffnet und abgebrochen). Nicht geprüft, weil es schreibt: Verknüpfen mit Rückfrage und «Rückgängig» selbst.

Offen aus der UX-Liste: 8 bis 12 (Melde-Baustein im Küchenpass, Küchenpass-Zeile mit Rezept und Lagerung, Verlustschutz in der Detailspalte, Herleitung gekürzt, Leitstand-Links), 16 bis 33.

## Nachtrag 20.11.2026: Küchenpass, Ränge 8 und 9

- **Meldezeile (Rang 8):** neuer Baustein im Design System (0.27), fest am unteren Bildschirmrand. Im Küchenpass: «… erledigt · Rückgängig» für 6 s; ein Speicherfehler bleibt stehen mit «Nochmals versuchen» und wird von der Bestätigung einer anderen Zeile nicht ersetzt. Die bisherige Notice «Nicht gespeichert» und die Statuszeile über der Liste entfallen.
- **Zeile (Rang 9):** unter dem Namen Konservierung und Lagerart (Systemzuteilung) und «haltbar bis spätestens» (`wellen_vorschlag.haltbar_bis`). Knopf «Rezept» (ausserhalb der Abhak-Fläche) öffnet die Rezeptkarte im selben Fenster mit `?von=kueche&welle=N`; dort «Zurück zum Küchenpass». `/kueche/?welle=N` öffnet diese Welle; die Adresse folgt der Wahl.
- **Fachfrage MHD entschieden (Dominik, 20.11.2026):** ab Produktionsdatum, siehe Nachtrag «Migration 40».
- Nicht gebaut aus den Vorschlägen: Kennzeichnung «wird gespeichert» an der Zeile; Rückkehr vom Rezept zur selben Zeile (landet am Anfang der Welle).
- Geprüft: Typen, Lint, 203 Tests, Build; im Browser Anzeige, Rezept-Link, Rückweg, Wellenwechsel. **Versehen beim Prüfen:** Ein Test hat «Geräucherter Saibling», Welle 1, kurz als erledigt gespeichert (das Abfangen der Anfrage griff nicht); sofort mit «Rückgängig» zurückgenommen, in der Datenbank kontrolliert (`erledigt_am` leer). Der Fehlerfall («Nochmals versuchen») ist im Browser nicht geprüft.

## Nachtrag 20.11.2026: Migration 40, MHD ab Produktionsdatum

- Entscheid Dominik: «MHD muss ab Produktionsdatum gerechnet werden.»
- `produktion_aufgabe.produziert_am`: Produktionstag, vom Trigger gesetzt (Regeln in `docs/supabase.md`, Abschnitt Checkliste). View `produktion_checkliste` liefert `haltbar_bis` und `haltbar_grundlage`; `wellenplan.haltbar_bis` und sein Hinweis «Haltbarkeit endet am …» rechnen bei abgehakten Zeilen ebenfalls ab dem Produktionstag. `wellen_vorschlag` bleibt (spätester Termin).
- Küchenpass zeigt «produziert … · haltbar bis …», «Produktion … geplant · haltbar bis …» oder «Produktion spätestens … · haltbar bis …». Nach dem Abhaken lädt er nach; bis der Stand zum Häkchen passt, steht «haltbar bis …» ohne Datum. Ohne die Migration gilt wie zuvor «haltbar bis spätestens» aus dem Vorschlag.
- Lesend geprüft: die neun bisherigen Spalten der Checkliste sind identisch (253 Zeilen), `haltbar_bis` der 82 Zeilen mit Welle gleich dem Vorschlag, solange nichts abgehakt ist. Trigger und Wellenplan konnten nur durchgesehen, nicht ausgeführt werden (der Wellenplan hat im Pilot 0 Zeilen).
- **Annahme, offen:** Abgehakt wird am Produktionstag. Wer am nächsten Morgen abhakt, bekommt ein um einen Tag zu spätes MHD; korrigieren lässt sich der Produktionstag in der App nicht. Braucht es das, kommt ein Feld «produziert am».
- Reihenfolge: `supabase db push --remote`, `cd app && npm run types`, `git push`. Die App läuft auch ohne Migration 40.
- **Eingespielt am 20.11.2026.** Danach lesend geprüft: Checkliste mit 13 Spalten, 82 Zeilen mit Grundlage `spaetestens` und MHD gleich dem Vorschlag, 171 ohne Welle; `wellenplan`, `wellen_uebersicht` und `leitstand_wellen` laufen; Trigger enthält `produziert_am`; erzeugte Typen gleich den von Hand nachgeführten. Küchenpass zeigt «Produktion spätestens 24.12.2026 · haltbar bis 14.01.2027». **Noch nie ausgeführt:** der Trigger selbst (Abhaken, Zurücknehmen) und der Wellenplan mit Zeilen; das zeigt sich beim ersten echten Abhaken.

## Nachtrag 20.11.2026: UX-Ränge 11 und 12

- **Herleitung gekürzt (Rang 11):** DataTable-Spalte mit `detail` (Design System 0.28) zeigt zwei Zeilen, ein Klick auf den Text zeigt alles; im Druck steht immer alles. Gesetzt in allen zehn Herleitungsspalten (Produktionsliste, Einkauf, Aufwand, Wellen, Ressourcen, Rezepte). `subDetail` kürzt die Unterzeile «für …» der Einkaufsliste. Gemessen: Produktionsliste 30'564 → 18'189 px, höchste Zeile 548 → 86 px; Einkaufsliste 59'996 → 48'503 px, höchste Zeile 602 → 149 px. Die Kacheln «Zukauf ohne Artikel» und «Noch nicht verknüpft» springen zur Karte.
- **Leitstand (Rang 12, Stufe 1):** Links mit Filter (`/systemzuteilung/?status=offen`, `?hinweis=mit`, `/rezepte/?status=offen`, `/einkauf/zutaten/?saison=<id>`); die Zielseiten lesen den Filter aus der Adresse. Pro Anlass der Stand («11 Services · 6 Menülinien» oder «[Services] · [Menülinien]»), neue Zeile «Zutaten ohne Artikel», Überschrift «Produktionswellen <Saison>». Systemzuteilung: Filter «mit Hinweis» und «nur Komponenten im Bedarf der Saison» (aus der Produktionsliste, ohne Migration). Rezepte: Filter «Nicht freigegeben».
- **Bekannt, nicht gebaut (Stufe 2, braucht eine View):** Der Leitstand zählt Zuteilung und Zukauf weiter über den ganzen Katalog (129 offen), die Saison hat 124; «Rezepte der Saison» zählt 179, die verlinkte Liste zeigt alle 363 nicht freigegebenen. «Prüfhinweise» zählt Hinweise, die Liste Komponenten (heute beide 235).
- Nicht gebaut aus Rang 11: Herleitungsspalte der Produktionsliste am Bildschirm ganz weglassen.
- Offen: Rang 10 (Detailspalte schützt Eingaben, «Speichern und nächste») und 16 bis 33.
