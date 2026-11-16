# Spezifikation: Etiketten, Druck und Packlisten-Kontrolle

Stand: 16.11.2026. Entwurf zur Durchsicht durch Dominik, noch nichts gebaut.

## Ziel

Jeder Beutel und jede IFCO-Kiste trägt ein Etikett aus den Daten des Produktionsplaners. Gedruckt wird aus dem Küchenpass mit einem Tipp. Der QR-Code auf dem Etikett dient zum Nachschlagen und zur Kontrolle der Packliste beim Verladen und bei der Ankunft.

## Entscheide von Dominik (16.11.2026)

- Drucker: Citizen CL-S631 (Thermotransfer, 300 dpi, ZPL-Emulation).
- Der Druckdienst läuft auf einem Windows-PC.
- Die Packliste wird über die QR-Codes kontrolliert.
- Gescannt wird mit einer eigenen iPhone-App in Swift. Es scannen 2 bis 3 Personen, verteilt wird über TestFlight.

## Nicht im Umfang

- Scannen einzelner Beutel beim Einpacken in die Kiste.
- Stufe «verbraucht» und Rückverfolgung bis zum Gast.
- Android-App. Android-Geräte nutzen die Web-App ohne Scan-Funktion.
- Etiketten für Geschirr, Geräte und Getränke.

## Begriffe

- **Charge:** eine Komponente, in einer Welle für ein Spiel produziert. Trägt Produktionsdatum und Verbrauchsdatum.
- **Einheit:** ein Beutel oder eine Kiste. Jede Einheit hat einen eigenen Kurzcode. Ein Beutel liegt in genau einer Kiste.
- **Kurzcode:** 8 Zeichen, zufällig, ohne verwechselbare Zeichen (0/O, 1/I/L). Steht im QR-Code und klein lesbar auf dem Etikett.

## Ablauf

1. Im Küchenpass ist eine Komponente der Welle abgehakt. Knopf «Etiketten drucken».
2. Die App schlägt pro Spiel vor: Anzahl Beutel und Anzahl Kisten. Beide Zahlen sind übersteuerbar, ebenso das Verbrauchsdatum.
3. «Drucken» legt Charge, Einheiten und einen Druckauftrag an. Der Druckdienst druckt zuerst die Beutel, dann die Kisten, nach Spiel sortiert.
4. Beim Verladen und bei der Ankunft wird jede Kiste mit der iPhone-App gescannt. Die Packliste zeigt den Stand.

## Rechnung der Stückzahlen

- Menge pro Spiel: aus der Produktionsliste pro Spiel (bestehend).
- Beutel = Menge ÷ Füllmenge pro Beutel, aufgerundet.
- Kisten = Menge ÷ Füllmenge pro Gebinde, aufgerundet (bestehendes Feld `rezept.fuellmenge_g`, wie in `planung_service_komponente`).
- Beutel pro Kiste = Füllmenge pro Gebinde ÷ Füllmenge pro Beutel, abgerundet. Die Beutel werden der Reihe nach auf die Kisten verteilt.
- Neu nötig: Feld `rezept.beutel_g` (Füllmenge pro Beutel in Gramm), zu pflegen in der Karte «Planung: Gebinde und Service». Fehlt der Wert, schlägt die App nichts vor und verlangt die Anzahl Beutel von Hand.
- Jede Zahl hat eine Herleitung als Text, wie bei den anderen Views.

## Verbrauchsdatum

- Verbrauchen bis = Produktionsdatum + `haltbarkeit_tage` der Komponente (bestehender View).
- Fehlt die Haltbarkeit (Komponente mit Status offen), muss das Datum beim Druck von Hand gesetzt werden. Ohne Verbrauchsdatum wird kein Etikett gedruckt. Das ist die einzige Sperre, sonst gilt: Prüfhinweise sperren nichts.
- Ein von Hand gesetztes Datum wird als Annahme gekennzeichnet und mit Benutzer gespeichert.

## Etikett

Format als Einstellung, Standard 100 × 50 mm für Beutel und Kiste (eine Rolle, kein Wechsel).

| Feld | Beutel | Kiste |
| --- | --- | --- |
| Produkt (Komponente) | gross | Inhaltsliste: Produkt × Anzahl Beutel, höchstens 4 Zeilen, sonst «+ n weitere» |
| Anlass, Spiel, Service-Datum | ja | gross |
| Menülinie | ja | ja |
| Gericht | nur wenn die Komponente im Spiel zu genau einem Gericht gehört | nein |
| Menge | Gewicht pro Beutel | Gesamtgewicht inkl. Tara |
| Produziert am | ja | nein |
| Verbrauchen bis | gross | frühestes Datum des Inhalts |
| Lagerung | aus der Systemzuteilung (0–2 °C, TK, Economat) | ja |
| Regeneration | aus der Systemzuteilung | nein |
| Allergene | siehe offene Punkte | nein |
| Zähler | «Beutel 3 von 12» | «Kiste 2 von 5» |
| QR-Code und Kurzcode | ja | ja |

Der QR-Code enthält nur den Link `https://gamma.atoll-os.com/e/?c=<Kurzcode>`, keine Daten.

## Datenbank

Neue Tabellen, alle mit Row Level Security, Policy für `authenticated`, Index auf jedem Fremdschlüssel:

- `charge`: Komponente, Welle, Service, Menge, produziert am, verbrauchen bis, Annahme-Kennzeichen, erstellt von.
- `einheit`: Charge (bei Beuteln), Art (Beutel oder Kiste), Kurzcode (eindeutig), Laufnummer, Kiste (bei Beuteln), Service.
- `druckauftrag`: Einheit, ZPL-Text, Status (offen, in Arbeit, gedruckt, Fehler), Fehlertext, Zeitstempel, erstellt von.
- `druckdienst_status`: letzter Lebenszeichen-Zeitpunkt des Druckdienstes.
- `scan`: Einheit, Stufe (verladen, angekommen), Zeitpunkt des Scans, Benutzer, Service der geöffneten Packliste, Ergebnis.

Views und Funktionen:

- `etikett_vorschlag`: Stückzahlen pro Komponente, Welle und Spiel mit Herleitung.
- `etikett_daten`: alle Felder eines Etiketts pro Einheit. Die Web-Vorschau und der ZPL-Text lesen beide daraus.
- `etiketten_erstellen(...)`: legt Charge, Einheiten und Druckaufträge in einer Transaktion an. Der ZPL-Text wird in der Datenbank aus `etikett_daten` erzeugt.
- `packliste`: pro Spiel alle Kisten mit Stand pro Stufe.
- `scan_erfassen(kurzcode, service, stufe, zeitpunkt)`: prüft und speichert. Ergebnis: ok, anderes Spiel, schon gescannt, Verbrauchsdatum vor Service-Datum, unbekannt.

Die App rechnet nichts selbst. Schemaänderungen nur als Migration.

## Druckdienst (Windows)

- Kleines Programm in Node.js, als Windows-Dienst eingerichtet, startet mit dem PC ohne Anmeldung. Liegt im Repo unter `druckdienst/`.
- Holt offene Druckaufträge, sendet den ZPL-Text an den Drucker und meldet «gedruckt» oder den Fehler zurück.
- Anschluss als Einstellung: Netzwerk (TCP-Port 9100, braucht die Ethernet-Option des Druckers) oder USB (Rohdaten über die Windows-Druckwarteschlange).
- Eigener Datenbank-Benutzer, der nur Druckaufträge lesen und abschliessen sowie das Lebenszeichen setzen darf. Zugangsdaten in einer lokalen Datei auf dem PC, nicht im Repo.
- Setzt jede Minute ein Lebenszeichen. Ist es älter als 5 Minuten, zeigt die App «Drucker nicht erreichbar seit …».
- Aufträge gehen nicht verloren: Was offen ist, wird gedruckt, sobald der Dienst wieder läuft. Ein Auftrag «in Arbeit», der länger als 2 Minuten hängt, gilt als Fehler und wird nicht von selbst wiederholt (sonst doppelte Etiketten).
- Nur Standard-PostgreSQL und offene Supabase-Funktionen, damit der Umzug auf den GAMMA-Server ohne Umbau geht.

## Web-App

- Küchenpass: Knopf «Etiketten drucken», Dialog mit Vorschlag, Übersteuerung und Vorschau des Etiketts.
- Seite «Druckaufträge»: Stand pro Auftrag, «nochmals drucken» (gleicher Kurzcode, kein neuer Beutel), Zustand des Druckdienstes.
- Seite `/e`: zeigt zu einem Kurzcode Produkt, Charge, Daten, Lagerung, Regeneration, bei Kisten den Inhalt. Nur für angemeldete Benutzer.
- Seite «Packliste» pro Spiel: Kisten mit Stand «verladen» und «angekommen», offene Kisten, Abschluss mit Bestätigung, wenn etwas fehlt.
- Neue Bausteine nach den Regeln des Design Systems.

## iPhone-App (Swift)

- SwiftUI, ab iOS 16, Scanner von Apple (VisionKit), Supabase-Paket für Swift. Eigenes Repo.
- Anmelden mit bestehendem Benutzer, mit Code aus der E-Mail statt Link.
- Spiel und Stufe wählen, dann scannen: Kamera bleibt offen, Rückmeldung grün, rot oder gelb mit Ton und Vibration, Zähler «14 von 18».
- Liste der offenen Kisten, Abschluss mit Bestätigung.
- Einzelner Scan ausserhalb einer Packliste zeigt die Angaben der Einheit.
- Ohne Netz: Die Packliste wird beim Öffnen geladen, Scans werden lokal geprüft, gespeichert und später mit dem echten Scan-Zeitpunkt gesendet. Massgebend ist das Ergebnis der Datenbank; weicht es ab, zeigt die App das an.
- Verteilung über TestFlight. Ein Build läuft nach 90 Tagen ab.

## Fehlerfälle

| Fall | Verhalten |
| --- | --- |
| Druckdienst steht | Auftrag bleibt offen, App zeigt den Hinweis, Druck folgt später |
| Drucker ohne Etiketten oder Farbband | Auftrag «Fehler» mit Text, «nochmals drucken» |
| Etikett beschädigt | «nochmals drucken», gleicher Kurzcode |
| Menge ändert nach dem Druck | Charge bleibt, zusätzliche Einheiten nachdrucken oder einzelne stornieren; stornierte zählen in der Packliste nicht |
| Kiste im falschen Spiel gescannt | rot, wird gespeichert, zählt nicht |
| Kiste zweimal gescannt | rot «schon gescannt», zählt einmal |
| Unbekannter Code | rot «unbekannt» |

## Tests

- Datenbank: Stückzahlen (Rundung, fehlende Füllmenge), Verbrauchsdatum, alle Ergebnisse von `scan_erfassen`, Rechte des Druckdienst-Benutzers.
- Web-App: Dialog, Vorschau, Packliste, wie die bestehenden Tests.
- Druckdienst: gegen einen nachgebauten Drucker (lokaler TCP-Port), dazu ein Probedruck am echten CL-S631 mit den gewählten Etiketten.
- iPhone-App: Prüfung ohne Netz und Abgleich danach.
- Kontrollwerte aus der Excel müssen unverändert bleiben.

## Etappen

1. Daten und Etiketten in der Web-App: Migration, Vorschlag, Dialog, Vorschau. Ohne Drucker prüfbar.
2. Druck: ZPL, Druckaufträge, Druckdienst, Probedruck.
3. QR-Seite und Packliste in der Web-App, Funktion `scan_erfassen`.
4. iPhone-App.

## Material (Empfehlung, nicht Teil des Baus)

- Beutel: Kunststoff-Etiketten mit Harz-Farbband, Kleber für nass und TK.
- IFCO-Kisten: nur Etiketten mit von IFCO freigegebenem, abwaschbarem Kleber oder Einsteckkarten.
- Drucker mit Ethernet-Option bestellen, falls er nicht direkt am PC stehen soll.

## Offene Punkte (Entscheid Dominik)

1. Allergene: Sie liegen heute am Artikel. Auf das Etikett kommen sie nur verlässlich, wenn alle Zutaten des Rezepts einem Artikel zugeordnet sind. Vorschlag: sonst die Zeile «Allergene: siehe Rezept» drucken, nie eine unvollständige Liste.
2. Etikettenformat und Material, sobald die Rollen gewählt sind.
3. Steht der Drucker am PC (USB) oder am Posten (Ethernet)?
4. Kiste mit Beuteln für mehrere Spiele: heute nicht vorgesehen, eine Kiste gehört zu einem Spiel. Stimmt das?
5. Darf die Seite `/e` ohne Anmeldung etwas zeigen (z. B. nur Produkt und Verbrauchsdatum), für Personal vor Ort ohne Zugang?
