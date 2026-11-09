# Produktionsplaner GAMMA Catering – Leitfaden für Claude Code

Web-App für die Produktionsplanung von GAMMA Catering (Hünenberg ZG): vom verkauften Menü zu Mengen, Produktionswellen, Einkauf, Personal, Geräten und Kosten. Auftraggeber und fachlicher Owner: Dominik Weckherlin, Produktionsleiter Küche ab Dezember 2026.

Vor jeder Arbeit lesen: `docs/uebergabe-claude-code.md` (Stand, Aufgaben, Reihenfolge) und `docs/supabase.md` (Datenbank).

## Stack

- Datenbank: Supabase-Projekt «Gamma», `oqmtocxemtcsvtzmswwx`, Region Zürich (`eu-central-2`). Pilot im Konto von Dominik, später Umzug auf einen eigenen GAMMA-Server (selbst gehostetes Supabase).
- App: Next.js (App Router) mit TypeScript im Ordner `app/`, ausgeliefert unter `gamma.atoll-os.com`. Möglichst statisch exportierbar; Logik in der Datenbank (Views, Funktionen) oder in Supabase Edge Functions, kein eigener App-Server.
- Nur Standard-PostgreSQL und offene Supabase-Funktionen verwenden, nichts, was es nur in Supabase Cloud gibt. Der Umzug zu GAMMA muss ohne Umbau gehen.

## Datenbank-Regeln

- Schemaänderungen nur als neue Datei in `supabase/migrations/` (Zeitstempel-Präfix), nie direkt im Dashboard. `db/*.sql` ist Archiv des Proof of Concept, nicht ändern.
- Jede neue Tabelle: Row Level Security an, Policy für `authenticated`. Fremdschlüssel bekommen einen Index. Views mit `security_invoker = true`.
- Rechenlogik gehört in Views oder SQL-Funktionen, damit jede Zahl in der Datenbank nachvollziehbar ist. Die App zeigt an, rechnet nicht selbst.
- Import-Funktionen liegen im Schema `importer` und sind nicht über die API erreichbar.
- Nach Schemaänderungen `supabase gen types typescript` laufen lassen und die Typen committen.
- Keine Schlüssel im Repo. Lokale Werte in `app/.env.local` (steht in `.gitignore`).

## Fachbegriffe (aus den GAMMA-Excel)

- **Systemzuteilung:** pro Komponente Produktionssystem (FNG, SF, SV, Past., HF, NTG, ÜNG, Minute), Lagerung (0–2 °C, TK, gedeckt, Tage), Regeneration (BS, Steamer, Grill, Herd, Salamander, SV, Fritteuse, Auftauen), CF-Stufe 0–5. Status offen, ok oder Zukauf (CF 4/5).
- **Basiskomponente:** Komponente, die in mehreren Gerichten vorkommt und nur einmal zugeteilt wird. Ein «Verweis» in der Excel ist in der Datenbank eine Verknüpfung Gericht → Komponente.
- **Quantum:** Gramm oder ml pro Gast und Gangtyp je Angebotsform (3-Gang-Menü, Buffet, Live Station, Flying Dinner).
- **Faktor:** Verkaufspreis = Warenkosten × Faktor (Catering 3.5, Theater Casino 4).
- **Menülinie:** Menü, das für mehrere Services gilt (Spengler Cup: «Spiel 1 und 6»). **Service:** ein Spiel oder Tag mit Gästezahl.
- **Welle:** Produktionsdurchgang in Hünenberg; Anzahl ergibt sich aus Haltbarkeit und Anlassdaten der Saison.
- **Prüfhinweis:** Plausibilitätsregel rot oder gelb, wird angezeigt, sperrt aber nichts.


## Design System ist die Quelle der Wahrheit

- Jede UI in diesem Repo verwendet die Tokens aus `design-system/tokens.json` und die Komponenten aus `design-system/components/`. Keine Hex-Werte, Schriftgrössen oder Abstände direkt in Screens.
- Fehlt ein Baustein: Wenn ein Muster zweimal vorkommt, wird es als Komponente ins Design System aufgenommen (README.md, preview.html, Typen in `index.d.ts`, Code in `bundle.js` / `bundle.css`).
- Neue Farbe oder Grösse nur als Token mit `usage`-Notiz.
- Jede Änderung am Design System bekommt eine Zeile in `design-system/CHANGELOG.md` (Version, Datum TT.MM.JJJJ, Änderung).
- Nach Änderungen das Design-System-Artifact (siehe README) mit denselben Dateien aktualisieren, damit Repo und Live-Version gleich bleiben.

## Fachliche Regeln

- Sprache: Schweizer Hochdeutsch, kein ß. Küchenvokabular (Stückliste, Arbeitsplan, Charge, Rüstzeit, Regenerieren, Anrichten).
- Zusatzbedarf an Personal oder Gerät ist kein Fehler: Status `info` («+1 Freelancer», «+1 Miete»), nie «Engpass» oder `critical`.
- Jede berechnete Zahl ist herleitbar (Spalte «Herleitung»).
- Unbekannte Werte als Platzhalter `[Preis]`, nie geschätzt.
- Bedienelemente mindestens 44 px hoch, Kontraste WCAG AA in Hell und Dunkel.

## Arbeitsweise

- Kleine Schritte, je ein Commit mit klarer Nachricht auf Deutsch. Vor dem Commit Typprüfung und Tests laufen lassen.
- Berechnungen gegen die Excel prüfen (Werte in `docs/supabase.md` und `docs/uebergabe-claude-code.md`). Abweichungen melden statt anpassen.
- Annahmen im UI kennzeichnen (gestrichelte Unterstreichung, siehe Design System) und in der Datenbank als Feld `annahme` oder in `bemerkung` festhalten.
- Bei fachlichen Unklarheiten Dominik fragen, nicht raten.
