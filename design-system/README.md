# Produktionsplaner

Das Design System der Planungs-App für GAMMA Catering: ruhig, präzise und in der Küche bedienbar. Es wächst mit der App – jeder neue Screen bringt seine Bausteine hierher zurück.

## Wofür die App da ist

Ein Anlass (Gäste, Menü, Serviceart, Location) wird einmal erfasst. Daraus rechnet die App Einkauf, Produktionsplan, Geräte, Material, Personal und Preis ab. Das Design hat drei Aufgaben:

1. **Zusammenfassung vor Detail.** Jeder Screen beginnt mit dem, was entschieden werden muss (KPI-Reihe, dunkles Panel), danach folgen Tabellen.
2. **Jede Zahl ist herleitbar.** Berechnete Werte haben eine Spalte oder Zeile «Herleitung» (z.B. «3 × 120 + 10 % Reserve»).
3. **Bedienbar mit Kochjacke.** Alle Bedienelemente sind mindestens 44 px hoch (`control-height`), Kontraste erfüllen WCAG AA.

## Sprache und Ton

- Schweizer Hochdeutsch, ohne ß: «Grösse», «Gemüsehandel», «Kalbsbraten».
- Küchenvokabular statt Software-Jargon: Stückliste, Arbeitsplan, Charge, Rüstzeit, Regenerieren, Anrichten, Pass, GN 1/1.
- Buttons nennen die Handlung: «Ressourcen berechnen», «Offerte erstellen», «Anfragen & Mieten auslösen».
- Zahlen mit Einheit: `2.40 kg`, `180 min / 60 P`, `CHF 1 250.–`; Zeiten `19:30`, Daten `14.11.2026`.
- Unbekannte Werte als Platzhalter in eckigen Klammern: `[Preis]`, `[Kundenname]` – nie schätzen.
- Fehlendes Personal oder Gerät ist kein Fehler: Es gibt den Freelancer-Pool und Miete. Die App formuliert Zusatzbedarf («+1 Freelancer», «+1 Miete»), nie «Engpass».

## Farbe

Ein Akzent, drei Ortsfarben, vier Statusfarben – sonst neutrale Grautöne mit leichtem Grünstich.

| Rolle | Token | Einsatz |
| --- | --- | --- |
| Grund | `ground`, `surface` | Seite und Karten |
| Akzent | `accent` (Salbeigrün) | Primär-Button, aktiver Nav-Eintrag, Gang-Bezeichnungen, Marker im Zeitplan |
| Ort | `loc-zentral` (Blau), `loc-vorort` (Orange), `loc-logistik` (Grau) | Zeitplan-Balken, Schrittnummern, Legende |
| Status | `status-ok`, `status-info`, `status-warn`, `status-critical` | StatusPill |
| Panel | `panel`, `panel-ink` | Die eine dunkle Zusammenfassung pro Screen |

Regeln:

- Pro Ansicht genau eine Farbcodierung. Im Leitstand bedeuten Blau/Orange/Grün die Anlässe A/B/C – dort keine Ortsfarben gleichzeitig.
- Zusatzbedarf ist `status-info`, nicht `status-critical`. Rot ist für echte Fehler reserviert (Allergen-Konflikt, stornierte Lieferung).
- Blau und Orange unterscheiden sich auch in der Helligkeit, damit sie bei Farbsehschwäche lesbar bleiben.

## Typografie

IBM Plex Sans für alles Lesbare, IBM Plex Mono für Zahlen (tabellarische Ziffern, damit Mengen untereinander stehen). Beide von Google Fonts.

- Seitentitel `page-title` 28/600, Kartentitel `section-title` 16/600, Text `body` 14/400.
- Labels `label` 12/500 in `ink-muted`; Gang-Bezeichnungen `eyebrow` 12/600 in Grossbuchstaben mit 0.06em Laufweite.
- Kennzahlen `kpi` 30 und `kpi-lg` 40 in Mono; Tabellenzahlen `figure` 13 in Mono, rechtsbündig.

## Layout

- Seitennavigation links (`sidenav-width` 232 px), Inhalt rechts mit `space-8` oben und `space-10` seitlich.
- Kopfzeile: Breadcrumb (`caption`), Seitentitel, rechts die Aktionen (Sekundär vor Primär).
- Inhalt in Karten (`radius-lg`, Rahmen `border`, keine Schatten), Abstände `space-6`, KPI-Reihen `space-4`.
- Alles bricht um: Navigation stapelt sich über dem Inhalt, Kartenreihen werden einspaltig, Tabellen und Zeitpläne scrollen in ihrem Container.

## Ikonografie

Linien-Icons, 18 px, Strichstärke 1.8, `currentColor`, abgerundete Enden. Keine Emoji. Icons stehen nur neben Text (Navigation, Buttons); reine Icon-Buttons brauchen ein `aria-label`.

## Logo

Noch kein offizielles GAMMA-Logo im System. Platzhalter ist ein grünes Quadrat (`accent`, Radius 7 px) mit dem Produktnamen in Text. Sobald das GAMMA-Logo vorliegt, kommt es als Asset hierher.

## Komponenten

Button, Card, KpiTile, StatusPill, LocationTag, SegmentedControl, TextField, Checkbox, DataTable, Timeline, SideNav, Notice. Alle unter dem Namensraum `Planer`, gestylt über `bundle.css` und die Tokens.

## Wie das System weiterwächst

1. Neuer Screen in der App → zuerst prüfen, ob bestehende Komponenten reichen.
2. Neues Muster, das zweimal vorkommt → als Komponente hier aufnehmen (README, Preview, Typen).
3. Neue Farbe oder Grösse nur als Token mit Usage-Notiz, nie als Hex im Screen.
4. Jede Änderung im Änderungsprotokoll festhalten.
