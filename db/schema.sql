-- Produktionsplaner – Datenbankschema v0.1 (PostgreSQL / Supabase)
-- Struktur: Gericht -> Komponenten; Rezept -> Zutatengruppen -> Zutaten + Schritte -> Schritt-Etiketten
-- Mengen immer in Gramm, Zeiten in Minuten, Temperaturen in °C.

create extension if not exists pgcrypto;

-- Stammdaten -----------------------------------------------------------

create table lieferant (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique
);

create table allergen (
  code        text primary key,            -- z.B. 'gluten', 'ei', 'milch' (14 deklarationspflichtige Allergene)
  name        text not null
);

create table artikel (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  lieferant_id    uuid references lieferant(id),
  gebinde_g       numeric(12,2),            -- Packungsgrösse in g
  preis_chf       numeric(12,2),            -- Preis pro Gebinde
  verlust_pct     numeric(5,2) default 0,   -- Rüst-/Schälverlust
  stueck_g        numeric(10,2),            -- Gewicht pro Stück (Ei 50 g, Knoblauchzehe 5 g) für Umrechnung
  aktiv           boolean not null default true
);

create table artikel_allergen (
  artikel_id   uuid references artikel(id) on delete cascade,
  allergen     text references allergen(code),
  primary key (artikel_id, allergen)
);

create table geraet (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,     -- 'Combi-Steamer', 'Kippkessel', 'Knetmaschine'
  kapazitaet      text,                     -- z.B. '10× GN 1/1', '150 l'
  anzahl_eigen    int not null default 0,   -- eigener Bestand; Mehrbedarf wird gemietet
  mietbar         boolean not null default true
);

-- Rezepte --------------------------------------------------------------

create type rezept_typ as enum ('gericht', 'komponente');

create table rezept (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  typ             rezept_typ not null,
  name            text not null,
  untertitel      text,
  kategorie       text,                     -- 'Hauptgang', 'Vorspeise', 'Sauce', 'Teig' …
  quelle          text,
  basis_portionen int,                      -- Gericht: Basis 10 Portionen
  portion_g       numeric(10,2),            -- Gericht: Gewicht pro Portion
  ergibt_g        numeric(12,2),            -- Komponente: Ertrag pro Charge
  chargengroesse  text,                     -- z.B. '40 Portionen', 'GN 1/1 × 65 mm'
  besonderes      text,                     -- «Besonders zu beachten»
  status          text not null default 'entwurf' check (status in ('entwurf','geprueft','freigegeben')),
  version         int not null default 1,
  geaendert_am    timestamptz not null default now()
);

-- Gericht verwendet Komponenten (Grundrezepte)
create table rezept_komponente (
  gericht_id      uuid references rezept(id) on delete cascade,
  komponente_id   uuid references rezept(id),
  menge_pro_portion_g numeric(10,2),
  reihenfolge     int not null default 0,
  primary key (gericht_id, komponente_id)
);

create table zutatengruppe (
  id          uuid primary key default gen_random_uuid(),
  rezept_id   uuid not null references rezept(id) on delete cascade,
  titel       text,                         -- 'Teig', 'Füllung', 'Guss' (optional)
  reihenfolge int not null
);

create table zutat (
  id            uuid primary key default gen_random_uuid(),
  gruppe_id     uuid not null references zutatengruppe(id) on delete cascade,
  artikel_id    uuid references artikel(id),        -- Einkaufsartikel …
  komponente_id uuid references rezept(id),         -- … oder Verweis auf ein Grundrezept
  bezeichnung   text not null,                      -- Anzeigename inkl. Verarbeitung ('in 4 cm Würfeln')
  menge_g       numeric(12,2),                      -- null = nach Geschmack
  ist_basis     boolean not null default false,     -- Basiszutat = 100 % für die Skalierung
  annahme       boolean not null default false,     -- Wert geschätzt, muss geprüft werden
  notiz         text,                               -- Originalangabe ('2 Zehen', '1 Bund')
  reihenfolge   int not null,
  check (artikel_id is null or komponente_id is null)
);

-- Regel: genau eine Basiszutat pro Rezept (wird in der App bzw. per Trigger geprüft)

create table schritt (
  id              uuid primary key default gen_random_uuid(),
  gruppe_id       uuid not null references zutatengruppe(id) on delete cascade,
  text            text not null,
  reihenfolge     int not null,
  ort             text check (ort in ('zentralkueche','vor_ort','logistik')),
  geraet_id       uuid references geraet(id),
  temperatur_c    numeric(5,1),
  aktiv_min       numeric(8,2) default 0,   -- bindet Personal
  unbeaufsichtigt_min numeric(8,2) default 0, -- bindet nur das Gerät
  rolle           text,                      -- 'Koch', 'Hilfskoch', 'Patissier'
  haccp           text,                      -- z.B. 'Kern 72 °C', 'Pasteurisation 20 min'
  annahme         boolean not null default false
);

create table offener_punkt (
  id          uuid primary key default gen_random_uuid(),
  rezept_id   uuid not null references rezept(id) on delete cascade,
  text        text not null,
  erledigt    boolean not null default false
);

-- Skalierung: Anteil jeder Zutat an der Basiszutat (Spalte «Skal.»)
create view zutat_skaliert as
select z.*, g.rezept_id,
       round(100 * z.menge_g / nullif(b.menge_g, 0), 2) as skal_pct
from zutat z
join zutatengruppe g on g.id = z.gruppe_id
left join lateral (
  select z2.menge_g from zutat z2
  join zutatengruppe g2 on g2.id = z2.gruppe_id
  where g2.rezept_id = g.rezept_id and z2.ist_basis limit 1
) b on true;

-- Zeitbedarf pro Rezept (Basis-Charge)
create view rezept_zeit as
select g.rezept_id,
       sum(s.aktiv_min) as aktiv_min,
       sum(s.unbeaufsichtigt_min) as unbeaufsichtigt_min
from schritt s join zutatengruppe g on g.id = s.gruppe_id
group by g.rezept_id;
