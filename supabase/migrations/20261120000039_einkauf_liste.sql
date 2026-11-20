-- Einkaufsliste in einer Abfrage (20.11.2026).
-- Die Seite Einkauf holte Summe, Artikel, Positionen und Zähler mit vier Abfragen. Jede rechnet denselben Unterbau
-- (einkauf_bedarf, einkauf_zutat) neu, die Summe allein dreimal: gemessen 1,2 bis 1,6 s. Neu rechnet eine Funktion
-- Positionen und Artikel je einmal und bildet die Summe aus diesen Zeilen: gemessen rund 0,2 s, gleiche Werte.
-- Die Rechenregeln der Summe stehen nur an einer Stelle (einkauf_summe_von); die View einkauf_summe benützt sie auch.

-- 1. Summe aus Positionen und Artikelzeilen ---------------------------------------------------------------------
-- Regeln unverändert aus Migration 38: Kosten nur über Positionen mit Kosten; bestellen_bis ist Ortszeit (Europe/Zurich).
-- Hängt an den Zeilentypen der Views einkauf_position und einkauf_artikel: wer diese Views neu anlegt (drop view),
-- muss zuerst einkauf_liste, einkauf_summe und einkauf_summe_von entfernen und danach wieder anlegen.
create function public.einkauf_summe_von(p_positionen public.einkauf_position[], p_artikel public.einkauf_artikel[])
returns table (
  positionen_artikel bigint, positionen_artikel_ohne_kosten bigint, positionen_zukauf bigint, positionen_offen bigint,
  positionen_nicht_im_plan bigint, kosten_chf numeric, naechster_bestellschluss timestamp, bestellschluesse_vorbei bigint,
  aus_vorschlag boolean, positionen_rezept bigint, positionen_rezept_unvollstaendig bigint,
  positionen_rezept_nicht_freigegeben bigint
)
language sql
stable
set search_path = public
as $$
  select count(p.komponente_id) filter (where p.typ in ('artikel', 'rezept')),
         count(p.komponente_id) filter (where p.typ in ('artikel', 'rezept') and p.kosten_chf is null),
         count(p.komponente_id) filter (where p.typ = 'zukauf'),
         count(p.komponente_id) filter (where p.typ = 'offen'),
         count(p.komponente_id) filter (where p.quelle = 'vorschlag_neu'),
         sum(p.kosten_chf) filter (where p.typ in ('artikel', 'rezept')),
         (select min(a.bestellen_bis) from unnest(p_artikel) a
          where a.bestellen_bis >= (now() at time zone 'Europe/Zurich')),
         (select count(distinct a.bestellen_bis) from unnest(p_artikel) a
          where a.bestellen_bis < (now() at time zone 'Europe/Zurich')),
         coalesce(bool_or(p.quelle = 'vorschlag'), false),
         count(p.komponente_id) filter (where p.typ = 'rezept'),
         count(p.komponente_id) filter (where p.typ = 'rezept' and (p.zutaten_ohne_artikel > 0 or p.zutaten_ohne_menge > 0)),
         count(p.komponente_id) filter (where p.typ = 'rezept' and p.rezept_status <> 'freigegeben')
  from unnest(p_positionen) p;
$$;

comment on function public.einkauf_summe_von(public.einkauf_position[], public.einkauf_artikel[]) is 'Einkauf: Summe über die übergebenen Positionen und Artikelzeilen einer Saison. Einzige Stelle mit den Rechenregeln der Summe; benützt von der View einkauf_summe und der Funktion einkauf_liste.';

-- 2. View einkauf_summe: gleiche Spalten und Werte, rechnet die Artikel nur noch einmal statt zweimal -------------
create or replace view public.einkauf_summe with (security_invoker = true) as
select s.id as saison_id, s.name as saison,
       v.positionen_artikel, v.positionen_artikel_ohne_kosten, v.positionen_zukauf, v.positionen_offen,
       v.positionen_nicht_im_plan, v.kosten_chf, v.naechster_bestellschluss, v.bestellschluesse_vorbei,
       v.aus_vorschlag, v.positionen_rezept, v.positionen_rezept_unvollstaendig, v.positionen_rezept_nicht_freigegeben
from saison s
cross join lateral public.einkauf_summe_von(
  array(select p from public.einkauf_position p where p.saison_id = s.id),
  array(select a from public.einkauf_artikel a where a.saison_id = s.id)
) v;

-- 3. Die ganze Einkaufsliste einer Saison ------------------------------------------------------------------------
-- Ohne p_saison die jüngste Saison (nach Name, wie bisher auf der Seite). Gibt es keine Saison, ist die Antwort null.
-- Antwort: summe (Zeile wie einkauf_summe), artikel (Zeilen wie einkauf_artikel, sortiert nach sortierung, artikel_id),
-- positionen (Zeilen wie einkauf_position, sortiert nach sortierung, komponente_id, einheit),
-- zutaten (zutaten, verknuepft aus einkauf_zutaten_stand).
create function public.einkauf_liste(p_saison uuid default null)
returns jsonb
language sql
stable
set search_path = public
as $$
  with s as (
    select sa.id, sa.name
    from saison sa
    where sa.id = coalesce(p_saison, (select j.id from saison j order by j.name desc limit 1))
  ), p as materialized (
    select p as z from einkauf_position p join s on p.saison_id = s.id
  ), a as materialized (
    select a as z from einkauf_artikel a join s on a.saison_id = s.id
  )
  select jsonb_build_object(
    'summe', (select to_jsonb(x) from (
                select s.id as saison_id, s.name as saison, v.*
                from einkauf_summe_von(array(select z from p), array(select z from a)) v) x),
    'artikel', coalesce((select jsonb_agg(to_jsonb(z) order by (z).sortierung, (z).artikel_id) from a), '[]'::jsonb),
    'positionen', coalesce((select jsonb_agg(to_jsonb(z) order by (z).sortierung, (z).komponente_id, (z).einheit) from p), '[]'::jsonb),
    'zutaten', (select jsonb_build_object('zutaten', e.zutaten, 'verknuepft', e.verknuepft)
                from einkauf_zutaten_stand e where e.saison_id = s.id)
  )
  from s;
$$;

comment on function public.einkauf_liste(uuid) is 'Einkauf: Summe, Artikelzeilen, Positionen und Zutaten-Zähler einer Saison in einer Antwort (ohne p_saison die jüngste Saison). Gleiche Werte wie die Views einkauf_summe, einkauf_artikel, einkauf_position und einkauf_zutaten_stand, aber der Unterbau wird nur einmal gerechnet.';

revoke execute on function public.einkauf_summe_von(public.einkauf_position[], public.einkauf_artikel[]) from public, anon;
revoke execute on function public.einkauf_liste(uuid) from public, anon;
grant execute on function public.einkauf_summe_von(public.einkauf_position[], public.einkauf_artikel[]) to authenticated;
grant execute on function public.einkauf_liste(uuid) to authenticated;
