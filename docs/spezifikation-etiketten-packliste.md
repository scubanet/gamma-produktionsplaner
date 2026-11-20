# Spezifikation: Etiketten, Lager, Druck und Packliste

Stand: 20.11.2026, Fassung 2 (nach interner Durchsicht gegen das Datenmodell ergänzt). Entwurf zur Durchsicht durch Dominik, noch nichts gebaut. Ersetzt die Fassung vom 16.11.2026 (im Git-Verlauf).

## Was sich gegenüber Fassung 1 ändert

- **Produkt-Etiketten tragen keinen Anlass und keine Menülinie mehr.** Ein Beutel gehört zuerst nur dem Lager. Erst beim Packen in eine IFCO-Kiste wird er einem Anlass zugeteilt.
- **Nur das Kisten-Etikett nennt Anlass, Spiel und Menülinie.**
- **Lager:** Die App führt den Bestand aller etikettierten Produkte. Jeder Beutel hat eine Seriennummer; der QR-Code enthält Produkt und Seriennummer.
- **Jeder Beutel wird beim Einpacken gescannt** (in Fassung 1 ausdrücklich nicht im Umfang). Damit weiss die Kiste, was drin ist, und das Lager stimmt pro Seriennummer.
- **Drucker:** Zebra ZD621T (Thermotransfer, 203 dpi, WLAN, LAN, USB, Bluetooth) statt Citizen CL-S631 (300 dpi). Das Layout wird für 203 dpi neu gesetzt.
- **MHD ab Produktionsdatum** (Entscheid 20.11.2026, Migration 40).

## Entscheide von Dominik

| Datum | Entscheid |
| --- | --- |
| 16.11.2026 | Der Druckdienst läuft auf einem Windows-PC. |
| 16.11.2026 | Gescannt wird mit einer eigenen iPhone-App in Swift, 2 bis 3 Personen, Verteilung über TestFlight. |
| 20.11.2026 | Drucker Zebra ZD621T, 203 dpi. |
| 20.11.2026 | Etikett 100 × 50 mm. Das Material wird noch abgeklärt (tiefkühl- und kühlraumtauglich); die Grösse bleibt. |
| 20.11.2026 | Produkt-Etikett ohne Anlass und Menülinie; diese stehen nur auf dem Kisten-Etikett. |
| 20.11.2026 | Lager aller Produkte mit Seriennummer im QR-Code. |
| 20.11.2026 | Beim Packen wird jeder Beutel in die Kiste gescannt. |
| 20.11.2026 | MHD rechnet ab Produktionsdatum. |
| 20.11.2026 | Ware bleibt über den Wechsel der Kollektion im Lager. Es gibt darum einen eigenen Stammsatz «Produkt». |
| 20.11.2026 | Beutelzahl: pro Spiel aufrunden, alle Beutel gleich gross; die Mehrmenge steht in der Herleitung. |
| 20.11.2026 | Allergene: nur drucken, wenn das Rezept vollständig mit Artikeln verknüpft ist; sonst «siehe Rezept». |
| 20.11.2026 | Die neue Stufe «Küche» darf Etiketten drucken und Lager und Kisten scannen (eigene Arbeit, siehe «Rechte»). |

## Umfang

Im Umfang:
- Etiketten für Beutel (Produkt) und IFCO-Kisten, Druck auf dem ZD621T.
- Lager der selbst produzierten, etikettierten Produkte.
- Packen mit Scan jedes Beutels, Packliste pro Spiel, Kontrolle beim Verladen und bei der Ankunft.

Vorgesehen, aber nicht in den ersten Etappen:
- Zugekaufte Fertigprodukte (CF-Stufe 4 und 5) mit eigenem Etikett und Seriennummer. Die Tabellen werden so angelegt, dass sie ohne Umbau dazukommen.

Nicht im Umfang:
- Rohwaren (Wareneingang, Verbrauch in der Produktion).
- Rückverfolgung bis zum Gast.
- Android-App. Android-Geräte nutzen die Web-App.
- Etiketten für Geschirr, Geräte und Getränke.

## Begriffe

- **Produkt:** das, was etikettiert im Lager liegt, unabhängig von der Kollektion. Hat eine feste Produktnummer (z.B. `P0123`), Name und Kategorie. Die Komponenten jeder Kollektion zeigen auf ihr Produkt; so behält der Portweinjus seine Nummer, wenn die Kollektion wechselt, und Bestand aus der alten Kollektion zählt für den Bedarf der neuen.
- **Charge:** ein Produkt aus einer Zeile der Checkliste (Saison, Welle) an einem Produktionstag. Trägt Produktionsdatum, Haltbarkeit und Verbrauchsdatum. Eine Charge gehört zu keinem Anlass; Saison und Welle sind nur die Herkunft und stehen nicht auf dem Etikett. Ein weiterer Druck für dieselbe Zeile am selben Tag hängt Beutel an diese Charge an, die Laufnummern laufen weiter.
- **Lagereinheit (Beutel):** ein etikettierter Beutel einer Charge mit eigener Seriennummer. Hat einen Zustand: im Lager, in Kiste, verbraucht, entsorgt.
- **Kiste:** eine IFCO-Kiste für ein Spiel (Service) eines Anlasses. Enthält gescannte Beutel. Hat einen eigenen Code.
- **Seriennummer:** 8 Zeichen, zufällig, ohne verwechselbare Zeichen (0/O, 1/I/L), über alle Produkte eindeutig. Steht im QR-Code und lesbar auf dem Etikett.

## QR-Code

- Beutel: `https://gamma.atoll-os.com/e/?p=<Produktnummer>&s=<Seriennummer>`
- Kiste: `https://gamma.atoll-os.com/e/?k=<Kistencode>`
- Der Code enthält Produkt und Seriennummer, sonst keine Daten (kein Datum, kein Name). Alles Weitere steht in der Datenbank.
- Die Produktnummer steht im Code, damit die Scan-App das Produkt auch ohne Netz erkennt. Massgebend bleibt die Seriennummer.
- Unter dem QR-Code steht lesbar «P0123 · K7M4X2PA», zum Abtippen, wenn der Code beschädigt ist.

## Ablauf

1. **Produzieren und etikettieren.** Im Küchenpass ist eine Komponente der Welle abgehakt; erst dann ist der Knopf «Etiketten drucken» aktiv. Der Dialog zeigt das Produktionsdatum (Tag des Abhakens) und schlägt die Anzahl Beutel vor, beides übersteuerbar. Das Produktionsdatum lässt sich nur auf einen früheren Tag korrigieren, nie auf einen späteren. «Drucken» legt die Charge und die Lagereinheiten an (Zustand «im Lager») und druckt die Etiketten. Gibt es zur Zeile schon Beutel, zeigt der Dialog «bereits n Beutel, m kg etikettiert» und schlägt nur die Restmenge vor.
   - **Ohne Welle einlagern:** Auf der Seite «Lager» gibt es «Produkt einlagern» (Produkt, Produktionsdatum, Anzahl, Menge pro Beutel). So werden der Anfangsbestand, Produktion ausserhalb einer Welle und Komponenten ohne Welle erfasst. Das Produktionsdatum ist dann von Hand gesetzt und als Annahme gekennzeichnet.
2. **Lager.** Die Seite «Lager» zeigt den Bestand pro Produkt: Anzahl Beutel, Menge, frühestes Verbrauchsdatum, was bald abläuft und was abgelaufen ist.
3. **Packen.** Auf der Packliste eines Spiels steht, was gebraucht wird. Eine Kiste anlegen, ihr Etikett drucken, dann jeden Beutel in die Kiste scannen. Der Beutel wechselt auf «in Kiste» und ist dem Spiel zugeteilt.
4. **Verladen und Ankunft.** Jede Kiste wird gescannt. Die Packliste zeigt den Stand.
5. **Abschluss.** Beim Abschluss des Spiels werden die Beutel aller Kisten «verbraucht». Kisten ohne Ankunfts-Scan listet der Abschluss einzeln auf; pro Kiste wird bestätigt: verbraucht, zurück ins Lager oder entsorgt. Rückläufer: siehe offene Punkte.

## Stückzahlen

- Beutel werden ganz einem Spiel zugeteilt. Deckt eine Welle mehrere Spiele, rechnet der Vorschlag darum pro Spiel und summiert: Beutel = Summe über die Spiele der Welle von (Bedarf des Spiels ÷ Füllmenge pro Beutel, aufgerundet). Das sind bis zu (Spiele − 1) Beutel mehr als Wellenmenge ÷ Füllmenge. Die Herleitung nennt die Spiele einzeln («Spiel 1: 3.33 kg ÷ 2 kg = 2 Beutel + …»).
- Einheiten: Bedarf in kg ÷ Füllmenge in Gramm. Bedarf in Liter: 1 l = 1 kg, als Annahme gekennzeichnet (wie heute in der Planung). Bedarf in Stück: kein Vorschlag, Anzahl Beutel und Stück pro Beutel von Hand.
- Neu nötig: Feld `rezept.beutel_g` (Füllmenge pro Beutel in Gramm), zu pflegen in der Karte «Planung: Gebinde und Service». Fehlt der Wert, schlägt die App nichts vor und verlangt Anzahl und Menge pro Beutel von Hand.
- Kisten werden nicht mehr vorgeschlagen. Sie entstehen beim Packen. Die Packliste zeigt als Anhalt «rund n Kisten» aus `rezept.fuellmenge_g`.
- Jede Zahl hat eine Herleitung als Text.

## Verbrauchsdatum

- Verbrauchen bis = Produktionsdatum + `haltbarkeit_tage` der Komponente. Das Produktionsdatum ist der Tag, an dem im Küchenpass abgehakt wurde (`produktion_aufgabe.produziert_am`, Migration 40).
- Produktionsdatum und Verbrauchsdatum werden beim Druck an der Charge festgehalten. Ändert die Systemzuteilung später, bleibt das gedruckte Datum gültig; die Seite «Lager» zeigt die Abweichung als Hinweis.
- Fehlt die Haltbarkeit, muss das Datum beim Druck von Hand gesetzt werden. Ohne Verbrauchsdatum wird kein Etikett gedruckt. Beim Druck ist das die einzige Sperre; die Sperren beim Packen stehen in der Tabelle der Scan-Ergebnisse.
- Ein von Hand gesetztes Datum wird als Annahme gekennzeichnet und mit Benutzer gespeichert.

## Etiketten

100 × 50 mm, Beutel und Kiste von derselben Rolle. Bei 203 dpi sind das rund 800 × 400 Punkte (8 Punkte pro mm; vor dem Bau am Datenblatt des ZD621T prüfen).

| Feld | Beutel (Produkt) | Kiste |
| --- | --- | --- |
| Kopfzeile | Kategorie des Produkts | Anlass und Menülinie |
| Hauptzeile | Produkt, gross; Marke «TK» bei Tiefkühlware | Spiel und Service-Datum, gross |
| Anlass, Spiel, Menülinie | **nein** | ja |
| Inhalt | – | Produkt × Anzahl Beutel, höchstens 4 Zeilen, sonst «+ n weitere» |
| Menge | Gewicht des Beutels | Gesamtgewicht inkl. Tara |
| Produziert am | ja | nein |
| Verbrauchen bis | gross, im schwarzen Feld | frühestes Datum des Inhalts |
| Lagerung | aus der Systemzuteilung (0–2 °C, TK, Economat) | ja |
| Regeneration | aus der Systemzuteilung | nein |
| Allergene | siehe offene Punkte | nein |
| Zähler | «Beutel 3 von 12» der Charge | «Kiste 2 von 5» des Spiels |
| QR-Code | Produkt und Seriennummer | Kistencode |
| Lesbar unter dem Code | «P0123 · K7M4X2PA» | Kistencode |

Hinweise zum Kisten-Etikett:
- Der Inhalt steht erst fest, wenn gepackt ist. Das Kisten-Etikett wird darum in zwei Schritten gedruckt: beim Anlegen ohne Inhalt (Anlass, Spiel, Zähler, Code), nach dem Packen auf Wunsch nochmals mit Inhalt, Gewicht und frühestem Datum. Siehe offene Punkte.
- «Kiste 2 von 5» stimmt erst, wenn alle Kisten des Spiels angelegt sind. Bis dahin steht «Kiste 2».

## Lager

- Bestand = alle Lagereinheiten im Zustand «im Lager». Er entsteht beim Etikettendruck und nimmt ab beim Einpacken, Verbrauchen und Entsorgen.
- Seite «Lager»: pro Produkt Anzahl Beutel, Menge, frühestes Verbrauchsdatum; aufklappbar die einzelnen Beutel mit Seriennummer, Charge und Datum. Filter: Lagerart, läuft in n Tagen ab, abgelaufen.
- Ausbuchen von Hand: «entsorgt» mit Grund (abgelaufen, beschädigt, Qualität, nicht produziert). Braucht keinen Scan, aber die Seriennummer.
- Jede Änderung an einem Beutel wird als Lagerbewegung festgehalten (was, wann, wer). Der Zustand lässt sich daraus herleiten.
- Reihenfolge: Beim Einpacken prüft die App, ob es vom selben Produkt Beutel mit früherem Verbrauchsdatum im Lager gibt, und meldet das gelb («älterer Beutel im Lager: K7M4X2PA, bis 27.12.»). Es sperrt nicht.
- Abgelaufene Beutel weist die Seite getrennt aus («davon abgelaufen: n»); sie zählen nicht zum verfügbaren Bestand.
- Der Bedarf der Anlässe wird dem Lager gegenübergestellt, als Menge in der Einheit des Bedarfs: «gebraucht 24 kg, im Lager 18 kg (9 Beutel)» pro Produkt und Spiel. Es zählen nur Beutel, deren Verbrauchsdatum am Service-Datum noch gültig ist, und nur Produkte, die ein Etikett bekommen (siehe Packliste). Produziert wird weiter nach dem Wellenplan; eine automatische Verrechnung von Lagerbestand mit der Produktionsmenge ist nicht Teil dieser Spezifikation (siehe offene Punkte).

## Packen und Packliste

- Packliste pro Spiel: Soll je Produkt (aus dem Bedarf des Spiels, bestehend), Ist (gescannte Beutel), Kisten mit Stand.
- Soll und Ist sind Mengen in der Einheit des Bedarfs (kg, l, Stück). Ist = Summe der Mengen der gescannten Beutel; das Soll ist erreicht, sobald Ist ≥ Soll. Die Anzahl Beutel ist nur ein Anhalt (Soll ÷ Füllmenge, aufgerundet) und fehlt, wenn die Füllmenge fehlt oder die Einheit Stück ist. Steht eine Komponente in zwei Einheiten im Bedarf, gibt es zwei Zeilen.
- Im Soll stehen nur Komponenten, die ein Etikett bekommen: Status «ok» mit Haltbarkeit, nicht «nur vor Ort». Zukauf-, offene und Vor-Ort-Komponenten stehen in einem Abschnitt «ohne Etikett», ohne Soll und Ist.
- Eine Kiste ist «offen» vom Anlegen bis zum ersten Scan «verladen». Eingepackt wird nur in eine offene Kiste; ausgepackt bei «offen» und bei «angekommen».
- «Kiste anlegen» erzeugt Kiste und Code und druckt das Etikett.
- Scan eines Beutels in die offene Kiste. Ergebnis:

| Ergebnis | Farbe | Wird eingepackt? |
| --- | --- | --- |
| ok | grün | ja |
| Produkt steht nicht im Bedarf dieses Spiels | rot | nein |
| Verbrauchsdatum vor dem Service-Datum (hat der Service kein Datum: gelb «Service ohne Datum») | rot | nein |
| Beutel ist schon in dieser Kiste | gelb | nein, schon gezählt |
| Beutel ist in einer anderen Kiste | rot | nein |
| Kiste ist schon verladen | rot | nein |
| Beutel ist verbraucht oder entsorgt | rot | nein |
| Soll dieses Produkts ist schon erreicht | gelb | ja, nach Bestätigung |
| älterer Beutel desselben Produkts im Lager | gelb | ja |
| unbekannter Code | rot | nein |

- «Auspacken»: Beutel scannen oder in der Kiste antippen; er geht zurück «im Lager».
- Verladen und Ankunft: Kiste scannen. Ergebnisse wie in Fassung 1 (ok, anderes Spiel, schon gescannt, unbekannt).
- Abschluss des Spiels: wie im Ablauf, Punkt 5. «Kisten auflösen» packt alle Beutel einer Kiste aus (zurück «im Lager»), auch für ein abgesagtes Spiel.

## Datenbank

Neue Tabellen, alle mit Row Level Security, Index auf jedem Fremdschlüssel:

- `produkt`: Produktnummer (fest, fortlaufend), Name, Kategorie. `komponente.produkt_id` zeigt auf das Produkt (neue Spalte). Beim Einrichten bekommt jede Komponente der heutigen Kollektion ein Produkt. Bei einer neuen Kollektion schlägt die App für gleichnamige Komponenten das bestehende Produkt vor; zugeordnet wird von Hand.
- `rezept.beutel_g`: Füllmenge pro Beutel (neue Spalte).
- `charge`: Produkt, Komponente (aus der produziert wurde; liefert Lagerung und Regeneration fürs Etikett), produziert am, Haltbarkeit in Tagen, verbrauchen bis, Annahme-Kennzeichen, Herkunft als Saison und Wellennummer (eine Zahl wie in `produktion_aufgabe`, kein Fremdschlüssel auf die Welle, weil der Wellenplan beim Übernehmen neu angelegt wird; beide dürfen leer sein), erstellt von. Eindeutig über Komponente, Saison, Wellennummer und Produktionsdatum. Bestand, Packliste und der Vergleich mit dem Bedarf laufen über das Produkt.
- `lagereinheit`: Charge, Seriennummer (eindeutig), Laufnummer in der Charge, Menge, Einheit (kg, l oder Stück), Zustand, Kiste. Die Kiste bleibt nach «verbraucht» stehen, damit sichtbar ist, in welchem Spiel der Beutel verbraucht wurde.
- `kiste`: Service, Code (eindeutig), Laufnummer im Spiel, Tara, Zustand (offen, verladen, angekommen, abgeschlossen).
- `lagerbewegung`: Lagereinheit, Art (Eingang, eingepackt, ausgepackt, verbraucht, entsorgt, Korrektur), Kiste, Grund, Zeitpunkt, Benutzer.
- `druckauftrag`: Lagereinheit oder Kiste (zwei Spalten, genau eine gesetzt), ZPL-Text, Status (offen, in Arbeit, gedruckt, Fehler), Fehlertext, Zeitstempel, erstellt von.
- `druckdienst_status`: letztes Lebenszeichen des Druckdienstes.
- `scan`: Kiste (leer bei unbekanntem Code), gescannter Text, Stufe (verladen, angekommen), Zeitpunkt, Benutzer, Service der geöffneten Packliste, Ergebnis.

Regeln für diese Tabellen:

- **Nichts vom Lager wird mitgelöscht.** Die Fremdschlüssel von Charge, Lagereinheit, Kiste und Lagerbewegung sind «restrict», nie «cascade». Ein Produkt oder eine Komponente mit Chargen und ein Service oder Anlass mit Kisten lassen sich nicht löschen; die App meldet «hat Lagerbestand» bzw. «zuerst Kisten auflösen».
- **Massgebend sind der Zustand der Lagereinheit und der Zustand der Kiste.** Geschrieben werden sie, die Lagerbewegungen und die Scans nur von den Funktionen unten; angemeldete Benutzer dürfen diese Tabellen nur lesen. Jede Funktion schreibt Zustand und Bewegung in derselben Transaktion.

Views und Funktionen:

- `etikett_vorschlag`: Anzahl Beutel pro Komponente und Welle mit Herleitung.
- `etikett_beutel`, `etikett_kiste`: alle Felder eines Etiketts. Web-Vorschau und ZPL-Text lesen beide daraus.
- `etiketten_erstellen(...)`: legt Charge, Lagereinheiten, Lagerbewegungen «Eingang» und Druckaufträge in einer Transaktion an. Der ZPL-Text wird in der Datenbank erzeugt.
- `lager_bestand`: pro Produkt Anzahl, Menge, frühestes Datum; `lager_einheit`: pro Beutel der aktuelle Stand.
- `packliste`: pro Spiel Soll und Ist je Produkt und die Kisten mit Stand.
- `kiste_erstellen(service)`, `beutel_einpacken(seriennummer, kiste, bestaetigt, zeitpunkt)`, `beutel_auspacken(seriennummer, zeitpunkt)`, `kiste_aufloesen(kiste)`, `einheit_ausbuchen(seriennummer, grund)`, `produkt_einlagern(...)`, `scan_erfassen(code, service, stufe, zeitpunkt)`, `service_abschliessen(service, entscheide pro Kiste)`. Der Zeitpunkt ist der echte Scan-Zeitpunkt (für Scans ohne Netz); ein wiederholter Aufruf mit demselben Beutel und derselben Kiste ändert nichts.
- Jede dieser Funktionen prüft und speichert in einem Schritt und gibt das Ergebnis aus der Tabelle oben zurück.

Die App rechnet nichts selbst. Schemaänderungen nur als Migration.

## Rechte

- Etiketten drucken, Kisten anlegen, ein- und auspacken, scannen: alle angemeldeten Stufen, auch die neue Stufe «Küche».
- Ausbuchen «entsorgt» und Abschluss eines Spiels: ab Stufe «Benutzer» (Vorschlag, siehe offene Punkte).
- Bis die Stufen gebaut sind: Alle Angemeldeten dürfen alles ausser Entsorgen und Abschluss eines Spiels (nur Admins). Jede Funktion prüft das Recht über eine einzige Hilfsfunktion, die die Arbeit «Stufen» später ersetzt.
- Die Stufe «Küche» selbst (lesen, abhaken, drucken, scannen) ist eine eigene Arbeit mit eigener Migration, weil sie die Zugriffsregeln aller Tabellen betrifft. Diese Spezifikation setzt sie voraus, baut sie aber nicht.

## Druck

- Zebra ZD621T, Druckersprache ZPL. Der ZPL-Text nutzt die skalierbare Schrift des Druckers und UTF-8 für Umlaute. Druckbreite, Befehle für QR-Code und UTF-8 und der Rohdaten-Anschluss über das Netzwerk werden vor dem Bau am Datenblatt geprüft; die Angaben in Fassung 1 galten dem Citizen.
- Druckdienst wie in Fassung 1: kleines Programm in Node.js als Windows-Dienst, im Repo unter `druckdienst/`. Holt offene Druckaufträge, sendet den ZPL-Text an den Drucker, meldet «gedruckt» oder den Fehler.
- Anschluss als Einstellung: Netzwerk (LAN oder WLAN) oder USB.
- Der Druckdienst hat eine eigene Datenbank-Rolle ohne Tabellenrechte. Sie darf nur zwei Funktionen ausführen: den ältesten offenen Auftrag holen (setzt «in Arbeit» und das Lebenszeichen, gibt den ZPL-Text zurück) und das Ergebnis melden. Das Passwort liegt nur auf dem Druck-PC.
- Lebenszeichen jede Minute. Ist es älter als 5 Minuten, zeigt die App «Drucker nicht erreichbar seit …».
- Aufträge gehen nicht verloren. Ein Auftrag «in Arbeit», der länger als 2 Minuten hängt, gilt als Fehler und wird nicht von selbst wiederholt (sonst doppelte Etiketten).
- «Nochmals drucken» druckt dasselbe Etikett mit derselben Seriennummer. Es entsteht kein neuer Beutel im Lager.
- Nur Standard-PostgreSQL und offene Supabase-Funktionen, damit der Umzug auf den GAMMA-Server ohne Umbau geht.

## Web-App

- Küchenpass: Knopf «Etiketten drucken», Dialog mit Vorschlag, Übersteuerung und Vorschau.
- Seite «Lager» (neu).
- Seite «Packliste» pro Spiel: Soll und Ist, Kisten, anlegen, ein- und auspacken, Abschluss.
- Seite «Druckaufträge»: Stand pro Auftrag, «nochmals drucken», Zustand des Druckdienstes.
- Seite `/e`: zeigt zu einem Code Produkt, Charge, Daten, Lagerung, Regeneration, Zustand und Kiste; bei Kisten den Inhalt. Nur für angemeldete Benutzer.
- Scannen ohne iPhone-App: Ein Handscanner (USB oder Bluetooth), der den Code wie eine Tastatur eintippt, funktioniert in der Web-App am Packtisch ohne weitere Entwicklung. Siehe offene Punkte.
- Neue Bausteine nach den Regeln des Design Systems.

## iPhone-App (Swift)

- SwiftUI, Scanner von Apple (VisionKit), Supabase-Paket für Swift. Eigenes Repo. Verteilung über TestFlight (ein Build läuft nach 90 Tagen ab).
- Anmelden mit bestehendem Benutzer, mit Code aus der E-Mail.
- **Packen:** Spiel und Kiste wählen (oder Kisten-Etikett scannen), dann Beutel scannen. Kamera bleibt offen, Rückmeldung grün, gelb oder rot mit Ton und Vibration, Zähler «9 von 12».
- **Verladen und Ankunft:** Spiel und Stufe wählen, Kisten scannen.
- **Nachschlagen:** Einzelner Scan zeigt die Angaben des Beutels oder der Kiste.
- Ohne Netz: Packliste und Lagerbestand des Spiels werden beim Öffnen geladen, Scans lokal geprüft, gespeichert und später mit dem echten Zeitpunkt gesendet.
  - Kisten werden nur mit Netz angelegt; ohne Netz wird in schon angelegte Kisten gepackt.
  - Ein ohne Netz gescannter Beutel liegt wirklich in der Kiste. Er wird beim Abgleich darum immer in die Kiste gebucht; das Ergebnis der Datenbank kommt als Hinweis zurück. Abweichungen (Soll überschritten, abgelaufen, schon in einer anderen Kiste, nicht im Bedarf) stehen in Packliste und App als «zu klären», bis jemand auspackt oder bestätigt.
  - Eine Seriennummer, die das Gerät nicht kennt, deren Code aber wie ein Beutel aussieht, ist gelb «wird beim Abgleich geprüft».

## Fehlerfälle

| Fall | Verhalten |
| --- | --- |
| Druckdienst steht | Auftrag bleibt offen, App zeigt den Hinweis, Druck folgt später |
| Drucker ohne Etiketten oder Farbband | Auftrag «Fehler» mit Text, «nochmals drucken» |
| Etikett beschädigt | «nochmals drucken», gleiche Seriennummer |
| Zu viele Etiketten gedruckt | überzählige Beutel ausbuchen (Grund «nicht produziert»); sie zählen nicht im Lager |
| Zu wenige Etiketten gedruckt | weitere Beutel derselben Charge nachdrucken; die Zähler «von n» der schon gedruckten stimmen dann nicht mehr |
| Beutel im falschen Spiel eingepackt | auspacken, im richtigen Spiel einpacken |
| Kiste im falschen Spiel gescannt | rot, wird gespeichert, zählt nicht |
| Kiste zweimal gescannt | rot «schon gescannt», zählt einmal |
| Beutel läuft im Lager ab | Seite «Lager» zeigt ihn als abgelaufen; Einpacken ist rot |
| Unbekannter Code | rot «unbekannt» |

## Tests

- Datenbank: Stückzahlen (Rundung, Restmenge, fehlende Füllmenge), Verbrauchsdatum ab Produktionsdatum, alle Ergebnisse von `beutel_einpacken` und `scan_erfassen`, Bestand nach jeder Bewegung, Rechte der Stufen und des Druckdienst-Benutzers.
- Web-App: Dialog, Vorschau, Lager, Packliste.
- Druckdienst: gegen einen nachgebauten Drucker (lokaler TCP-Port), dazu ein Probedruck am echten ZD621T mit den gewählten Etiketten (Lesbarkeit bei 203 dpi, QR-Code aus 30 cm scannbar, Haftung bei 0–2 °C und TK).
- iPhone-App: Prüfung ohne Netz und Abgleich danach, auch mit zwei Geräten ohne Netz im selben Spiel.
- Kontrollwerte aus der Excel müssen unverändert bleiben.

## Etappen

1. **Daten und Beutel-Etikett:** Migration (Produktnummer, Charge, Lagereinheit, Bewegung, Druckauftrag), Vorschlag, Dialog im Küchenpass, Vorschau des Beutel-Etiketts für 203 dpi. Druckaufträge bleiben «offen». Nur mit Testdaten prüfbar, noch nicht für den Betrieb.
2. **Lager:** Seite «Lager», «Produkt einlagern», Ausbuchen, Bestand gegen Bedarf.
3. **Druck:** ZPL, Druckdienst, Probedruck am ZD621T. Ab hier im Betrieb nutzbar (etikettieren und Lager führen).
4. **Packen in der Web-App:** Packliste, Kisten mit Kisten-Etikett und Vorschau, Ein- und Auspacken (mit Handscanner oder Eintippen), Seite `/e`, Abschluss.
5. **iPhone-App:** Packen, Verladen, Ankunft, ohne Netz.

Die Stufe «Küche» läuft unabhängig davon und sollte vor Etappe 4 stehen.

## Material

- Dominik klärt ein Etikett ab, das für Kühlraum und Tiefkühlung taugt; die Grösse 100 × 50 mm bleibt.
- Das zuerst genannte Etikett (SMC-TT-R378) ist laut Anbieter aus Papier mit permanentem Kleber. Für Beutel bei 0–2 °C und TK sind Kunststoff-Etiketten mit Harz-Farbband sicherer.
- IFCO-Kisten: nur Etiketten mit abwaschbarem, von IFCO freigegebenem Kleber oder Einsteckkarten.
- Farbband passend zum Etikett wählen (Wachs für Papier, Harz für Kunststoff).

## Offene Punkte (Entscheid Dominik)

Vor Etappe 1:

1. ~~Produkt über Kollektionen hinweg~~ Entschieden am 20.11.2026: Ware bleibt im Lager, eigener Stammsatz «Produkt».
2. ~~Beutel pro Spiel~~ Entschieden am 20.11.2026: pro Spiel aufrunden.
3. ~~Allergene~~ Entschieden am 20.11.2026: «siehe Rezept», solange das Rezept nicht vollständig verknüpft ist.

Vor Etappe 3:

4. **Druckdienst-PC:** Steht er fest, und hängt der Drucker am LAN, am WLAN oder per USB daran?

Vor Etappe 4:

5. **Kiste für mehrere Spiele:** Die Spezifikation geht davon aus, dass eine Kiste genau einem Spiel gehört und das Etikett Spiel und Service-Datum trägt. Stimmt das auch bei Menülinien für mehrere Spiele und bei kleinen Mengen?
6. **Produkt nicht im Bedarf des Spiels:** sperren (rot), oder nach Bestätigung erlauben und als «zusätzlich» führen (Ersatz, Reserve)?
7. **Rückläufer:** Darf Ware, die am Anlassort war, zurück ins Lager? Wenn ja, mit welchem Verbrauchsdatum, und gilt das auch für aufgetaute TK-Ware? Vorschlag: Nur Kisten, die nie verladen wurden, gehen ohne Weiteres zurück; sonst fragt die App «zurück ins Lager» (neues, kürzeres Datum von Hand) oder «entsorgt».
8. **Teilmengen:** Wird ein Beutel immer ganz gebraucht, oder gibt es angebrochene Beutel, die mit Restmenge zurück ins Lager gehen?
9. **Kisten-Etikett in zwei Schritten** (erst ohne, dann mit Inhalt) oder nur einmal ohne Inhalt? Der Inhalt steht in jedem Fall in der App.
10. **Handscanner am Packtisch** (rund CHF 100 bis 300), damit das Packen vor der iPhone-App funktioniert?
11. **Wer darf entsorgen und ein Spiel abschliessen:** ab «Benutzer» oder auch «Küche»? Vorschlag: Überzählige Etiketten mit Grund «nicht produziert» darf auch «Küche» ausbuchen, weil der Fall beim Etikettieren entsteht.
12. **Seite `/e` ohne Anmeldung:** Darf sie Produkt und Verbrauchsdatum zeigen, für Personal vor Ort ohne Zugang?

Später:

13. **Lagerbestand und Produktion:** Soll der Wellenplan weniger produzieren, wenn noch Bestand da ist? Heute rechnet er ohne Lager.
14. **Lagerorte:** Reicht die Lagerart (0–2 °C, TK, Economat), oder braucht es Orte (Kühlraum 1, TK-Zelle 2)?
15. **Zukauf-Produkte:** Ab wann sollen sie Etiketten und Seriennummern bekommen?
