# Tabs

Zweite und dritte Ebene der Navigation: die Seiten eines Bereichs (unter der TopNav, `tone="sunken"`) und die Ansichten einer Seite (im Inhalt, z.B. Liste, Wellen, Aufwand).

- Echte Links mit `aria-current="page"`, kein Wechsel ohne Seitenaufruf.
- Aktiver Eintrag in `ink`, fett, mit Linie unten; die anderen in `ink-muted`.
- Ohne Einträge rendert die Komponente nichts.
- Unter 760 px scrollt die Zeile seitlich, statt umzubrechen.
- `label` ist der Name der Navigation für Screenreader.
