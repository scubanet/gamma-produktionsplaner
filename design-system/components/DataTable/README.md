# DataTable

Tabelle für Stücklisten, Personal, Geräte und Ressourcen-Pools.

- Kopf in `label` / `ink-muted`, Zeilentrenner `divider`, keine Zebrastreifen.
- Mengen, Zeiten, Beträge: `numeric` → `figure` (Mono, rechtsbündig, tabellarische Ziffern), Einheit immer mitschreiben.
- `subKey` für eine zweite Zeile in `ink-muted` (Lieferant, Herleitung).
- Eine Spalte «Herleitung» erklärt, woher eine berechnete Zahl kommt – Kernprinzip der App.
- Breite Tabellen scrollen in ihrem eigenen Container.
