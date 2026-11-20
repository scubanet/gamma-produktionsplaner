# Meldezeile

Rückmeldung am unteren Bildschirmrand: sichtbar dort, wo gerade gearbeitet wird, auch in langen Listen (Küchenpass).

- Für die Bestätigung einer Aktion mit einem Rückweg («Apfel erledigt · Rückgängig») und für Fehler, die bei der Arbeit stehen bleiben müssen («Nicht gespeichert · Nochmals versuchen»).
- Ohne `children` ist die Zeile leer und unsichtbar. Der Bereich bleibt im Dokument (`role="status"`), damit Screenreader eine neue Meldung vorlesen.
- `tone="status"` (Vorgabe): dunkles Panel (`panel`, `panel-ink`), wird höflich vorgelesen. Die Seite blendet es nach einigen Sekunden aus.
- `tone="fehler"`: Farben der Notice (`notice-bg`, `notice-border`, `notice-ink`), wird sofort vorgelesen und bleibt stehen, bis es geschlossen oder die Aktion ausgeführt ist.
- `actionLabel` und `onAction`: höchstens eine Aktion. `onClose` zeigt ein Kreuz zum Schliessen.
- Knöpfe mindestens 44 px. Nicht für Meldungen, die einen Entscheid verlangen: dafür Dialog.
- Im Druck ausgeblendet.
