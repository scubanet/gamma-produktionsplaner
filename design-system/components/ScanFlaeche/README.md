# ScanFlaeche

Scannen am Handy: Die ganze Fläche trägt die Farbe des letzten Ergebnisses, damit es auf Armlänge und im Kühlraum sofort lesbar ist.

- `tone`: `neutral` (bereit, Vorgabe), `ok` (grün, gebucht), `warn` (gelb, Hinweis oder Rückfrage, sperrt nicht), `fehler` (rot, nicht gebucht).
- Die Farbe ist nie der einzige Träger: über dem Titel steht das Wort «ok», «Achtung» oder «Nicht gebucht». Die Meldung wird sofort vorgelesen (`role="status"`, `aria-live="assertive"`).
- Aufbau von oben nach unten: `kopf` (Spiel, Stufe, Zähler), `children` (Kamerabild als `video` oder `canvas`, Seitenverhältnis 4 : 3, höchstens 42 % der Höhe), Meldung mit `titel`, `text`, `hinweise`, zuunterst `actions`.
- `pl-scan__eingabe` (als Kind neben dem Kamerabild): Eingabe von Hand oder eine Auswahl, liegt über dem Kamerabild in den Farben der Seite.
- Signalfarben `scan-ok`, `scan-warn`, `scan-fehler` mit `scan-ink` bzw. `scan-warn-ink`; in Hell und Dunkel gleich, Kontrast über 6 : 1.
- Knöpfe in `actions` mindestens 56 px hoch (Handschuhe) und in den Farben der Fläche. Höchstens drei.
- Füllt die Höhe des Bildschirms (`100dvh`): die Seite zeigt daneben keine Navigation. Nicht für Meldungen in normalen Seiten: dafür Notice oder Meldezeile.
- Zusatzbedarf oder «fehlt noch» ist kein Fehler und nie rot.
