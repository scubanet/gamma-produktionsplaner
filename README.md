# Produktionsplaner – GAMMA Catering

Planungs-App für Event-Catering: Ein Anlass (Gäste, Menü, Serviceart, Location) wird einmal erfasst. Daraus berechnet die App Einkauf, Produktionsplan, Geräte, Material, Personal (inkl. Freelancer-Pool) und Preis pro Gast.

## Inhalt

| Ordner | Inhalt |
| --- | --- |
| `docs/` | Lösungsvorschlag (PDF): Grundprinzip, Datenmodell, Berechnungslogik, Umsetzung in drei Stufen |
| `design-system/` | Design System «Produktionsplaner»: Tokens, Brand Book, 12 Komponenten (`window.Planer`), Änderungsprotokoll |
| `mockups/` | Klickbare Screens (Design Components, `.dc.html`), alle aus `planer.css` (Design-System-Tokens) und mit gemeinsamer Navigation `Nav.dc.html`: Leitstand, Anlass erfassen, Ressourcen, Produktionsplan, Rezepte, Rentabilität |
| `rezepte/` | `rezepte.json`: 14 Rezepte (6 Gerichte, 8 Komponenten) im Rezeptkarten-Format, Annahmen markiert |
| `supabase/` | Massgebend für die Datenbank: Migrationen (`migrations/`) und Import der GAMMA-Excel (`import/`). Details in `docs/supabase.md` |
| `db/` | Archiv Proof of Concept: `schema.sql` (PostgreSQL/Supabase), `seed.sql` mit den Rezepten, `kosten.sql` mit Kostenmodell (Lohnsätze, Energie, Fixkosten, Anlässe) und Auswertungen für Deckungsbeitrag und Monatsergebnis |

## Kernprinzip

Jede Speise hat eine **Stückliste** (Zutaten pro 10 Portionen, Verluste) und einen **Arbeitsplan** (Schritte mit Ort, Gerät, Rolle, Rüstzeit, Zeit pro Charge). Ein Menü ist eine Sammlung von Speisen, ein Anlass ist Menü × Gäste × Rahmenbedingungen. Ein Regelwerk (Servicefaktoren, Reserven, Infrastruktur) leitet daraus alle Ressourcen ab.

Zeit Prozessschritt = Rüstzeit + (Menge ÷ Chargengrösse) × Zeit pro Charge

Zusatzbedarf wird nie als Engpass behandelt: Personal kommt aus dem Freelancer-Pool, Geräte und Fahrzeuge werden gemietet.

## Live-Versionen

- Design System: https://claude.ai/artifact/NdcHNeGLn5AuyF27KjoHRC
- Mockup (Canvas): https://claude.ai/artifact/9isqPxkJizcp9Aqyvmq4kG
- Lösungsvorschlag (Dokument): https://claude.ai/code/artifact/9d0ba6eb-f543-457f-ae5f-5bcd1e95f0d2
- Plattform und Datenbank (Dokument): https://claude.ai/artifact/HiKLyLAE2Q4LMsjcLWgaT9
- Pilot-Datenbank: Supabase-Projekt «Gamma», Zürich (`oqmtocxemtcsvtzmswwx`)

Die Links sind privat, bis sie im Share-Menü freigegeben werden.

## Stand

9.11.2026: Pilot-Datenbank in Supabase (Zürich) aufgesetzt. Importiert aus den GAMMA-Excel: Katalog Winter Collection 2026/27 (300 Gerichte, 493 Komponenten mit Systemzuteilung), Preisliste (669 Artikel), Quantumtabelle und Faktoren aus dem Verkaufstool, Saison mit 5 Anlässen, Spengler-Cup-Menüs (6 Menülinien, 11 Spiele, 344 Komponentenzeilen), Barkarte und die 14 Rezepte.

Proof of Concept gestartet: Datenbankschema v0.1 und 6 Rezepte erfasst (3 Gerichte, 3 Komponenten, 1 Platzhalter). Offene Punkte pro Rezept stehen in `rezepte.json` und in der Rezeptbibliothek.

Kostenlogik: Umsatz − variable Kosten (Waren, Personal, Energie, Gerätemiete, Transport, Material) = Deckungsbeitrag; Deckungsbeitrag − Fixkosten (Kaderlöhne, Miete, Abschreibungen …) = Betriebsergebnis. Break-even-Umsatz = Fixkosten ÷ DB-Quote.

Schema lokal testen: `psql -f db/schema.sql && psql -f db/seed.sql && psql -f db/kosten.sql`
