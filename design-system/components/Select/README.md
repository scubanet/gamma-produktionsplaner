# Select

Auswahlliste mit Label darüber, für Filter und Felder mit mehr als 4 Optionen (bis 4: SegmentedControl).

- Gleiches Feld wie TextField: Label `label` / `ink-muted`, Höhe `control-height`, Rahmen `border-control`, Fokus `accent`.
- Natives `<select>`: Tastatur, Screenreader und Touch funktionieren ohne Zusatz.
- `onChange` liefert den gewählten Wert (String). Erste Option für «alle» heisst «Alle …», z.B. «Alle Kategorien».
