# Änderungsprotokoll

| Version | Datum | Änderung |
| --- | --- | --- |
| 0.5 | 09.11.2026 | Für Katalog und Rezepte (aus `mockups/Rezepte.dc.html`): ItemList (Auswahlliste neben einer Detailansicht), Chip (Gerät, Temperatur, Zeit, HACCP an Arbeitsschritten), RecipeGroups (Zutaten und nummerierte Schritte je Gruppe). Hilfsklasse `pl-sr` (nur für Screenreader). TextField mit `invalid` und `aria-describedby`, Select-Hinweis verbunden; numerische Felder mit Dezimaltastatur. SideNav-Reihenfolge mit Katalog. |
| 0.4 | 09.11.2026 | Für die Systemzuteilung: neue Komponenten Dialog (natives `<dialog>`, Token `backdrop`) und Fieldset (Checkbox-Gruppe mit Legende). Button mit `ariaLabel` für gleichlautende Buttons in Tabellen. Notice mit `role` (alert/status), Dialog mit `onCancel`. SideNav-Reihenfolge mit Systemzuteilung. |
| 0.3 | 09.11.2026 | Neue Komponente Select (Auswahlliste für Filter mit mehr als 4 Optionen, Produktionsliste). Druckregeln in `bundle.css`: Navigation und `pl-print-hide` ausgeblendet, Tabellen ohne Scrollen, Tabellenkopf auf jeder Seite. Token `border-control` dunkler (#7E8883 / #6E7A75), damit Feld- und Button-Rahmen 3:1 erreichen (vorher 1.5:1). SegmentedControl: Segmente 44 px hoch, Pfeiltasten-Bedienung wie eine Radiogruppe. |
| 0.2 | 09.11.2026 | Für die App: Seitengerüst-Klassen (`pl-app`, `pl-main`, `pl-head`, `pl-h1`, Raster, Hilfsklassen) aus `mockups/planer.css` in `bundle.css` übernommen. TextField mit `type`, `name`, `autoComplete`, `required` (Login per E-Mail). `bundle.js` läuft auch ohne `window` (Server-Rendering) und exportiert `Planer` als Modul. |
| 0.1 | 17.10.2026 | Erste Fassung aus dem Mockup (5 Screens): 40 Farb-Tokens in Hell und Dunkel, 10 Textstile, 8 Abstände, 4 Radien, 12 Komponenten. Regel «Zusatzbedarf = info, nicht Engpass» aufgenommen. |

## Offen

- GAMMA-Logo und Hausfarben einarbeiten, sobald verfügbar.
- Komponenten für Einkauf und Stammdaten, wenn diese Screens entstehen.
- Tablet-Ansicht für die Küche (Produktionsplan im Querformat).
