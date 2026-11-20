# Dialog

Modales Fenster zum Bearbeiten eines Datensatzes, ohne die Liste zu verlassen (z.B. Komponente in der Systemzuteilung).

- Natives `<dialog>` mit `showModal()`: Fokus bleibt im Dialog, Escape schliesst, Hintergrund `backdrop`.
- Fläche `surface`, Rahmen `border`, Radius `radius-lg`, Titel wie Kartentitel; Breite höchstens 720 px.
- `actions` rechts unten: Sekundär («Abbrechen») vor Primär («Speichern»). Der Inhalt wird nur gerendert, solange der Dialog offen ist.
- `onClose` kommt auch bei Escape; der Aufrufer setzt dann `open` auf `false`.
- `onCancel` erhält das Escape-Ereignis; `e.preventDefault()` hält den Dialog offen, z.B. solange gespeichert wird.
- Blendet beim Öffnen mit Deckkraft und 8 px Versatz ein (`motion-base`), der Hintergrund blendet mit. Browser ohne `@starting-style` zeigen ihn ohne Bewegung.
- Schatten `shadow-overlay`.
