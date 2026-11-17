# Anleitung Produktionsplaner

Stand: 15.11.2026. Kurze Bedienungsanleitung pro Modul.

## Navigation

Oben stehen sechs Bereiche. Die Seiten eines Bereichs erscheinen als Reiter direkt darunter.

| Bereich | Seiten |
| --- | --- |
| Leitstand | Leitstand |
| Verkauf | Offerten, Anlässe |
| Produktion | Produktionsplan, Ressourcen, Einkauf, Küchenpass |
| Küche | Rezepte, Katalog, Systemzuteilung |
| Auswertung | Rentabilität |
| Verwaltung | Stammdaten, Benutzer |

- Hat eine Seite mehrere Ansichten, stehen sie als zweite Reihe Reiter über dem Seitentitel: im Produktionsplan «Liste», «Wellen», «Aufwand aus Rezepten»; im Einkauf «Einkaufsliste», «Lieferanten», «Artikel zuordnen».
- Auf dem Handy steht oben nur «GAMMACATERING» und «Menü». «Menü» klappt die Bereiche und «Abmelden» auf.
- Rechts oben steht die eigene E-Mail-Adresse und «Abmelden».

## Grundsätze, die überall gelten

- **Die App rechnet nicht selbst.** Jede Zahl kommt aus der Datenbank. Neben berechneten Zahlen steht eine «Herleitung», die zeigt, wie sie entstanden ist.
- **Platzhalter statt Schätzung.** Fehlt ein Wert, steht `[Preis]`, `[Menge]` oder `[Datum]`. Ein Total erscheint erst, wenn alle Teile da sind.
- **Gestrichelt unterstrichen = Annahme.** Der Wert ist noch nicht bestätigt und muss geprüft werden.
- **Prüfhinweise (rot, gelb) sperren nichts.** Sie zeigen, wo etwas nicht plausibel ist.
- **Zusatzbedarf ist kein Fehler.** «+1 Freelancer» oder «+1 Miete» heisst nur: Das braucht es zusätzlich.
- **Drucken** geht auf den meisten Seiten über den Knopf «Drucken»; im Druckdialog lässt sich auch ein PDF sichern.
- **Speichern wird bestätigt.** Nach dem Speichern steht unter dem Seitentitel eine Zeile, was gespeichert wurde. Ein Fehler erscheint als Hinweis «Nicht gespeichert».
- **Ungespeicherte Änderungen:** Im Rezept und im Kopf des Anlasses steht neben «Speichern» der Hinweis «Ungespeicherte Änderungen», und der Browser fragt nach, bevor die Seite verlassen wird.
- **Tabellen sortieren:** In der Produktionsliste sortiert ein Klick auf den Spaltenkopf, der zweite Klick dreht die Richtung. Der Pfeil zeigt den Stand.

## Der Weg durch die App

1. **Offerte** schreiben und bestätigen. Daraus wird ein Anlass.
2. **Anlass** ergänzen: Services (Tage oder Spiele mit Gästezahl) und Menülinien.
3. **Produktionsplan** ansehen: Mengen pro Komponente, danach die Produktionswellen.
4. **Einkauf**: Einkaufsliste nach Lieferant mit Bestellschluss.
5. **Ressourcen**: Personal und Geräte pro Anlass.
6. **Rentabilität**: Deckungsbeitrag pro Anlass und Monatsergebnis.

Katalog, Systemzuteilung, Rezepte und Stammdaten sind die Grundlagen dafür.

## Anmelden

E-Mail-Adresse eingeben. In der E-Mail den Link öffnen und auf «Jetzt anmelden» klicken, oder den Code aus der E-Mail auf der Anmeldeseite eintippen. Link und Code gelten eine Stunde und nur einmal. Es gibt kein Passwort. Anmelden können sich nur bereits erfasste Benutzer. Abmelden geht auf jeder Seite oben rechts, auf dem Handy im «Menü».

## Leitstand

Zeigt, was ansteht. Jede Zeile führt mit einem Klick zur richtigen Seite.

- **Nächster Anlass** oben rechts, mit den Tagen bis zum Beginn.
- **Zu erledigen:** Komponenten ohne Systemzuteilung, Prüfhinweise, Stand der Checkliste (erledigt / alle Aufgaben), Komponenten im Zukauf.
- **Produktionswellen:** Fortschritt pro Welle der Saison des nächsten Anlasses. «Ohne Welle» sind Komponenten im Zukauf, ohne Zuteilung oder nur vor Ort.
- **Anlässe der Saison** mit Datum; ein Klick öffnet den Anlass.
- **Zuteilung der Komponenten:** Anteile ok, offen, Zukauf.

## Offerten

Ersetzt das Verkaufstool.

1. In der Liste eine neue Offerte anlegen oder eine offene öffnen.
2. **Anlass und Kunde** ausfüllen: Kunde, Datum, Ort, Gäste, Saison, Angebotsform (z.B. 3-Gang-Menü, Buffet) und Betrieb. Der Betrieb bestimmt den Faktor (Catering 3.5, Theater Casino 4). Danach «Kopfdaten speichern»: Preise rechnen mit dem gespeicherten Stand.
3. **Gericht hinzufügen:** Gericht suchen, Gang wählen. Mehrere Gerichte im selben Gang teilen sich die Gäste gleichmässig; der Anteil lässt sich pro Gericht in Prozent ändern.
4. Rechts stehen **Preis pro Gast exkl. MWST**, **Total inkl. MWST** und der **Deckungsbeitrag**. Die Menge pro Gast kommt aus der Quantumtabelle, die Warenkosten aus dem Artikel oder, wenn keiner verknüpft ist, aus der Schätzung der Kategorie (dann als Annahme markiert).
5. **Offerte als PDF** öffnet die Kundenansicht zum Drucken.
6. **Offerte bestätigen** macht daraus einen bestätigten Anlass mit einer Menülinie «Menü» und einem Service.

## Anlässe

Ersetzt das Blatt «Spengler Cup» der Excel.

- **Liste:** alle Anlässe, filterbar nach Status.
- **Anlass bearbeiten:** Kopfdaten, Services und Menülinien.
  - **Service:** ein Tag oder ein Spiel mit Datum und Gästezahl. Das Datum braucht es für Wellen und Einkauf. Mit «Daten erfassen» lassen sich die Daten aller Services in einem Schritt eintragen.
  - **Menülinie:** ein Menü, das für einen oder mehrere Services gilt (z.B. «Spiel 1 und 6»). Gerichte kommen aus dem Katalog und bringen ihre Komponenten mit. Der Anteil sagt, wie viele Gäste das Gericht nehmen; die Menge pro Gast lässt sich pro Komponente ändern.
- **Geschirr und Besteck:** «Standard übernehmen» schlägt die Positionen für die Gänge des Menüs vor (aus den Stammdaten, je Angebotsform). Jede Position lässt sich bearbeiten: Stück pro Gast, Wechselfaktor, Reserve. Material für die Ausgabe (Platten, Wärmebehälter) als feste Stückzahl ohne Gang. Die Tabelle zeigt Bedarf, eigenen Bestand, Zusatzbedarf Miete, Körbe und Gewicht.
- **Getränke- und Barkarten:** Positionen mit Rubrik, Bezeichnung, Menge und Preis pflegen, umbenennen, drucken. Positionen ohne Preis werden angezeigt.

## Produktionsplan

**Produktionsliste**

- Zeigt pro Komponente die Menge für die ganze Saison, Haltbarkeit, Anzahl Wellen und den frühesten Start.
- **Suchen:** Das Suchfeld findet nach Komponente, Kategorie, Gericht, Gang und zuständiger Person, auch ohne Umlaute («bundner») und mit mehreren Wörtern.
- **Bearbeiten** öffnet die Zuteilung der Komponente rechts neben der Liste, mit Menge, Wellen, Start und Herleitung. Die Liste bleibt sichtbar, die gewählte Zeile ist markiert. Auf schmalen Bildschirmen (Handy, Tablet hochkant) öffnet sich stattdessen ein Dialog.
- Filter: Kategorie, Status, Spiel. Jedes Spiel wird einzeln gezeigt, mit eigener Menge, Datum und Anlieferung, auch wenn mehrere Spiele dasselbe Menü haben.
- Die Herleitung zeigt Gäste × Anteil × Menge pro Gast.
- «Abgleich mit der Excel» steht aufklappbar unter der Tabelle und vergleicht die Kontrollwerte (z.B. Bündner Trockenfleisch 181.5 kg). Zugeklappt zeigt die Zeile, ob alle Werte gleich sind. Stimmt etwas nicht, zuerst melden.
- Export als Excel (exportiert, was gerade angezeigt wird, also auch ein Suchergebnis), Drucken als PDF.
- **Erledigt:** Hat eine Komponente eine Welle oder keine (Zukauf, nur vor Ort), wird hier abgehakt. Bei mehreren Wellen steht der Stand («2 von 3 Wellen»); abgehakt wird dann im Wellenplan.
- **Zuständig** gilt hier für alle Wellen der Komponente.

**Aufwand aus Rezepten** (Reiter «Aufwand aus Rezepten»)

- Rechnet aus den verknüpften Rezepten: pro Welle die Durchgänge, die aktive Zeit, die Stunden pro Rolle und die Belegung der Geräte; pro Spiel die Gebinde, Gewicht und Volumen, die Zeit vor Ort und die Ausgabe.
- Der Status jeder Zeile sagt, was fehlt: kein Rezept, Menge fehlt, Füllmenge fehlt. Summen gelten nur für die gerechneten Komponenten.
- Gestrichelte Mengen sind Liter, als Kilogramm gerechnet (Annahme).

**Produktionswellen** (Reiter «Wellen»)

- Die App schlägt Wellen vor: Wie oft produziert wird, ergibt sich aus der Haltbarkeit und den Service-Daten.
- **Vorschlag übernehmen** speichert den Plan. Das ersetzt einen bestehenden Plan.
- Danach lässt sich pro Welle der Produktionstag ändern und eine Bemerkung setzen.
- **Erledigt** und **Zuständig** pro Komponente in jeder Welle. Im Dialog «Zuständig» lässt sich die Person gleich für alle Wellen der Komponente setzen.
- Hinweise oben zeigen, was fehlt: Services ohne Datum, Komponenten ohne Zuteilung.

## Küchenpass

Für das Handy oder Tablet am Posten: eine Welle zum Abhaken.

- Beim Öffnen steht die erste Welle, in der noch etwas offen ist. Gibt es mehrere Wellen, lässt sich oben wechseln.
- Die ganze Zeile ist antippbar. Ein Häkchen gilt für diese Komponente in dieser Welle und erscheint auch im Wellenplan und in der Produktionsliste.
- Oben steht der Fortschritt (erledigt / alle). «Noch offen», «Erledigt» und «Alle» filtern die Liste.
- Klappt das Speichern nicht (z.B. kein Netz), geht das Häkchen zurück und ein Hinweis erscheint. Dann nochmals abhaken.
- Zuständig und Termine werden im Wellenplan geändert.
- **Auf den Home-Bildschirm:** In Safari «Teilen» → «Zum Home-Bildschirm». Die App startet dann direkt im Küchenpass.

## Systemzuteilung

Ersetzt die Kategorienblätter der Excel.

- Liste aller Komponenten mit Status: **offen** (noch nicht zugeteilt), **ok**, **Zukauf** (CF-Stufe 4 oder 5).
- Suchen und filtern nach Kategorie, Status und Prüfhinweisen.
- **Bearbeiten** öffnet die Zuteilung rechts neben der Liste (auf schmalen Bildschirmen als Dialog): Produktionssystem, Lagerung (0–2 °C, TK, Economat = trocken bis 18 °C, Tage), Regeneration und CF-Stufe. Speichern rechnet Status und Prüfhinweise neu.
- Hat inzwischen jemand anderes dieselbe Komponente geändert, wird nicht überschrieben; die App lädt den neuen Stand.

## Katalog

Die Gerichte der Winter Collection mit ihren Komponenten.

- Gericht suchen oder nach Kategorie filtern.
- Rechts stehen die Komponenten des Gerichts und das Quantum pro Gast je Angebotsform.
- Die Verknüpfung Gericht ↔ Rezept gibt es in der App noch nicht.

## Rezepte

- **Liste links:** Gerichte und Komponenten, mit Suchfeld nach Name oder Kategorie. «+ Rezept» legt ein neues an.
- **Rezeptkarte:** Zutaten und Zubereitung, Zeiten, Geräte, «Besonders zu beachten», offene Punkte.
- **Skalieren:** oben eine Voreinstellung wählen oder eine eigene Zahl eingeben. Ein Gericht skaliert nach Portionen, eine Komponente nach Chargen. Zeiten werden nicht skaliert.
- **Bearbeiten** öffnet die Pflegeseite:
  - Kopf: Name, Untertitel, Quelle, Typ, Kategorie, Basisportionen oder Ergibt-Menge, Notizen.
  - **Basiszutat:** die Zutat, die als 100 % gilt. Erst damit erscheinen die Prozentwerte.
  - Zutaten: Bezeichnung, Menge in Gramm, Notiz (Originalangabe wie «2 EL»), Annahme. «+ Zutat» fügt hinzu, «Entfernen» löscht.
  - Schritte: Text, Gerät, Temperatur, Minuten aktiv und unbeaufsichtigt, HACCP.
  - Offene Punkte lassen sich als erledigt abhaken.
  - **Planung: Gebinde und Service:** Gebinde (IFCO-Box), Verpackung, Füllmenge pro Gebinde in Gramm und der Aufwand für die Ausgabe in Minuten pro 100 Portionen.
  - **Pro Schritt:** Ort (Zentralküche, vor Ort, Logistik), Rolle, Rüstzeit (einmal) und Menge pro Durchgang. «aktiv» und «unbeaufsichtigt» gelten pro Durchgang. Regenerieren vor Ort ist ein eigener Schritt mit Ort «vor Ort».
- **Karte «Planung»** auf der Rezeptkarte: zeigt, was für die Berechnung noch fehlt, und die Systemzuteilung der verknüpften Komponenten. Mit «+ Komponente verknüpfen» wird das Rezept einer Komponente im Katalog zugeordnet.
  - Gespeichert wird alles zusammen mit «Speichern». Entfernte Zeilen sind erst dann gelöscht.
  - **Rezept löschen** steht unten auf der Pflegeseite und ist nur für Administratoren sichtbar. Es löscht endgültig. Ein Rezept, das im Katalog, in der Systemzuteilung, in einem Anlass oder in einem anderen Rezept verwendet wird, lässt sich nicht löschen; die App nennt die Stelle.
- Bei importierten Rezepten fehlen oft Grammangaben, Basiszutat und Ergibt-Menge. Das steht pro Rezept unter «Offene Punkte».

## Einkauf

**Einkaufsliste**

- Zeigt pro Lieferant und Artikel, was für welche Welle oder welchen Anlass zu bestellen ist, mit Liefertermin und Bestellschluss.
- Oben: nächster Bestellschluss und Warenkosten der verknüpften Artikel.
- **Noch nicht verknüpft:** Komponenten ohne Hauptartikel. Mit «Zuordnen» einen Artikel wählen, dann erscheint die Komponente in der Liste.
- **Zukauf ohne Artikel:** Zukauf-Komponenten, die noch keinen Artikel haben.
- Solange der Wellenplan nicht übernommen ist, rechnet die Liste mit dem Vorschlag.

**Artikel zuordnen** (Reiter «Artikel zuordnen»)

- Zeigt alle Komponenten der Saison ohne Hauptartikel, je mit bis zu drei Vorschlägen aus der Preisliste (ähnlicher Name, Prozentzahl = Ähnlichkeit).
- Ein Klick auf den Vorschlag ordnet zu. Passt keiner: «Artikel suchen».
- Ein ähnlicher Name ist noch nicht der richtige Artikel: vor dem Klick prüfen. Ändern lässt sich die Zuordnung in der Einkaufsliste unter «Verknüpfte Komponenten».

**Lieferanten** (Reiter «Lieferanten»)

- Lieferant erfassen mit Liefertagen, Bestellschluss (Stunde), Vorlauf in Tagen, Telefon und E-Mail.
- Artikel einem Lieferanten zuordnen: nach Namen oder Preisliste filtern und zuweisen.

## Ressourcen

Personal, Geräte und Kalkulation pro Anlass.

1. Oben den Anlass wählen.
2. **Personal:** Rolle, Einsatz, Anzahl eigen, Anzahl Freelancer, Stunden pro Person. Die Kosten rechnen sich aus dem Lohnsatz der Rolle.
3. **Geräte:** Gerät und Anzahl. Reicht der eigene Bestand nicht, weil mehrere Anlässe gleichzeitig laufen, zeigt die App den Zusatzbedarf als Miete.
4. **Kalkulation:** pro Kostenart der berechnete Wert, daneben «Plan von Hand» und «Ist». Der Umsatz kommt aus der Offerte, sonst von Hand.

## Rentabilität

- Monat wählen: Umsatz, Deckungsbeitrag, Betriebsergebnis und Break-even-Umsatz.
- Darunter die Anlässe des Monats mit Deckungsbeitrag und Fixkosten-Anteil; «Kalkulation» springt zum Anlass in den Ressourcen.
- Ist ein Anlass unvollständig (z.B. Umsatz fehlt), gibt es kein Monatstotal. Die App sagt, was fehlt.
- «Kostensätze pflegen» führt zu den Stammdaten.

## Stammdaten

Lohnsätze pro Rolle, Strompreis, Fixkosten pro Monat, Geräte (Bestand, Mietpreis) und Einstellungen. Mit «+ …» erfassen, mit «Bearbeiten» ändern oder löschen. Solange hier nichts steht, zeigen die Kosten `[Preis]`.

## Benutzer

Nur für Administratoren.

- **Zugang anlegen:** Name und E-Mail eingeben. Die Person öffnet danach gamma.atoll-os.com und lässt sich mit dieser Adresse einen Anmeldelink schicken. Ein Passwort gibt es nicht.
- **Sperren und Entsperren:** nimmt den Zugang weg, ohne Daten zu löschen.
- **Zum Admin machen:** Admins verwalten Benutzer und dürfen Rezepte löschen. Den eigenen Zugang kann man weder sperren noch herabstufen.

## Womit anfangen

Diese Daten fehlen noch und bringen am meisten:

1. Datum der 11 Spiele des Spengler Cup (Anlässe → Services).
2. Lieferanten mit Liefertagen, dann Hauptartikel pro Komponente (Einkauf).
3. Lohnsätze, Strompreis, Fixkosten, Gerätebestand (Stammdaten).
4. Bei den Rezepten: Basiszutat, Ergibt-Menge und Mengen in Gramm.
