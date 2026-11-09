-- GAMMA-Erweiterung: Katalog, Systemzuteilung, Verkauf, Anlass/Menülinien, Planung
-- Abgebildet nach: Systemzuteilung Winter Collection 2026/27, Verkaufstool Gamma TEST, F&B Spengler Cup 2026

-- Einstellungen ---------------------------------------------------------
create table einstellung (
  schluessel  text primary key,
  wert        numeric,
  text_wert   text,
  bemerkung   text
);

-- Artikel / Preisliste --------------------------------------------------
alter table artikel add column artikelnummer text;
alter table artikel add column einheit text;                 -- kg, l, Stk, Schale, Flasche …
alter table artikel add column preis_pro_einheit numeric(12,2);
alter table artikel add column preisquelle text;             -- 'Durchschnittspreis', 'Spezialpreis Fleisch'
create unique index artikel_name_einheit_uq on artikel (name, coalesce(einheit, ''));

create table artikel_preis (
  artikel_id    uuid not null references artikel(id) on delete cascade,
  gueltig_ab    date not null,
  preis_pro_einheit numeric(12,2) not null,
  quelle        text,
  primary key (artikel_id, gueltig_ab)
);

-- Katalog ---------------------------------------------------------------
create table kollektion (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,                -- 'Winter Collection 2026/27'
  stand       date
);

create table kategorie (
  code        text primary key,                    -- Blattname der Systemzuteilung
  reihenfolge int not null,
  wk_chf_pro_kg_schaetzung numeric(10,2)           -- Annahme Verkaufstool, bis Rezepte vorliegen
);

create table gericht_katalog (
  id            uuid primary key default gen_random_uuid(),
  kollektion_id uuid not null references kollektion(id) on delete cascade,
  code          text,                              -- GW091, SC04
  name          text not null,                     -- vollständiger Katalogname
  kategorie     text not null references kategorie(code),
  gang          text,                              -- Vorspeise, Suppe, Hauptgang …
  mengentyp     text,                              -- Typ für Menge (Quantumtabelle)
  rezept_id     uuid references rezept(id),
  quelle_zeile  int,
  unique (kollektion_id, kategorie, quelle_zeile)
);
create index on gericht_katalog (kollektion_id);
create index on gericht_katalog (rezept_id);

-- Systemzuteilung pro Komponente
create table produktionssystem (
  code            text primary key,                -- FNG, SF, SV, Past., HF, NTG, ÜNG, Minute
  name            text not null,
  haltbarkeit_tage int not null,                   -- Standard, auf Blatt Produktionsplan anpassbar
  reihenfolge     int not null,
  bemerkung       text
);

create table regenerationsart (
  code        text primary key,                    -- BS, Steamer, Grill, Herd, Salamander, SV, Fritteuse, Auftauen
  name        text not null,
  reihenfolge int not null
);

create table komponente (
  id              uuid primary key default gen_random_uuid(),
  kollektion_id   uuid not null references kollektion(id) on delete cascade,
  kategorie       text not null references kategorie(code),
  quelle_zeile    int not null,
  name            text not null,
  cf_stufe        smallint check (cf_stufe between 0 and 5),
  produktion      text[] not null default '{}',    -- Codes aus produktionssystem
  lager_0_2       boolean not null default false,
  lager_tk        boolean not null default false,
  lager_gedeckt   boolean not null default false,
  lager_tage      int,
  regeneration    text[] not null default '{}',    -- Codes aus regenerationsart
  bemerkung       text,
  hauptartikel_id uuid references artikel(id),
  rezept_id       uuid references rezept(id),
  unique (kollektion_id, kategorie, quelle_zeile)
);
create index on komponente (kollektion_id, kategorie, name);
create index on komponente (hauptartikel_id);
create index on komponente (rezept_id);

-- Gericht besteht aus Komponenten; Verweise zeigen auf eine Komponente in einem anderen Blatt
create table gericht_komponente (
  gericht_id        uuid not null references gericht_katalog(id) on delete cascade,
  reihenfolge       int not null,
  komponente_id     uuid references komponente(id),
  bezeichnung       text not null,
  verweis_kategorie text references kategorie(code),   -- gesetzt bei «siehe Blatt …»
  menge_pro_portion numeric(12,4),                     -- in der Einheit des Hauptartikels
  primary key (gericht_id, reihenfolge)
);
create index on gericht_komponente (komponente_id);

-- Prüfregeln (Plausibilität)
create table pruefregel (
  code        text primary key,
  farbe       text not null check (farbe in ('rot','gelb')),
  text        text not null
);

-- Verkauf ---------------------------------------------------------------
create table betrieb (
  code        text primary key,
  name        text not null,
  faktor_vk   numeric(5,2) not null,               -- Verkaufspreis = Warenkosten × Faktor
  quelle      text
);

create table angebotsform (
  code        text primary key,
  name        text not null,
  reihenfolge int not null
);

create table mengentyp (
  code        text primary key,                    -- Typ für Menge: Vorspeise, Suppe, Hauptgang Fleisch und Fisch …
  einheit     text not null default 'g' check (einheit in ('g','ml','Stk')),
  reihenfolge int not null
);

create table quantum (
  angebotsform text not null references angebotsform(code),
  mengentyp    text not null references mengentyp(code),
  menge_pro_gast numeric(8,2) not null,
  primary key (angebotsform, mengentyp)
);

-- Saison, Anlass, Services, Menülinien -----------------------------------
create table saison (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,
  kollektion_id       uuid references kollektion(id),
  produktionsstandort text not null default 'Hünenberg ZG',
  produktion_ab       date
);

alter table anlass alter column gaeste drop not null;
alter table anlass alter column datum drop not null;
alter table anlass add column saison_id uuid references saison(id);
alter table anlass add column ort text;
alter table anlass add column datum_bis date;
alter table anlass add column vorlauf_tage int not null default 1;
alter table anlass add column betrieb text references betrieb(code);
alter table anlass add column angebotsform text references angebotsform(code);
alter table anlass add column bemerkung text;
create index on anlass (saison_id);

create table menuelinie (
  id          uuid primary key default gen_random_uuid(),
  anlass_id   uuid not null references anlass(id) on delete cascade,
  name        text not null,                       -- 'Spiel 1 und 6'
  reihenfolge int not null,
  unique (anlass_id, name)
);

create table service (
  id            uuid primary key default gen_random_uuid(),
  anlass_id     uuid not null references anlass(id) on delete cascade,
  menuelinie_id uuid references menuelinie(id),
  name          text not null,                     -- 'Spiel 1'
  datum         date,
  gaeste        int not null,
  reihenfolge   int not null,
  unique (anlass_id, name)
);
create index on service (menuelinie_id);

create table menuelinie_gericht (
  id            uuid primary key default gen_random_uuid(),
  menuelinie_id uuid not null references menuelinie(id) on delete cascade,
  gang          text not null,
  bezeichnung   text not null,                     -- Text laut Menükarte
  gericht_id    uuid references gericht_katalog(id),
  anteil        numeric(5,4) not null default 1,   -- Anteil Gäste (Hauptgänge 60/20/20)
  reihenfolge   int not null
);
create index on menuelinie_gericht (menuelinie_id);
create index on menuelinie_gericht (gericht_id);

create table menuelinie_komponente (
  id            uuid primary key default gen_random_uuid(),
  linie_gericht_id uuid not null references menuelinie_gericht(id) on delete cascade,
  komponente_id uuid references komponente(id),
  bezeichnung   text not null,
  menge_pro_gast numeric(10,3) not null,
  einheit       text not null check (einheit in ('g','ml','Stk')),
  reihenfolge   int not null
);
create index on menuelinie_komponente (linie_gericht_id);
create index on menuelinie_komponente (komponente_id);

-- Getränke- und Barkarten
create table karte (
  id          uuid primary key default gen_random_uuid(),
  anlass_id   uuid references anlass(id) on delete cascade,
  name        text not null
);
create index on karte (anlass_id);

create table karte_position (
  id          uuid primary key default gen_random_uuid(),
  karte_id    uuid not null references karte(id) on delete cascade,
  rubrik      text,
  name        text not null,
  menge       text,
  preis_chf   numeric(10,2),
  reihenfolge int not null
);
create index on karte_position (karte_id);

-- Produktionswellen (Planung Hünenberg)
create table produktionswelle (
  id          uuid primary key default gen_random_uuid(),
  saison_id   uuid not null references saison(id) on delete cascade,
  nummer      int not null,
  datum       date,
  bemerkung   text,
  unique (saison_id, nummer)
);

create table welle_komponente (
  welle_id      uuid not null references produktionswelle(id) on delete cascade,
  komponente_id uuid not null references komponente(id),
  menge         numeric(12,3) not null,
  einheit       text not null,
  primary key (welle_id, komponente_id)
);
create index on welle_komponente (komponente_id);

-- Import-Protokoll
create table import_lauf (
  id          uuid primary key default gen_random_uuid(),
  quelle      text not null,                       -- Dateiname
  bereich     text not null,
  anzahl      int,
  am          timestamptz not null default now()
);

-- Berechnungen ----------------------------------------------------------

-- Haltbarkeit und Status pro Komponente (Logik der Spalten AA und AM)
create view komponente_zuteilung with (security_invoker = true) as
select k.*,
  case
    when k.cf_stufe in (4, 5) then 'Zukauf'
    when cardinality(k.produktion) = 0 then 'offen'
    else 'ok'
  end as status,
  case
    when k.cf_stufe in (4, 5) then null
    when coalesce(k.lager_tage, 0) > 0 then k.lager_tage
    when k.lager_tk then (select haltbarkeit_tage from produktionssystem where code = 'TK')
    else nullif((select max(p.haltbarkeit_tage) from produktionssystem p
                 where p.code = any (k.produktion) and p.code <> 'Minute'), 0)
  end as haltbarkeit_tage,
  (k.produktion = array['Minute']) as nur_vor_ort
from komponente k;

-- Prüfhinweise (Blatt Legende, Zeilen 45–47)
create view komponente_pruefhinweis with (security_invoker = true) as
select k.id as komponente_id, k.kategorie, k.name, r.code, r.farbe, r.text
from komponente_zuteilung k
join pruefregel r on
     (r.code = 'fng_ohne_gedeckt' and 'FNG' = any (k.produktion) and not k.lager_gedeckt)
  or (r.code = 'lagerung_ohne_kuehlung' and coalesce(k.lager_tage, 0) > 3 and not (k.lager_0_2 or k.lager_tk))
  or (r.code = 'lange_haltbarkeit_ohne_tk' and k.haltbarkeit_tage >= 21 and not k.lager_tk);

-- Produktionswellen pro Haltbarkeit (Hilfstabelle Wellen, Blatt Produktionsplan)
create function wellen_anzahl(p_saison uuid, p_haltbarkeit int)
returns int language plpgsql stable set search_path = public as $$
declare
  r record; gedeckt_bis date := null; wellen int := 0; n int;
begin
  if p_haltbarkeit is null or p_haltbarkeit < 1 then return null; end if;
  for r in select datum - vorlauf_tage as anlieferung, coalesce(datum_bis, datum) as ende
           from anlass where saison_id = p_saison and datum is not null order by datum loop
    if gedeckt_bis is null or r.ende > gedeckt_bis then
      n := ceil((r.ende - (r.anlieferung - 1))::numeric / p_haltbarkeit);
      wellen := wellen + n;
      gedeckt_bis := r.anlieferung - 1 + n * p_haltbarkeit;
    end if;
  end loop;
  return wellen;
end $$;

-- Bedarf pro Komponente und Anlass: Gäste × Anteil × Menge pro Gast (Blatt Spengler Cup)
create view anlass_komponente_bedarf with (security_invoker = true) as
select l.anlass_id, l.id as menuelinie_id, l.name as menuelinie,
  mg.gang, mg.bezeichnung as gericht, mk.komponente_id, mk.bezeichnung as komponente,
  sum(s.gaeste) as gaeste, mg.anteil, mk.menge_pro_gast, mk.einheit,
  round(sum(s.gaeste) * mg.anteil * mk.menge_pro_gast / case when mk.einheit = 'Stk' then 1 else 1000 end, 3) as menge_total,
  case mk.einheit when 'g' then 'kg' when 'ml' then 'l' else 'Stk' end as einheit_total
from menuelinie l
join service s on s.menuelinie_id = l.id
join menuelinie_gericht mg on mg.menuelinie_id = l.id
join menuelinie_komponente mk on mk.linie_gericht_id = mg.id
group by l.anlass_id, l.id, l.name, mg.id, mg.gang, mg.bezeichnung, mg.anteil, mk.id, mk.komponente_id, mk.bezeichnung, mk.menge_pro_gast, mk.einheit;

-- Produktionsliste Saison (Blatt Produktionsliste): Menge, Haltbarkeit, Wellen, Start
create view produktionsliste with (security_invoker = true) as
with bedarf as (
  select a.saison_id, b.komponente_id, b.einheit_total, sum(b.menge_total) as menge_total
  from anlass_komponente_bedarf b join anlass a on a.id = b.anlass_id
  where b.komponente_id is not null
  group by a.saison_id, b.komponente_id, b.einheit_total
)
select b.saison_id, k.kategorie, k.name as komponente, k.status, b.menge_total, b.einheit_total,
  k.haltbarkeit_tage,
  wellen_anzahl(b.saison_id, k.haltbarkeit_tage) as wellen,
  case when k.haltbarkeit_tage is not null then
    greatest(s.produktion_ab, (select min(datum - vorlauf_tage) from anlass where saison_id = b.saison_id) - k.haltbarkeit_tage)
  end as start_ab,
  k.id as komponente_id
from bedarf b
join komponente_zuteilung k on k.id = b.komponente_id
join saison s on s.id = b.saison_id;

-- Warenkosten pro Gericht ohne Rezept: Hauptartikel × Menge pro Portion + Zuschlag (Spalten AP–AV)
create view gericht_warenkosten with (security_invoker = true) as
select g.id as gericht_id, g.name,
  sum(gk.menge_pro_portion * a.preis_pro_einheit) as wk_rohware_chf,
  round(sum(gk.menge_pro_portion * a.preis_pro_einheit)
        * (1 + coalesce((select wert from einstellung where schluessel = 'wk_zuschlag'), 0)), 2) as wk_inkl_zuschlag_chf,
  count(*) filter (where a.id is null) as komponenten_ohne_preis
from gericht_katalog g
join gericht_komponente gk on gk.gericht_id = g.id
left join komponente k on k.id = gk.komponente_id
left join artikel a on a.id = k.hauptartikel_id
group by g.id, g.name;

-- Zugriff: RLS auf allen Tabellen, im Pilot voller Zugriff für angemeldete Benutzer ----------
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy pilot_angemeldet on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Fremdschlüssel-Indizes für das Basisschema
create index on artikel (lieferant_id);
create index on artikel_allergen (allergen);
create index on rezept_komponente (komponente_id);
create index on zutatengruppe (rezept_id);
create index on zutat (gruppe_id);
create index on zutat (artikel_id);
create index on zutat (komponente_id);
create index on schritt (gruppe_id);
create index on schritt (geraet_id);
create index on offener_punkt (rezept_id);
create index on anlass_gericht (rezept_id);
create index on anlass_kosten (anlass_id);
