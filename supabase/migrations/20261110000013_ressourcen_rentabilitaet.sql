-- Personal, Geräte, Vollkosten und Rentabilität (Aufgabe 8).
-- Entscheide Dominik 10.11.2026:
--   Personal und Geräte pro Anlass von Hand erfassen. Freelancer und Mietgeräte sind Zusatzbedarf (info), kein Fehler.
--   Umsatz exkl. MWST aus der bestätigten Offerte, sonst von Hand am Anlass; fehlt beides: [Umsatz].
-- Fixkosten-Anteil wie im Mockup: Zuschlag = Fixkosten des Monats ÷ variable Kosten des Monats.
-- Unvollständige Zahlen werden nie als Total gezeigt: fehlt Umsatz, Waren oder Personal, gibt es keinen Deckungsbeitrag.

-- 1. Stammdaten ---------------------------------------------------------------------
alter table public.lohnsatz add column chf_pro_h_freelancer numeric(8,2);  -- leer = gleicher Satz wie eigenes Personal (Annahme)
alter table public.lohnsatz
  add constraint lohnsatz_chf_check check (chf_pro_h > 0 and (chf_pro_h_freelancer is null or chf_pro_h_freelancer > 0));
alter table public.energiepreis add constraint energiepreis_chf_check check (chf_pro_kwh > 0);
alter table public.fixkosten
  add constraint fixkosten_chf_check check (chf_pro_monat >= 0),
  add constraint fixkosten_zeitraum_check check (gueltig_bis is null or gueltig_bis >= gueltig_ab);
alter table public.geraet
  add constraint geraet_anzahl_check check (anzahl_eigen >= 0),
  add constraint geraet_werte_check check ((leistung_kw is null or leistung_kw >= 0) and (mietpreis_chf_tag is null or mietpreis_chf_tag >= 0));

insert into public.einstellung (schluessel, wert, bemerkung) values
  ('db_ziel_pct', 35, 'Annahme aus dem Mockup: Zielwert Deckungsbeitrag in % vom Umsatz, mit der Geschäftsleitung festlegen')
on conflict (schluessel) do nothing;

-- 2. Umsatz von Hand, Personal und Geräte pro Anlass -------------------------------------
alter table public.anlass add column umsatz_netto_chf numeric(12,2) check (umsatz_netto_chf is null or umsatz_netto_chf >= 0);

create table public.anlass_personal (
  id                 uuid primary key default gen_random_uuid(),
  anlass_id          uuid not null references public.anlass(id) on delete cascade,
  rolle              text not null check (trim(rolle) <> ''),          -- wie lohnsatz.rolle
  anzahl_eigen       int not null default 0 check (anzahl_eigen >= 0),
  anzahl_freelancer  int not null default 0 check (anzahl_freelancer >= 0),
  stunden_pro_person numeric(5,2) not null check (stunden_pro_person > 0 and stunden_pro_person <= 24),
  einsatz            text,                                             -- z.B. «17:30–23:30»
  bemerkung          text,
  reihenfolge        int not null default 0,
  check (anzahl_eigen + anzahl_freelancer > 0)
);
create index on public.anlass_personal (anlass_id);
alter table public.anlass_personal enable row level security;
create policy pilot_angemeldet on public.anlass_personal for all to authenticated using (true) with check (true);

create table public.anlass_geraet (
  id          uuid primary key default gen_random_uuid(),
  anlass_id   uuid not null references public.anlass(id) on delete cascade,
  geraet_id   uuid not null references public.geraet(id),
  anzahl      int not null check (anzahl > 0),
  bemerkung   text,
  unique (anlass_id, geraet_id)
);
create index on public.anlass_geraet (geraet_id);
alter table public.anlass_geraet enable row level security;
create policy pilot_angemeldet on public.anlass_geraet for all to authenticated using (true) with check (true);

-- 3. Personal: Stunden und Kosten pro Zeile ---------------------------------------------
-- Lohnsatz der Rolle, gültig am Anlassdatum (ohne Datum: heute).
create view public.anlass_personal_kosten with (security_invoker = true) as
with p as (
  select ap.*, a.datum,
         ap.anzahl_eigen + ap.anzahl_freelancer as anzahl,
         (ap.anzahl_eigen + ap.anzahl_freelancer) * ap.stunden_pro_person as stunden,
         l.chf_pro_h, l.chf_pro_h_freelancer, l.gueltig_ab as satz_gueltig_ab
  from anlass_personal ap
  join anlass a on a.id = ap.anlass_id
  left join lateral (
    select ls.chf_pro_h, ls.chf_pro_h_freelancer, ls.gueltig_ab
    from lohnsatz ls
    where ls.rolle = ap.rolle and ls.gueltig_ab <= coalesce(a.datum, current_date)
    order by ls.gueltig_ab desc
    limit 1
  ) l on true
)
select id, anlass_id, rolle, anzahl_eigen, anzahl_freelancer, anzahl, stunden_pro_person, stunden, einsatz, bemerkung, reihenfolge,
       chf_pro_h, coalesce(chf_pro_h_freelancer, chf_pro_h) as chf_pro_h_freelancer,
       -- Kein eigener Freelancer-Satz hinterlegt: gleicher Satz angenommen.
       anzahl_freelancer > 0 and chf_pro_h is not null and chf_pro_h_freelancer is null as freelancer_satz_annahme,
       round(anzahl_eigen * stunden_pro_person * chf_pro_h
             + anzahl_freelancer * stunden_pro_person * coalesce(chf_pro_h_freelancer, chf_pro_h), 2) as kosten_chf,
       case when anzahl_freelancer > 0 then '+' || anzahl_freelancer || ' Freelancer' end as zusatzbedarf,
       case
         when chf_pro_h is null then 'Lohnsatz für «' || rolle || '» fehlt: [Preis]'
         else concat_ws(' + ',
                case when anzahl_eigen > 0 then anzahl_eigen || ' eigen × ' || trim_scale(stunden_pro_person) || ' h × CHF ' || to_char(chf_pro_h, 'FM999990.00') end,
                case when anzahl_freelancer > 0 then anzahl_freelancer || ' Freelancer × ' || trim_scale(stunden_pro_person) || ' h × CHF '
                          || to_char(coalesce(chf_pro_h_freelancer, chf_pro_h), 'FM999990.00') end)
       end as herleitung
from p;

-- 4. Geräte: eigener Bestand, Zusatzbedarf Miete und Mietkosten ---------------------------
-- Annahme: Überschneiden sich Anlässe, bekommt der frühere Anlass (Datum, dann Nummer) den eigenen Bestand zuerst.
-- Ohne Datum lässt sich keine Überschneidung prüfen: der ganze eigene Bestand gilt als frei.
-- Die Zuteilung läuft pro Gerät der Reihe nach: Ein Anlass erhält, was frühere überschneidende Anlässe
-- vom eigenen Bestand tatsächlich belegen, nicht deren ganzen Bedarf.
create function public.geraet_zuteilung()
returns table (anlass_geraet_id uuid, frueher_belegt integer, eigen_anzahl integer)
language plpgsql
stable
set search_path = public
as $$
declare
  r record;
  v_geraet uuid := null;
  v_von date[];
  v_bis date[];
  v_eigen int[];
  v_belegt int;
begin
  for r in
    select ag.id, ag.geraet_id, ag.anzahl, ge.anzahl_eigen, a.datum, coalesce(a.datum_bis, a.datum) as datum_bis
    from anlass_geraet ag
    join anlass a on a.id = ag.anlass_id
    join geraet ge on ge.id = ag.geraet_id
    where a.status <> 'offerte'
    order by ag.geraet_id, a.datum nulls last, coalesce(a.nummer, ''), a.id
  loop
    if v_geraet is distinct from r.geraet_id then
      v_geraet := r.geraet_id;
      v_von := '{}'; v_bis := '{}'; v_eigen := '{}';
    end if;
    v_belegt := 0;
    if r.datum is not null then
      for i in 1 .. coalesce(array_length(v_von, 1), 0) loop
        if v_von[i] <= r.datum_bis and v_bis[i] >= r.datum then
          v_belegt := v_belegt + v_eigen[i];
        end if;
      end loop;
    end if;
    anlass_geraet_id := r.id;
    frueher_belegt := v_belegt;
    eigen_anzahl := least(r.anzahl, greatest(r.anzahl_eigen - v_belegt, 0));
    return next;
    if r.datum is not null then
      v_von := v_von || r.datum; v_bis := v_bis || r.datum_bis; v_eigen := v_eigen || eigen_anzahl;
    end if;
  end loop;
end
$$;
revoke execute on function public.geraet_zuteilung() from public, anon;
grant execute on function public.geraet_zuteilung() to authenticated;

create view public.anlass_geraet_bedarf with (security_invoker = true) as
with m as (
  select ag.id, ag.anlass_id, ag.geraet_id, ag.anzahl, ag.bemerkung,
         ge.name as geraet, ge.anzahl_eigen, ge.mietbar, ge.mietpreis_chf_tag,
         coalesce(a.datum_bis, a.datum) - a.datum + 1 as tage,
         z.frueher_belegt, z.eigen_anzahl,
         ag.anzahl - z.eigen_anzahl as miete_anzahl
  from anlass_geraet ag
  join anlass a on a.id = ag.anlass_id
  join geraet ge on ge.id = ag.geraet_id
  join geraet_zuteilung() z on z.anlass_geraet_id = ag.id
)
select id, anlass_id, geraet_id, geraet, anzahl, bemerkung, anzahl_eigen, frueher_belegt,
       greatest(anzahl_eigen - frueher_belegt, 0) as eigen_frei,
       eigen_anzahl, miete_anzahl, mietbar, tage, mietpreis_chf_tag,
       case when miete_anzahl = 0 then 0 else round(miete_anzahl * tage * mietpreis_chf_tag, 2) end as mietkosten_chf,
       -- Zusatzbedarf ist kein Fehler: Status info.
       case when miete_anzahl > 0 then '+' || miete_anzahl || ' Miete' end as zusatzbedarf,
       concat_ws('; ',
         'Bedarf ' || anzahl || ', eigener Bestand ' || anzahl_eigen
           || case when frueher_belegt > 0 then ', davon ' || frueher_belegt || ' gleichzeitig bei früherem Anlass belegt, frei ' || greatest(anzahl_eigen - frueher_belegt, 0) else '' end,
         case when miete_anzahl > 0
              then miete_anzahl || ' Miete × ' || coalesce(tage::text, '[Tage]') || ' Tag(e) × '
                   || coalesce('CHF ' || to_char(mietpreis_chf_tag, 'FM999990.00'), '[Preis]')
                   || coalesce(' = CHF ' || to_char(round(miete_anzahl * tage * mietpreis_chf_tag, 2), 'FM999999990.00'), '')
                   || case when not mietbar then ' (Gerät ist nicht als mietbar erfasst)' else '' end
         end
       ) as herleitung
from m;

-- 5. Kalkulation pro Anlass und Kostenart --------------------------------------------------
-- berechnet: Waren aus der Offerte, Personal und Gerätemiete aus den Tabellen oben.
-- von Hand (anlass_kosten): Planbeträge für alles Übrige (Transport, Material …) und Ist-Beträge nach dem Anlass.
-- Es gilt der Ist-Betrag, sonst der Plan.
create view public.anlass_kostenart with (security_invoker = true) as
with a as (
  select id as anlass_id from anlass where status <> 'offerte'
), arten as (
  select a.anlass_id, k.art, k.ordnung
  from a
  cross join unnest(enum_range(null::kostenart)) with ordinality as k(art, ordnung)
), berechnet as (
  select o.anlass_id, 'waren'::kostenart as art, o.warenkosten_chf as chf,
         'Warenkosten der Offerte' || case when o.positionen_geschaetzt > 0 then ' (' || o.positionen_geschaetzt || ' Gericht(e) geschätzt)' else '' end as herleitung,
         o.positionen_geschaetzt > 0 as annahme
  from offerte_summe o
  where o.positionen > 0
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
         case when h.plan_chf is not null then 'von Hand geplant CHF ' || to_char(h.plan_chf, 'FM999999990.00') end,
         case when h.ist_chf is not null then 'Ist CHF ' || to_char(h.ist_chf, 'FM999999990.00') || ' ersetzt den Plan' end
       ), '') as herleitung
from arten t
left join berechnet b on b.anlass_id = t.anlass_id and b.art = t.art
left join hand h on h.anlass_id = t.anlass_id and h.art = t.art;

-- Plan und Ist einer Kostenart von Hand setzen (ein Betrag pro Anlass und Kostenart; leer = entfernen).
create function public.anlass_kosten_setzen(p_anlass uuid, p_art kostenart, p_plan numeric, p_ist numeric)
returns void
language plpgsql
set search_path = public
as $$
begin
  if coalesce(p_plan, 0) < 0 or coalesce(p_ist, 0) < 0 then
    raise exception 'Beträge dürfen nicht negativ sein' using errcode = '23514';
  end if;
  delete from anlass_kosten where anlass_id = p_anlass and art = p_art;
  if p_plan is not null or p_ist is not null then
    insert into anlass_kosten (anlass_id, art, bezeichnung, plan_chf, ist_chf)
    values (p_anlass, p_art, 'Erfassung in der App', p_plan, p_ist);
  end if;
end
$$;
revoke execute on function public.anlass_kosten_setzen(uuid, kostenart, numeric, numeric) from public, anon;
grant execute on function public.anlass_kosten_setzen(uuid, kostenart, numeric, numeric) to authenticated;

-- Eine Zeile pro Anlass: Umsatz, variable Kosten, Deckungsbeitrag, Fixkosten-Anteil, Ergebnis.
create view public.anlass_kalkulation with (security_invoker = true) as
with k as (
  select anlass_id,
         max(gilt_chf) filter (where art = 'waren') as waren_chf,
         max(gilt_chf) filter (where art = 'personal') as personal_chf,
         -- Übrige: nicht erfasst zählt als 0; erfasst, aber unbekannt (z.B. Miete ohne Mietpreis) macht die Summe unbekannt.
         case when count(*) filter (where art not in ('waren', 'personal') and unvollstaendig) = 0
              then coalesce(sum(gilt_chf) filter (where art not in ('waren', 'personal')), 0) end as uebrige_chf,
         string_agg(case art when 'energie' then 'Energie' when 'geraetemiete' then 'Gerätemiete' when 'transport' then 'Transport' when 'material' then 'Material' end, ', ')
           filter (where art not in ('waren', 'personal') and unvollstaendig) as uebrige_fehlend,
         bool_or(annahme) as annahme
  from anlass_kostenart
  group by anlass_id
), u as (
  select a.id as anlass_id, a.nummer, a.name, a.kunde, a.datum, a.datum_bis, a.status,
         date_trunc('month', a.datum)::date as monat,
         a.status in ('bestaetigt', 'durchgefuehrt', 'abgerechnet') as zaehlt,
         coalesce((select sum(s.gaeste) from service s where s.anlass_id = a.id)::int, a.gaeste) as gaeste,
         (select coalesce(sum(p.anzahl), 0)::int from anlass_personal_kosten p where p.anlass_id = a.id) as personal_anzahl,
         (select coalesce(sum(p.anzahl_freelancer), 0)::int from anlass_personal_kosten p where p.anlass_id = a.id) as personal_freelancer,
         (select coalesce(sum(p.stunden), 0) from anlass_personal_kosten p where p.anlass_id = a.id) as personal_stunden,
         (select coalesce(sum(g.anzahl), 0)::int from anlass_geraet_bedarf g where g.anlass_id = a.id) as geraete_anzahl,
         (select coalesce(sum(g.miete_anzahl), 0)::int from anlass_geraet_bedarf g where g.anlass_id = a.id) as geraete_miete,
         case when o.positionen > 0 and o.umsatz_netto_chf is not null then o.umsatz_netto_chf else a.umsatz_netto_chf end as umsatz_chf,
         case when o.positionen > 0 and o.umsatz_netto_chf is not null then 'offerte'
              when a.umsatz_netto_chf is not null then 'hand' end as umsatz_quelle,
         case when o.positionen > 0 then o.gaeste end as gaeste_offerte
  from anlass a
  left join offerte_summe o on o.anlass_id = a.id
  where a.status <> 'offerte'
), r as (
  select u.*, k.waren_chf, k.personal_chf, k.uebrige_chf, k.uebrige_fehlend, coalesce(k.annahme, false) as annahme,
         k.waren_chf + k.personal_chf + k.uebrige_chf as variabel_chf,
         u.umsatz_chf - (k.waren_chf + k.personal_chf + k.uebrige_chf) as db_chf
  from u
  left join k on k.anlass_id = u.anlass_id
), f as (
  -- Fixkosten des Monats und variable Kosten aller Anlässe des Monats, die zählen (bestätigt bis abgerechnet).
  select r.*,
         (select sum(fk.chf_pro_monat) from fixkosten fk
          where fk.gueltig_ab < (r.monat + interval '1 month')::date and (fk.gueltig_bis is null or fk.gueltig_bis >= r.monat)) as fix_monat_chf,
         sum(r.variabel_chf) filter (where r.zaehlt) over (partition by r.monat) as variabel_monat_chf,
         count(*) filter (where r.zaehlt and r.variabel_chf is null) over (partition by r.monat) as monat_unvollstaendig
  from r
), z as (
  select f.*,
         case when f.zaehlt and f.monat is not null and f.monat_unvollstaendig = 0 and f.variabel_monat_chf > 0
              then f.fix_monat_chf / f.variabel_monat_chf end as fix_zuschlag
  from f
)
select anlass_id, nummer, name, kunde, datum, datum_bis, status, monat, zaehlt, gaeste,
       personal_anzahl, personal_freelancer, personal_stunden, geraete_anzahl, geraete_miete,
       umsatz_chf, umsatz_quelle, waren_chf, personal_chf, uebrige_chf, variabel_chf, annahme,
       db_chf, round(100 * db_chf / nullif(umsatz_chf, 0), 1) as db_pct,
       (select wert from einstellung where schluessel = 'db_ziel_pct') as db_ziel_pct,
       round(100 * fix_zuschlag, 1) as fix_zuschlag_pct,
       round(variabel_chf * fix_zuschlag, 2) as fix_anteil_chf,
       db_chf - round(variabel_chf * fix_zuschlag, 2) as ergebnis_chf,
       round(100 * (db_chf - round(variabel_chf * fix_zuschlag, 2)) / nullif(umsatz_chf, 0), 1) as ergebnis_pct,
       nullif(concat_ws(', ',
         case when umsatz_chf is null then 'Umsatz' end,
         case when waren_chf is null then 'Waren' end,
         case when personal_chf is null then 'Personal' end,
         uebrige_fehlend), '') as fehlend,
       concat_ws('; ',
         case when umsatz_chf is null then 'Umsatz fehlt: Offerte oder Betrag von Hand'
              else 'Umsatz CHF ' || to_char(umsatz_chf, 'FM999999990.00') || case umsatz_quelle when 'offerte' then ' aus der Offerte' else ' von Hand' end end,
         case when variabel_chf is null then 'variable Kosten unvollständig: kein Deckungsbeitrag'
              else 'variable Kosten CHF ' || to_char(variabel_chf, 'FM999999990.00') || ' = Waren + Personal + Übrige' end,
         case when gaeste_offerte is distinct from gaeste and gaeste_offerte is not null
              then 'Umsatz und Waren der Offerte rechnen mit ' || gaeste_offerte || ' Gästen, die Services haben ' || coalesce(gaeste::text, '[Gäste]') end,
         case when fix_zuschlag is not null
              then 'Fixkosten-Anteil = variable Kosten CHF ' || to_char(variabel_chf, 'FM999999990.00') || ' × Fixkosten des Monats CHF '
                   || to_char(fix_monat_chf, 'FM999999990.00') || ' ÷ variable Kosten des Monats CHF ' || to_char(variabel_monat_chf, 'FM999999990.00')
                   || ' (Zuschlag rund ' || trim_scale(round(100 * fix_zuschlag, 1)) || ' %)'
              when zaehlt and monat is not null then 'Fixkosten-Anteil fehlt: Fixkosten oder variable Kosten des Monats unvollständig'
         end
       ) as herleitung
from z;

-- 6. Monatsergebnis und Break-even -----------------------------------------------------------
-- Ersetzt die Views des Proof of Concept (rechneten mit anlass_gericht und zeigten 0 statt «unbekannt»).
drop view public.monat_ergebnis;
drop view public.anlass_deckungsbeitrag;

create view public.anlass_deckungsbeitrag with (security_invoker = true) as
select anlass_id as id, nummer, name, datum, gaeste, umsatz_chf, waren_chf, personal_chf, uebrige_chf, db_chf, db_pct
from anlass_kalkulation
where zaehlt;

create view public.monat_ergebnis with (security_invoker = true) as
with m as (
  select monat,
         count(*) as anlaesse,
         case when count(*) filter (where gaeste is null) = 0 then sum(gaeste) end as gaeste,
         bool_or(annahme) as annahme,
         count(*) filter (where umsatz_chf is null) as anlaesse_ohne_umsatz,
         count(*) filter (where db_chf is null) as anlaesse_unvollstaendig,
         sum(umsatz_chf) as umsatz_bekannt_chf,
         sum(variabel_chf) as variabel_bekannt_chf,
         sum(db_chf) as db_bekannt_chf
  from anlass_kalkulation
  where zaehlt and monat is not null
  group by monat
), f as (
  select m.*,
         (select coalesce(sum(fk.chf_pro_monat), 0) from fixkosten fk
          where fk.gueltig_ab < (m.monat + interval '1 month')::date and (fk.gueltig_bis is null or fk.gueltig_bis >= m.monat)) as fix_chf,
         (select count(*) from fixkosten fk
          where fk.gueltig_ab < (m.monat + interval '1 month')::date and (fk.gueltig_bis is null or fk.gueltig_bis >= m.monat)) as fixkosten_zeilen
  from m
), e as (
  select f.*,
         -- Totale nur, wenn jeder Anlass des Monats vollständig ist.
         case when f.anlaesse_unvollstaendig = 0 then f.umsatz_bekannt_chf end as umsatz_chf,
         case when f.anlaesse_unvollstaendig = 0 then f.db_bekannt_chf end as db_chf
  from f
)
select monat, anlaesse, gaeste, annahme, anlaesse_ohne_umsatz, anlaesse_unvollstaendig, umsatz_bekannt_chf,
       umsatz_chf, db_chf, round(100 * db_chf / nullif(umsatz_chf, 0), 1) as db_pct,
       fix_chf, fixkosten_zeilen,
       case when fixkosten_zeilen > 0 then db_chf - fix_chf end as ergebnis_chf,
       -- Break-even-Umsatz = Fixkosten ÷ Deckungsbeitragsquote.
       case when fixkosten_zeilen > 0 and db_chf > 0 then round(fix_chf / (db_chf / umsatz_chf), 0) end as breakeven_umsatz_chf,
       case when fixkosten_zeilen > 0 and db_chf is not null then (db_chf - fix_chf) >= 0 end as rentabel,
       concat_ws('; ',
         case when anlaesse_unvollstaendig > 0 then anlaesse_unvollstaendig || ' von ' || anlaesse || ' Anlässen unvollständig: kein Monatstotal'
              else 'Deckungsbeitrag = Umsatz − variable Kosten über ' || anlaesse || ' Anlass/Anlässe' end,
         case when fixkosten_zeilen = 0 then 'Fixkosten des Monats fehlen: kein Ergebnis'
              else 'Ergebnis = Deckungsbeitrag − Fixkosten CHF ' || to_char(fix_chf, 'FM999999990.00') end,
         case when fixkosten_zeilen > 0 and db_chf > 0 then 'Break-even = Fixkosten ÷ (Deckungsbeitrag ÷ Umsatz)' end
       ) as herleitung
from e;
