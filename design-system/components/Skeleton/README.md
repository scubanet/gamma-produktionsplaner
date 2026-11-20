# Skeleton

Ladezustand: ruhige graue Flächen in der Form des späteren Inhalts, statt «…» oder «wird geladen …».

- `variant="text"`: Zeilen Fliesstext (`rows`, Standard 3). `variant="zeile"`: Zeilen einer Liste oder Tabelle (Standard 8). `variant="karte"`: eine Fläche in Kartenhöhe. `variant="zahl"`: eine Zahl im Text, in einer KPI-Kachel oder im Breadcrumb.
- Fläche `surface-hover`, pulsiert ruhig (`motion-pulse`); bei reduzierter Bewegung steht sie still.
- Die Flächen sind für Screenreader ausgeblendet. `label` («Rezepte werden geladen») steht einmal pro Seite als `role="status"`, nur für Screenreader.
- `DataTable` zeigt mit `loading` acht Skelettzeilen in den echten Spalten.
- Kein Skelett für Fehler oder leere Listen: dafür Notice und der leere Zustand.
