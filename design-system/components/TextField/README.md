# TextField

Einzeiliges Eingabefeld mit Label darüber.

- Label in `label` / `ink-muted`, Feld `control-height`, Rahmen `border-control`, Fokus `accent`.
- `numeric` setzt Mono-Schrift und Ziffern-Tastatur – für Gäste, Mengen, Portionen.
- Format: Datum `TT.MM.JJJJ`, Zeit `HH:MM`, Dezimalpunkt wie in der Schweiz üblich (2.40 kg).
- `type` (`text`, `email`, `search`, `tel`), `name`, `autoComplete` und `required` gehen direkt ans Eingabefeld, z.B. `type="email"` mit `autoComplete="email"` im Login.
- `hint` ist mit dem Feld verbunden (`aria-describedby`). `invalid` markiert eine ungültige Eingabe (`aria-invalid`, Rahmen und Hinweis in `status-critical-ink`); der Hinweis wird dann vorgelesen.
- `type="date"` für Daten (Anlassdatum): der Browser zeigt seine Datumsauswahl im Format des Geräts, gespeichert wird JJJJ-MM-TT. Ausserhalb des Felds Daten immer als TT.MM.JJJJ anzeigen.
