# Premium-Schliff – Umsetzungsplan

**Ziel:** Die App soll beim ersten Öffnen so hochwertig wirken, wie sie fachlich ist. Konzept, Farben und Typografie (Variante D) bleiben; es geht um Auftritt, Bewegung und Zustände.

**Befund vom 19.11.2026:** Live gesehen wurde nur die Anmeldeseite (`gamma.atoll-os.com/anmelden/`), die übrigen Screens sind aus Code und Design System 0.14 beurteilt. Vor Aufgabe 3 deshalb alle Screens einmal angemeldet durchsehen und diese Liste ergänzen (Aufgabe 0).

**Vor dem Start lesen:** `CLAUDE.md`, `docs/uebergabe-claude-code.md`, `design-system/README.md`, `docs/plan-ui-ux-look-d.md` (gleiche Arbeitsregeln).

**Für jede Aufgabe gilt:**

- Tests: `cd app && npm test`. Typen: `cd app && npm run typecheck`. Beides vor jedem Commit, mit Node 24.
- Jede Änderung in `design-system/`: Zeile in `CHANGELOG.md` (ab 0.15, Datum TT.MM.JJJJ), `index.d.ts`, `README.md` und `preview.html` der Komponente nachführen.
- Neue Werte (Dauer, Schatten) kommen als Token in `design-system/tokens.json`, danach `scripts/tokens.mjs` laufen lassen. Keine Hex-Werte und keine festen Millisekunden in Screens.
- Bedienelemente mindestens 44 px hoch. Schweizer Hochdeutsch ohne ß.
- Ein Commit pro Aufgabe, Nachricht auf Deutsch.

## Reihenfolge und Befund

| Nr. | Aufgabe | Befund | Wirkung |
| --- | --- | --- | --- |
| 0 | Durchsicht aller Screens, angemeldet | nur die Anmeldeseite wurde live geprüft | Grundlage |
| 1 | Anmeldeseite neu setzen | klebt oben links, E-Mail-Feld ragt aus der Karte | sehr hoch |
| 2 | Marke und App-Icons | kein Logo, `icons: []` im Manifest | sehr hoch |
| 3 | Bewegung | keine einzige Transition in `bundle.css` | hoch |
| 4 | Ladezustände | «…» und «wird geladen …» auf rund 12 Seiten | hoch |
| 5 | Fehlermeldungen | rund 50 Stellen zeigen `e.message` roh an | mittel |
| 6 | Leere Zustände | keine einheitliche Darstellung | mittel |
| 7 | Dialog bei ungespeicherten Änderungen | Standarddialog des Browsers | mittel |
| 8 | Kopfzeile und Tiefe | E-Mail und «Abmelden» lose in der Leiste, Dialog ohne Schatten | mittel |
| 9 | Abnahme mit Bildern | – | Kontrolle |

Aufgaben 1 und 2 zuerst: Sie bestimmen den ersten Eindruck und brauchen zusammen etwa einen halben Tag. 3 bis 8 sind unabhängig voneinander.

---

### Aufgabe 0: Durchsicht aller Screens

- [x] `cd app && npm run dev`, anmelden, jede Seite aus `lib/navigation.ts` (`GRUPPEN` und `ANSICHTEN`) in 1440 px und 390 px Breite ansehen, hell und dunkel.
- [x] Pro Seite notieren: Was fällt als unfertig auf (Abstände, Umbrüche, überlaufende Tabellen, nackte Texte, Sprünge beim Laden)?
- [x] Befunde unten im Abschnitt «Nachtrag Durchsicht» eintragen und den Aufgaben 3 bis 8 zuordnen oder als neue Aufgabe anhängen. Erst danach weiterbauen.

### Aufgabe 1: Anmeldeseite neu setzen

**Dateien:** `app/app/anmelden/page.tsx`, `design-system/components/bundle.css` (neue Klasse `pl-auth`), `design-system/components/Cover/` oder neue Komponente, falls passend.

**Ursache des überlaufenden Felds:** Die Seite beginnt mit `<main className="pl-main">` ohne den Rahmen `pl-app`. `box-sizing: border-box` hängt an `.pl-app *` und `.pl-root *`, darum rechnet das Feld Innenabstand und Rahmen zur Breite dazu.

- [x] Rahmen `pl-app` um die Seite, damit `box-sizing` greift. Prüfen, ob das Feld bündig in der Karte sitzt.
- [x] Layout `pl-auth`: Inhalt horizontal und vertikal zentriert, Karte höchstens 420 px breit, Hintergrund `surface-sunken`, Karte auf `surface` mit Schatten-Token aus Aufgabe 8.
- [x] Über der Karte die Marke aus Aufgabe 2, darunter «Produktionsplaner» als Titel in Normalgrösse (nicht 44 px Versalien).
- [x] Unter der Karte eine ruhige Fusszeile: «GAMMA Catering · Hünenberg». Keine weiteren Links.
- [x] Alle drei Zustände gleich setzen: E-Mail eingeben, «E-Mail gesendet» mit Code, «Anmeldung bestätigen».
- [x] Code-Feld: sechs Ziffern in Mono, grösser (20 px), zentriert, mit Abstand zwischen den Ziffern.
- [x] Bei 390 px: Karte randlos mit 16 px Seitenabstand, nichts läuft über.
- [x] Commit `Anmeldeseite zentriert, mit Marke, Feld bündig`

### Aufgabe 2: Marke und App-Icons

**Logo (Stand 19.11.2026):** Die Bildmarke ist ein fettes «G» in einem Kreisring, einfarbig (auf gammagruppe.ch dunkel auf Weiss und hell auf Schwarz). Auf der Website liegt sie nur klein als Rasterbild vor:

- `https://gammagruppe.ch/wp-content/uploads/2022/10/GAMMA_nav@2x.png` (126 × 74 px, Kopfzeile)
- `https://gammagruppe.ch/wp-content/uploads/2022/10/gamma-64.png` (64 px, Favicon)
- Wortmarke GAMMACATERING: `https://gammagruppe.ch/wp-content/uploads/2025/02/GAMMACATERING.png` (964 × 642 px) und `.../2026/09/Gammacatering-Logo-Schutzraum-weiss-scaled.png` (2560 × 329 px, weiss)

Für Kopfzeile und Favicon reicht das, für die App-Icons (192 und 512 px) nicht. Dafür braucht es die Vektordatei (SVG) von GAMMA. Bis sie da ist, bleiben die App-Icons beim Platzhalter (Quadrat in `accent`); alles so bauen, dass später nur das Asset getauscht wird. Das Logo nicht verändern (keine anderen Farben als Schwarz, Weiss oder nach Vorgabe von GAMMA, Schutzraum einhalten).

**Dateien:** neue Komponente `design-system/components/Brand/`, `TopNav`, `app/app/anmelden/page.tsx`, `app/app/favicon.ico`, `app/public/manifest.webmanifest`, `app/public/icons/`, `app/app/layout.tsx`.

- [x] Komponente `Brand`: Bildmarke («G» im Kreis; bis die SVG von GAMMA vorliegt das Rasterbild der Website in Kopfzeile und Anmeldung) plus Wortmarke «GAMMA Catering» und klein «Produktionsplaner». Grössen `sm` (TopNav) und `lg` (Anmeldung). Bildmarke als SVG-Datei, damit der Tausch gegen das Logo eine Datei betrifft.
- [x] `TopNav` nutzt `Brand` statt reinem Text.
- [x] Icons 192 und 512 px, maskierbar, dazu `apple-touch-icon` 180 px, aus derselben SVG erzeugt (Skript in `app/scripts/`). Im Manifest eintragen, `icons` ist heute leer.
- [x] `favicon.ico` prüfen und durch die Bildmarke ersetzen, dazu `icon.svg`.
- [x] `theme-color` für hell und dunkel in `layout.tsx`.
- [x] Mailvorlage `supabase/templates/anmeldelink.html` im gleichen Auftritt (Marke oben, Knopf in `accent`). Hinweis in `docs/supabase.md`: Vorlage muss danach von Hand im Dashboard eingetragen werden.
- [x] Commit `Marke als Komponente, App-Icons und Favicon`

### Aufgabe 3: Bewegung

**Dateien:** `design-system/tokens.json`, `design-system/components/bundle.css`, `DetailPanel`, `Dialog`.

- [x] Tokens: `motion-fast` 120 ms, `motion-base` 200 ms, `ease-standard` `cubic-bezier(0.2, 0, 0, 1)`.
- [x] Übergänge auf Farbe, Hintergrund, Rahmen und Schatten für: `pl-btn`, `pl-top__item`, `pl-tabs__item`, `pl-nav__item`, `pl-items__item`, `pl-todo`, `pl-list-row`, `pl-seg__opt`, `pl-field__input`, Tabellenzeilen, `pl-table__sort`.
- [x] Knopf gedrückt: kurzer Zustand `:active` (dunkler, kein Springen).
- [x] `Dialog`: einblenden mit Deckkraft und 8 px Versatz, Hintergrund blendet mit (`@starting-style`, mit Rückfall ohne Bewegung).
- [x] `DetailPanel`: Inhalt blendet beim Wechsel der Zeile kurz über, statt hart zu tauschen.
- [x] `pl-progress__bar` und `pl-anteil__teil`: Breite wächst beim ersten Anzeigen.
- [x] `@media (prefers-reduced-motion: reduce)`: alle Dauern auf 0.
- [x] Commit `Bewegung: Tokens und Übergänge im Design System`

### Aufgabe 4: Ladezustände

**Dateien:** neue Komponente `design-system/components/Skeleton/`, alle Seiten unter `app/app/(geschuetzt)/`.

- [ ] Komponente `Skeleton` mit Varianten `text`, `zahl`, `zeile` (Tabellenzeile) und `karte`. Fläche `surface-sunken`, ruhiges Pulsieren, bei reduzierter Bewegung statisch. `aria-hidden`, dazu einmal pro Seite ein `role="status"` mit `pl-sr`-Text.
- [ ] `DataTable` bekommt `loading` und zeigt dann acht Skelettzeilen mit den echten Spaltenbreiten.
- [ ] `KpiTile` und `pl-todo__zahl`: Skelett statt «…».
- [ ] Alle Stellen ersetzen: `grep -rn -E '"…"|wird geladen' app/app app/components`. Betroffen sind Leitstand, Rezepte, Rezept bearbeiten, Produktion (Liste, Wellen, Aufwand), Küchenpass, Katalog, Systemzuteilung, Anlässe, Offerten, Rentabilität, Einkauf.
- [ ] Das Layout darf beim Eintreffen der Daten nicht springen: Skelett hat die Höhe des späteren Inhalts.
- [ ] Commit `Ladezustände mit Skelett statt Platzhaltertext`

### Aufgabe 5: Fehlermeldungen

**Dateien:** neu `app/lib/fehler.ts`, `app/tests/fehler.test.ts`, rund 50 Stellen mit `e.message` oder `error.message`.

- [ ] Funktion `fehlerText(e)`: bekannte Fälle in klare Sätze übersetzen (keine Verbindung, Sitzung abgelaufen, keine Berechtigung, Datensatz wird noch verwendet, doppelter Wert). Unbekanntes: «Das hat nicht geklappt. Bitte nochmals versuchen.»
- [ ] Tests zuerst, je bekannter Fall einer (Muster wie `fehlertext` in `lib/anmeldung.ts`).
- [ ] `Notice` bekommt optional `detail`: die technische Meldung steht aufklappbar unter «Technische Angaben», nicht im Haupttext.
- [ ] Bei «Sitzung abgelaufen» direkt zur Anmeldung leiten statt einen Hinweis zu zeigen.
- [ ] Alle Stellen umstellen, danach `grep` auf `\.message` in `app/app` und `app/components` prüfen.
- [ ] Commit `Fehlermeldungen in klarer Sprache, Technik aufklappbar`

### Aufgabe 6: Leere Zustände

**Dateien:** neue Komponente `design-system/components/EmptyState/`, Listen und Tabellen in allen Screens.

- [ ] Komponente `EmptyState`: Titel, ein Satz, optional eine Aktion (Button). Ruhig, linksbündig in der Tabelle, kein Bild.
- [ ] Zwei Fälle unterscheiden: «noch nichts erfasst» (mit Aktion «Erstes … erfassen») und «Suche oder Filter ohne Treffer» (mit Aktion «Filter zurücksetzen»).
- [ ] `DataTable` bekommt `empty`. Alle Listen durchgehen: Offerten, Anlässe, Rezepte, Katalog, Produktionsliste, Wellen, Einkauf, Lieferanten, Benutzer, Stammdaten.
- [ ] Commit `Leere Zustände einheitlich mit nächstem Schritt`

### Aufgabe 7: Dialog bei ungespeicherten Änderungen

**Dateien:** `app/lib/ungespeichert.ts`, `app/tests/ungespeichert.test.ts`, `rezepte/bearbeiten/page.tsx`, `components/anlass/AnlassKopf.tsx`.

- [ ] Klicks auf Links innerhalb der App abfangen, solange Änderungen offen sind, und den eigenen `Dialog` zeigen: «Änderungen verwerfen?» mit «Weiter bearbeiten» (primär) und «Verwerfen».
- [ ] `beforeunload` bleibt für Tab schliessen und Neuladen; dort lässt der Browser keinen eigenen Dialog zu.
- [ ] Test für die reine Entscheidungsfunktion (gleicher Ursprung, kein neuer Tab, kein Download, kein Anker auf derselben Seite).
- [ ] Commit `Eigener Dialog bei ungespeicherten Änderungen`

### Aufgabe 8: Kopfzeile und Tiefe

**Dateien:** `design-system/tokens.json`, `bundle.css`, `TopNav`, `app/components/Geruest.tsx`.

- [ ] Tokens `shadow-overlay` (Dialog, Menü) und `shadow-card` (Anmeldekarte), hell und dunkel. `Dialog` bekommt `shadow-overlay`.
- [ ] Benutzer-Menü rechts in der Kopfzeile: Kürzel im Kreis, beim Öffnen Name, E-Mail und «Abmelden». Ersetzt die lose E-Mail und den Knopf.
- [ ] Kopfzeile bleibt beim Scrollen oben stehen (`position: sticky`), mit feiner Linie.
- [ ] Linien-Icons nach `design-system/README.md` (18 px, Strich 1.8, `currentColor`) für wiederkehrende Aktionen: Suchen, Drucken, Hinzufügen, Bearbeiten, Schliessen, Sortierrichtung. Als SVG im Design System, immer neben Text.
- [ ] Tabellenzeilen, die klickbar sind, zeigen das beim Überfahren (Hintergrund `surface-sunken`, Zeiger).
- [ ] Commit `Kopfzeile mit Benutzer-Menü, Schatten-Tokens, Icons`

### Aufgabe 9: Abnahme mit Bildern

- [ ] Von jedem Screen ein Bild in 1440 px und 390 px, hell und dunkel, in `docs/abnahme-premium/` ablegen.
- [ ] Prüffragen pro Bild: Ist die Marke sichtbar? Läuft nichts über? Gibt es einen Zustand für Laden, Leer und Fehler? Sind Abstände aus den Tokens?
- [ ] Kontrast der neuen Elemente prüfen (Text 4.5:1, Bedienelemente 3:1).
- [ ] Dominik sieht die Bilder durch, bevor ausgeliefert wird.

## Nicht Teil dieses Plans

- Neues Konzept, neue Farben oder neue Schrift. Variante D bleibt.
- Offizielles GAMMA-Logo und Schrift PP Neue Montreal: folgen, sobald GAMMA liefert (Tausch der Datei aus Aufgabe 2).
- Eigenes Handy-Layout oder Swift-App: offen, eigene Entscheidung.

## Nachtrag Durchsicht

Durchsicht vom 20.11.2026, angemeldet auf `localhost:3000` gegen die Pilot-Datenbank. Gesehen: alle 16 Seiten aus `GRUPPEN` und `ANSICHTEN` in 1440 px hell; in 390 px Produktionsliste, Rezepte, Anlässe, Rentabilität, Ressourcen und Küchenpass; dunkel Aufwand und Rentabilität. **Nicht gesehen:** die Unterseiten zum Bearbeiten (Anlass, Offerte, Rezept), Karte und Druckansichten, die übrigen Seiten in 390 px und dunkel. Das holt Aufgabe 9 nach.

| Nr. | Befund | Wo | Gehört zu |
| --- | --- | --- | --- |
| N1 | Schlägt eine Abfrage fehl, bleibt der ganze Leitstand leer (fünfmal «–», dreimal «Keine Daten.») und zeigt die rohe Meldung «Could not find the table 'public.leitstand_rezepte' in the schema cache». Ursache lokal: Migration 32 ist noch nicht eingespielt. | Leitstand | Aufgabe 5; ob die übrigen Abschnitte trotzdem laden sollen, entscheidet Dominik |
| N2 | Links ohne Klasse stehen im Blau des Browsers, im Dunkel-Thema schlecht lesbar. | Aufwand (Rezept-Link «Eingelegte Birne»), vermutlich weitere | Aufgabe 8: Link-Stil in `accent` |
| N3 | Abstand zwischen Seitenkopf und Inhalt ist uneinheitlich: gross bei Produktionsliste, Einkauf, Lieferanten, Benutzer, Stammdaten, Systemzuteilung; eng bei Anlässen und Offerten. Im Aufwand klebt die Unterzeile am Titel. | mehrere | Aufgabe 8 |
| N4 | Namen in der ersten Spalte sind Sekundär-Buttons (Kasten um «Spengler Cup», «O-2026-0001»). Wirkt schwer; die Zeile selbst ist nicht klickbar. | Anlässe, Offerten | Aufgabe 8 (klickbare Zeilen) |
| N5 | Der Knopf «+ Zuständig» bricht auf zwei Zeilen um. | Produktionsliste, Wellen | Aufgabe 8 |
| N6 | Ladetext «Vorschläge werden gesucht …», im Breadcrumb «EINKAUF · …». | Artikel zuordnen | Aufgabe 4 |
| N7 | Leere Zustände als nackter Satz: «Keine Daten.», «Noch kein Personal erfasst.», «Noch keine Lieferanten.», «Noch nichts erfasst.» | Leitstand, Ressourcen, Lieferanten, Stammdaten, Einkauf | Aufgabe 6 |
| N8 | Platzhalter als Leitzahl: `[Personal]`, `[DB]`, `[Ergebnis]`, `[Break-even]`, `[Preis]` in 30 px Mono füllen die KPI-Reihe. Fachlich richtig (nie schätzen), wirkt aber unfertig. | Ressourcen, Rentabilität, Einkauf | offen, Entscheid Dominik: so lassen oder ruhiger darstellen |
| N9 | In 390 px steht «Skalieren» nicht auf der Linie des Felds «andere Anzahl Chargen». | Rezepte | Aufgabe 8 |
| N10 | Dunkel: Karte (`surface`) ist dunkler als der Grund `surface-sunken`. | Anmeldung | Aufgabe 8 (Schatten-Tokens hell und dunkel) |

Ohne Befund: In 390 px läuft auf den sechs geprüften Seiten nichts über die Breite, Bedienelemente der Produktionsliste sind mindestens 44 px hoch. Die Marke steht auf jeder Seite in der Kopfzeile.
