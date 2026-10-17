# Button

Löst eine Aktion aus; pro Bereich höchstens ein Primär-Button.

- **primary** (`accent` / `on-accent`): die eine Hauptaktion eines Screens, z.B. «Ressourcen berechnen», «Offerte erstellen».
- **secondary** (`surface`, Rahmen `border-control`): Nebenaktionen wie «Entwurf speichern», «Drucken».
- **dashed**: Hinzufügen in Listen, z.B. «+ Gang hinzufügen», «+ Prozessschritt».
- Höhe immer `control-height` (44 px), Radius `radius-md`.
- Beschriftung nennt, was passiert (Verb), nicht «OK» oder «Weiter».
- Mit `href` wird ein Link im Button-Look gerendert (Navigation zwischen Screens).
