-- Offerte (Aufgabe 5): ersetzt das Verkaufstool.
-- Eine Offerte ist ein Anlass mit Status «offerte» und Gerichten aus dem Katalog.
-- Entscheide Dominik 09.11.2026:
--   Quantum eines Mengentyps wird gleich auf seine Gerichte verteilt (Anteil 1/n, pro Gericht änderbar;
--   Gerichte ohne eigenen Anteil teilen sich den Rest).
--   Warenkosten aus dem Artikelstamm, wenn alle Komponenten einen Preis haben, sonst Schätzung CHF/kg der Kategorie.
--   Preise exkl. MWST, MWST separat. Deckungsbeitrag vorerst = Verkaufspreis − Warenkosten.
-- Offerten bekommen keine Saison, damit sie Produktionswellen und Produktionsliste nicht beeinflussen,
-- und zählen nicht im Deckungsbeitrag pro Anlass / Monatsergebnis, bis sie bestätigt sind.

-- 1. Kunde und Offertnummer ------------------------------------------------
alter table public.anlass add column kunde text;

create sequence public.offerte_nummer_seq;
grant usage on sequence public.offerte_nummer_seq to authenticated;

create function public.offerte_nummer_setzen()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  n bigint;
begin
  if new.nummer is null and new.status = 'offerte' then
    n := nextval('offerte_nummer_seq');
    new.nummer := 'O-' || to_char(now() at time zone 'Europe/Zurich', 'YYYY') || '-'
                  || lpad(n::text, greatest(4, length(n::text)), '0');
  end if;
  return new;
end
$$;

create trigger offerte_nummer
  before insert on public.anlass
  for each row execute function public.offerte_nummer_setzen();

-- 2. Gerichte einer Offerte ------------------------------------------------
create table public.offerte_gericht (
  anlass_id   uuid not null references public.anlass(id) on delete cascade,
  gericht_id  uuid not null references public.gericht_katalog(id),
  anteil      numeric(5,4) check (anteil is null or (anteil > 0 and anteil <= 1)),  -- null = Rest gleich verteilt
  reihenfolge int not null default 0,
  primary key (anlass_id, gericht_id)
);
create index on public.offerte_gericht (gericht_id);
alter table public.offerte_gericht enable row level security;
create policy pilot_angemeldet on public.offerte_gericht for all to authenticated using (true) with check (true);

-- 3. Einstellungen ----------------------------------------------------------
insert into public.einstellung (schluessel, wert, bemerkung) values
  ('mwst_satz', 0.081, 'MWST-Normalsatz Schweiz seit 01.01.2024'),
  ('vk_rundung_chf', 0.05, 'Annahme: Preis pro Gast auf 5 Rappen gerundet, mit Philipp klären')
on conflict (schluessel) do nothing;

-- 4. Positionen: Menge, Warenkosten und Verkaufspreis pro Gast mit Herleitung ---
-- Beträge pro Gast auf Rappen gerundet, bevor weitergerechnet wird: jede Zahl der Herleitung folgt
-- aus den gezeigten Zahlen, und die Positionen ergeben die Summe.
create view public.offerte_position with (security_invoker = true) as
with pos as (
  select og.anlass_id, og.gericht_id, og.anteil, og.reihenfolge,
         g.code, g.name, g.gang, g.mengentyp, g.kategorie,
         regexp_replace(g.name, '^(GW|SC)\d+\s+', '') as bezeichnung,
         a.angebotsform, a.betrieb,
         count(*) over typ as gerichte_gleicher_typ,
         count(*) filter (where og.anteil is null) over typ as gerichte_ohne_anteil,
         coalesce(sum(og.anteil) over typ, 0) as anteil_fest_typ
  from offerte_gericht og
  join gericht_katalog g on g.id = og.gericht_id
  join anlass a on a.id = og.anlass_id
  window typ as (partition by og.anlass_id, g.mengentyp)
), m as (
  select p.*, mt.einheit, q.menge_pro_gast as quantum,
         coalesce(p.anteil, round(greatest(1 - p.anteil_fest_typ, 0) / nullif(p.gerichte_ohne_anteil, 0), 4)) as anteil_wirksam,
         k.wk_chf_pro_kg_schaetzung, w.wk_inkl_zuschlag_chf, w.komponenten_ohne_preis, b.faktor_vk
  from pos p
  left join mengentyp mt on mt.code = p.mengentyp
  left join quantum q on q.angebotsform = p.angebotsform and q.mengentyp = p.mengentyp
  left join kategorie k on k.code = p.kategorie
  left join gericht_warenkosten w on w.gericht_id = p.gericht_id
  left join betrieb b on b.code = p.betrieb
), q as (
  select m.*,
    -- Summe der wirksamen Anteile des Mengentyps (100 % = Quantum voll verteilt).
    sum(m.anteil_wirksam) over (partition by m.anlass_id, m.mengentyp) as anteil_summe_typ,
    round(m.quantum * m.anteil_wirksam, 1) as menge_pro_gast,
    case
      when m.wk_inkl_zuschlag_chf is not null and m.komponenten_ohne_preis = 0 then 'artikel'
      when m.wk_chf_pro_kg_schaetzung is not null and m.quantum is not null then 'schaetzung'
    end as wk_quelle
  from m
), k as (
  select q.*,
    case q.wk_quelle
      when 'artikel' then round(q.wk_inkl_zuschlag_chf * q.anteil_wirksam, 2)
      when 'schaetzung' then round(q.menge_pro_gast / 1000 * q.wk_chf_pro_kg_schaetzung, 2)
    end as wk_pro_gast_chf
  from q
)
select
  anlass_id, gericht_id, reihenfolge, code, name, bezeichnung, gang, mengentyp, kategorie, einheit,
  quantum, anteil, anteil_wirksam, gerichte_gleicher_typ, anteil_summe_typ,
  round(anteil_summe_typ, 4) <> 1 as anteil_pruefen,
  menge_pro_gast, wk_quelle, wk_quelle = 'schaetzung' as wk_annahme, wk_pro_gast_chf, faktor_vk,
  round(wk_pro_gast_chf * faktor_vk, 2) as vk_pro_gast_chf,
  concat_ws('; ',
    case when quantum is null then 'Quantum fehlt für ' || coalesce(mengentyp, '[Mengentyp]') || ' / ' || coalesce(angebotsform, '[Angebotsform]')
         else 'Quantum ' || trim_scale(quantum) || ' ' || einheit || ' × Anteil ' || trim_scale(round(anteil_wirksam * 100, 2)) || ' %'
              || case when anteil is null and gerichte_gleicher_typ > 1 then ' (Rest gleich verteilt)' else '' end
              || ' = ' || trim_scale(menge_pro_gast) || ' ' || einheit
    end,
    case wk_quelle
      when 'artikel' then 'Warenkosten Portion CHF ' || to_char(wk_inkl_zuschlag_chf, 'FM999999990.00')
           || ' (Artikel inkl. Zuschlag) × Anteil = CHF ' || to_char(wk_pro_gast_chf, 'FM999999990.00')
      when 'schaetzung' then trim_scale(menge_pro_gast) || ' ' || einheit || ' × CHF ' || to_char(wk_chf_pro_kg_schaetzung, 'FM999999990.00')
           || '/kg (Schätzung Kategorie ' || kategorie || ')' || case when einheit = 'ml' then ', ml wie g gerechnet' else '' end
           || ' = CHF ' || to_char(wk_pro_gast_chf, 'FM999999990.00')
      else 'Warenkosten [Preis]'
    end,
    case when faktor_vk is null then 'Faktor fehlt: Betrieb wählen'
         when wk_pro_gast_chf is not null then 'CHF ' || to_char(wk_pro_gast_chf, 'FM999999990.00') || ' × Faktor ' || trim_scale(faktor_vk)
              || ' = CHF ' || to_char(round(wk_pro_gast_chf * faktor_vk, 2), 'FM999999990.00')
    end,
    case when round(anteil_summe_typ, 4) <> 1
         then 'Anteile ' || coalesce(mengentyp, '[Mengentyp]') || ' zusammen ' || trim_scale(round(anteil_summe_typ * 100, 2)) || ' %, bitte prüfen'
    end
  ) as herleitung
from k;

-- 5. Summe: Preis pro Gast, Total, MWST, Deckungsbeitrag ---------------------
create view public.offerte_summe with (security_invoker = true) as
with p as (
  select anlass_id,
         count(*) as positionen,
         count(*) filter (where vk_pro_gast_chf is null) as positionen_ohne_preis,
         count(*) filter (where wk_annahme) as positionen_geschaetzt,
         count(distinct mengentyp) filter (where anteil_pruefen) as mengentypen_anteil_pruefen,
         sum(wk_pro_gast_chf) as wk_pro_gast_chf,
         sum(vk_pro_gast_chf) as vk_pro_gast_chf
  from offerte_position
  group by anlass_id
), e as (
  select max(wert) filter (where schluessel = 'mwst_satz') as mwst_satz,
         coalesce(max(wert) filter (where schluessel = 'vk_rundung_chf'), 0.01) as rundung
  from einstellung
), r as (
  select a.id as anlass_id, a.gaeste,
         coalesce(p.positionen, 0) as positionen,
         coalesce(p.positionen_ohne_preis, 0) as positionen_ohne_preis,
         coalesce(p.positionen_geschaetzt, 0) as positionen_geschaetzt,
         coalesce(p.mengentypen_anteil_pruefen, 0) as mengentypen_anteil_pruefen,
         -- Summen nur, wenn jede Position einen Preis hat: nie eine Teilsumme als Total zeigen.
         case when p.positionen_ohne_preis = 0 then p.wk_pro_gast_chf end as wk_pro_gast_chf,
         case when p.positionen_ohne_preis = 0 then p.vk_pro_gast_chf end as vk_pro_gast_chf,
         case when p.positionen_ohne_preis = 0 then round(p.vk_pro_gast_chf / e.rundung) * e.rundung end as preis_pro_gast_chf,
         e.mwst_satz, e.rundung
  from anlass a
  left join p on p.anlass_id = a.id
  cross join e
), t as (
  select r.*,
         r.preis_pro_gast_chf * r.gaeste as umsatz_netto_chf,
         r.wk_pro_gast_chf * r.gaeste as warenkosten_chf
  from r
)
select anlass_id, gaeste, positionen, positionen_ohne_preis, positionen_geschaetzt, mengentypen_anteil_pruefen,
       wk_pro_gast_chf, vk_pro_gast_chf, preis_pro_gast_chf, rundung, mwst_satz,
       umsatz_netto_chf,
       round(umsatz_netto_chf * mwst_satz / 0.05) * 0.05 as mwst_chf,
       umsatz_netto_chf + round(umsatz_netto_chf * mwst_satz / 0.05) * 0.05 as total_brutto_chf,
       warenkosten_chf,
       umsatz_netto_chf - warenkosten_chf as deckungsbeitrag_chf,
       round(100 * (umsatz_netto_chf - warenkosten_chf) / nullif(umsatz_netto_chf, 0), 1) as deckungsbeitrag_pct,
       case
         when positionen = 0 then 'Noch keine Gerichte'
         when positionen_ohne_preis > 0 then positionen_ohne_preis || ' Gericht(e) ohne Preis: kein Total'
         else 'Preis pro Gast CHF ' || to_char(vk_pro_gast_chf, 'FM999999990.00') || ', gerundet auf ' || trim_scale(rundung) || ' = CHF '
              || to_char(preis_pro_gast_chf, 'FM999999990.00')
              || coalesce(' × ' || gaeste || ' Gäste = CHF ' || to_char(umsatz_netto_chf, 'FM999999999990.00'), '; Gäste fehlen')
              || coalesce('; MWST ' || trim_scale(round(mwst_satz * 100, 1)) || ' % auf 5 Rappen gerundet', '')
              || coalesce('; Warenkosten CHF ' || to_char(wk_pro_gast_chf, 'FM999999990.00') || ' × ' || gaeste || ' = CHF '
                          || to_char(warenkosten_chf, 'FM999999999990.00') || '; Deckungsbeitrag = Total exkl. MWST − Warenkosten', '')
       end as herleitung
from t;

-- 6. Offerten zählen erst nach Bestätigung im Deckungsbeitrag pro Anlass (und damit im Monatsergebnis).
create or replace view public.anlass_deckungsbeitrag with (security_invoker = true) as
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
left join kosten k on k.anlass_id = a.id
where a.status <> 'offerte';
