# Icon

Linien-Icons für wiederkehrende Aktionen: 18 px, Strich 1.8, `currentColor`, runde Enden.

- Namen: `search`, `print`, `plus`, `edit`, `close`, `sort-up`, `sort-down`.
- Ein Icon steht immer neben Text. Im Button über `icon` (`<Button icon="print">Drucken / PDF</Button>`); ein Button nur mit Icon braucht `ariaLabel`.
- Das Icon selbst ist für Screenreader ausgeblendet (`aria-hidden`).
- «Hinzufügen» trägt das Icon `plus` statt eines «+» im Text.
- Neues Icon: Pfade im 24er-Raster in `ICONS` (`bundle.js`) ergänzen, Name in `IconName` (`index.d.ts`).
