# Konzept: Scan-App für iPhone und Web

Stand: 21.11.2026. Entwurf zur Durchsicht durch Dominik, noch nichts gebaut. Baut auf `docs/spezifikation-etiketten-packliste.md` (Fassung 2) auf und ergänzt sie um die Entscheide vom 20. und 21.11.2026. Wo dieses Konzept und Fassung 2 sich widersprechen, gilt dieses Konzept; die Punkte sind unter «Was neu ist» einzeln genannt und gehören vor dem Bau in eine Fassung 3 der Spezifikation.

## Kurzfassung

Es gibt einen gemeinsamen Kern in der Datenbank und zwei dünne Oberflächen: eine iPhone-App in Swift und eine Seite «Scannen» in der bestehenden Web-App für alle anderen Handys. Beide können dasselbe und liefern dasselbe Ergebnis, weil jede Prüfung in der Datenbank läuft. Gescannt wird an drei Stellen: beim Packen der IFCO, beim Verladen und bei der Ankunft.

## Stand im Repo (21.11.2026)

| Teil | Stand |
| --- | --- |
| Etappe 1: Produkt, Charge, Lagereinheit mit Seriennummer, Beutel-Etikett | gebaut, Migration 41 eingespielt |
| Etappe 2: Lager | gebaut, Migration 42 eingespielt |
| Stufe «Küche» | gebaut, Migration 43 eingespielt |
| Etappe 3: Druck (ZPL, Druckdienst, Zebra ZD621T) | offen |
| Etappe 4: Kiste, Packliste, Ein- und Auspacken, `scan_erfassen`, Seite `/e` | offen |
| Etappe 5: iPhone-App | offen |

Kiste, Packliste und alle Scan-Funktionen sind noch nicht gebaut. Die neuen Punkte unten gehen darum ohne Umbau in die Migration von Etappe 4.

## Was neu ist gegenüber Fassung 2

| Entscheid | Fassung 2 | Neu |
| --- | --- | --- |
| Andere Handys (20.11.) | Android nutzt die Web-App mit Handscanner oder Eintippen | Die Web-App scannt mit der Kamera |
| Sortenrein (20.11.) | Eine Kiste kann mehrere Produkte enthalten | Jede IFCO enthält genau ein Produkt |
| Stufe «Scannen» (20.11.) | Scannen dürfen alle Stufen, auch «Küche» | Zusätzlich eine eigene Stufe, die nur scannt |
| Gewicht (20. und 21.11.) | Gesamtgewicht steht auf dem Kisten-Etikett | Gewicht pro Spiel und Transportart als Angabe für die Logistik |

Unverändert aus Fassung 2: Gepackt wird pro Spiel, die Kiste gehört zu Anlass und Spiel, nicht zu einem Gericht (bestätigt am 21.11.). Der Beutel trägt keinen Anlass und gehört bis zum Packen dem Lager. Der QR-Code des Beutels ist `https://gamma.atoll-os.com/e/?p=<Produktnummer>&s=<Seriennummer>`, der der Kiste `…/e/?k=<Kistencode>`.

## Lösungswege

| Weg | Dafür | Dagegen |
| --- | --- | --- |
| **A, gewählt:** Swift-App fürs iPhone, Scan-Seite in der Web-App für den Rest | Bester Scanner auf dem iPhone. Android braucht keinen Store. Die Web-Seite ist zugleich Notweg fürs iPhone. | Zwei Oberflächen. Bleibt klein, weil die Logik in der Datenbank liegt. |
| B: nur die Web-Seite | Ein einziger Code | Auf dem iPhone schwächer: Safari hat keinen eingebauten Barcode-Leser und keine Vibration |
| C: eine App für iPhone und Android aus einem Code | Nativer Scanner auf beiden | Neue Technik, zwei Stores, zu viel für eine Handvoll Geräte |

## Gemeinsamer Kern

Beide Oberflächen rufen dieselben Funktionen aus Fassung 2 auf und enthalten selbst keine Regeln: `kiste_erstellen`, `beutel_einpacken`, `beutel_auspacken`, `scan_erfassen`, dazu den View `packliste` und die Seite `/e`.

Ergänzungen für Etappe 4:

- `kiste.produkt_id`: das Produkt der Kiste (sortenrein). Gesetzt durch den ersten eingepackten Beutel. Wird die Kiste leer, ist sie wieder frei.
- `scan.scan_nummer` (UUID, vom Gerät vergeben) und `scan.quelle` (iPhone-App oder Web). Ein nach einem Funkloch doppelt gesendeter Kisten-Scan wird so nur einmal gespeichert und meldet nicht fälschlich «schon gescannt». Beim Einpacken reicht die Regel aus Fassung 2 (gleicher Beutel, gleiche Kiste ändert nichts).
- View für das Gewicht pro Kiste, pro Spiel und Transportart, mit Herleitung.
- Beide Oberflächen lesen aus dem QR-Code Produktnummer und Seriennummer oder den Kistencode. Ein Code mit fremder Adresse ist rot «unbekannt» und wird nicht geöffnet.

## Bildschirme

Beide Oberflächen haben dieselben Bildschirme mit denselben Texten.

1. **Anmelden:** bestehender Benutzer, Code aus der E-Mail. Das Gerät bleibt angemeldet.
2. **Spiel und Stufe wählen:** «Packen», «Verladen» oder «Angekommen». Packliste und Lagerbestand des Spiels werden jetzt geladen.
3. **Scannen:** Die Kamera bleibt offen. Die Rückmeldung füllt den ganzen Bildschirm (grün, gelb, rot), dazu Ton und Vibration. Knöpfe: Taschenlampe und «Code von Hand eingeben».
4. **Fehlt noch:** offene Produkte oder Kisten, Abschluss der Stufe mit Bestätigung.
5. **Nachschlagen:** Ein Scan ausserhalb einer Packliste zeigt die Angaben von Beutel oder Kiste.

Ein Bluetooth-Handscanner im Tastaturmodus funktioniert in beiden Oberflächen über das Eingabefeld.

## Packen

1. Stufe «Packen» und Spiel wählen. Die Packliste zeigt Soll und Ist je Produkt als Menge («Thonsauce 4 von 12 kg»).
2. «Kiste anlegen» (nur mit Netz) druckt das Kisten-Etikett, oder das Etikett einer offenen Kiste scannen.
3. Den ersten Beutel scannen. Er legt das Produkt der Kiste fest.
4. Weitere Beutel scannen. Zähler und Gewicht der Kiste laufen mit.
5. Nächste Kiste anlegen oder scannen.

Scan-Ergebnisse wie in Fassung 2, dazu die Zeile für sortenrein:

| Ergebnis | Farbe | Wird eingepackt? |
| --- | --- | --- |
| ok | grün | ja |
| **anderes Produkt als in der Kiste** | rot | nein |
| Produkt steht nicht im Bedarf dieses Spiels | rot | nein |
| Verbrauchsdatum vor dem Service-Datum | rot | nein |
| Beutel ist in einer anderen Kiste | rot | nein |
| Kiste ist schon verladen | rot | nein |
| Beutel ist verbraucht oder entsorgt | rot | nein |
| unbekannter Code | rot | nein |
| Beutel ist schon in dieser Kiste | gelb | nein, schon gezählt |
| Soll dieses Produkts ist schon erreicht | gelb | ja, nach Bestätigung |
| älterer Beutel desselben Produkts im Lager | gelb | ja |
| Kiste über der Gewichtsgrenze | gelb | ja |

**Kisten-Etikett:** Weil die Kiste sortenrein ist, steht nach dem Packen ein Produkt mit Anzahl Beutel, Gewicht und frühestem Datum darauf, nicht mehr eine Liste.

**Auspacken:** Beutel scannen oder in der Kiste antippen; er geht zurück «im Lager».

## Gewicht

Beim Beladen ist das Gewicht der Engpass, nicht das Volumen. Die Nutzlast der Fahrzeuge prüft die App nicht; das ist Sache der Logistik. Die App liefert ihr aber das Gewicht.

- Gezählt werden nur die Speisen in den IFCO-Kisten. Geschirr, Geräte und Getränke fahren nicht im Kühl- oder Tiefkühltransport und bleiben ausserhalb der Rechnung.
- Gewicht der Kiste = Summe der Beutel + Tara. Liter zählen als 1 l = 1 kg (Annahme, wie in der Planung).
- Getrennt nach Transportart, abgeleitet aus der Lagerart der Systemzuteilung: gekühlt (0–2 °C) und tiefgekühlt.
- **Angabe für die Logistik:** Die Packliste zeigt pro Spiel und Transportart die Anzahl Kisten und das Gewicht. Vor dem Packen als Soll aus dem Bedarf (Planwert für die Fahrzeugwahl), nach dem Packen als Ist aus den gescannten Beuteln. Die Angabe lässt sich als PDF oder Text weitergeben.
- Beim Verladen steht neben «14 von 18 Kisten» das geladene Gewicht, zur Kontrolle gegen die weitergegebene Zahl.
- Obergrenze pro Kiste als Einstellung; darüber meldet der Scan gelb. Sie warnt nur und sperrt nichts.
- Gerechnet wird in der Datenbank, mit Herleitung.

## Verladen und Ankunft

Wie in Fassung 2: Spiel und Stufe wählen, jede Kiste scannen. Ergebnisse: ok, anderes Spiel, schon gescannt, unbekannt. Neu dazu: gelb, wenn die Kiste leer ist oder das Soll des Spiels noch nicht gepackt ist.

## iPhone-App (Swift)

| Thema | Lösung |
| --- | --- |
| Oberfläche | SwiftUI, nur iPhone, Hochformat, grosse Tippflächen |
| Scanner | VisionKit, nur QR-Codes, Kamera bleibt offen |
| Rückmeldung | Farbe, Ton, Vibration |
| Daten | Supabase-Paket für Swift |
| Zwischenspeicher | Packliste, Lagerbestand des Spiels und offene Scans lokal (SwiftData) |
| QR-Link | Die App meldet sich für `gamma.atoll-os.com/e/` an; ein Scan mit der normalen Kamera öffnet die App |
| Aussehen | Tokens und Logo aus dem Design System |
| Verteilung | TestFlight; ein Build läuft nach 90 Tagen ab |
| Repo | Eigenes Repo |

Vorschlag: iOS 17 als Minimum (wegen SwiftData).

## Web-App: Seite «Scannen»

- Neue Seite im geschützten Bereich mit eigenem Handy-Layout, ohne die übrige Navigation. Läuft rein im Browser und passt damit zum statischen Export. Start über das Symbol auf dem Home-Bildschirm wie beim Küchenpass.
- Scanner: Chrome und Samsung Internet auf Android bringen einen eingebauten Barcode-Leser mit (`BarcodeDetector`). Firefox und Safari haben ihn nicht oder nur abgeschaltet; dort lädt die Seite einmalig einen eigenen Leser nach (WebAssembly). Quelle: caniuse.com, `mdn-api_barcodedetector`, Stand 20.11.2026.
- Rückmeldung: Farbe und Ton überall, Vibration auf Android. Der Bildschirm bleibt an. Taschenlampe nur, wo Browser und Gerät sie freigeben.
- Bausteine aus dem Design System, Bedienelemente mindestens 44 px.
- Grenzen gegenüber der iPhone-App: Kamera-Freigabe im Browser, schwächer bei wenig Licht, sendet offene Scans nur, solange die Seite offen ist.

## Ohne Netz

Es gilt die Regel aus Fassung 2, für beide Oberflächen:

- Packliste und Lagerbestand des Spiels werden beim Öffnen geladen, Scans lokal geprüft, gespeichert und später mit dem echten Zeitpunkt gesendet.
- Kisten werden nur mit Netz angelegt.
- Ein ohne Netz gescannter Beutel liegt wirklich in der Kiste und wird beim Abgleich immer eingebucht. Abweichungen stehen als «zu klären» in Packliste und App.
- Ein Zähler «n Scans noch nicht gesendet» ist immer sichtbar. Der Abschluss einer Stufe geht erst, wenn alles gesendet ist.
- Fällt die iPhone-App aus (Build abgelaufen), scannt das iPhone über die Web-Seite.

## Stufe «Scannen»

Vierte Stufe neben Admin, Benutzer und Küche, gebaut wie «Küche» (Tabelle `app_scannen`, `stufe()` gibt `scannen`).

- Darf: Spiele und Packlisten lesen, Kisten anlegen (mit Etikett), ein- und auspacken, Verladen und Ankunft scannen, nachschlagen.
- Darf nicht: Rezepte, Produktion, Einkauf, Katalog, Systemzuteilung, Preise, Benutzer; Beutel-Etiketten drucken, einlagern, entsorgen, ein Spiel abschliessen.
- Sieht in der Web-App nur die Seite «Scannen» und die Packliste.
- «Küche», Benutzer und Admin dürfen weiterhin scannen.
- Eigene Migration, weil die Lese-Regeln vieler Tabellen betroffen sind: «Küche» liest fast alles, «Scannen» fast nichts.

## Etappen

1. **Druck** (Etappe 3 der Spezifikation, unverändert).
2. **Stufe «Scannen»:** eigene Migration, Benutzerverwaltung, Seitenschutz.
3. **Packen-Kern:** Migration mit Kiste (Produkt), Packliste, Funktionen, Gewicht; Tests für alle Ergebnisse.
4. **Web-App:** Seite «Packliste» mit der Gewichtsangabe für die Logistik, Seite «Scannen» mit Kamera, Seite `/e`. Prüfbar auf jedem Handy, auch auf dem iPhone.
5. **iPhone-App:** gleiche Bildschirme in SwiftUI, erster Build in TestFlight.
6. **Probelauf:** eine echte Packliste mit gedruckten Etiketten packen und verladen, mit einem iPhone und einem Android-Gerät, einmal im Flugmodus.

## Offene Punkte (Entscheid Dominik)

1. **Weitergabe an die Logistik:** In welcher Form braucht die Logistik das Gewicht (PDF, E-Mail, nur am Bildschirm), und reicht der Planwert vor dem Packen, oder braucht sie das Ist nach dem Packen?
2. **Economat:** Unter welcher Transportart wird Ware aus dem Economat ausgewiesen?
3. **Beutel in Stück:** Sie haben heute kein Gewicht. Soll das Gewicht pro Beutel beim Etikettieren erfasst werden?
4. **Obergrenze pro Kiste:** Braucht es sie, und wenn ja, welcher Wert in kg?
5. **iOS 17 als Minimum:** Haben alle iPhones, die scannen sollen, iOS 17 oder neuer?
6. **Adresse im QR-Code beim Umzug:** `gamma.atoll-os.com` steht auf jedem Etikett. Beim Umzug auf den GAMMA-Server muss die Adresse weiterleiten, solange alte Etiketten im Tiefkühler liegen.

Die offenen Punkte 5 bis 12 der Spezifikation gelten weiter. Punkt 10 (Handscanner am Packtisch) wird mit dem Kamera-Scan in der Web-App weniger dringend.
