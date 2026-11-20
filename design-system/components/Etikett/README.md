# Etikett

Vorschau eines gedruckten Etiketts 100 × 50 mm (Beutel oder IFCO-Kiste), bevor es angelegt und gedruckt wird.

- Schwarz auf weiss in Hell und Dunkel (`label-paper`, `label-ink`): die Vorschau zeigt das Papier, nicht die App.
- Seitenverhältnis aus `label-aspect`. Alle Masse hängen an der Breite der Vorschau; höchstens 560 px breit.
- Aufbau wie das gedruckte Etikett: Kopfzeile mit Zähler, Titel gross (mit `marke`, z.B. «TK»), Felder links, Datum im schwarzen Feld, Code rechts.
- Den QR-Code zeichnet der Drucker. In der Vorschau steht ein gestrichelter Platzhalter «QR», darunter der lesbare Code.
- Beutel-Etikett: kein Anlass, keine Menülinie. Diese stehen nur auf dem Kisten-Etikett.
- Lange Namen und Werte werden in der Vorschau mit «…» gekürzt; was der Drucker bei Überlänge macht, legt der ZPL-Text fest.
- Nur Anzeige. Die Werte kommen aus der Datenbank (Views `etikett_vorschlag`, `etikett_beutel`).
