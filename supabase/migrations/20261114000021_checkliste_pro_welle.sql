-- Checkliste pro Produktionswelle (Wunsch Dominik, 14.11.2026).
-- Bisher galt «erledigt» für die Komponente in der ganzen Saison. Eine Komponente mit kurzer Haltbarkeit wird aber
-- in mehreren Wellen produziert: abgehakt wird neu pro Welle.
--   welle_nr = Welle der Komponente im Vorschlag (wellen_vorschlag.nr, 1 … n nach Haltbarkeit)
--   welle_nr = 0: Komponente ohne Welle (Zukauf, offen, nur vor Ort): ein Eintrag pro Saison wie bisher
-- Annahme: Die Nummer bleibt gleich, solange sich Anlassdaten und Haltbarkeit nicht ändern. Ändern sie sich,
-- verschieben sich die Wellen und die Häkchen sind zu prüfen.

-- 1. Tabelle ---------------------------------------------------------------------
alter table public.produktion_aufgabe
  add column welle_nr integer not null default 0 check (welle_nr >= 0);
alter table public.produktion_aufgabe drop constraint produktion_aufgabe_pkey;
alter table public.produktion_aufgabe add primary key (saison_id, komponente_id, welle_nr);
comment on table public.produktion_aufgabe is 'Checkliste der Produktion: zuständige Person und Erledigt-Status pro Saison, Komponente und Welle (welle_nr 0 = ohne Welle).';

-- Bestehende Einträge galten für die ganze Saison. Zuständig geht auf alle Wellen der Komponente über.
-- «Erledigt» wird für Komponenten mit Wellen nicht übernommen: Welche Welle erledigt war, ist nicht bekannt.
insert into public.produktion_aufgabe (saison_id, komponente_id, welle_nr, zustaendig)
select distinct a.saison_id, a.komponente_id, v.nr, a.zustaendig
from public.produktion_aufgabe a
join public.wellen_vorschlag v on v.saison_id = a.saison_id and v.komponente_id = a.komponente_id
where a.welle_nr = 0;

delete from public.produktion_aufgabe a
where a.welle_nr = 0
  and exists (select 1 from public.produktion_aufgabe b
              where b.saison_id = a.saison_id and b.komponente_id = a.komponente_id and b.welle_nr > 0);

-- 2. Checkliste: eine Zeile pro Komponente und Welle -------------------------------
-- Wellen aus dem Vorschlag; das Datum kommt aus dem Wellenplan, sobald er übernommen ist.
-- Komponenten der Produktionsliste ohne Welle bekommen eine Zeile mit welle_nr 0.
create view public.produktion_checkliste with (security_invoker = true) as
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
)
select z.saison_id, z.komponente_id, z.welle_nr,
       case when pl.komponente_id is not null then pl.datum else z.spaetestens_am end as produktion_am,
       z.spaetestens_am, pl.plan_nummer,
       a.zustaendig, a.erledigt_am, a.erledigt_von
from zeilen z
left join plan pl on pl.saison_id = z.saison_id and pl.komponente_id = z.komponente_id and pl.welle_nr = z.welle_nr
left join produktion_aufgabe a on a.saison_id = z.saison_id and a.komponente_id = z.komponente_id and a.welle_nr = z.welle_nr;

-- 3. Wellenplan: Welle der Komponente im Vorschlag mitgeben -------------------------
-- Unverändert wie Migration 12, neu mit der Spalte vorschlag_nr am Schluss (Schlüssel der Checkliste).
create or replace view public.wellenplan with (security_invoker = true) as
with p as (
  select w.saison_id, w.id as welle_id, w.nummer, w.datum, w.spaetestens_am, w.bemerkung,
         wk.komponente_id, z.name as komponente, z.kategorie, z.status, wk.einheit, wk.menge, wk.vorschlag_nr,
         z.haltbarkeit_tage, w.datum + z.haltbarkeit_tage as haltbar_bis,
         v.komponente_id is not null as im_vorschlag, v.menge as menge_aktuell, v.letzter_service, v.herleitung,
         v.produktion_am as spaetestens_aktuell, v.erste_anlieferung
  from produktionswelle w
  join welle_komponente wk on wk.welle_id = w.id
  join komponente_zuteilung z on z.id = wk.komponente_id
  left join wellen_vorschlag v on v.saison_id = w.saison_id and v.komponente_id = wk.komponente_id
                              and v.einheit_total = wk.einheit and v.nr = wk.vorschlag_nr
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
