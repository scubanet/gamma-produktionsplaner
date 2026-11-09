# ItemList

Auswahlliste links neben einer Detailansicht, z.B. Rezeptbibliothek oder Gerichte im Katalog.

- Karte wie Card (`surface`, Rahmen `border`, `radius-lg`), Gruppentitel als `eyebrow` («Gerichte», «Komponenten»).
- Einträge sind Buttons, mindestens 52 px hoch, mit Name und Detailzeile (`pl-small`).
- Gewählter Eintrag `accent-tint` mit Rahmen `accent` und `aria-current="true"`.
- Lange Listen scrollen in der Karte (höchstens 75 % der Fensterhöhe); Suche und Filter stehen darüber.
- Jede Gruppe ist eine `role="group"` mit ihrem Titel als Beschriftung; Screenreader nennen beim Wechsel die Gruppe.
