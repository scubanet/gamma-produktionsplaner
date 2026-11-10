-- Rezept in der App pflegen: Typ, Basis (Portionen bzw. Ergibt-Menge), Mengen in Gramm, Basiszutat, offene Punkte.
-- Alles in einer Funktion, damit ein Rezept ganz oder gar nicht gespeichert wird.

-- 1. Wertebereiche. Leer bleibt erlaubt (Platzhalter in der App), 0 und negative Werte nicht.
--    Bestehende Daten geprüft am 10.11.2026: keine Zeile verletzt die Regeln.
alter table public.rezept
  add constraint rezept_basis_portionen_check check (basis_portionen > 0),
  -- Ein Gericht skaliert nach Portionen und braucht darum Basisportionen.
  add constraint rezept_gericht_portionen_check check (typ <> 'gericht' or basis_portionen is not null),
  add constraint rezept_portion_g_check check (portion_g > 0),
  add constraint rezept_ergibt_g_check check (ergibt_g > 0);
alter table public.zutat
  add constraint zutat_menge_g_check check (menge_g > 0);

-- 2. Speichern. p_zutaten: [{"id": uuid, "menge_g": Zahl oder null, "annahme": true/false}], nur geänderte Zutaten.
--    p_geaendert_am: Stand, den die App geladen hat; weicht er ab, hat jemand anderes inzwischen gespeichert.
create function public.rezept_speichern(
  p_rezept uuid,
  p_geaendert_am timestamptz,
  p_typ rezept_typ,
  p_kategorie text,
  p_basis_portionen integer,
  p_portion_g numeric,
  p_ergibt_g numeric,
  p_chargengroesse text,
  p_portionen_annahme boolean,
  p_ergibt_annahme boolean,
  p_zutaten jsonb,
  p_basis_zutat uuid,
  p_erledigt uuid[]
)
returns timestamptz
language plpgsql
set search_path = public
as $$
declare
  alt rezept%rowtype;
  n integer;
  neu timestamptz := clock_timestamp();
begin
  select * into alt from rezept where id = p_rezept for update;
  if not found then
    raise exception 'Rezept nicht gefunden';
  end if;
  if alt.geaendert_am is distinct from p_geaendert_am then
    raise exception 'Das Rezept wurde inzwischen geändert. Bitte neu laden und die Änderung erneut eingeben.' using errcode = '40001';
  end if;

  -- Typ wechseln nur, wenn keine Verknüpfung dagegen spricht.
  if p_typ = 'gericht' and alt.typ = 'komponente' and (
       exists (select 1 from rezept_komponente where komponente_id = p_rezept)
       or exists (select 1 from zutat where komponente_id = p_rezept)) then
    raise exception 'Typ nicht geändert: Das Rezept wird in einem Gericht als Komponente verwendet.';
  end if;
  if p_typ = 'komponente' and alt.typ = 'gericht' and exists (select 1 from rezept_komponente where gericht_id = p_rezept) then
    raise exception 'Typ nicht geändert: Das Gericht hat eigene Komponenten.';
  end if;

  update rezept set
    typ = p_typ,
    kategorie = nullif(btrim(p_kategorie), ''),
    basis_portionen = p_basis_portionen,
    portion_g = p_portion_g,
    ergibt_g = p_ergibt_g,
    chargengroesse = nullif(btrim(p_chargengroesse), ''),
    -- Eine Annahme kann nur an einem vorhandenen Wert hängen.
    portionen_annahme = coalesce(p_portionen_annahme, false) and p_basis_portionen is not null,
    ergibt_annahme = coalesce(p_ergibt_annahme, false) and p_ergibt_g is not null,
    geaendert_am = neu
  where id = p_rezept;

  -- Mengen: nur Zutaten dieses Rezepts.
  update zutat z set
    menge_g = (x.v->>'menge_g')::numeric,
    annahme = coalesce((x.v->>'annahme')::boolean, false) and (x.v->>'menge_g') is not null
  from jsonb_array_elements(coalesce(p_zutaten, '[]'::jsonb)) x(v)
  join zutatengruppe g on g.rezept_id = p_rezept
  where z.id = (x.v->>'id')::uuid and z.gruppe_id = g.id;
  get diagnostics n = row_count;
  if n <> jsonb_array_length(coalesce(p_zutaten, '[]'::jsonb)) then
    raise exception 'Nicht gespeichert: Eine Zutat gehört nicht zu diesem Rezept oder kommt doppelt vor.';
  end if;

  -- Basiszutat: genau eine oder keine; sie braucht eine Menge, sonst gibt es keine Prozentwerte.
  if p_basis_zutat is not null and not exists (
       select 1 from zutat z join zutatengruppe g on g.id = z.gruppe_id
       where z.id = p_basis_zutat and g.rezept_id = p_rezept and z.menge_g is not null) then
    raise exception 'Basiszutat nicht gesetzt: Sie gehört nicht zu diesem Rezept oder hat keine Menge in Gramm.';
  end if;
  update zutat z set ist_basis = (z.id is not distinct from p_basis_zutat)
  from zutatengruppe g
  where g.id = z.gruppe_id and g.rezept_id = p_rezept
    and z.ist_basis is distinct from (z.id is not distinct from p_basis_zutat);

  update offener_punkt set erledigt = true
  where rezept_id = p_rezept and id = any(coalesce(p_erledigt, '{}'::uuid[]));

  return neu;
end
$$;

revoke execute on function public.rezept_speichern(uuid, timestamptz, rezept_typ, text, integer, numeric, numeric, text, boolean, boolean, jsonb, uuid, uuid[]) from public, anon;
grant execute on function public.rezept_speichern(uuid, timestamptz, rezept_typ, text, integer, numeric, numeric, text, boolean, boolean, jsonb, uuid, uuid[]) to authenticated;

comment on function public.rezept_speichern(uuid, timestamptz, rezept_typ, text, integer, numeric, numeric, text, boolean, boolean, jsonb, uuid, uuid[]) is
  'Rezept aus der App speichern: Kopf, Mengen in Gramm, Basiszutat, erledigte offene Punkte. Prüft den geladenen Stand (geaendert_am).';
