# Scan-App für iPhone und Web – Plan für Claude Code

Stand: 21.11.2026. Übergabe aus dem Konzept `docs/konzept-scan-app.md`. S0 ist erledigt (Spezifikation Fassung 3). S1 ist gebaut, Migration 44 am 21.11.2026 eingespielt. Entschieden am 21.11.2026: Frage S1 (Planungstabellen lesbar), Punkt 5 (Kiste immer ein Spiel), Punkt 6 (nicht im Bedarf: nach Bestätigung, «zusätzlich»). S2 ist gebaut, Migration 45 am 21.11.2026 eingespielt. S3 ist gebaut (Migrationen 46 und 47 am 21.11.2026 eingespielt; Migration 48 mit den zehn IFCO-Typen eingespielt; Migration 49 «Hinweis bei Höchstbeladung» eingespielt; nächste Migration ist 50). S4 ist gebaut (Seiten «Packliste» und `/e`), im Browser lesend geprüft. S5 ist gebaut (Seite «Scannen»), auf keinem echten Handy geprüft; entschieden am 21.11.2026: Economat als «ungekühlt», keine Obergrenze nach Gewicht. Nächste Migration ist 46.

**Ziel:** Beutel werden beim Packen in sortenreine IFCO-Kisten gescannt, Kisten beim Verladen und bei der Ankunft. Gescannt wird mit einer iPhone-App in Swift und, auf allen anderen Handys, mit der Kamera in der Web-App. Beide Oberflächen rufen dieselben Funktionen der Datenbank auf.

**Termine:** Dominik startet Anfang Dezember 2026. Pilot ist White Turf im Februar 2027.

**Vor dem Start lesen:** `CLAUDE.md`, `docs/uebergabe-claude-code.md`, `docs/supabase.md`, `docs/spezifikation-etiketten-packliste.md` (Fassung 2), `docs/konzept-scan-app.md`.

**Für jede Aufgabe gilt:**

- Dieser Plan beschreibt Umfang, Dateien und Abnahme, nicht den Code. Vor dem Bauen die Schritte der Aufgabe ausarbeiten und die betroffenen Tabellen, Views und Funktionen lesen (Migrationen 41 bis 43).
- Rechenlogik und jede Prüfung in Views oder SQL-Funktionen. Die Oberflächen zeigen an und rechnen nicht. Neue Migration pro Aufgabe (nächste Nummer ist 44), Views mit `security_invoker = true`, danach `cd app && npm run types`.
- Geschrieben werden Zustand, Lagerbewegung und Scan nur von Funktionen, in einer Transaktion (Regel aus Fassung 2).
- Tests und Typprüfung vor jedem Commit: `cd app && npm test && npm run typecheck`. Ein Commit pro Aufgabe, Nachricht auf Deutsch.
- Migrationen spielt Dominik ein. Neue Funktionen vorher in einer verworfenen Transaktion als `authenticated` durchspielen, wie bei Migration 42.
- Fragen an Dominik (mit **Frage** markiert) vor dem Bauen klären, nicht raten.
- Wo Konzept und Fassung 2 sich widersprechen, gilt das Konzept.

## Entscheide von Dominik

| Datum | Entscheid |
| --- | --- |
| 20.11.2026 | iPhone-App in Swift; alle anderen Handys scannen in der Web-App mit der Kamera. |
| 20.11.2026 | Beim Packen wird jeder Beutel mit eigenem Code einer IFCO zugeteilt. |
| 20.11.2026 | Es gibt eine eigene Stufe «Scannen». |
| 20.11.2026 | Jede IFCO ist sortenrein (ein Produkt). |
| 20.11.2026 | Beim Beladen ist das Gewicht der Engpass, nicht das Volumen. |
| 20.11.2026 | Geschirr, Geräte und Getränke fahren nicht im Kühl- oder Tiefkühltransport und zählen nicht mit. |
| 21.11.2026 | Gepackt wird pro Spiel, nicht pro Gericht. Die Kiste gehört zu Anlass und Spiel. |
| 21.11.2026 | Die Nutzlast prüft die App nicht. Das Gewicht muss aber an die Logistik weitergegeben werden können. |

## Reihenfolge

| Nr. | Aufgabe | Braucht | Wartet auf Dominik |
| --- | --- | --- | --- |
| S0 | Spezifikation auf Fassung 3 nachführen (nur Doku) | – | – |
| S1 | Stufe «Scannen» | – | Frage S1 |
| S2 | Packen-Kern in der Datenbank | S0 | Punkte 5 und 6 der Spezifikation |
| S3 | Gewicht für die Logistik | S2 | Fragen S3 |
| S4 | Web-App: Seite «Packliste» und Seite `/e` | S2, S3 | Frage S4 |
| S5 | Web-App: Seite «Scannen» mit Kamera | S2 | – |
| S6 | iPhone-App (eigenes Repo) | S2, S5 | Frage S6 |
| S7 | Probelauf (Dominik) | S4 bis S6, Druck | – |

Der Druck (Etappe 3 der Spezifikation: ZPL, Druckdienst, Zebra ZD621T) ist nicht Teil dieses Plans. Ohne ihn bleiben Druckaufträge «offen», wie seit Etappe 1; S1 bis S6 sind trotzdem bau- und prüfbar.

### S0: Spezifikation auf Fassung 3 nachführen

- `docs/spezifikation-etiketten-packliste.md` als Fassung 3: Abschnitt «Was sich gegenüber Fassung 2 ändert» mit den vier Punkten aus dem Konzept (Kamera-Scan in der Web-App, sortenrein, Stufe «Scannen», Gewicht für die Logistik).
- Nachführen: Tabelle der Entscheide, «Nicht im Umfang» (Android), Kisten-Etikett (ein Produkt statt Liste), Scan-Ergebnisse (Zeile «anderes Produkt als in der Kiste»), Datenbank (`kiste.produkt_id`, `scan.scan_nummer`, `scan.quelle`), Rechte, Etappen, offene Punkte.
- Nur Doku, kein Code. Abnahme: Konzept und Spezifikation widersprechen sich nicht mehr.

### S1: Stufe «Scannen»

- Migration: `app_scannen` und `stufe()` gibt `scannen`, gebaut wie `app_kueche` (Migration 43). Admin geht vor, danach Küche, danach Scannen.
- «Scannen» liest nur, was Packen, Verladen, Ankunft und Nachschlagen brauchen, und schreibt nichts direkt. Alle anderen Lese-Regeln schliessen die Stufe aus. Die Regeln aus Migration 43 lesen, bevor sie geändert werden.
- `lager_recht` um die Rechte fürs Packen und Scannen ergänzen (einzige Stelle für die Rechte des Lagers). «Scannen» darf: Kiste anlegen, ein- und auspacken, Verladen und Ankunft scannen. Nicht: Beutel-Etiketten drucken, einlagern, entsorgen, ein Spiel abschliessen.
- Benutzerverwaltung (Edge Function und Seite `benutzer`): Stufe «Scannen» wählbar.
- App: `lib/stufe.ts`, Navigation und Seitenschutz im `Geruest`. «Scannen» sieht nur «Scannen» und «Packliste» und landet nach der Anmeldung auf «Scannen».
- **Frage S1:** Liste der Tabellen und Views, die «Scannen» lesen darf, Dominik zur Bestätigung vorlegen (Vorschlag: Anlass und Service ohne Umsatz, Produkt, Charge, Lagereinheit, Kiste, Packliste; keine Rezepte, keine Geld-Tabellen).
- Abnahme: Ein Konto der Stufe «Scannen» liest über die Schnittstelle keine Rezepte, Artikel, Offerten und Kosten; ein Konto «Küche» verhält sich wie vorher. Tests in `app/tests/`.

### S2: Packen-Kern in der Datenbank

- Tabellen `kiste` und `scan`, View `packliste`, View `etikett_kiste`, Funktionen `kiste_erstellen`, `beutel_einpacken`, `beutel_auspacken`, `kiste_aufloesen`, `scan_erfassen`, `service_abschliessen`, wie in der Spezifikation (Abschnitte «Packen und Packliste» und «Datenbank»).
- Neu gegenüber Fassung 2:
  - `kiste.produkt_id`: gesetzt durch den ersten eingepackten Beutel, wieder leer, wenn die Kiste leer ist. Ein Beutel mit anderem Produkt gibt das Ergebnis «anderes Produkt als in der Kiste» (rot, wird nicht eingepackt).
  - `scan.scan_nummer` (UUID vom Gerät, eindeutig) und `scan.quelle` (`ios` oder `web`). `scan_erfassen` mit einer schon gespeicherten Scan-Nummer gibt das gespeicherte Ergebnis zurück und speichert nichts.
  - Regel für Scans ohne Netz aus Fassung 2: Ein nachgesendeter Beutel wird immer eingebucht; Abweichungen stehen als «zu klären» in der Packliste. Dafür braucht `beutel_einpacken` ein Kennzeichen «ohne Netz gescannt».
- `druckauftrag` trägt heute nur `lagereinheit_id` (nicht leer). Für das Kisten-Etikett die Spalte für die Kiste ergänzen (genau eine der beiden gesetzt, wie in der Spezifikation).
- Fremdschlüssel «restrict», Index auf jedem Fremdschlüssel, Zugriffsregeln im Muster von Migration 43.
- Offen aus der Spezifikation und vor dem Bau zu klären: Punkt 5 (Kiste für mehrere Spiele) und Punkt 6 (Produkt nicht im Bedarf: sperren oder nach Bestätigung erlauben).
- Abnahme: Jedes Ergebnis der Tabelle im Konzept, Abschnitt «Packen», ist in einer verworfenen Transaktion durchgespielt, dazu doppelt gesendete Scans und zwei Geräte im selben Spiel. Bestand in `lager_bestand` stimmt nach jeder Bewegung. Kontrollwerte aus der Excel unverändert.

### S3: Gewicht für die Logistik

- View pro Kiste: Gewicht = Summe der Beutel + Tara, mit Herleitung. Liter als 1 l = 1 kg, als Annahme gekennzeichnet.
- View pro Service und Transportart (gekühlt 0–2 °C, tiefgekühlt; aus der Lagerart der Systemzuteilung): Anzahl Kisten und Gewicht, als Soll aus dem Bedarf (Planwert vor dem Packen, mit «rund n Kisten» aus `rezept.fuellmenge_g`) und als Ist aus den gescannten Beuteln.
- Eine unvollständige Zahl wird nie als Total ausgegeben: Fehlt bei einem Produkt die Lagerart oder das Gewicht, weist der View es getrennt aus («n Produkte ohne Lagerart»). Am 20.11.2026 fehlte die Lagerart bei 72 von 82 Zeilen des Wellen-Vorschlags.
- Keine Prüfung gegen eine Nutzlast.
- **Frage S3a:** Unter welcher Transportart wird Ware aus dem Economat ausgewiesen?
- **Frage S3b:** Beutel in Stück haben kein Gewicht. Soll das Gewicht pro Beutel beim Etikettieren erfasst werden? Bis zur Antwort: getrennt ausweisen, nicht schätzen.
- **Frage S3c:** Braucht es eine Obergrenze pro Kiste, und wenn ja, welcher Wert in kg? Bis zur Antwort nicht bauen.
- Abnahme: Für ein Spiel mit Testdaten stimmen Soll und Ist von Hand nachgerechnet; jede Zahl hat eine Herleitung.

### S4: Web-App, Seite «Packliste» und Seite `/e`

- Seite «Packliste» pro Spiel wie in der Spezifikation (Soll und Ist je Produkt, Kisten, anlegen, ein- und auspacken, Abschluss), mit Eingabefeld für Handscanner und Eintippen.
- Neu: Karte «Gewicht für die Logistik» pro Transportart (Kisten, kg, Soll und Ist) mit «Weitergeben».
- Seite `/e` wie in der Spezifikation. Sie liest `?p=…&s=…` oder `?k=…`.
- **Frage S4:** In welcher Form braucht die Logistik das Gewicht (Druckansicht als PDF, Text zum Kopieren, E-Mail), und reicht der Planwert vor dem Packen, oder braucht sie das Ist danach? Bis zur Antwort: Druckansicht und «Text kopieren», beide Werte.
- Bausteine aus dem Design System; neue Muster dort aufnehmen (CHANGELOG).
- Abnahme: Tests wie bei `lager.test.ts`; mit einem Konto «Scannen» und einem Konto «Küche» im Browser bedient.

### S5: Web-App, Seite «Scannen» mit Kamera

- Neue Seite im geschützten Bereich mit eigenem Handy-Layout ohne die übrige Navigation, rein im Browser (statischer Export). Fünf Bildschirme wie im Konzept, Abschnitt «Bildschirme».
- `lib/scan-code.ts`: liest aus dem gescannten Text Produktnummer und Seriennummer oder den Kistencode. Fremde Adressen sind «unbekannt». Mit Tests.
- Scanner: `BarcodeDetector`, wo der Browser ihn hat (Chrome und Samsung Internet auf Android). Sonst ein nachgeladener Leser. Vor dem Einbau Lizenz, Grösse und Pflegestand der Bibliothek prüfen und Dominik die Wahl nennen; nur nachladen, wenn nötig.
- Rückmeldung: Farbe über den ganzen Bildschirm, Ton, Vibration wo vorhanden, Bildschirm bleibt an, Taschenlampe wo freigegeben. Neuer Baustein im Design System.
- Ohne Netz: Packliste und Lagerbestand des Spiels beim Öffnen laden, Scans lokal prüfen und in IndexedDB speichern, später mit dem echten Zeitpunkt und der Scan-Nummer senden. Zähler «n Scans noch nicht gesendet» immer sichtbar; Abschluss einer Stufe erst, wenn alles gesendet ist. Kisten nur mit Netz anlegen.
- Kamera nicht freigegeben: Hinweis mit Anleitung, Eingabe von Hand bleibt möglich.
- Abnahme: auf einem Android-Gerät (Chrome) und einem iPhone (Safari) Beutel und Kisten mit Testdaten gescannt, einmal im Flugmodus mit Abgleich danach. Was nicht auf einem echten Gerät geprüft wurde, steht im Nachtrag als «nicht ausgeführt».

### S6: iPhone-App (eigenes Repo)

- Eigenes Repo neben diesem, Vorschlag `~/Developer/Gamma/gamma-scan`. SwiftUI, nur iPhone, Hochformat. Projekt aus `project.yml` mit XcodeGen, wie bei Dominiks anderen Apps.
- Scanner von Apple (VisionKit), nur QR-Codes. Supabase-Paket für Swift, Anmeldung mit Code aus der E-Mail. Zwischenspeicher mit SwiftData.
- Gleiche fünf Bildschirme und gleiche Texte wie S5. Keine eigene Prüflogik ausser der vorläufigen Prüfung ohne Netz; massgebend ist das Ergebnis der Datenbank.
- QR-Link öffnet die App: Associated Domains für `gamma.atoll-os.com`, dazu in diesem Repo `app/public/.well-known/apple-app-site-association` (Auslieferung über Apache prüfen: Inhaltstyp, kein Redirect).
- Farben und Logo aus `design-system/tokens.json`.
- Verteilung über TestFlight; den Upload macht Dominik.
- ~~Frage S6~~ Entschieden am 22.11.2026 (Dominik): iOS 17 ist Standard, also das Minimum.
- Abnahme: Unit-Tests für Code-Lesen, Warteschlange und Abgleich; auf einem echten iPhone gescannt (der Scanner läuft nicht im Simulator).

### S7: Probelauf (Dominik)

Eine echte Packliste mit gedruckten Etiketten in Hünenberg packen und verladen, mit einem iPhone und einem Android-Gerät, einmal im Flugmodus. Braucht den Druck (Etappe 3).

## Nicht in diesem Plan

- Druck (Etappe 3 der Spezifikation).
- Prüfung der Nutzlast und Fahrzeugplanung.
- Gewicht von Geschirr, Geräten und Getränken.
- Zuteilung einer Kiste zu einem Gericht.
- Android-App.
- Adresse im QR-Code beim Umzug auf den GAMMA-Server: beim Umzug muss `gamma.atoll-os.com/e/` weiterleiten, solange alte Etiketten im Tiefkühler liegen. Beim Umzug klären.
