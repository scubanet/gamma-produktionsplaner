# Anleitung Produktionsplaner

Stand: 10.11.2026. Kurze Bedienungsanleitung pro Modul. Die Module stehen links in der Navigation in dieser Reihenfolge.

## Grundsätze, die überall gelten

- **Die App rechnet nicht selbst.** Jede Zahl kommt aus der Datenbank. Neben berechneten Zahlen steht eine «Herleitung», die zeigt, wie sie entstanden ist.
- **Platzhalter statt Schätzung.** Fehlt ein Wert, steht `[Preis]`, `[Menge]` oder `[Datum]`. Ein Total erscheint erst, wenn alle Teile da sind.
- **Gestrichelt unterstrichen = Annahme.** Der Wert ist noch nicht bestätigt und muss geprüft werden.
- **Prüfhinweise (rot, gelb) sperren nichts.** Sie zeigen, wo etwas nicht plausibel ist.
- **Zusatzbedarf ist kein Fehler.** «+1 Freelancer» oder «+1 Miete» heisst nur: Das braucht es zusätzlich.
- **Drucken** geht auf den meisten Seiten über den Knopf «Drucken»; im Druckdialog lässt sich auch ein PDF sichern.

## Der Weg durch die App

1. **Offerte** schreiben und bestätigen. Daraus wird ein Anlass.
2. **Anlass** ergänzen: Services (Tage oder Spiele mit Gästezahl) und Menülinien.
3. **Produktionsplan** ansehen: Mengen pro Komponente, danach die Produktionswellen.
4. **Einkauf**: Einkaufsliste nach Lieferant mit Bestellschluss.
5. **Ressourcen**: Personal und Geräte pro Anlass.
6. **Rentabilität**: Deckungsbeitrag pro Anlass und Monatsergebnis.

Katalog, Systemzuteilung, Rezepte und Stammdaten sind die Grundlagen dafür.

## Anmelden

E-Mail-Adresse eingeben, den Link in der E-Mail öffnen. Es gibt kein Passwort. Anmelden können sich nur bereits erfasste Benutzer. Abmelden geht im Leitstand.

## Leitstand

Übersicht mit den nächsten Schritten. Von hier geht es in die Module.

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
- **Getränke- und Barkarten:** Positionen mit Rubrik, Bezeichnung, Menge und Preis pflegen, umbenennen, drucken. Positionen ohne Preis werden angezeigt.

## Produktionsplan

**Produktionsliste**

- Zeigt pro Komponente die Menge für die ganze Saison, Haltbarkeit, Anzahl Wellen und den frühesten Start.
- Filter: Kategorie, Status, Menülinie.
- Die Herleitung zeigt Gäste × Anteil × Menge pro Gast.
- «Abgleich mit der Excel» vergleicht die Kontrollwerte (z.B. Bündner Trockenfleisch 181.5 kg). Stimmt etwas nicht, zuerst melden.
- Export als Excel, Drucken als PDF.
- **Erledigt:** Hat eine Komponente eine Welle oder keine (Zukauf, nur vor Ort), wird hier abgehakt. Bei mehreren Wellen steht der Stand («2 von 3 Wellen»); abgehakt wird dann im Wellenplan.
- **Zuständig** gilt hier für alle Wellen der Komponente.

**Produktionswellen** (Knopf «Produktionswellen»)

- Die App schlägt Wellen vor: Wie oft produziert wird, ergibt sich aus der Haltbarkeit und den Service-Daten.
- **Vorschlag übernehmen** speichert den Plan. Das ersetzt einen bestehenden Plan.
- Danach lässt sich pro Welle der Produktionstag ändern und eine Bemerkung setzen.
- **Erledigt** und **Zuständig** pro Komponente in jeder Welle. Im Dialog «Zuständig» lässt sich die Person gleich für alle Wellen der Komponente setzen.
- Hinweise oben zeigen, was fehlt: Services ohne Datum, Komponenten ohne Zuteilung.

## Systemzuteilung

Ersetzt die Kategorienblätter der Excel.

- Liste aller Komponenten mit Status: **offen** (noch nicht zugeteilt), **ok**, **Zukauf** (CF-Stufe 4 oder 5).
- Suchen und filtern nach Kategorie, Status und Prüfhinweisen.
- **Bearbeiten** öffnet die Zuteilung: Produktionssystem, Lagerung (0–2 °C, TK, gedeckt, Tage), Regeneration und CF-Stufe. Speichern rechnet Status und Prüfhinweise neu.
- Hat inzwischen jemand anderes dieselbe Komponente geändert, wird nicht überschrieben; die App lädt den neuen Stand.

## Katalog

Die Gerichte der Winter Collection mit ihren Komponenten.

- Gericht suchen oder nach Kategorie filtern.
- Rechts stehen die Komponenten des Gerichts und das Quantum pro Gast je Angebotsform.
- Die Verknüpfung Gericht ↔ Rezept gibt es in der App noch nicht.

## Rezepte

- **Liste links:** Gerichte und Komponenten. «+ Rezept» legt ein neues an.
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

**Artikel zuordnen** (Knopf «Artikel zuordnen»)

- Zeigt alle Komponenten der Saison ohne Hauptartikel, je mit bis zu drei Vorschlägen aus der Preisliste (ähnlicher Name, Prozentzahl = Ähnlichkeit).
- Ein Klick auf den Vorschlag ordnet zu. Passt keiner: «Artikel suchen».
- Ein ähnlicher Name ist noch nicht der richtige Artikel: vor dem Klick prüfen. Ändern lässt sich die Zuordnung in der Einkaufsliste unter «Verknüpfte Komponenten».

**Lieferanten** (Knopf «Lieferanten»)

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

## Womit anfangen

Diese Daten fehlen noch und bringen am meisten:

1. Datum der 11 Spiele des Spengler Cup (Anlässe → Services).
2. Lieferanten mit Liefertagen, dann Hauptartikel pro Komponente (Einkauf).
3. Lohnsätze, Strompreis, Fixkosten, Gerätebestand (Stammdaten).
4. Bei den Rezepten: Basiszutat, Ergibt-Menge und Mengen in Gramm.
