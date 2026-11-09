# Übergabe an Claude Code

Stand: 09.11.2026. Konzept, Design und Datenbank sind fertig, jetzt wird die App gebaut. Ziel: Pilot mit White Turf im Februar 2027. Der Spengler Cup (26.–31.12.2026) läuft noch über die Excel; die App rechnet parallel mit, als Abgleich.

## Was schon da ist

| Bereich | Wo | Stand |
| --- | --- | --- |
| Konzept | Dokument «Plattform, Datenbank und Einbau der GAMMA-Excel» (Link im README), `docs/Loesungsvorschlag_Produktionsplanung_GAMMA.pdf` | freigegeben für den Pilot |
| Datenbank | Supabase «Gamma» (`oqmtocxemtcsvtzmswwx`, Zürich), `supabase/migrations/` | 6 Migrationen, Daten importiert, siehe `docs/supabase.md` |
| Design System | `design-system/` (Tokens, 12 Komponenten, Brand Book) | verbindlich für jede UI |
| Mockups | `mockups/*.dc.html` (Leitstand, Anlass, Ressourcen, Produktion, Rezepte, Rentabilität), Stylesheet `mockups/planer.css` | Vorlage für Layout und Inhalte |
| Rezepte | `rezepte/rezepte.json`, in der Datenbank in `rezept` … `schritt` | 14 Rezepte |

Die Mockups zeigen Beispieldaten (Firmenjubiläum, Hochzeit, GV). Die echten Daten sind jetzt der Spengler Cup und der Katalog der Winter Collection.

## Wichtige Views (Rechenlogik liegt in der Datenbank)

| View / Funktion | Liefert |
| --- | --- |
| `komponente_zuteilung` | Komponente mit Status (offen, ok, Zukauf) und Haltbarkeit |
| `komponente_pruefhinweis` | rote und gelbe Prüfhinweise |
| `anlass_komponente_bedarf` | Menge pro Komponente, Menülinie und Anlass |
| `produktionsliste` | Menge, Haltbarkeit, Wellen und frühester Start pro Komponente und Saison |
| `wellen_anzahl(saison, tage)` | Anzahl Produktionswellen |
| `gericht_warenkosten` | Warenkosten pro Gericht nach Hauptartikel plus 20 % Zuschlag |
| `anlass_deckungsbeitrag`, `monat_ergebnis` | Deckungsbeitrag und Monatsergebnis |

Kontrollwerte aus der Excel (müssen in der App gleich herauskommen):

- Bündner Trockenfleisch, Spengler Cup gesamt: 181.5 kg (30 g × 6'050 Gäste)
- Rindsentrecote, Menülinie «Spiel 1 und 6»: 79.2 kg (120 g × 1'100 Gäste × 60 %)
- Bunter Blattsalat, Menülinie «Spiel 1 und 6»: 27.5 kg
- Haltbarkeit 21 Tage ergibt 3 Wellen in der Saison Winter 2026/27, 3 Tage ergibt 8, 180 Tage ergibt 1
- Komponenten-Status: 310 ok, 130 offen, 53 Zukauf

## Einrichtung (einmalig, auf dem Mac)

1. Supabase-CLI anmelden und verknüpfen: `supabase login`, dann im Repo `supabase link --project-ref oqmtocxemtcsvtzmswwx`. Die Migrationen sind bereits eingespielt; `supabase migration list` muss sie als angewendet zeigen. Falls lokale und entfernte Versionen abweichen: `supabase migration repair` statt neu einspielen.
2. Next.js-App in `app/` anlegen (TypeScript, App Router, ESLint). `app/.env.local` mit `NEXT_PUBLIC_SUPABASE_URL=https://oqmtocxemtcsvtzmswwx.supabase.co` und dem Publishable Key aus dem Supabase-Dashboard (Project Settings, API Keys). `.env.local` in `.gitignore`.
3. Typen erzeugen: `supabase gen types typescript --project-id oqmtocxemtcsvtzmswwx > app/lib/database.types.ts`.
4. Design-System-Tokens aus `design-system/tokens.json` als CSS-Variablen einbinden (wie `mockups/planer.css`).

## Aufgaben in dieser Reihenfolge

1. **Gerüst und Login:** Next.js, Supabase Auth mit E-Mail-Link (Magic Link), geschützte Routen, Navigation wie `mockups/Nav.dc.html`. Erster Benutzer: Dominik. Deployment-Ziel `gamma.atoll-os.com` vorbereiten (statischer Export, falls möglich).
2. **Produktionsliste Spengler Cup:** Screen nach `mockups/Produktion.dc.html` mit Daten aus `produktionsliste` und `anlass_komponente_bedarf`. Filter nach Kategorie, Status, Menülinie. Herleitung pro Zeile (Gäste × Anteil × Menge). Kontrollwerte oben prüfen. Export als Excel und PDF.
3. **Systemzuteilung pflegen:** Liste der Komponenten mit Status und Prüfhinweisen, Bearbeiten von Produktion, Lagerung, Regeneration und CF-Stufe. Ersetzt die Kategorienblätter der Excel.
4. **Katalog und Rezepte:** Gerichte mit Komponenten, Rezeptkarte nach `mockups/Rezepte.dc.html`, Skalierung.
5. **Offerte:** ersetzt das Verkaufstool. Gäste, Angebotsform, Betrieb, Gerichte pro Gang, Mengen aus `quantum`, Preis nach Faktor, daneben Deckungsbeitrag. Offerte als PDF.
6. **Anlass und Menülinien:** Anlass mit Services und Menülinien erfassen (wie Blatt Spengler Cup), Getränke- und Barkarten.
7. **Produktionswellen und Einkauf:** Wellen planen (`produktionswelle`, `welle_komponente`), Einkaufsliste nach Artikel.
8. Danach: Personal, Geräte, Vollkosten und Rentabilität nach `mockups/Ressourcen.dc.html` und `mockups/Rentabilitaet.dc.html`.

Nach jeder Aufgabe: Commit, kurzer Stand an Dominik, Kontrollwerte prüfen.

## Offene Punkte (nicht selbst entscheiden)

- Rollen und Rechte pro Abteilung (Verkauf, Küche, Einkauf, Geschäftsleitung). Im Pilot dürfen alle angemeldeten Benutzer alles.
- Wer später den GAMMA-Server betreut; Umzug nach dem Pilot.
- Wo die Rezepte heute liegen (Spalte «Paprika» in der Systemzuteilung deutet auf die Rezept-App Paprika).
- Anbindung an eine Warenwirtschaft oder ein ERP.
- Annahmen aus den Excel (rot markiert) mit Philipp und dem Küchenchef bestätigen: Haltbarkeiten, Zuschlag 20 %, Warenkosten pro kg.
- Drei unsichere Zuordnungen Menütext → Katalog, siehe `docs/supabase.md`.

## Start in Claude Code

Im Ordner `~/Developer/Gamma/gamma-produktionsplaner` starten und als erste Anweisung geben:

> Lies CLAUDE.md, docs/uebergabe-claude-code.md und docs/supabase.md. Richte die Einrichtung ein und starte mit Aufgabe 1.
