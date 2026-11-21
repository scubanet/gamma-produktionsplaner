# Spezifikation: Etiketten, Lager, Druck und Packliste

Stand: 21.11.2026, Fassung 3. Ersetzt Fassung 2 vom 20.11.2026 (im Git-Verlauf) und nimmt die Entscheide vom 20. und 21.11.2026 aus `docs/konzept-scan-app.md` auf. Gebaut sind Etappe 1 und 2 (Migrationen 41 und 42) und die Stufe «Küche» (Migration 43); alles Weitere ist noch nicht gebaut. Plan für Packen und Scannen: `docs/plan-scan-app.md`.

## Was sich gegenüber Fassung 2 ändert

- **Kamera-Scan in der Web-App.** Alle Handys ohne iPhone-App scannen auf einer Seite «Scannen» der Web-App mit der Kamera. Handscanner und Eintippen bleiben als Eingabe möglich.
- **Sortenrein.** Jede IFCO-Kiste enthält genau ein Produkt. Der erste eingepackte Beutel legt es fest; ein Beutel mit anderem Produkt wird abgelehnt.
- **Stufe «Scannen».** Vierte Stufe neben Admin, Benutzer und Küche, die nur packt, scannt und nachschlägt.
- **Gewicht für die Logistik.** Die Packliste weist pro Spiel und Transportart die Anzahl Kisten und das Gewicht aus, als Soll und als Ist, zum Weitergeben. Die Nutzlast der Fahrzeuge prüft die App nicht.

Bestätigt am 21.11.2026 und unverändert: Gepackt wird pro Spiel. Die Kiste gehört zu Anlass und Spiel, nicht zu einem Gericht.

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
| 20.11.2026 | iPhone-App in Swift; alle anderen Handys scannen in der Web-App mit der Kamera. |
| 20.11.2026 | Es gibt eine eigene Stufe «Scannen». |
| 20.11.2026 | Jede IFCO ist sortenrein (ein Produkt). |
| 20.11.2026 | Beim Beladen ist das Gewicht der Engpass, nicht das Volumen. |
| 20.11.2026 | Geschirr, Geräte und Getränke fahren nicht im Kühl- oder Tiefkühltransport und zählen beim Gewicht nicht mit. |
| 21.11.2026 | Gepackt wird pro Spiel, nicht pro Gericht. Die Kiste gehört zu Anlass und Spiel. |
| 21.11.2026 | Die Nutzlast prüft die App nicht. Das Gewicht muss aber an die Logistik weitergegeben werden können. |
| 21.11.2026 | Eine Kiste gehört immer genau einem Spiel, auch bei Menülinien für mehrere Spiele und bei kleinen Mengen. |
| 21.11.2026 | Ein Beutel, dessen Produkt nicht im Bedarf des Spiels steht, wird nach Bestätigung eingepackt und in der Packliste als «zusätzlich» geführt. |
| 21.11.2026 | Economat-Ware ist ungekühlt und wird als eigene Transportart ausgewiesen; sie kann mit dem gekühlten Transport mitfahren. |
| 21.11.2026 | Keine Obergrenze pro Kiste nach Gewicht; massgebend ist das Volumen, die Kiste muss stapelbar bleiben. Das Gewicht der Beutel-Verpackung wird nicht gerechnet. |
| 21.11.2026 | Die Stufe «Scannen» darf die Planungstabellen lesen, aus denen die Packliste rechnet (Menülinien, Gerichte, Komponenten, Systemzuteilung); keine Rezepte, keine Geld-Tabellen. |

## Umfang

Im Umfang:
- Etiketten für Beutel (Produkt) und IFCO-Kisten, Druck auf dem ZD621T.
- Lager der selbst produzierten, etikettierten Produkte.
- Packen mit Scan jedes Beutels, Packliste pro Spiel, Kontrolle beim Verladen und bei der Ankunft.
- Scannen mit der iPhone-App und mit der Kamera in der Web-App.
- Gewicht der Speisen pro Spiel und Transportart als Angabe für die Logistik.

Vorgesehen, aber nicht in den ersten Etappen:
- Zugekaufte Fertigprodukte (CF-Stufe 4 und 5) mit eigenem Etikett und Seriennummer. Die Tabellen werden so angelegt, dass sie ohne Umbau dazukommen.

Nicht im Umfang:
- Rohwaren (Wareneingang, Verbrauch in der Produktion).
- Rückverfolgung bis zum Gast.
- Android-App. Alle Handys ohne iPhone-App scannen in der Web-App mit der Kamera.
- Etiketten für Geschirr, Geräte und Getränke, und ihr Gewicht.
- Prüfung der Nutzlast und Fahrzeugplanung.
- Zuteilung einer Kiste zu einem Gericht.

## Begriffe

- **Produkt:** das, was etikettiert im Lager liegt, unabhängig von der Kollektion. Hat eine feste Produktnummer (z.B. `P0123`), Name und Kategorie. Die Komponenten jeder Kollektion zeigen auf ihr Produkt; so behält der Portweinjus seine Nummer, wenn die Kollektion wechselt, und Bestand aus der alten Kollektion zählt für den Bedarf der neuen.
- **Charge:** ein Produkt aus einer Zeile der Checkliste (Saison, Welle) an einem Produktionstag. Trägt Produktionsdatum, Haltbarkeit und Verbrauchsdatum. Eine Charge gehört zu keinem Anlass; Saison und Welle sind nur die Herkunft und stehen nicht auf dem Etikett. Ein weiterer Druck für dieselbe Zeile am selben Tag hängt Beutel an diese Charge an, die Laufnummern laufen weiter.
- **Lagereinheit (Beutel):** ein etikettierter Beutel einer Charge mit eigener Seriennummer. Hat einen Zustand: im Lager, in Kiste, verbraucht, entsorgt.
- **Kiste:** eine IFCO-Kiste für ein Spiel (Service) eines Anlasses. Enthält gescannte Beutel eines einzigen Produkts (sortenrein). Hat einen eigenen Code.
- **Transportart:** gekühlt (0–2 °C), tiefgekühlt oder ungekühlt (Economat), abgeleitet aus der Lagerart der Systemzuteilung.
- **Seriennummer:** 8 Zeichen, zufällig, ohne verwechselbare Zeichen (0/O, 1/I/L), über alle Produkte eindeutig. Steht im QR-Code und lesbar auf dem Etikett.

## QR-Code

- Beutel: `https://gamma.atoll-os.com/e/?p=<Produktnummer>&s=<Seriennummer>`
- Kiste: `https://gamma.atoll-os.com/e/?k=<Kistencode>`
- Der Code enthält Produkt und Seriennummer, sonst keine Daten (kein Datum, kein Name). Alles Weitere steht in der Datenbank.
- Die Produktnummer steht im Code, damit die Scan-App das Produkt auch ohne Netz erkennt. Massgebend bleibt die Seriennummer.
- Beide Oberflächen lesen aus dem Code Produktnummer und Seriennummer oder den Kistencode. Ein Code mit fremder Adresse ist rot «unbekannt» und wird nicht geöffnet.
- Unter dem QR-Code steht lesbar «P0123 · K7M4X2PA», zum Abtippen, wenn der Code beschädigt ist.

## Ablauf

1. **Produzieren und etikettieren.** Im Küchenpass ist eine Komponente der Welle abgehakt; erst dann ist der Knopf «Etiketten drucken» aktiv. Der Dialog zeigt das Produktionsdatum (Tag des Abhakens) und schlägt die Anzahl Beutel vor, beides übersteuerbar. Das Produktionsdatum lässt sich nur auf einen früheren Tag korrigieren, nie auf einen späteren. «Drucken» legt die Charge und die Lagereinheiten an (Zustand «im Lager») und druckt die Etiketten. Gibt es zur Zeile schon Beutel, zeigt der Dialog «bereits n Beutel, m kg etikettiert» und schlägt nur die Restmenge vor.
   - **Ohne Welle einlagern:** Auf der Seite «Lager» gibt es «Produkt einlagern» (Produkt, Produktionsdatum, Anzahl, Menge pro Beutel). So werden der Anfangsbestand, Produktion ausserhalb einer Welle und Komponenten ohne Welle erfasst. Das Produktionsdatum ist dann von Hand gesetzt und als Annahme gekennzeichnet.
2. **Lager.** Die Seite «Lager» zeigt den Bestand pro Produkt: Anzahl Beutel, Menge, frühestes Verbrauchsdatum, was bald abläuft und was abgelaufen ist.
3. **Packen.** Auf der Packliste eines Spiels steht, was gebraucht wird. Eine Kiste anlegen, ihr Etikett drucken, dann jeden Beutel in die Kiste scannen. Der erste Beutel legt das Produkt der Kiste fest. Der Beutel wechselt auf «in Kiste» und ist dem Spiel zugeteilt.
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
| Inhalt | – | ein Produkt mit Anzahl Beutel (sortenrein) |
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
- «Kiste anlegen» erzeugt Kiste und Code und druckt das Etikett; dabei wird das Gebinde (Höhe der IFCO) gewählt. Kisten werden nur mit Netz angelegt.
- Jede Kiste ist sortenrein: Der erste eingepackte Beutel legt das Produkt der Kiste fest. Wird die Kiste leer, ist sie wieder frei für ein anderes Produkt.
- Scan eines Beutels in die offene Kiste. Ergebnis:

| Ergebnis | Farbe | Wird eingepackt? |
| --- | --- | --- |
| ok | grün | ja |
| anderes Produkt als in der Kiste | rot | nein |
| Produkt steht nicht im Bedarf dieses Spiels | gelb | ja, nach Bestätigung; steht in der Packliste als «zusätzlich» |
| Verbrauchsdatum vor dem Service-Datum (hat der Service kein Datum: gelb «Service ohne Datum») | rot | nein |
| Beutel ist schon in dieser Kiste | gelb | nein, schon gezählt |
| Beutel ist in einer anderen Kiste | rot | nein |
| Kiste ist schon verladen | rot | nein |
| Beutel ist verbraucht oder entsorgt | rot | nein |
| Soll dieses Produkts ist schon erreicht | gelb | ja, nach Bestätigung |
| älterer Beutel desselben Produkts im Lager | gelb | ja |
| unbekannter Code | rot | nein |

- «Auspacken»: Beutel scannen oder in der Kiste antippen; er geht zurück «im Lager».
- Verladen und Ankunft: Kiste scannen. Ergebnisse wie in Fassung 1 (ok, anderes Spiel, schon gescannt, unbekannt). Neu: gelb, wenn die Kiste leer ist oder das Soll des Spiels noch nicht gepackt ist. Beim Verladen steht neben «14 von 18 Kisten» das geladene Gewicht.
- Abschluss des Spiels: wie im Ablauf, Punkt 5. «Kisten auflösen» packt alle Beutel einer Kiste aus (zurück «im Lager»), auch für ein abgesagtes Spiel.

## Gewicht für die Logistik

Beim Beladen ist das Gewicht der Engpass, nicht das Volumen. Die Nutzlast der Fahrzeuge prüft die App nicht; sie liefert der Logistik das Gewicht.

- Gezählt werden nur die Speisen in den IFCO-Kisten.
- Gewicht der Kiste = Summe der Beutel + Tara. Liter zählen als 1 l = 1 kg, als Annahme gekennzeichnet (wie in der Planung).
- Getrennt nach Transportart: gekühlt (0–2 °C), tiefgekühlt und ungekühlt (Economat; kann mit dem gekühlten Transport mitfahren).
- Tara: Es gibt IFCO-Kisten in verschiedenen Höhen mit verschiedener Tara. Die Höhe wird pro Kiste beim Anlegen gewählt (Entscheid 21.11.2026); jede Höhe ist ein Gebinde in den Stammdaten. Für den Planwert vor dem Packen gilt das Gebinde am Rezept. Fehlt die Tara, steht das Gewicht ohne Tara da und das Gesamtgewicht als Platzhalter.
- Keine Obergrenze nach Gewicht. Massgebend für die Kiste ist das Volumen: sie muss stapelbar bleiben.
- Die Packliste zeigt pro Spiel und Transportart die Anzahl Kisten und das Gewicht: als Soll aus dem Bedarf (Planwert vor dem Packen, mit «rund n Kisten» aus `rezept.fuellmenge_g`) und als Ist aus den gescannten Beuteln.
- Eine unvollständige Zahl wird nie als Total ausgegeben. Fehlt bei einem Produkt die Lagerart oder das Gewicht (Beutel in Stück, siehe offene Punkte, 18), wird es getrennt ausgewiesen («n Produkte ohne Lagerart»), nicht geschätzt.
- Gerechnet wird in der Datenbank, mit Herleitung.
- Form der Weitergabe: siehe offene Punkte, 16.

## Datenbank

Neue Tabellen, alle mit Row Level Security, Index auf jedem Fremdschlüssel:

- `produkt`: Produktnummer (fest, fortlaufend), Name, Kategorie. `komponente.produkt_id` zeigt auf das Produkt (neue Spalte). Beim Einrichten bekommt jede Komponente der heutigen Kollektion ein Produkt. Bei einer neuen Kollektion schlägt die App für gleichnamige Komponenten das bestehende Produkt vor; zugeordnet wird von Hand.
- `rezept.beutel_g`: Füllmenge pro Beutel (neue Spalte).
- `charge`: Produkt, Komponente (aus der produziert wurde; liefert Lagerung und Regeneration fürs Etikett), produziert am, Haltbarkeit in Tagen, verbrauchen bis, Annahme-Kennzeichen, Herkunft als Saison und Wellennummer (eine Zahl wie in `produktion_aufgabe`, kein Fremdschlüssel auf die Welle, weil der Wellenplan beim Übernehmen neu angelegt wird; beide dürfen leer sein), erstellt von. Eindeutig über Komponente, Saison, Wellennummer und Produktionsdatum. Bestand, Packliste und der Vergleich mit dem Bedarf laufen über das Produkt.
- `lagereinheit`: Charge, Seriennummer (eindeutig), Laufnummer in der Charge, Menge, Einheit (kg, l oder Stück), Zustand, Kiste. Die Kiste bleibt nach «verbraucht» stehen, damit sichtbar ist, in welchem Spiel der Beutel verbraucht wurde.
- `kiste`: Service, Code (eindeutig), Laufnummer im Spiel, Gebinde (liefert die Tara), Zustand (offen, verladen, angekommen, abgeschlossen), Produkt (`produkt_id`: gesetzt durch den ersten eingepackten Beutel, wieder leer, wenn die Kiste leer ist).
- `lagerbewegung`: Lagereinheit, Art (Eingang, eingepackt, ausgepackt, verbraucht, entsorgt, Korrektur), Kiste, Grund, Zeitpunkt, Benutzer.
- `druckauftrag`: Lagereinheit oder Kiste (zwei Spalten, genau eine gesetzt), ZPL-Text, Status (offen, in Arbeit, gedruckt, Fehler), Fehlertext, Zeitstempel, erstellt von. Seit Migration 41 gibt es nur die Spalte für die Lagereinheit; die Spalte für die Kiste kommt mit dem Packen.
- `druckdienst_status`: letztes Lebenszeichen des Druckdienstes.
- `scan`: Kiste (leer bei unbekanntem Code), gescannter Text, Stufe (verladen, angekommen), Zeitpunkt, Benutzer, Service der geöffneten Packliste, Ergebnis, Scan-Nummer (`scan_nummer`: UUID, vom Gerät vergeben, eindeutig), Quelle (`quelle`: `ios` oder `web`).
- `app_scannen`: Benutzer der Stufe «Scannen», gebaut wie `app_kueche`.

Regeln für diese Tabellen:

- **Nichts vom Lager wird mitgelöscht.** Die Fremdschlüssel von Charge, Lagereinheit, Kiste und Lagerbewegung sind «restrict», nie «cascade». Ein Produkt oder eine Komponente mit Chargen und ein Service oder Anlass mit Kisten lassen sich nicht löschen; die App meldet «hat Lagerbestand» bzw. «zuerst Kisten auflösen».
- **Massgebend sind der Zustand der Lagereinheit und der Zustand der Kiste.** Geschrieben werden sie, die Lagerbewegungen und die Scans nur von den Funktionen unten; angemeldete Benutzer dürfen diese Tabellen nur lesen. Jede Funktion schreibt Zustand und Bewegung in derselben Transaktion.

Views und Funktionen:

- `etikett_vorschlag`: Anzahl Beutel pro Komponente und Welle mit Herleitung.
- `etikett_beutel`, `etikett_kiste`: alle Felder eines Etiketts. Web-Vorschau und ZPL-Text lesen beide daraus.
- `etiketten_erstellen(...)`: legt Charge, Lagereinheiten, Lagerbewegungen «Eingang» und Druckaufträge in einer Transaktion an. Der ZPL-Text wird in der Datenbank erzeugt.
- `lager_bestand`: pro Produkt Anzahl, Menge, frühestes Datum; `lager_einheit`: pro Beutel der aktuelle Stand.
- `packliste`: pro Spiel Soll und Ist je Produkt und die Kisten mit Stand.
- Gewicht: ein View pro Kiste (Summe der Beutel + Tara) und ein View pro Service und Transportart (Kisten und Gewicht als Soll und Ist), beide mit Herleitung.
- `kiste_erstellen(service)`, `beutel_einpacken(seriennummer, kiste, bestaetigt, zeitpunkt, ohne Netz gescannt)`, `beutel_auspacken(seriennummer, zeitpunkt)`, `kiste_aufloesen(kiste)`, `einheit_ausbuchen(seriennummer, grund)`, `produkt_einlagern(...)`, `scan_erfassen(code, service, stufe, zeitpunkt, scan_nummer, quelle)`, `service_abschliessen(service, entscheide pro Kiste)`. Der Zeitpunkt ist der echte Scan-Zeitpunkt (für Scans ohne Netz); ein wiederholter Aufruf mit demselben Beutel und derselben Kiste ändert nichts.
- `scan_erfassen` mit einer schon gespeicherten Scan-Nummer gibt das gespeicherte Ergebnis zurück und speichert nichts. So meldet ein nach einem Funkloch doppelt gesendeter Kisten-Scan nicht fälschlich «schon gescannt».
- Mit dem Kennzeichen «ohne Netz gescannt» bucht `beutel_einpacken` den Beutel immer ein; Abweichungen stehen als «zu klären» in der Packliste (siehe «Ohne Netz»).
- Jede dieser Funktionen prüft und speichert in einem Schritt und gibt das Ergebnis aus der Tabelle oben zurück.
- Gebaut sind `etiketten_erstellen`, `produkt_einlagern`, `einheit_ausbuchen` und die Views für Etikett und Lager (Migrationen 41 und 42).

Die App rechnet nichts selbst. Schemaänderungen nur als Migration.

## Rechte

Jede Funktion prüft das Recht über `lager_recht` (einzige Stelle für die Rechte des Lagers).

| Arbeit | Admin | Benutzer | Küche | Scannen |
| --- | --- | --- | --- | --- |
| Beutel-Etiketten erstellen, einlagern, «nicht produziert» ausbuchen (gebaut) | ja | ja | ja | nein |
| Ware entsorgen: abgelaufen, beschädigt, Qualität (gebaut) | ja | nein | nein | nein |
| Kiste anlegen, ein- und auspacken, Verladen und Ankunft scannen, nachschlagen | ja | ja | ja | ja |
| Spiel abschliessen | ja | offen | offen | nein |

- **Stufe «Scannen»:** liest, was Packen, Verladen, Ankunft und Nachschlagen brauchen, und schreibt nichts direkt: Anlass und Service, Produkt, Charge, Lagereinheit, Kiste und die Planungstabellen, aus denen die Packliste das Soll rechnet (Menülinien, Gerichte, Komponenten, Systemzuteilung; Entscheid 21.11.2026). Keine Rezepte, kein Einkauf, keine Geld-Tabellen, keine Benutzer. In der Web-App sieht sie nur «Scannen» und «Packliste». Wie bei «Küche» sind Preis-Spalten in lesbaren Tabellen (z.B. `anlass.umsatz_netto_chf`) über die Schnittstelle lesbar, bis der Preisschutz Schritt 2 gebaut ist.
- Eigene Migration, weil die Lese-Regeln vieler Tabellen betroffen sind: «Küche» liest fast alles, «Scannen» fast nichts.
- Wer ausser Admins ein Spiel abschliessen und Ware entsorgen darf: siehe offene Punkte, 11.

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
- Seite «Packliste» pro Spiel: Soll und Ist, Kisten, anlegen, ein- und auspacken, Abschluss, mit Eingabefeld für Handscanner und Eintippen. Dazu die Karte «Gewicht für die Logistik» pro Transportart (Kisten, kg, Soll und Ist) mit «Weitergeben».
- Seite «Druckaufträge»: Stand pro Auftrag, «nochmals drucken», Zustand des Druckdienstes.
- Seite `/e`: zeigt zu einem Code Produkt, Charge, Daten, Lagerung, Regeneration, Zustand und Kiste; bei Kisten den Inhalt. Nur für angemeldete Benutzer.
- Seite «Scannen» (neu): siehe nächster Abschnitt.
- Neue Bausteine nach den Regeln des Design Systems.

## Scannen: zwei Oberflächen, ein Kern

Gescannt wird mit der iPhone-App und, auf allen anderen Handys, mit der Kamera in der Web-App. Beide rufen dieselben Funktionen der Datenbank auf und enthalten selbst keine Regeln ausser der vorläufigen Prüfung ohne Netz. Beide haben dieselben fünf Bildschirme mit denselben Texten:

1. **Anmelden:** bestehender Benutzer, Code aus der E-Mail. Das Gerät bleibt angemeldet.
2. **Spiel und Stufe wählen:** «Packen», «Verladen» oder «Angekommen». Packliste und Lagerbestand des Spiels werden jetzt geladen.
3. **Scannen:** Die Kamera bleibt offen. Die Rückmeldung füllt den ganzen Bildschirm (grün, gelb, rot), dazu Ton und Vibration. Knöpfe: Taschenlampe und «Code von Hand eingeben».
4. **Fehlt noch:** offene Produkte oder Kisten, Abschluss der Stufe mit Bestätigung.
5. **Nachschlagen:** Ein Scan ausserhalb einer Packliste zeigt die Angaben von Beutel oder Kiste.

Ein Bluetooth-Handscanner im Tastaturmodus funktioniert in beiden Oberflächen über das Eingabefeld.

### Web-App: Seite «Scannen»

- Neue Seite im geschützten Bereich mit eigenem Handy-Layout, ohne die übrige Navigation. Läuft rein im Browser (statischer Export). Start über das Symbol auf dem Home-Bildschirm wie beim Küchenpass.
- Scanner: der eingebaute Barcode-Leser des Browsers (`BarcodeDetector`), wo es ihn gibt (Chrome und Samsung Internet auf Android). Sonst lädt die Seite einmalig einen eigenen Leser nach. Die Bibliothek wird vor dem Einbau geprüft (Lizenz, Grösse, Pflegestand) und Dominik genannt.
- Rückmeldung: Farbe und Ton überall, Vibration auf Android. Der Bildschirm bleibt an. Taschenlampe nur, wo Browser und Gerät sie freigeben.
- Kamera nicht freigegeben: Hinweis mit Anleitung; die Eingabe von Hand bleibt möglich.
- Grenzen gegenüber der iPhone-App: Kamera-Freigabe im Browser, schwächer bei wenig Licht, sendet offene Scans nur, solange die Seite offen ist.

### iPhone-App (Swift)

- SwiftUI, nur iPhone, Hochformat. Scanner von Apple (VisionKit), nur QR-Codes. Supabase-Paket für Swift, Zwischenspeicher mit SwiftData. Eigenes Repo. Verteilung über TestFlight (ein Build läuft nach 90 Tagen ab; dann scannt das iPhone über die Web-Seite).
- Der QR-Link öffnet die App: Sie meldet sich für `gamma.atoll-os.com/e/` an (Associated Domains).
- Farben und Logo aus dem Design System.
- Kleinste iOS-Version: siehe offene Punkte, 20.

### Ohne Netz

Gilt für beide Oberflächen.

- Packliste und Lagerbestand des Spiels werden beim Öffnen geladen, Scans lokal geprüft, gespeichert und später mit dem echten Zeitpunkt und der Scan-Nummer gesendet.
- Kisten werden nur mit Netz angelegt; ohne Netz wird in schon angelegte Kisten gepackt.
- Ein ohne Netz gescannter Beutel liegt wirklich in der Kiste. Er wird beim Abgleich darum immer in die Kiste gebucht; das Ergebnis der Datenbank kommt als Hinweis zurück. Abweichungen (Soll überschritten, abgelaufen, schon in einer anderen Kiste, nicht im Bedarf ohne Bestätigung, anderes Produkt als in der Kiste) stehen in Packliste und App als «zu klären», bis jemand auspackt oder bestätigt.
- Eine Seriennummer, die das Gerät nicht kennt, deren Code aber wie ein Beutel aussieht, ist gelb «wird beim Abgleich geprüft».
- Ein Zähler «n Scans noch nicht gesendet» ist immer sichtbar. Der Abschluss einer Stufe geht erst, wenn alles gesendet ist.

## Fehlerfälle

| Fall | Verhalten |
| --- | --- |
| Druckdienst steht | Auftrag bleibt offen, App zeigt den Hinweis, Druck folgt später |
| Drucker ohne Etiketten oder Farbband | Auftrag «Fehler» mit Text, «nochmals drucken» |
| Etikett beschädigt | «nochmals drucken», gleiche Seriennummer |
| Zu viele Etiketten gedruckt | überzählige Beutel ausbuchen (Grund «nicht produziert»); sie zählen nicht im Lager |
| Zu wenige Etiketten gedruckt | weitere Beutel derselben Charge nachdrucken; die Zähler «von n» der schon gedruckten stimmen dann nicht mehr |
| Beutel im falschen Spiel eingepackt | auspacken, im richtigen Spiel einpacken |
| Beutel mit anderem Produkt in die Kiste gescannt | rot, wird nicht eingepackt; andere Kiste nehmen |
| Scan nach einem Funkloch doppelt gesendet | wird einmal gespeichert (Scan-Nummer), das erste Ergebnis kommt zurück |
| Kiste im falschen Spiel gescannt | rot, wird gespeichert, zählt nicht |
| Kiste zweimal gescannt | rot «schon gescannt», zählt einmal |
| Beutel läuft im Lager ab | Seite «Lager» zeigt ihn als abgelaufen; Einpacken ist rot |
| Unbekannter Code | rot «unbekannt» |

## Tests

- Datenbank: Stückzahlen (Rundung, Restmenge, fehlende Füllmenge), Verbrauchsdatum ab Produktionsdatum, alle Ergebnisse von `beutel_einpacken` und `scan_erfassen`, Bestand nach jeder Bewegung, Rechte der Stufen und des Druckdienst-Benutzers.
- Datenbank, neu: sortenrein, doppelt gesendete Scans, Gewicht (Soll und Ist von Hand nachgerechnet), Rechte der Stufe «Scannen».
- Web-App: Dialog, Vorschau, Lager, Packliste, Lesen des Codes (`lib/scan-code.ts`).
- Seite «Scannen»: auf einem Android-Gerät (Chrome) und einem iPhone (Safari), einmal im Flugmodus mit Abgleich danach.
- Druckdienst: gegen einen nachgebauten Drucker (lokaler TCP-Port), dazu ein Probedruck am echten ZD621T mit den gewählten Etiketten (Lesbarkeit bei 203 dpi, QR-Code aus 30 cm scannbar, Haftung bei 0–2 °C und TK).
- iPhone-App: Code-Lesen, Warteschlange, Prüfung ohne Netz und Abgleich danach, auch mit zwei Geräten ohne Netz im selben Spiel; auf einem echten iPhone gescannt (der Scanner läuft nicht im Simulator).
- Kontrollwerte aus der Excel müssen unverändert bleiben.

## Etappen

1. **Daten und Beutel-Etikett** (gebaut, Migration 41): Produktnummer, Charge, Lagereinheit, Bewegung, Druckauftrag, Vorschlag, Dialog im Küchenpass, Vorschau des Beutel-Etiketts für 203 dpi. Druckaufträge bleiben «offen».
2. **Lager** (gebaut, Migration 42): Seite «Lager», «Produkt einlagern», Ausbuchen, Bestand gegen Bedarf.
3. **Druck:** ZPL, Druckdienst, Probedruck am ZD621T. Ab hier im Betrieb nutzbar (etikettieren und Lager führen).
4. **Packen und Scannen in der Web-App**, in den Schritten des Plans `docs/plan-scan-app.md`: Stufe «Scannen» (S1), Packen-Kern in der Datenbank (S2), Gewicht für die Logistik (S3), Seite «Packliste» und Seite `/e` (S4), Seite «Scannen» mit Kamera (S5).
5. **iPhone-App** (S6): gleiche Bildschirme in SwiftUI, erster Build in TestFlight.
6. **Probelauf** (S7): eine echte Packliste mit gedruckten Etiketten packen und verladen, mit einem iPhone und einem Android-Gerät, einmal im Flugmodus. Braucht den Druck.

Die Stufe «Küche» ist gebaut (Migration 43). Etappe 4 und 5 sind ohne den Druck bau- und prüfbar; die Druckaufträge bleiben so lange «offen».

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

5. ~~Kiste für mehrere Spiele~~ Entschieden am 21.11.2026: Eine Kiste gehört immer genau einem Spiel.
6. ~~Produkt nicht im Bedarf des Spiels~~ Entschieden am 21.11.2026: nach Bestätigung erlauben, als «zusätzlich» führen.
7. **Rückläufer:** Darf Ware, die am Anlassort war, zurück ins Lager? Wenn ja, mit welchem Verbrauchsdatum, und gilt das auch für aufgetaute TK-Ware? Vorschlag: Nur Kisten, die nie verladen wurden, gehen ohne Weiteres zurück; sonst fragt die App «zurück ins Lager» (neues, kürzeres Datum von Hand) oder «entsorgt».
8. **Teilmengen:** Wird ein Beutel immer ganz gebraucht, oder gibt es angebrochene Beutel, die mit Restmenge zurück ins Lager gehen?
9. **Kisten-Etikett in zwei Schritten** (erst ohne, dann mit Inhalt) oder nur einmal ohne Inhalt? Der Inhalt steht in jedem Fall in der App.
10. **Handscanner am Packtisch** (rund CHF 100 bis 300)? Mit dem Kamera-Scan in der Web-App weniger dringend.
11. **Wer darf entsorgen und ein Spiel abschliessen:** ab «Benutzer» oder auch «Küche»? Gebaut ist: «nicht produziert» ausbuchen dürfen alle ausser «Scannen», Ware entsorgen nur Admins. «Scannen» schliesst kein Spiel ab (Entscheid 20.11.2026). Offen bleibt, ob «Benutzer» und «Küche» ein Spiel abschliessen dürfen.
12. **Seite `/e` ohne Anmeldung:** Darf sie Produkt und Verbrauchsdatum zeigen, für Personal vor Ort ohne Zugang?
16. **Weitergabe an die Logistik:** In welcher Form braucht die Logistik das Gewicht (PDF, E-Mail, Text zum Kopieren), und reicht der Planwert vor dem Packen, oder braucht sie das Ist danach? Bis zur Antwort: Druckansicht und «Text kopieren», beide Werte.
17. ~~Economat~~ Entschieden am 21.11.2026: eigene Zeile «ungekühlt»; die Ware kann mit dem gekühlten Transport mitfahren.
18. **Beutel in Stück:** Sie haben kein Gewicht und werden getrennt ausgewiesen, nicht geschätzt. Das Gewicht der Verpackung (Beutel) wird nicht gerechnet (Dominik, 21.11.2026: «Wir arbeiten nicht im Grammbereich»). Offen: Soll für Stück-Beutel ein Gewicht erfasst werden?
19. ~~Obergrenze pro Kiste~~ Entschieden am 21.11.2026: keine Grenze nach Gewicht. Massgebend ist das Volumen: Die Kiste muss stapelbar bleiben. Offen: Soll der Scan gelb warnen, wenn in der Kiste mehr liegt als die Füllmenge pro IFCO aus dem Rezept?
20. **iOS 17 als Minimum** (wegen SwiftData): Haben alle iPhones, die scannen sollen, iOS 17 oder neuer?
21. ~~Lesbare Tabellen für «Scannen»~~ Entschieden am 21.11.2026: Planungstabellen lesbar, siehe «Rechte».

Später:

13. **Lagerbestand und Produktion:** Soll der Wellenplan weniger produzieren, wenn noch Bestand da ist? Heute rechnet er ohne Lager.
14. **Lagerorte:** Reicht die Lagerart (0–2 °C, TK, Economat), oder braucht es Orte (Kühlraum 1, TK-Zelle 2)?
15. **Zukauf-Produkte:** Ab wann sollen sie Etiketten und Seriennummern bekommen?
22. **Adresse im QR-Code beim Umzug:** `gamma.atoll-os.com` steht auf jedem Etikett. Beim Umzug auf den GAMMA-Server muss die Adresse weiterleiten, solange alte Etiketten im Tiefkühler liegen.
