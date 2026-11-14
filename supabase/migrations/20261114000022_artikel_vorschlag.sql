-- Hauptartikel schneller zuordnen (14.11.2026): Vorschläge aus der Preisliste nach Ähnlichkeit des Namens.
-- Die Datenbank schlägt nur vor; zugeordnet wird von Hand (Entscheid Dominik: Verknüpfungen macht er selbst).
-- pg_trgm ist eine Standard-Erweiterung von PostgreSQL (contrib) und auch im selbst gehosteten Supabase vorhanden.
create extension if not exists pg_trgm with schema extensions;

-- Komponenten der Saison ohne Hauptartikel, je mit den ähnlichsten aktiven Artikeln.
-- Ähnlichkeit 0–1: ganzer Name oder bestes Wortfenster im Artikelnamen (similarity / word_similarity).
-- Komponenten ohne Treffer erscheinen mit einer Zeile ohne Artikel, damit die Liste vollständig ist.
create function public.komponente_artikel_vorschlag(p_saison uuid, p_anzahl integer default 3, p_schwelle numeric default 0.5)
returns table (
  komponente_id uuid, komponente text, kategorie text, status text,
  rang integer, artikel_id uuid, artikel text, artikelnummer text, artikel_einheit text,
  preis_pro_einheit numeric, aehnlichkeit numeric
)
language sql
stable
set search_path = public, extensions
as $$
  with k as (
    select distinct p.komponente_id, p.komponente, p.kategorie, p.status
    from produktionsliste p
    join komponente c on c.id = p.komponente_id
    where p.saison_id = p_saison and c.hauptartikel_id is null
  )
  select k.komponente_id, k.komponente, k.kategorie, k.status,
         t.rang, t.id, t.name, t.artikelnummer, t.einheit, t.preis_pro_einheit, t.s
  from k
  left join lateral (
    select x.*, (row_number() over (order by x.s desc, x.name))::int as rang
    from (
      select a.id, a.name, a.artikelnummer, a.einheit, a.preis_pro_einheit,
             round(greatest(similarity(k.komponente, a.name), word_similarity(k.komponente, a.name))::numeric, 2) as s
      from artikel a
      where a.aktiv
    ) x
    where x.s >= p_schwelle
    order by x.s desc, x.name
    limit greatest(p_anzahl, 1)
  ) t on true;
$$;

revoke execute on function public.komponente_artikel_vorschlag(uuid, integer, numeric) from public, anon;
grant execute on function public.komponente_artikel_vorschlag(uuid, integer, numeric) to authenticated;
