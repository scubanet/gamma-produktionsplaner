# QrBild

QR-Code am Bildschirm und in der Druckansicht.

- `matrix`: Felder des Codes, `true` = dunkel, mit dem hellen Rand (vier Felder). Die Matrix rechnet die App aus dem Text des Etiketts; die Komponente zeichnet nur.
- Immer schwarz auf weiss (`label-paper`, `label-ink`), auch im dunklen Thema: so liest ihn jede Kamera.
- Breite 160 px, mit `size="lg"` 280 px (zum Scannen vom Bildschirm aus einer Armlänge); nie breiter als der Platz.
- `label` beschreibt den Code für Screenreader («QR-Code Kiste 2»). Die lesbare Zeile (Seriennummer, Kistencode) steht als Text daneben, nicht im Bild.
