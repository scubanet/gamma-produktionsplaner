# DataTable

Tabelle für Stücklisten, Personal, Geräte und Ressourcen-Pools.

- Kopf in `label` / `ink-muted`, Zeilentrenner `divider`, keine Zebrastreifen.
- Mengen, Zeiten, Beträge: `numeric` → `figure` (Mono, rechtsbündig, tabellarische Ziffern), Einheit immer mitschreiben.
- `subKey` für eine zweite Zeile in `ink-muted` (Lieferant, Herleitung).
- Eine Spalte «Herleitung» erklärt, woher eine berechnete Zahl kommt – Kernprinzip der App.
- Breite Tabellen scrollen in ihrem eigenen Container.
- `printHidden` blendet eine Spalte im Druck aus, z.B. die Spalte mit «Bearbeiten»/«Entfernen» auf einer Karte, die als PDF an Gäste geht.
- Sortieren per Spaltenkopf (seit 0.11): Spalte mit `sortable`, Tabelle mit `sort` (`key`, `dir` «auf» oder «ab») und `onSort(key)`. Der Kopf ist dann ein Button, `aria-sort` zeigt den Stand, der Pfeil die Richtung. Sortiert wird ausserhalb der Tabelle.
- Gewählte Zeile (seit 0.13): `isSelected(row)` markiert die Zeile, deren Detail im DetailPanel offen ist.
- `rowHref` macht die ganze Zeile klickbar (Zeiger, Fläche `surface-sunken` beim Überfahren). Der Link in der ersten Spalte (`pl-link`) bleibt für Tastatur und Screenreader; Klicks auf Buttons und Felder der Zeile lösen die Navigation nicht aus.
- Die Sortierrichtung zeigt das Icon `sort-up` oder `sort-down` neben dem Spaltenkopf.
