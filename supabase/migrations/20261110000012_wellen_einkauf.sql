-- Produktionswellen und Einkauf (Aufgabe 7).
-- Entscheide Dominik 10.11.2026:
--   Menge pro Welle nach Service-Datum; Services ohne Datum ergeben [Menge].
--   Vorschlag der Datenbank als Wellenplan übernehmen, Datum der Welle danach änderbar; Prüfhinweise sperren nichts.
--   Einkaufsliste: Komponenten mit Hauptartikel als Artikelzeilen, Zukauf ohne Artikel als [Artikel], Rest «noch nicht verknüpft».
--   Lieferanten mit Liefertagen, Bestellschluss und Vorlauf nach dem Vorbild der BestellApp; Bestellungen werden nicht gespeichert.

-- 1. Lieferant ------------------------------------------------------------------
alter table public.lieferant
  add column liefertage int[] not null default '{}',          -- 1 = Montag … 7 = Sonntag (wie BestellApp delivery_days)
  add column bestellschluss_stunde int not null default 12,   -- Uhrzeit des Bestellschlusses
  add column vorlauf_tage int not null default 1,             -- Tage zwischen Bestellschluss und Lieferung
  add column telefon text,
  add column email text,
  add column bemerkung text,
  add column aktiv boolean not null default true;

alter table public.lieferant
  add constraint lieferant_liefertage_check check (liefertage <@ array[1, 2, 3, 4, 5, 6, 7]),
  add constraint lieferant_bestellschluss_check check (bestellschluss_stunde between 0 and 23),
  add constraint lieferant_vorlauf_check check (vorlauf_tage between 0 and 30);

insert into public.einstellung (schluessel, wert, bemerkung) values
  ('einkauf_vorlauf_tage', 1, 'Annahme: Ware trifft einen Tag vor der Produktion bzw. Anlieferung ein, mit der Küche klären')
on conflict (schluessel) do nothing;

-- Spätester Liefertermin eines Lieferanten bis p_liefern_bis und der Bestellschluss dafür.
-- Ohne Liefertage: keine Zeile (Bestelltermin unbekannt).
create function public.lieferant_bestelltermin(p_lieferant uuid, p_liefern_bis date)
returns table (liefertermin date, bestellen_bis timestamp)
language sql
stable
set search_path = public
as $$
  select d::date, (d::date - l.vorlauf_tage) + make_interval(hours => l.bestellschluss_stunde)
  from lieferant l
  cross join lateral generate_series(p_liefern_bis::timestamp, p_liefern_bis::timestamp - interval '13 days', interval '-1 day') d
  where l.id = p_lieferant
    and extract(isodow from d)::int = any (l.liefertage)
  order by d desc
  limit 1;
$$;

-- 2. Wellen-Termine --------------------------------------------------------------
-- Gleiche Logik wie wellen_anzahl (Hilfstabelle im Blatt Produktionsplan), liefert aber die Termine:
-- erste Welle am Tag vor der Anlieferung, danach alle «Haltbarkeit» Tage, solange der Anlass läuft.
create function public.wellen_termine(p_saison uuid, p_haltbarkeit integer)
returns table (nr integer, produktion_am date, haltbar_bis date)
language plpgsql
stable
set search_path = public
as $$
declare
  r record;
  gedeckt_bis date := null;
  n int;
  z int := 0;
begin
  if p_haltbarkeit is null or p_haltbarkeit < 1 then
    return;
  end if;
  for r in
    select a.datum - a.vorlauf_tage as anlieferung, coalesce(a.datum_bis, a.datum) as ende
    from anlass a
    where a.saison_id = p_saison and a.datum is not null
    order by a.datum
  loop
    if gedeckt_bis is null or r.ende > gedeckt_bis then
      n := ceil((r.ende - (r.anlieferung - 1))::numeric / p_haltbarkeit);
      for i in 0 .. n - 1 loop
        z := z + 1;
        nr := z;
        produktion_am := r.anlieferung - 1 + i * p_haltbarkeit;
        haltbar_bis := produktion_am + p_haltbarkeit;
        return next;
      end loop;
      gedeckt_bis := r.anlieferung - 1 + n * p_haltbarkeit;
    end if;
  end loop;
end
$$;

-- 3. Bedarf pro Service ------------------------------------------------------------
-- Wie anlass_komponente_bedarf, aber je Service (mit Datum), damit der Bedarf einer Welle zugeordnet werden kann.
create view public.service_komponente_bedarf with (security_invoker = true) as
select s.id as service_id, s.anlass_id, a.saison_id, s.name as service, s.reihenfolge, s.datum,
       s.datum - a.vorlauf_tage as anlieferung,
       mk.komponente_id,
       case mk.einheit when 'g' then 'kg' when 'ml' then 'l' else 'Stk' end as einheit_total,
       case when count(*) filter (where mk.menge_pro_gast is null) = 0
            then sum(s.gaeste * mg.anteil * mk.menge_pro_gast / case when mk.einheit = 'Stk' then 1 else 1000 end)
       end as menge,
       count(*) filter (where mk.menge_pro_gast is null) as zeilen_ohne_menge
from service s
join anlass a on a.id = s.anlass_id
join menuelinie_gericht mg on mg.menuelinie_id = s.menuelinie_id
join menuelinie_komponente mk on mk.linie_gericht_id = mg.id
where mk.komponente_id is not null
group by s.id, s.anlass_id, a.saison_id, s.name, s.reihenfolge, s.datum, a.vorlauf_tage, mk.komponente_id,
         case mk.einheit when 'g' then 'kg' when 'ml' then 'l' else 'Stk' end;

-- 4. Vorschlag: Komponente × Welle mit Menge -----------------------------------------
-- Zuordnung wie im Raster der Excel: Eine Welle deckt die Service-Tage nach ihrem Produktionstag bis zum Ende
-- der Haltbarkeit. Ein Service gehört zur spätesten Welle, die vor seinem Datum produziert wird.
-- Liegt die Produktion nicht vor der Anlieferung des Services (Datum − Vorlauf), gibt es einen gelben Prüfhinweis.
-- Fehlt bei einer Komponente ein Service-Datum oder liegt ein Service vor der ersten Welle, ist die Verteilung
-- unbekannt: Menge leer ([Menge]).
create view public.wellen_vorschlag with (security_invoker = true) as
with k as (
  select distinct b.saison_id, b.komponente_id, b.einheit_total, z.haltbarkeit_tage, z.name, z.kategorie, z.status
  from service_komponente_bedarf b
  join komponente_zuteilung z on z.id = b.komponente_id
  where b.saison_id is not null and z.haltbarkeit_tage is not null
), hb as (
  select distinct saison_id, haltbarkeit_tage from k
), termine as (
  -- Überlappen sich Anlässe, kann wellen_termine denselben Tag zweimal liefern: je Tag eine Welle, nach Datum nummeriert.
  select d.saison_id, d.haltbarkeit_tage, d.produktion_am, d.produktion_am + d.haltbarkeit_tage as haltbar_bis,
         (row_number() over (partition by d.saison_id, d.haltbarkeit_tage order by d.produktion_am))::int as nr
  from (
    select distinct hb.saison_id, hb.haltbarkeit_tage, w.produktion_am
    from hb
    cross join lateral wellen_termine(hb.saison_id, hb.haltbarkeit_tage) w
  ) d
), zu as (
  select b.saison_id, b.komponente_id, b.einheit_total, b.service, b.reihenfolge, b.datum, b.anlieferung, b.menge, b.zeilen_ohne_menge,
         (select max(t.nr) from termine t
          where t.saison_id = b.saison_id and t.haltbarkeit_tage = k.haltbarkeit_tage and t.produktion_am < b.datum) as nr
  from service_komponente_bedarf b
  join k on k.saison_id = b.saison_id and k.komponente_id = b.komponente_id and k.einheit_total = b.einheit_total
), ko as (
  select saison_id, komponente_id, einheit_total,
         count(*) filter (where datum is null) as services_ohne_datum,
         count(*) filter (where datum is not null and nr is null) as services_ohne_welle
  from zu
  group by saison_id, komponente_id, einheit_total
), v as (
  select k.saison_id, k.komponente_id, k.name as komponente, k.kategorie, k.status, k.einheit_total, k.haltbarkeit_tage,
         t.nr, t.produktion_am, t.haltbar_bis,
         ko.services_ohne_datum, ko.services_ohne_welle,
         case when ko.services_ohne_datum = 0 and ko.services_ohne_welle = 0 and coalesce(sum(zu.zeilen_ohne_menge), 0) = 0
              then round(coalesce(sum(zu.menge), 0), 3)
         end as menge,
         min(zu.anlieferung) as erste_anlieferung,
         max(zu.datum) as letzter_service,
         string_agg(zu.service || ' ' || coalesce(trim_scale(round(zu.menge, 3))::text, '[Menge]') || ' ' || k.einheit_total,
                    ' + ' order by zu.datum, zu.reihenfolge) as services
  from k
  join termine t on t.saison_id = k.saison_id and t.haltbarkeit_tage = k.haltbarkeit_tage
  join ko on ko.saison_id = k.saison_id and ko.komponente_id = k.komponente_id and ko.einheit_total = k.einheit_total
  left join zu on zu.saison_id = k.saison_id and zu.komponente_id = k.komponente_id
              and zu.einheit_total = k.einheit_total and zu.nr = t.nr
  group by k.saison_id, k.komponente_id, k.name, k.kategorie, k.status, k.einheit_total, k.haltbarkeit_tage,
           t.nr, t.produktion_am, t.haltbar_bis, ko.services_ohne_datum, ko.services_ohne_welle
)
select saison_id, komponente_id, komponente, kategorie, status, einheit_total, haltbarkeit_tage,
       nr, produktion_am, haltbar_bis, menge, erste_anlieferung, letzter_service, services_ohne_datum, services_ohne_welle,
       -- Gelbe Prüfhinweise, sperren nichts.
       greatest(letzter_service - haltbar_bis, 0) as tage_ueber_haltbarkeit,
       coalesce(produktion_am >= erste_anlieferung, false) as anlieferung_knapp,
       case
         when services_ohne_datum > 0 then 'Service-Datum fehlt bei ' || services_ohne_datum || ' Service(s): Verteilung auf die Wellen unbekannt'
         when services_ohne_welle > 0 then services_ohne_welle || ' Service(s) liegen vor der ersten Welle: Datum von Service und Anlass prüfen'
         else coalesce(services, 'kein Service in diesem Fenster')
       end as herleitung
from v
-- Wellen ohne Bedarf dieser Komponente weglassen (z.B. Wellen für andere Anlässe).
where menge is distinct from 0;

-- 5. Wellenplan --------------------------------------------------------------------
alter table public.produktionswelle add column spaetestens_am date;   -- Termin aus dem Vorschlag
alter table public.welle_komponente alter column menge drop not null; -- [Menge], solange Service-Daten fehlen
alter table public.welle_komponente add column vorschlag_nr integer;  -- Welle der Komponente im Vorschlag
-- Eine Komponente kann in zwei Einheiten vorkommen (kg und l): Einheit gehört zum Schlüssel.
alter table public.welle_komponente drop constraint welle_komponente_pkey;
alter table public.welle_komponente add primary key (welle_id, komponente_id, einheit);

-- Vorschlag als Plan übernehmen. Ersetzt den bestehenden Plan der Saison (Datumsänderungen gehen verloren).
create function public.wellenplan_uebernehmen(p_saison uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_wellen integer;
begin
  if not exists (select 1 from wellen_vorschlag where saison_id = p_saison) then
    raise exception 'Kein Vorschlag: In dieser Saison braucht keine Komponente mit Haltbarkeit eine Welle' using errcode = 'P0002';
  end if;

  delete from produktionswelle where saison_id = p_saison;

  insert into produktionswelle (saison_id, nummer, datum, spaetestens_am)
  select p_saison, row_number() over (order by d), d, d
  from (select distinct produktion_am as d from wellen_vorschlag where saison_id = p_saison) x;
  get diagnostics v_wellen = row_count;

  insert into welle_komponente (welle_id, komponente_id, menge, einheit, vorschlag_nr)
  select w.id, v.komponente_id, v.menge, v.einheit_total, v.nr
  from wellen_vorschlag v
  join produktionswelle w on w.saison_id = v.saison_id and w.spaetestens_am = v.produktion_am
  where v.saison_id = p_saison;

  return v_wellen;
end
$$;

-- Plan mit Prüfhinweisen (rot oder gelb, zeigen an, sperren nichts).
create view public.wellenplan with (security_invoker = true) as
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
       nullif(concat_ws('; ', rot, nullif(gelb, '')), '') as hinweis
from h;

-- Übersicht pro Saison: was bekommt eine Welle, was nicht.
create view public.wellen_uebersicht with (security_invoker = true) as
select s.id as saison_id, s.name as saison,
       (select count(*) from service sv join anlass a on a.id = sv.anlass_id where a.saison_id = s.id) as services,
       (select count(*) from service sv join anlass a on a.id = sv.anlass_id where a.saison_id = s.id and sv.datum is null) as services_ohne_datum,
       (select count(*) from produktionsliste p where p.saison_id = s.id and p.haltbarkeit_tage is not null) as komponenten_mit_welle,
       (select count(*) from produktionsliste p where p.saison_id = s.id and p.haltbarkeit_tage is null and p.status = 'offen') as komponenten_offen,
       (select count(*) from produktionsliste p where p.saison_id = s.id and p.haltbarkeit_tage is null and p.status = 'Zukauf') as komponenten_zukauf,
       (select count(*) from produktionsliste p where p.saison_id = s.id and p.haltbarkeit_tage is null and p.status = 'ok') as komponenten_vor_ort,
       (select count(*) from produktionswelle w where w.saison_id = s.id) as plan_wellen,
       (select count(distinct produktion_am) from wellen_vorschlag v where v.saison_id = s.id) as vorschlag_wellen,
       (select count(*) from wellenplan w where w.saison_id = s.id and w.hinweis_farbe = 'rot') as hinweise_rot,
       (select count(*) from wellenplan w where w.saison_id = s.id and w.hinweis_farbe = 'gelb') as hinweise_gelb
from saison s;

-- 6. Einkauf -------------------------------------------------------------------------
-- Wellen für den Einkauf. Der Plan bestimmt das Datum; die Menge kommt immer aktuell aus dem Vorschlag
-- (sonst würde der Einkauf mit veralteten Mengen rechnen). Komponenten, die erst nach der Übernahme
-- dazugekommen sind, erscheinen als «neu im Vorschlag» mit dem Termin des Vorschlags.
create view public.wellen_aktuell with (security_invoker = true) as
select w.saison_id, 'plan'::text as quelle, w.nummer as nr, 'Welle ' || w.nummer as bezug, w.datum,
       wk.komponente_id, wk.einheit,
       case when v.komponente_id is not null then v.menge else wk.menge end as menge
from produktionswelle w
join welle_komponente wk on wk.welle_id = w.id
left join wellen_vorschlag v on v.saison_id = w.saison_id and v.komponente_id = wk.komponente_id
                            and v.einheit_total = wk.einheit and v.nr = wk.vorschlag_nr
union all
select v.saison_id, 'vorschlag_neu', 500 + (dense_rank() over (partition by v.saison_id order by v.produktion_am))::int,
       'Neu im Vorschlag, ' || to_char(v.produktion_am, 'DD.MM.YYYY'), v.produktion_am,
       v.komponente_id, v.einheit_total, v.menge
from wellen_vorschlag v
where exists (select 1 from produktionswelle w where w.saison_id = v.saison_id)
  and not exists (
    select 1 from produktionswelle w
    join welle_komponente wk on wk.welle_id = w.id
    where w.saison_id = v.saison_id and wk.komponente_id = v.komponente_id and wk.einheit = v.einheit_total and wk.vorschlag_nr = v.nr)
union all
select v.saison_id, 'vorschlag',
       (dense_rank() over (partition by v.saison_id order by v.produktion_am))::int,
       'Welle ' || dense_rank() over (partition by v.saison_id order by v.produktion_am),
       v.produktion_am, v.komponente_id, v.einheit_total, v.menge
from wellen_vorschlag v
where not exists (select 1 from produktionswelle w where w.saison_id = v.saison_id);

-- Einkaufspositionen: Komponenten in Wellen (Bedarf am Produktionstag) und Komponenten ohne Haltbarkeit
-- (Zukauf, offen, nur vor Ort: Bedarf zur Anlieferung des Anlasses).
-- Artikelmenge = Komponentenmenge × (1 + Verlust des Artikels): Annahme, bis Rezepte mit Artikeln verknüpft sind.
create view public.einkauf_position with (security_invoker = true) as
with e as (
  select coalesce((select wert from einstellung where schluessel = 'einkauf_vorlauf_tage'), 1)::int as vorlauf
), bedarf as (
  select wa.saison_id, 'welle'::text as bezug_typ, wa.bezug, wa.nr as sortierung, wa.quelle,
         wa.datum as bedarf_am, wa.komponente_id, wa.einheit, wa.menge
  from wellen_aktuell wa
  union all
  select a.saison_id, 'anlass', a.name, 1000 + (dense_rank() over (order by a.datum, a.id))::int, 'anlass',
         a.datum - a.vorlauf_tage, b.komponente_id, b.einheit_total, b.menge
  from (
    select b0.anlass_id, b0.komponente_id, b0.einheit_total,
           case when count(*) filter (where b0.menge_total is null) = 0 then sum(b0.menge_total) end as menge
    from anlass_komponente_bedarf b0
    join komponente_zuteilung z0 on z0.id = b0.komponente_id
    where z0.haltbarkeit_tage is null
    group by b0.anlass_id, b0.komponente_id, b0.einheit_total
  ) b
  join anlass a on a.id = b.anlass_id
  where a.saison_id is not null
), m as (
  select b.*, e.vorlauf, z.name as komponente, z.kategorie, z.status, z.nur_vor_ort,
         ar.id as artikel_id, ar.name as artikel, ar.artikelnummer, ar.einheit as artikel_einheit,
         ar.preis_pro_einheit, coalesce(ar.verlust_pct, 0) as verlust_pct,
         l.id as lieferant_id, l.name as lieferant,
         case when ar.id is not null then 'artikel' when z.status = 'Zukauf' then 'zukauf' else 'offen' end as typ,
         -- Nur gleiche Einheiten: kg ↔ kg, l ↔ Liter, Stk ↔ Stk. Gebinde (Schale, Bund …) lassen sich nicht umrechnen.
         coalesce((b.einheit = 'kg' and ar.einheit = 'kg') or (b.einheit = 'l' and ar.einheit in ('Liter', 'l')) or (b.einheit = 'Stk' and ar.einheit = 'Stk'), false) as umrechenbar,
         b.bedarf_am - e.vorlauf as liefern_bis
  from bedarf b
  cross join e
  join komponente_zuteilung z on z.id = b.komponente_id
  left join artikel ar on ar.id = z.hauptartikel_id
  left join lieferant l on l.id = ar.lieferant_id
), r as (
  select m.*,
         case when m.umrechenbar then round(m.menge * (1 + m.verlust_pct / 100), 3) end as menge_artikel,
         t.liefertermin, t.bestellen_bis
  from m
  left join lateral lieferant_bestelltermin(m.lieferant_id, m.liefern_bis) t on true
)
select saison_id, bezug_typ, bezug, sortierung, quelle, bedarf_am, liefern_bis,
       komponente_id, komponente, kategorie, status, nur_vor_ort, typ,
       menge as menge_komponente, einheit,
       artikel_id, artikel, artikelnummer, artikel_einheit, preis_pro_einheit, verlust_pct,
       menge_artikel, round(menge_artikel * preis_pro_einheit, 2) as kosten_chf,
       lieferant_id, lieferant, liefertermin, bestellen_bis,
       concat_ws('; ',
         case bezug_typ
           when 'welle' then 'Bedarf der ' || bezug || ' am Produktionstag ' || coalesce(to_char(bedarf_am, 'DD.MM.YYYY'), '[Datum]')
           else 'Bedarf des ganzen Anlasses ' || bezug || ' zur Anlieferung am ' || coalesce(to_char(bedarf_am, 'DD.MM.YYYY'), '[Datum]')
                || ' (Annahme: keine Verteilung auf die Tage)'
         end,
         case
           when typ = 'zukauf' then 'Zukauf: Artikel [Artikel] zuordnen'
           when typ = 'offen' then 'kein Hauptartikel zugeordnet'
           when menge is null then 'Menge der Komponente fehlt'
           when not umrechenbar then 'Einheit ' || einheit || ' der Komponente passt nicht zu ' || coalesce(artikel_einheit, '[Einheit]') || ' des Artikels: Menge von Hand'
           else trim_scale(menge) || ' ' || einheit || ' × (1 + ' || trim_scale(verlust_pct) || ' % Verlust) = ' || trim_scale(menge_artikel) || ' ' || artikel_einheit
                || coalesce(' × CHF ' || to_char(preis_pro_einheit, 'FM999999990.00') || ' = CHF ' || to_char(round(menge_artikel * preis_pro_einheit, 2), 'FM999999990.00'), '; [Preis]')
         end,
         case when typ = 'artikel' and bedarf_am is not null
              then 'Lieferung bis ' || to_char(liefern_bis, 'DD.MM.YYYY') || ' (' || vorlauf || ' Tag(e) vor Bedarf)'
                   || case when lieferant_id is null then '; [Lieferant]'
                           when liefertermin is null then '; Liefertage von ' || lieferant || ' fehlen'
                           else '; ' || lieferant || ' liefert am ' || to_char(liefertermin, 'DD.MM.YYYY')
                                || ', bestellen bis ' || to_char(bestellen_bis, 'DD.MM.YYYY HH24') || ' Uhr' end
         end
       ) as herleitung
from r;

-- Einkaufsliste nach Artikel: pro Bezug (Welle oder Anlass), Lieferant und Artikel.
create view public.einkauf_artikel with (security_invoker = true) as
select saison_id, bezug_typ, bezug, sortierung, quelle, bedarf_am, liefern_bis,
       lieferant_id, lieferant, artikel_id, artikel, artikelnummer, artikel_einheit, preis_pro_einheit,
       count(*) as komponenten,
       string_agg(komponente, ', ' order by komponente) as komponenten_namen,
       case when count(*) filter (where menge_artikel is null) = 0 then sum(menge_artikel) end as menge_artikel,
       case when count(*) filter (where kosten_chf is null) = 0 then sum(kosten_chf) end as kosten_chf,
       min(liefertermin) as liefertermin, min(bestellen_bis) as bestellen_bis,
       string_agg(komponente || ': ' || herleitung, ' | ' order by komponente) as herleitung
from einkauf_position
where typ = 'artikel'
group by saison_id, bezug_typ, bezug, sortierung, quelle, bedarf_am, liefern_bis,
         lieferant_id, lieferant, artikel_id, artikel, artikelnummer, artikel_einheit, preis_pro_einheit;

-- Summe pro Saison. Kosten nur über Positionen mit Kosten; die Zahl der Positionen ohne Kosten steht daneben.
-- bestellen_bis ist Ortszeit (Europe/Zurich) ohne Zeitzone.
create view public.einkauf_summe with (security_invoker = true) as
select s.id as saison_id, s.name as saison,
       count(p.komponente_id) filter (where p.typ = 'artikel') as positionen_artikel,
       count(p.komponente_id) filter (where p.typ = 'artikel' and p.kosten_chf is null) as positionen_artikel_ohne_kosten,
       count(p.komponente_id) filter (where p.typ = 'zukauf') as positionen_zukauf,
       count(p.komponente_id) filter (where p.typ = 'offen') as positionen_offen,
       count(p.komponente_id) filter (where p.quelle = 'vorschlag_neu') as positionen_nicht_im_plan,
       sum(p.kosten_chf) filter (where p.typ = 'artikel') as kosten_chf,
       min(p.bestellen_bis) filter (where p.bestellen_bis >= (now() at time zone 'Europe/Zurich')) as naechster_bestellschluss,
       count(distinct p.bestellen_bis) filter (where p.bestellen_bis < (now() at time zone 'Europe/Zurich')) as bestellschluesse_vorbei,
       coalesce(bool_or(p.quelle = 'vorschlag'), false) as aus_vorschlag
from saison s
left join einkauf_position p on p.saison_id = s.id
group by s.id, s.name;

-- 7. Rechte und Selbstprüfung -----------------------------------------------------------
revoke execute on function public.lieferant_bestelltermin(uuid, date) from public, anon;
revoke execute on function public.wellen_termine(uuid, integer) from public, anon;
revoke execute on function public.wellenplan_uebernehmen(uuid) from public, anon;
grant execute on function public.lieferant_bestelltermin(uuid, date) to authenticated;
grant execute on function public.wellen_termine(uuid, integer) to authenticated;
grant execute on function public.wellenplan_uebernehmen(uuid) to authenticated;

-- Kontrollwert: wellen_termine muss für jede Haltbarkeit gleich viele Wellen liefern wie wellen_anzahl.
-- Weicht eine ab, scheitert die Migration als Ganzes.
do $$
declare
  s record;
  h int;
begin
  for s in select id, name from saison loop
    for h in 1 .. 400 loop
      if (select count(*) from wellen_termine(s.id, h)) is distinct from coalesce(wellen_anzahl(s.id, h), 0) then
        raise exception 'wellen_termine weicht von wellen_anzahl ab: Saison %, Haltbarkeit % Tage', s.name, h;
      end if;
    end loop;
  end loop;
end
$$;
