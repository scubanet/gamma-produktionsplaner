-- Produktionsplaner – Kostenmodell v0.2 (setzt schema.sql voraus)
-- Deckungsbeitragsrechnung: Umsatz − variable Kosten = Deckungsbeitrag; DB − Fixkosten = Betriebsergebnis

-- Kostensätze ----------------------------------------------------------

create table lohnsatz (
  rolle         text not null,              -- 'Koch', 'Hilfskoch', 'Service-Freelancer', 'Abwasch'
  chf_pro_h     numeric(8,2) not null,      -- inkl. Sozialleistungen, Ferien, 13. Monatslohn
  gueltig_ab    date not null,
  quelle        text,                        -- 'Lohnbuchhaltung', 'Pool-Tarif'
  primary key (rolle, gueltig_ab)
);

create table energiepreis (
  gueltig_ab    date primary key,
  chf_pro_kwh   numeric(6,4) not null
);

alter table geraet add column leistung_kw numeric(6,2);   -- mittlere Leistung im Betrieb
alter table geraet add column mietpreis_chf_tag numeric(10,2);
alter table schritt alter column rolle set default 'Koch';

create type fixkosten_kategorie as enum ('loehne_fix','miete','abschreibung','energie_grundlast','fahrzeuge','versicherung','marketing','it_verwaltung','uebrige');

create table fixkosten (
  id            uuid primary key default gen_random_uuid(),
  kategorie     fixkosten_kategorie not null,
  bezeichnung   text not null,
  chf_pro_monat numeric(12,2) not null,
  gueltig_ab    date not null,
  gueltig_bis   date
);

-- Anlässe --------------------------------------------------------------

create table anlass (
  id            uuid primary key default gen_random_uuid(),
  nummer        text unique,                 -- 'A-2026-0418'
  name          text not null,
  datum         date not null,
  gaeste        int not null,
  serviceart    text check (serviceart in ('teller','buffet','flying','apero')),
  status        text not null default 'offerte' check (status in ('offerte','option','bestaetigt','durchgefuehrt','abgerechnet'))
);

create table anlass_gericht (
  anlass_id       uuid references anlass(id) on delete cascade,
  rezept_id       uuid references rezept(id),
  portionen       int not null,
  vk_pro_portion  numeric(10,2) not null,
  primary key (anlass_id, rezept_id)
);

create type kostenart as enum ('waren','personal','energie','geraetemiete','transport','material');

-- Variable Kosten pro Anlass: Plan (berechnet) und Ist (nach Abrechnung)
create table anlass_kosten (
  id          uuid primary key default gen_random_uuid(),
  anlass_id   uuid not null references anlass(id) on delete cascade,
  art         kostenart not null,
  bezeichnung text,
  plan_chf    numeric(12,2),
  ist_chf     numeric(12,2)
);

-- Auswertungen ---------------------------------------------------------

-- Herstellkosten-Anteile Arbeit und Energie pro Rezept (Basis-Charge)
create view rezept_kosten_arbeit_energie as
select g.rezept_id,
  sum(s.aktiv_min / 60.0 * coalesce(l.chf_pro_h, 0))                                   as arbeit_chf,
  sum((s.aktiv_min + s.unbeaufsichtigt_min) / 60.0 * coalesce(ge.leistung_kw, 0) * coalesce(e.chf_pro_kwh, 0)) as energie_chf
from schritt s
join zutatengruppe g on g.id = s.gruppe_id
left join geraet ge on ge.id = s.geraet_id
left join lateral (select chf_pro_h from lohnsatz where rolle = s.rolle and gueltig_ab <= current_date order by gueltig_ab desc limit 1) l on true
left join lateral (select chf_pro_kwh from energiepreis where gueltig_ab <= current_date order by gueltig_ab desc limit 1) e on true
group by g.rezept_id;

-- Warenkosten pro Rezept (Basis-Charge), inkl. Rüstverlust
create view rezept_kosten_waren as
select g.rezept_id,
  sum(z.menge_g * (1 + coalesce(a.verlust_pct, 0) / 100) * a.preis_chf / nullif(a.gebinde_g, 0)) as waren_chf
from zutat z
join zutatengruppe g on g.id = z.gruppe_id
join artikel a on a.id = z.artikel_id
group by g.rezept_id;

-- Deckungsbeitrag pro Anlass (Ist, sonst Plan)
create view anlass_deckungsbeitrag as
with umsatz as (
  select anlass_id, sum(portionen * vk_pro_portion) as umsatz_chf from anlass_gericht group by anlass_id
), kosten as (
  select anlass_id,
    sum(coalesce(ist_chf, plan_chf)) filter (where art = 'waren')    as waren_chf,
    sum(coalesce(ist_chf, plan_chf)) filter (where art = 'personal') as personal_chf,
    sum(coalesce(ist_chf, plan_chf)) filter (where art not in ('waren','personal')) as uebrige_chf,
    sum(coalesce(ist_chf, plan_chf)) as variabel_chf
  from anlass_kosten group by anlass_id
)
select a.id, a.nummer, a.name, a.datum, a.gaeste,
  coalesce(u.umsatz_chf, 0) as umsatz_chf,
  coalesce(k.waren_chf, 0) as waren_chf, coalesce(k.personal_chf, 0) as personal_chf, coalesce(k.uebrige_chf, 0) as uebrige_chf,
  coalesce(u.umsatz_chf, 0) - coalesce(k.variabel_chf, 0) as db_chf,
  round((coalesce(u.umsatz_chf, 0) - coalesce(k.variabel_chf, 0)) / nullif(u.umsatz_chf, 0) * 100, 1) as db_pct
from anlass a
left join umsatz u on u.anlass_id = a.id
left join kosten k on k.anlass_id = a.id;

-- Monatsergebnis und Break-even
create view monat_ergebnis as
with m as (
  select date_trunc('month', datum)::date as monat, count(*) as anlaesse, sum(gaeste) as gaeste,
         sum(umsatz_chf) as umsatz_chf, sum(db_chf) as db_chf
  from anlass_deckungsbeitrag group by 1
), f as (
  select m.monat, coalesce(sum(fk.chf_pro_monat), 0) as fix_chf
  from m left join fixkosten fk on fk.gueltig_ab <= m.monat and (fk.gueltig_bis is null or fk.gueltig_bis >= m.monat)
  group by m.monat
)
select m.*, f.fix_chf,
  m.db_chf - f.fix_chf as ergebnis_chf,
  round(f.fix_chf / nullif(m.db_chf / nullif(m.umsatz_chf, 0), 0), 0) as breakeven_umsatz_chf,
  (m.db_chf - f.fix_chf) >= 0 as rentabel
from m join f using (monat);
