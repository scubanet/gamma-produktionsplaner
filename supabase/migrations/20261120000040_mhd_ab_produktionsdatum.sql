-- Haltbarkeit ab Produktionsdatum (20.11.2026).
-- Entscheid Dominik (20.11.2026): Das MHD rechnet ab dem Produktionsdatum, nicht ab dem spätesten Termin des Vorschlags.
--
-- 1. produktion_aufgabe.produziert_am: der Produktionstag, getrennt vom Häkchen. Die Datenbank setzt ihn beim Abhaken
--    (Ortszeit Europe/Zurich). Annahme: abgehakt wird am Produktionstag.
--    Wird das Häkchen am selben Tag zurückgenommen, gilt es als Versehen und der Tag ist wieder leer.
--    Wird es an einem späteren Tag zurückgenommen und wieder gesetzt, bleibt der erste Produktionstag: erneutes Abhaken
--    kann das MHD nie verlängern.
-- 2. Checkliste (eine Zeile pro Komponente und Welle): vier Spalten am Schluss; die bisherigen bleiben gleich.
--      haltbarkeit_tage  aus der Systemzuteilung
--      produziert_am     Produktionstag; leer, solange offen
--      haltbar_bis       Produktionsdatum + haltbarkeit_tage. Produktionsdatum = produziert_am, sonst das Datum des
--                        Wellenplans, sonst der späteste Termin des Vorschlags.
--      haltbar_grundlage welches Datum gerechnet wurde: 'produziert', 'geplant' oder 'spaetestens'.
-- 3. Wellenplan: haltbar_bis und der Hinweis «Haltbarkeit endet am …» rechnen bei abgehakten Zeilen ebenfalls ab dem
--    Produktionstag (gleiche Spalten wie Migration 21).

alter table public.produktion_aufgabe add column produziert_am date;
comment on column public.produktion_aufgabe.produziert_am is 'Produktionstag (Ortszeit Europe/Zurich), von der Datenbank beim Abhaken gesetzt. Grundlage für das MHD. Bleibt beim späteren Zurücknehmen stehen, damit erneutes Abhaken das MHD nicht verlängert; am selben Tag zurückgenommen wird er geleert.';

create or replace function public.produktion_aufgabe_stempel()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  heute date := (now() at time zone 'Europe/Zurich')::date;
begin
  new.geaendert_am := now();
  new.geaendert_von := auth.uid();
  if new.erledigt_am is null then
    new.erledigt_von := null;
    if tg_op = 'INSERT' then
      new.produziert_am := null;
    elsif coalesce(old.produziert_am, (old.erledigt_am at time zone 'Europe/Zurich')::date) = heute then
      -- Am selben Tag zurückgenommen: Versehen.
      new.produziert_am := null;
    else
      -- Zeilen, die vor dieser Migration abgehakt wurden, haben noch keinen Produktionstag: aus erledigt_am.
      new.produziert_am := coalesce(old.produziert_am, (old.erledigt_am at time zone 'Europe/Zurich')::date);
    end if;
  elsif tg_op = 'INSERT' then
    new.erledigt_am := now();
    new.erledigt_von := auth.uid();
    new.produziert_am := heute;
  elsif old.erledigt_am is null then
    new.erledigt_am := now();
    new.erledigt_von := auth.uid();
    new.produziert_am := coalesce(old.produziert_am, heute);
  else
    new.erledigt_am := old.erledigt_am;
    new.erledigt_von := old.erledigt_von;
    -- Zeilen, die vor dieser Migration abgehakt wurden, haben noch keinen Produktionstag.
    new.produziert_am := coalesce(old.produziert_am, (old.erledigt_am at time zone 'Europe/Zurich')::date);
  end if;
  new.zustaendig := nullif(trim(new.zustaendig), '');
  return new;
end;
$$;

create or replace view public.produktion_checkliste with (security_invoker = true) as
with wellen as (
  select v.saison_id, v.komponente_id, v.nr as welle_nr, min(v.produktion_am) as spaetestens_am
  from wellen_vorschlag v
  group by v.saison_id, v.komponente_id, v.nr
), plan as (
  select w.saison_id, wk.komponente_id, wk.vorschlag_nr as welle_nr, min(w.nummer) as plan_nummer, min(w.datum) as datum
  from produktionswelle w
  join welle_komponente wk on wk.welle_id = w.id
  where wk.vorschlag_nr is not null
  group by w.saison_id, wk.komponente_id, wk.vorschlag_nr
), zeilen as (
  select saison_id, komponente_id, welle_nr, spaetestens_am from wellen
  union all
  select distinct p.saison_id, p.komponente_id, 0, null::date
  from produktionsliste p
  where not exists (select 1 from wellen w where w.saison_id = p.saison_id and w.komponente_id = p.komponente_id)
), basis as (
  select z.saison_id, z.komponente_id, z.welle_nr,
         case when pl.komponente_id is not null then pl.datum else z.spaetestens_am end as produktion_am,
         z.spaetestens_am, pl.plan_nummer,
         a.zustaendig, a.erledigt_am, a.erledigt_von,
         kz.haltbarkeit_tage,
         case when a.erledigt_am is not null then coalesce(a.produziert_am, (a.erledigt_am at time zone 'Europe/Zurich')::date) end as produziert_am,
         pl.komponente_id is not null and pl.datum is not null as geplant
  from zeilen z
  left join plan pl on pl.saison_id = z.saison_id and pl.komponente_id = z.komponente_id and pl.welle_nr = z.welle_nr
  left join produktion_aufgabe a on a.saison_id = z.saison_id and a.komponente_id = z.komponente_id and a.welle_nr = z.welle_nr
  left join komponente_zuteilung kz on kz.id = z.komponente_id
)
select b.saison_id, b.komponente_id, b.welle_nr, b.produktion_am, b.spaetestens_am, b.plan_nummer,
       b.zustaendig, b.erledigt_am, b.erledigt_von,
       b.haltbarkeit_tage, b.produziert_am,
       coalesce(b.produziert_am, b.produktion_am) + b.haltbarkeit_tage as haltbar_bis,
       case when b.produziert_am is not null then 'produziert'
            when b.produktion_am is null then null
            when b.geplant then 'geplant'
            else 'spaetestens' end as haltbar_grundlage
from basis b;

comment on view public.produktion_checkliste is 'Checkliste: eine Zeile pro Komponente und Welle (welle_nr 0 = ohne Welle). haltbar_bis = Produktionsdatum + Haltbarkeit der Systemzuteilung; Produktionsdatum ist der Produktionstag der abgehakten Zeile (produziert_am; Annahme: abgehakt wird am Produktionstag), sonst das Datum des Wellenplans, sonst der späteste Termin (haltbar_grundlage).';

-- Wellenplan: wie Migration 21, haltbar_bis bei abgehakten Zeilen ab dem Produktionstag.
create or replace view public.wellenplan with (security_invoker = true) as
with p as (
  select w.saison_id, w.id as welle_id, w.nummer, w.datum, w.spaetestens_am, w.bemerkung,
         wk.komponente_id, z.name as komponente, z.kategorie, z.status, wk.einheit, wk.menge, wk.vorschlag_nr,
         z.haltbarkeit_tage,
         -- Abgehakt: ab dem Produktionstag; sonst ab dem Datum der Welle.
         coalesce(case when a.erledigt_am is not null then coalesce(a.produziert_am, (a.erledigt_am at time zone 'Europe/Zurich')::date) end, w.datum)
           + z.haltbarkeit_tage as haltbar_bis,
         v.komponente_id is not null as im_vorschlag, v.menge as menge_aktuell, v.letzter_service, v.herleitung,
         v.produktion_am as spaetestens_aktuell, v.erste_anlieferung
  from produktionswelle w
  join welle_komponente wk on wk.welle_id = w.id
  join komponente_zuteilung z on z.id = wk.komponente_id
  left join wellen_vorschlag v on v.saison_id = w.saison_id and v.komponente_id = wk.komponente_id
                              and v.einheit_total = wk.einheit and v.nr = wk.vorschlag_nr
  left join produktion_aufgabe a on a.saison_id = w.saison_id and a.komponente_id = wk.komponente_id and a.welle_nr = wk.vorschlag_nr
), h as (
  select p.*,
    case when p.datum > coalesce(p.spaetestens_aktuell, p.spaetestens_am)
         then 'Datum nach dem spätesten Termin ' || to_char(coalesce(p.spaetestens_aktuell, p.spaetestens_am), 'DD.MM.YYYY') || ': Anlieferung gefährdet' end as rot,
    concat_ws('; ',
      case when p.datum is null then 'Datum der Welle fehlt' end,
      case when p.spaetestens_aktuell is distinct from p.spaetestens_am and p.im_vorschlag
           then 'Termin im Vorschlag geändert: neu ' || to_char(p.spaetestens_aktuell, 'DD.MM.YYYY') || ', Vorschlag neu übernehmen' end,
      case when p.datum >= p.erste_anlieferung
           then 'Produktion am Tag der Anlieferung (' || to_char(p.erste_anlieferung, 'DD.MM.YYYY') || ') oder später: Vorlauf prüfen' end,
      case when p.haltbar_bis < p.letzter_service
           then 'Haltbarkeit endet am ' || to_char(p.haltbar_bis, 'DD.MM.YYYY') || ', letzter Service am ' || to_char(p.letzter_service, 'DD.MM.YYYY') end,
      case when p.haltbarkeit_tage is null then 'Komponente hat keine Haltbarkeit mehr: Systemzuteilung prüfen' end,
      case when not p.im_vorschlag then 'nicht mehr im Vorschlag: Vorschlag neu übernehmen'
           when p.menge is null then 'Menge fehlt: Service-Datum eintragen, dann Vorschlag neu übernehmen'
           when p.menge is distinct from p.menge_aktuell
           then 'Bedarf geändert: aktuell ' || coalesce(trim_scale(p.menge_aktuell)::text, '[Menge]') || ' ' || p.einheit end
    ) as gelb
  from p
)
select saison_id, welle_id, nummer, datum, spaetestens_am, bemerkung, komponente_id, komponente, kategorie, status,
       einheit, menge, menge_aktuell, haltbarkeit_tage, haltbar_bis, letzter_service, herleitung,
       case when rot is not null then 'rot' when gelb <> '' then 'gelb' end as hinweis_farbe,
       nullif(concat_ws('; ', rot, nullif(gelb, '')), '') as hinweis,
       vorschlag_nr
from h;
