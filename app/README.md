# Produktionsplaner – App

Next.js (App Router, TypeScript), statischer Export nach `out/` für `gamma.atoll-os.com`. Daten und Rechenlogik liegen in Supabase (siehe `../docs/supabase.md`).

## Lokal starten

1. `.env.example` nach `.env.local` kopieren und den Publishable Key eintragen.
2. `npm install`
3. `npm run dev` → http://localhost:3000

## Befehle

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Entwicklungsserver (erzeugt vorher `app/tokens.css`) |
| `npm run build` | Statischer Export nach `out/` |
| `npm run typecheck` | Typprüfung |
| `npm test` | Tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run tokens` | `app/tokens.css` aus `design-system/tokens.json` erzeugen |
| `npm run types` | Datenbank-Typen nach `lib/database.types.ts` (nach jeder Migration) |

## Aufbau

- `lib/planer.ts` bindet die Komponenten aus `design-system/components/` ein. Screens importieren nur von dort.
- `app/tokens.css` ist generiert, nicht von Hand ändern. Ein Test prüft, dass sie zu `tokens.json` passt.
- Anmeldung per E-Mail-Link (Supabase Auth, PKCE). Nur eingeladene Benutzer; neue Konten werden nicht angelegt.
- Geschützte Seiten liegen in `app/(geschuetzt)/`. Die Prüfung läuft im Browser, die eigentliche Sperre ist Row Level Security.
