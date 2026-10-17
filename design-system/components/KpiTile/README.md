# KpiTile

Zeigt eine Leitzahl mit Label und optionaler Erklärung.

- Zahl in `kpi` (IBM Plex Mono, tabellarische Ziffern), Label und Detail in `label` / `ink-muted`.
- Reihen von 3–4 Kacheln in einem Grid mit `gap` `space-4`; alle Kacheln einer Reihe gleich aufgebaut.
- Die finanzielle Kennzahl (Preis pro Gast) darf `tone="panel"` tragen, sonst nur eine Kachel pro Reihe.
- Unbekannte Werte als Platzhalter `[Preis]`, nie geschätzt.
