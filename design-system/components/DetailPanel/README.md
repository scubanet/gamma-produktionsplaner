# DetailPanel

Detail der gewählten Zeile rechts neben einer Liste (Layout `pl-split`: `pl-split__liste` und `pl-split__detail`). Ersetzt auf breiten Screens den Dialog; unter 1000 px öffnet die App weiterhin den Dialog.

- Linie oben in `ink`, `meta` in Grossbuchstaben, Titel 24/500 in Normalschrift (Namen stehen nie in Grossbuchstaben).
- Schliessen-Button oben rechts (`onClose`), 44 px, mit `aria-label`.
- `actions` kleben unten an der Spalte, damit Speichern bei langen Formularen sichtbar bleibt.
- Die gewählte Zeile in der Tabelle markiert `DataTable` über `isSelected` (Fläche `surface-sunken`, Strich in `accent`).
- Wird nicht gedruckt.
- Wechselt die Zeile, blendet der Inhalt kurz über (`motion-base`), ohne das Formular neu aufzubauen. Massgebend ist `itemKey`, sonst der Titel, wenn er Text ist.
