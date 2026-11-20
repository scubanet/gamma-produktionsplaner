# EmptyState

Leerer Zustand einer Liste oder Tabelle: Titel, ein Satz, höchstens eine Aktion. Linksbündig an der Stelle der Tabelle, kein Bild.

- Zwei Fälle. «Noch nichts erfasst»: Titel «Noch keine Lieferanten», Aktion «Ersten Lieferanten erfassen» (`icon="plus"`). «Suche oder Filter ohne Treffer»: Titel «Nichts gefunden für «…»» oder «Keine Anlässe mit diesem Status», Aktion «Filter zurücksetzen».
- `actionLabel` mit `onAction` oder `href`; ohne Aktion, wenn der nächste Schritt gleich daneben steht (Button im Kartenkopf).
- `role="status"`, damit Screenreader nach dem Filtern hören, dass die Liste leer ist.
- `DataTable` zeigt mit `empty` diesen Baustein statt einer leeren Tabelle.
- Nicht für Ladezustand (Skeleton) oder Fehler (Notice).
