# Arbeitsregeln für dieses Repo

## Design System ist die Quelle der Wahrheit

- Jede UI in diesem Repo verwendet die Tokens aus `design-system/tokens.json` und die Komponenten aus `design-system/components/`. Keine Hex-Werte, Schriftgrössen oder Abstände direkt in Screens.
- Fehlt ein Baustein: Wenn ein Muster zweimal vorkommt, wird es als Komponente ins Design System aufgenommen (README.md, preview.html, Typen in `index.d.ts`, Code in `bundle.js` / `bundle.css`).
- Neue Farbe oder Grösse nur als Token mit `usage`-Notiz.
- Jede Änderung am Design System bekommt eine Zeile in `design-system/CHANGELOG.md` (Version, Datum TT.MM.JJJJ, Änderung).
- Nach Änderungen das Design-System-Artifact (siehe README) mit denselben Dateien aktualisieren, damit Repo und Live-Version gleich bleiben.

## Fachliche Regeln

- Sprache: Schweizer Hochdeutsch, kein ß. Küchenvokabular (Stückliste, Arbeitsplan, Charge, Rüstzeit, Regenerieren, Anrichten).
- Zusatzbedarf an Personal oder Gerät ist kein Fehler: Status `info` («+1 Freelancer», «+1 Miete»), nie «Engpass» oder `critical`.
- Jede berechnete Zahl ist herleitbar (Spalte «Herleitung»).
- Unbekannte Werte als Platzhalter `[Preis]`, nie geschätzt.
- Bedienelemente mindestens 44 px hoch, Kontraste WCAG AA in Hell und Dunkel.
