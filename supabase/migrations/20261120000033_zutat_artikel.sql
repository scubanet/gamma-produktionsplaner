-- Zutaten mit Artikeln verknüpfen (20.11.2026, Plan Datenkette, Aufgabe 2).
-- zutat.artikel_id gibt es seit Migration 01; eine Seite zum Verknüpfen fehlte. Die Datenbank schlägt nur vor,
-- verknüpft wird von Hand (Entscheid Dominik). Eine Zeile pro Bezeichnung: «Salz» steht in vielen Rezepten und
-- wird einmal entschieden. Zutaten, die auf eine Komponente zeigen (Unterrezept), bekommen keinen Artikel.

-- Rezepte, die im Bedarf der Saison stehen: Rezepte der Komponenten der Produktionsliste und deren Unterrezepte.
create function public.saison_rezepte(p_saison uuid)
returns setof uuid
language sql
stable
set search_path = public
as $$
  with recursive rz as (
      select distinct c.rezept_id
      from produktionsliste p
      join komponente c on c.id = p.komponente_id
      where p.saison_id = p_saison and c.rezept_id is not null
    union
      select c.rezept_id
      from rz
      join zutatengruppe g on g.rezept_id = rz.rezept_id
      join zutat z on z.gruppe_id = g.id and z.komponente_id is not null
      join komponente c on c.id = z.komponente_id
      where c.rezept_id is not null
  )
  select rezept_id from rz;
$$;

comment on function public.saison_rezepte(uuid) is 'Rezepte im Bedarf einer Saison: Rezepte der Komponenten der Produktionsliste, samt Unterrezepten.';

-- Offene Bezeichnungen der Saison, je mit den ähnlichsten aktiven Artikeln (wie komponente_artikel_vorschlag, Migration 22).
-- schluessel = Bezeichnung in Kleinbuchstaben ohne Rand; anzahl = Zutaten der Saison, weitere = gleiche Bezeichnung in
-- Rezepten ausserhalb der Saison. Bezeichnungen ohne Treffer erscheinen mit einer Zeile ohne Artikel.
create function public.zutat_artikel_vorschlag(p_saison uuid, p_anzahl integer default 3, p_schwelle numeric default 0.5)
returns table (
  schluessel text, bezeichnung text, anzahl integer, rezepte_anzahl integer, rezepte text[], weitere integer,
  rang integer, artikel_id uuid, artikel text, artikelnummer text, artikel_einheit text,
  preis_pro_einheit numeric, aehnlichkeit numeric
)
language sql
stable
set search_path = public, extensions
as $$
  with zs as (
    select z.id, lower(btrim(z.bezeichnung)) as schluessel, z.bezeichnung, r.name as rezept
    from saison_rezepte(p_saison) s(rezept_id)
    join rezept r on r.id = s.rezept_id
    join zutatengruppe g on g.rezept_id = r.id
    join zutat z on z.gruppe_id = g.id
    where z.artikel_id is null and z.komponente_id is null and btrim(z.bezeichnung) <> ''
  ),
  offen as (
    select zs.schluessel, min(zs.bezeichnung) as bezeichnung, count(*)::int as anzahl,
           count(distinct zs.rezept)::int as rezepte_anzahl,
           (array_agg(distinct zs.rezept order by zs.rezept))[1:5] as rezepte,
           array_agg(zs.id) as ids
    from zs
    group by zs.schluessel
  )
  select o.schluessel, o.bezeichnung, o.anzahl, o.rezepte_anzahl, o.rezepte,
         (select count(*) from zutat w
          where w.artikel_id is null and w.komponente_id is null
            and lower(btrim(w.bezeichnung)) = o.schluessel and not (w.id = any (o.ids)))::int as weitere,
         t.rang, t.id, t.name, t.artikelnummer, t.einheit, t.preis_pro_einheit, t.s
  from offen o
  left join lateral (
    select x.*, (row_number() over (order by x.s desc, x.name))::int as rang
    from (
      select a.id, a.name, a.artikelnummer, a.einheit, a.preis_pro_einheit,
             round(greatest(similarity(o.bezeichnung, a.name), word_similarity(o.bezeichnung, a.name))::numeric, 2) as s
      from artikel a
      where a.aktiv
    ) x
    where x.s >= p_schwelle
    order by x.s desc, x.name
    limit greatest(p_anzahl, 1)
  ) t on true;
$$;

-- Verknüpfte Bezeichnungen der Saison, zum Kontrollieren und Lösen.
create function public.zutat_artikel_verknuepft(p_saison uuid)
returns table (schluessel text, bezeichnung text, artikel_id uuid, artikel text, artikel_einheit text, preis_pro_einheit numeric, anzahl integer, rezepte_anzahl integer)
language sql
stable
set search_path = public
as $$
  select lower(btrim(z.bezeichnung)), min(z.bezeichnung), a.id, a.name, a.einheit, a.preis_pro_einheit,
         count(*)::int, count(distinct g.rezept_id)::int
  from saison_rezepte(p_saison) s(rezept_id)
  join zutatengruppe g on g.rezept_id = s.rezept_id
  join zutat z on z.gruppe_id = g.id
  join artikel a on a.id = z.artikel_id
  where z.komponente_id is null
  group by lower(btrim(z.bezeichnung)), a.id, a.name, a.einheit, a.preis_pro_einheit;
$$;

-- Eine Bezeichnung mit einem Artikel verknüpfen: alle offenen Zutaten der Saison mit dieser Bezeichnung,
-- mit p_weitere auch die in Rezepten ausserhalb der Saison. Bestehende Verknüpfungen bleiben unberührt.
-- Antwort: Anzahl verknüpfter Zutaten.
create function public.zutat_artikel_zuordnen(p_saison uuid, p_schluessel text, p_artikel uuid, p_weitere boolean default false)
returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  if not exists (select 1 from artikel a where a.id = p_artikel and a.aktiv) then
    raise exception 'Artikel nicht gefunden oder nicht mehr aktiv.' using errcode = 'P0002';
  end if;
  update zutat z
  set artikel_id = p_artikel
  where z.artikel_id is null
    and z.komponente_id is null
    and lower(btrim(z.bezeichnung)) = p_schluessel
    and (p_weitere or exists (
      select 1 from zutatengruppe g
      where g.id = z.gruppe_id and g.rezept_id in (select saison_rezepte(p_saison))));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Verknüpfung einer Bezeichnung mit einem Artikel lösen, in allen Rezepten. Antwort: Anzahl gelöster Zutaten.
create function public.zutat_artikel_loesen(p_schluessel text, p_artikel uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  update zutat z
  set artikel_id = null
  where z.artikel_id = p_artikel and lower(btrim(z.bezeichnung)) = p_schluessel;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Zähler für den Einkauf: Zutaten der Saison und davon mit Artikel (ohne Unterrezepte).
create view public.einkauf_zutaten_stand with (security_invoker = true) as
select s.id as saison_id, count(z.id)::int as zutaten, count(z.artikel_id)::int as verknuepft
from saison s
left join lateral public.saison_rezepte(s.id) r(rezept_id) on true
left join public.zutatengruppe g on g.rezept_id = r.rezept_id
left join public.zutat z on z.gruppe_id = g.id and z.komponente_id is null
group by s.id;

comment on view public.einkauf_zutaten_stand is 'Einkauf: Anzahl Zutaten in den Rezepten der Saison und davon mit Artikel verknüpft (ohne Zutaten, die ein Unterrezept sind).';

revoke execute on function public.saison_rezepte(uuid) from public, anon;
revoke execute on function public.zutat_artikel_vorschlag(uuid, integer, numeric) from public, anon;
revoke execute on function public.zutat_artikel_verknuepft(uuid) from public, anon;
revoke execute on function public.zutat_artikel_zuordnen(uuid, text, uuid, boolean) from public, anon;
revoke execute on function public.zutat_artikel_loesen(text, uuid) from public, anon;
grant execute on function public.saison_rezepte(uuid) to authenticated;
grant execute on function public.zutat_artikel_vorschlag(uuid, integer, numeric) to authenticated;
grant execute on function public.zutat_artikel_verknuepft(uuid) to authenticated;
grant execute on function public.zutat_artikel_zuordnen(uuid, text, uuid, boolean) to authenticated;
grant execute on function public.zutat_artikel_loesen(text, uuid) to authenticated;
grant select on public.einkauf_zutaten_stand to authenticated;
