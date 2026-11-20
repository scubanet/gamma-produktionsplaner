-- Warenkosten des Anlasses aus den Menülinien (20.11.2026, Plan Datenkette, Aufgabe 4).
-- Entscheid Dominik (20.11.2026): zuerst über die Menülinien des Anlasses (Menge pro Gast ist dort bei jeder Komponente erfasst),
-- die Offerte folgt, sobald der Katalog die Menge pro Portion kennt. Ohne den Zuschlag von 20 %.
-- Pro Komponente: Bedarf des Anlasses × Warenkosten pro kg des Rezepts (rezept_warenkosten, Migration 35);
-- sonst Bedarf × Preis des Hauptartikels bei gleicher Einheit (Annahme); sonst keine Kosten.
create view public.anlass_warenkosten_komponente with (security_invoker = true) as
with b as (
  select b0.anlass_id, b0.komponente_id, min(b0.komponente) as bezeichnung, b0.einheit_total as einheit,
         case when count(*) filter (where b0.menge_total is null) = 0 then sum(b0.menge_total) end as menge
  from anlass_komponente_bedarf b0
  group by b0.anlass_id, b0.komponente_id, b0.einheit_total
), m as (
  select b.anlass_id, b.komponente_id, coalesce(z.name, b.bezeichnung) as komponente, b.einheit, b.menge,
         z.rezept_id, rk.name as rezept, rk.status as rezept_status, rk.chf_pro_kg, rk.annahme as rezept_annahme,
         a.name as artikel, a.einheit as artikel_einheit, a.preis_pro_einheit, coalesce(a.verlust_pct, 0) as verlust_pct,
         case
           when rk.chf_pro_kg is not null and b.einheit in ('kg', 'l') then 'rezept'
           when a.preis_pro_einheit is not null
                and ((b.einheit = 'kg' and a.einheit = 'kg') or (b.einheit = 'l' and a.einheit in ('Liter', 'l')) or (b.einheit = 'Stk' and a.einheit = 'Stk'))
             then 'hauptartikel'
         end as weg
  from b
  left join komponente_zuteilung z on z.id = b.komponente_id
  left join rezept_warenkosten rk on rk.rezept_id = z.rezept_id
  left join artikel a on a.id = z.hauptartikel_id
)
select anlass_id, komponente_id, komponente, einheit, menge, weg, rezept_id, rezept, rezept_status,
       case weg
         when 'rezept' then round(menge * chf_pro_kg, 2)
         when 'hauptartikel' then round(menge * (1 + verlust_pct / 100) * preis_pro_einheit, 2)
       end as kosten_chf,
       case weg when 'rezept' then (rezept_annahme or einheit = 'l') when 'hauptartikel' then true else false end as annahme,
       case
         when menge is null then komponente || ': Menge fehlt'
         when weg = 'rezept' then trim_scale(menge) || ' ' || einheit || ' × CHF ' || trim_scale(chf_pro_kg) || ' / kg (Rezept ' || rezept
              || case when rezept_status <> 'freigegeben' then ', ' || rezept_status else '' end || ') = CHF ' || to_char(round(menge * chf_pro_kg, 2), 'FM999999990.00')
         when weg = 'hauptartikel' then trim_scale(menge) || ' ' || einheit || ' × CHF ' || to_char(preis_pro_einheit, 'FM999999990.00') || ' (Hauptartikel ' || artikel
              || ', Annahme) = CHF ' || to_char(round(menge * (1 + verlust_pct / 100) * preis_pro_einheit, 2), 'FM999999990.00')
         when rezept_id is not null then 'Rezept ' || rezept || ' hat noch keine vollständigen Kosten'
         else 'kein Rezept und kein Hauptartikel mit Preis'
       end as herleitung
from m;

comment on view public.anlass_warenkosten_komponente is 'Warenkosten pro Anlass und Komponente aus den Menülinien: über das Rezept (CHF/kg), sonst über den Hauptartikel, sonst leer.';

-- Summe pro Anlass. Ein Total gibt es nur, wenn jede Komponente Kosten hat; bekannt_chf ist die Teilsumme und nie ein Total.
create view public.anlass_warenkosten with (security_invoker = true) as
with s as (
  select anlass_id,
         count(*)::int as komponenten,
         count(*) filter (where kosten_chf is null)::int as komponenten_ohne_kosten,
         count(*) filter (where weg = 'rezept')::int as komponenten_rezept,
         count(*) filter (where weg = 'hauptartikel')::int as komponenten_hauptartikel,
         count(*) filter (where weg = 'rezept' and rezept_status <> 'freigegeben')::int as komponenten_nicht_freigegeben,
         case when count(*) filter (where kosten_chf is null) = 0 then sum(kosten_chf) end as waren_chf,
         sum(kosten_chf) as bekannt_chf,
         coalesce(bool_or(annahme), false) as annahme
  from anlass_warenkosten_komponente
  group by anlass_id
)
select anlass_id, komponenten, komponenten_ohne_kosten, komponenten_rezept, komponenten_hauptartikel, komponenten_nicht_freigegeben,
       waren_chf, bekannt_chf, annahme,
       case
         when waren_chf is not null then 'Warenkosten aus den Menülinien: ' || komponenten_rezept || ' Komponente(n) über das Rezept'
              || case when komponenten_nicht_freigegeben > 0 then ' (' || komponenten_nicht_freigegeben || ' nicht freigegeben)' else '' end
              || case when komponenten_hauptartikel > 0 then ', ' || komponenten_hauptartikel || ' über den Hauptartikel (Annahme)' else '' end
              || ', ohne Zuschlag'
         else 'aus den Rezepten erst ' || (komponenten - komponenten_ohne_kosten) || ' von ' || komponenten || ' Komponenten mit Kosten'
              || coalesce(' (bisher bekannt CHF ' || to_char(bekannt_chf, 'FM999999990.00') || ', kein Total)', '')
       end as herleitung
from s;

comment on view public.anlass_warenkosten is 'Warenkosten pro Anlass aus den Menülinien über die Rezepte. waren_chf nur, wenn jede Komponente Kosten hat; bekannt_chf ist die Teilsumme.';

grant select on public.anlass_warenkosten_komponente, public.anlass_warenkosten to authenticated;

-- Kalkulation: Kostenart Waren nimmt die Warenkosten aus den Menülinien, sobald sie vollständig sind; sonst wie bisher die Offerte.
-- Solange sie unvollständig sind, steht der Stand in der Herleitung und ändert keinen Betrag. Spalten unverändert (Migration 13).
create or replace view public.anlass_kostenart with (security_invoker = true) as
with a as (
  select id as anlass_id from anlass where status <> 'offerte'
), arten as (
  select a.anlass_id, k.art, k.ordnung
  from a
  cross join unnest(enum_range(null::kostenart)) with ordinality as k(art, ordnung)
), berechnet as (
  -- Waren: zuerst aus den Menülinien über die Rezepte (nur wenn vollständig), sonst wie bisher aus der Offerte.
  select w.anlass_id, 'waren'::kostenart as art, w.waren_chf as chf, w.herleitung, w.annahme
  from anlass_warenkosten w
  where w.waren_chf is not null
  union all
  select o.anlass_id, 'waren'::kostenart, o.warenkosten_chf,
         'Warenkosten der Offerte' || case when o.positionen_geschaetzt > 0 then ' (' || o.positionen_geschaetzt || ' Gericht(e) geschätzt)' else '' end,
         o.positionen_geschaetzt > 0
  from offerte_summe o
  where o.positionen > 0
    and not exists (select 1 from anlass_warenkosten w where w.anlass_id = o.anlass_id and w.waren_chf is not null)
  union all
  select p.anlass_id, 'personal',
         case when count(*) filter (where p.kosten_chf is null) = 0 then sum(p.kosten_chf) end,
         count(*) || ' Zeile(n) Personal, ' || trim_scale(sum(p.stunden)) || ' h'
           || case when count(*) filter (where p.kosten_chf is null) > 0 then '; Lohnsatz fehlt bei ' || count(*) filter (where p.kosten_chf is null) || ' Rolle(n)' else '' end,
         bool_or(p.freelancer_satz_annahme)
  from anlass_personal_kosten p
  group by p.anlass_id
  union all
  select g.anlass_id, 'geraetemiete',
         case when count(*) filter (where g.mietkosten_chf is null) = 0 then sum(g.mietkosten_chf) end,
         sum(g.miete_anzahl) || ' Mietgerät(e) aus ' || count(*) || ' Zeile(n) Geräte'
           || case when count(*) filter (where g.mietkosten_chf is null) > 0 then '; Mietpreis oder Datum fehlt' else '' end,
         false
  from anlass_geraet_bedarf g
  group by g.anlass_id
), hand as (
  select anlass_id, art,
         sum(plan_chf) as plan_chf, sum(ist_chf) as ist_chf,
         count(*) as zeilen
  from anlass_kosten
  group by anlass_id, art
)
select t.anlass_id, t.art, t.ordnung::int as ordnung,
       b.chf as berechnet_chf, h.plan_chf as hand_plan_chf, h.ist_chf,
       -- Ist der berechnete Teil unbekannt (Lohnsatz, Mietpreis oder Preis der Offerte fehlt), gibt es keinen Plan:
       -- ein Planbetrag von Hand kommt nur dazu, er ersetzt nichts. Nur ein Ist-Betrag ersetzt alles.
       case when b.anlass_id is not null and b.chf is null then null
            when b.chf is not null or h.plan_chf is not null then coalesce(b.chf, 0) + coalesce(h.plan_chf, 0) end as plan_chf,
       coalesce(h.ist_chf,
                case when b.anlass_id is not null and b.chf is null then null
                     when b.chf is not null or h.plan_chf is not null then coalesce(b.chf, 0) + coalesce(h.plan_chf, 0) end) as gilt_chf,
       h.ist_chf is not null as ist_erfasst,
       (b.anlass_id is not null and b.chf is null and h.ist_chf is null) as unvollstaendig,
       coalesce(b.annahme, false) as annahme,
       nullif(concat_ws('; ',
         b.herleitung,
         -- Stand der Rechnung aus den Rezepten, solange sie noch kein Total ergibt.
         case when t.art = 'waren' then (select w.herleitung from anlass_warenkosten w where w.anlass_id = t.anlass_id and w.waren_chf is null and w.komponenten > 0) end,
         case when h.plan_chf is not null then 'von Hand geplant CHF ' || to_char(h.plan_chf, 'FM999999990.00') end,
         case when h.ist_chf is not null then 'Ist CHF ' || to_char(h.ist_chf, 'FM999999990.00') || ' ersetzt den Plan' end
       ), '') as herleitung
from arten t
left join berechnet b on b.anlass_id = t.anlass_id and b.art = t.art
left join hand h on h.anlass_id = t.anlass_id and h.art = t.art;
