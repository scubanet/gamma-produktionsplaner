# Produktionsplaner – GAMMA Catering

Planungs-App für Event-Catering: Ein Anlass (Gäste, Menü, Serviceart, Location) wird einmal erfasst. Daraus berechnet die App Einkauf, Produktionsplan, Geräte, Material, Personal (inkl. Freelancer-Pool) und Preis pro Gast.

## Inhalt

| Ordner | Inhalt |
| --- | --- |
| `docs/` | Lösungsvorschlag (PDF): Grundprinzip, Datenmodell, Berechnungslogik, Umsetzung in drei Stufen |
| `design-system/` | Design System «Produktionsplaner»: Tokens, Brand Book, 12 Komponenten (`window.Planer`), Änderungsprotokoll |
| `mockups/` | Klickbare Screens (Design Components, `.dc.html`): Anlass erfassen, Ressourcen, Rezept & Arbeitsplan, Produktionsplan, Leitstand, Rezeptkarte, Rezeptbibliothek |
| `rezepte/` | `rezepte.json`: die ersten 6 echten Rezepte im Rezeptkarten-Format (Annahmen markiert) |
| `db/` | `schema.sql` (PostgreSQL/Supabase) und `seed.sql` mit den Rezepten |

## Kernprinzip

Jede Speise hat eine **Stückliste** (Zutaten pro 10 Portionen, Verluste) und einen **Arbeitsplan** (Schritte mit Ort, Gerät, Rolle, Rüstzeit, Zeit pro Charge). Ein Menü ist eine Sammlung von Speisen, ein Anlass ist Menü × Gäste × Rahmenbedingungen. Ein Regelwerk (Servicefaktoren, Reserven, Infrastruktur) leitet daraus alle Ressourcen ab.

Zeit Prozessschritt = Rüstzeit + (Menge ÷ Chargengrösse) × Zeit pro Charge

Zusatzbedarf wird nie als Engpass behandelt: Personal kommt aus dem Freelancer-Pool, Geräte und Fahrzeuge werden gemietet.

## Live-Versionen

- Design System: https://claude.ai/artifact/NdcHNeGLn5AuyF27KjoHRC
- Mockup (Canvas): https://claude.ai/artifact/9isqPxkJizcp9Aqyvmq4kG
- Lösungsvorschlag (Dokument): https://claude.ai/code/artifact/9d0ba6eb-f543-457f-ae5f-5bcd1e95f0d2

Die Links sind privat, bis sie im Share-Menü freigegeben werden.

## Stand

Proof of Concept gestartet: Datenbankschema v0.1 und 6 Rezepte erfasst (3 Gerichte, 3 Komponenten, 1 Platzhalter). Offene Punkte pro Rezept stehen in `rezepte.json` und in der Rezeptbibliothek.

Schema lokal testen: `psql -f db/schema.sql && psql -f db/seed.sql`
