# Produktionsplaner

Das Design System der Planungs-App für GAMMA Catering: ruhig, präzise und in der Küche bedienbar. Es wächst mit der App – jeder neue Screen bringt seine Bausteine hierher zurück.

## Wofür die App da ist

Ein Anlass (Gäste, Menü, Serviceart, Location) wird einmal erfasst. Daraus rechnet die App Einkauf, Produktionsplan, Geräte, Material, Personal und Preis ab. Das Design hat drei Aufgaben:

1. **Zusammenfassung vor Detail.** Jeder Screen beginnt mit dem, was entschieden werden muss (KPI-Reihe, dunkles Panel), danach folgen Tabellen.
2. **Jede Zahl ist herleitbar.** Berechnete Werte haben eine Spalte oder Zeile «Herleitung» (z.B. «3 × 120 + 10 % Reserve»).
3. **Bedienbar mit Kochjacke.** Alle Bedienelemente sind mindestens 44 px hoch (`control-height`), Kontraste erfüllen WCAG AA.

## Sprache und Ton

- Schweizer Hochdeutsch, ohne ß: «Grösse», «Gemüsehandel», «Kalbsbraten».
- Küchenvokabular statt Software-Jargon: Stückliste, Arbeitsplan, Charge, Rüstzeit, Regenerieren, Anrichten, Pass, GN 1/1.
- Buttons nennen die Handlung: «Ressourcen berechnen», «Offerte erstellen», «Anfragen & Mieten auslösen».
- Zahlen mit Einheit: `2.40 kg`, `180 min / 60 P`, `CHF 1 250.–`; Zeiten `19:30`, Daten `14.11.2026`.
- Unbekannte Werte als Platzhalter in eckigen Klammern: `[Preis]`, `[Kundenname]` – nie schätzen.
- Fehlendes Personal oder Gerät ist kein Fehler: Es gibt den Freelancer-Pool und Miete. Die App formuliert Zusatzbedarf («+1 Freelancer», «+1 Miete»), nie «Engpass».

## Farbe

Die Farben folgen seit Version 0.9 der Website gammacatering.com: weisser Grund, Fast-Schwarz, Bordeaux als einzige Aktionsfarbe, Status in Salbei, Gelb und Hellblau. Dazu drei Ortsfarben.

| Rolle | Token | Einsatz |
| --- | --- | --- |
| Grund | `ground`, `surface` | Seite und Karten |
| Akzent | `accent` (Bordeaux) | Primär-Button, aktiver Nav-Eintrag, Gang-Bezeichnungen, Marker im Zeitplan |
| Ort | `loc-zentral` (Blau), `loc-vorort` (Orange), `loc-logistik` (Grau) | Zeitplan-Balken, Schrittnummern, Legende |
| Status | `status-ok`, `status-info`, `status-warn`, `status-critical` | StatusPill |
| Panel | `panel`, `panel-ink` | Die eine dunkle Zusammenfassung pro Screen |

Regeln:

- Pro Ansicht genau eine Farbcodierung. Im Leitstand bedeuten Blau/Orange/Bordeaux die Anlässe A/B/C – dort keine Ortsfarben gleichzeitig.
- Zusatzbedarf ist `status-info`, nicht `status-critical`. Rot ist für echte Fehler reserviert (Allergen-Konflikt, stornierte Lieferung).
- Blau und Orange unterscheiden sich auch in der Helligkeit, damit sie bei Farbsehschwäche lesbar bleiben.

## Typografie

Inter Tight für alles Lesbare, IBM Plex Mono für Zahlen (tabellarische Ziffern, damit Mengen untereinander stehen). Beide von Google Fonts. Inter Tight ist Platzhalter für die Hausschrift PP Neue Montreal der Website; sie ist lizenzpflichtig und ersetzt Inter Tight in `font-sans`, sobald GAMMA die Webfont-Lizenz bestätigt.

- Seitentitel `page-title` 44/500 in Grossbuchstaben; ist der Titel ein Name aus den Daten (Rezept, Gericht, Anlass, Karte, Offerte), steht er mit `pl-h1--name` in Normalschrift 36/500, Kartentitel `section-title` 16/600, Text `body` 14/400.
- Labels `label` 12/500 in `ink-muted`; Tabellenköpfe und Breadcrumb `table-head` 11/500 in Grossbuchstaben mit 0.08em Laufweite, Tabellenkopf mit Linie in `ink`; Gang-Bezeichnungen `eyebrow` 12/600 in Grossbuchstaben mit 0.06em Laufweite.
- Kennzahlen `kpi` 30 und `kpi-lg` 40 in Mono; Tabellenzahlen `figure` 13 in Mono, rechtsbündig.

## Layout

- Hauptnavigation oben (TopNav) mit sechs Bereichen, darunter die Seiten des Bereichs als Tabs; Inhalt mit `space-8` oben und `space-10` seitlich. Die SideNav (links, `sidenav-width` 232 px) bleibt für die Mockups.
- Kopfzeile: Breadcrumb (`caption`), Seitentitel, rechts die Aktionen (Sekundär vor Primär).
- Die Anmeldeseite steht ohne Navigation in `pl-auth`: Marke, eine Karte mit `shadow-card`, Fusszeile, alles mittig.
- Schatten nur für Flächen über dem Inhalt (`shadow-overlay`: Dialog, Benutzer-Menü) und die Karte der Anmeldeseite (`shadow-card`).
- Links im Text und in Tabellen stehen in `accent` (`pl-link`), nie im Blau des Browsers. Führt eine Tabellenzeile zu einer Seite, ist die ganze Zeile klickbar.
- Inhalt in Karten (`radius-lg`, Rahmen `border`, keine Schatten), Abstände `space-6`, KPI-Reihen `space-4`.
- Abschnitte ohne Karte beginnen mit `pl-section-title` (Grossbuchstaben, Linie in `ink`); darunter Zeilen `pl-todo` oder `pl-list-row`. So ist der Leitstand gebaut.
- Zum Abhaken am Posten (Küchenpass) dienen Zeilen `pl-pass`: ganze Zeile klickbar, Häkchen 32 px.
- Alles bricht um: Navigation stapelt sich über dem Inhalt, Kartenreihen werden einspaltig, Tabellen und Zeitpläne scrollen in ihrem Container.

## Bewegung

Bewegung zeigt einen Zustand, sie schmückt nicht. Zwei Dauern: `motion-fast` (120 ms) für Hover, Fokus und Auswahl, `motion-base` (200 ms) für das Einblenden von Dialog und Detailspalte und das Wachsen von Fortschrittsbalken; Verlauf `ease-standard`. Keine festen Millisekunden in Screens. Bei `prefers-reduced-motion: reduce` sind beide Dauern 0.

## Ikonografie

Linien-Icons, 18 px, Strichstärke 1.8, `currentColor`, abgerundete Enden. Keine Emoji. Sie liegen als Komponente Icon im System (Suchen, Drucken, Hinzufügen, Bearbeiten, Schliessen, Sortierrichtung). Icons stehen nur neben Text (Navigation, Buttons); reine Icon-Buttons brauchen ein `aria-label`.

## Logo

Die Marke steht als Komponente Brand in der Kopfzeile und auf der Anmeldeseite. Die Bildmarke ist eine einzige Datei, `assets/bildmarke.svg`; daraus erzeugt `app/scripts/icons.mjs` Favicon und App-Icons. Noch liegt dort ein Platzhalter (bordeauxrotes Quadrat in `accent`), bis GAMMA die Bildmarke («G» im Kreisring) als Vektordatei liefert. Das Logo wird nicht verändert: nur Schwarz oder Weiss oder nach Vorgabe von GAMMA, Schutzraum einhalten.

## Komponenten

Button, Card, KpiTile, StatusPill, LocationTag, SegmentedControl, TextField, Checkbox, DataTable, Timeline, SideNav, Notice, Select, Dialog, Fieldset, ItemList, Chip, RecipeGroups, TopNav, Tabs, DetailPanel, Brand, Icon, UserMenu, Skeleton, EmptyState. Alle unter dem Namensraum `Planer`, gestylt über `bundle.css` und die Tokens.

## Wie das System weiterwächst

1. Neuer Screen in der App → zuerst prüfen, ob bestehende Komponenten reichen.
2. Neues Muster, das zweimal vorkommt → als Komponente hier aufnehmen (README, Preview, Typen).
3. Neue Farbe oder Grösse nur als Token mit Usage-Notiz, nie als Hex im Screen.
4. Jede Änderung im Änderungsprotokoll festhalten.
