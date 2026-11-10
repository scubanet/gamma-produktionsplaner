-- Rezept in der App vollständig pflegen: Kopf, Gruppen, Zutaten und Schritte ändern, hinzufügen, löschen; neues Rezept anlegen.
-- rezept_speichern nimmt das Rezept als ein jsonb-Dokument. Neue Felder brauchen damit keine neue Signatur mehr.
-- Ersetzt die Fassung aus Migration 17.

drop function public.rezept_speichern(uuid, timestamptz, text, text, rezept_typ, text, integer, numeric, numeric, text, boolean, boolean, jsonb, uuid, uuid[]);

-- Wertebereiche für Schritte. Bestehende Daten geprüft am 10.11.2026: keine Zeile verletzt die Regeln.
alter table public.schritt
  add constraint schritt_aktiv_min_check check (aktiv_min >= 0),
  add constraint schritt_unbeaufsichtigt_min_check check (unbeaufsichtigt_min >= 0);

-- Adresse (Slug) aus dem Namen: Kleinbuchstaben, Umlaute ausgeschrieben, alles andere als Bindestrich.
create function public.rezept_slug(p_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(nullif(trim(both '-' from regexp_replace(
    translate(
      replace(replace(replace(replace(lower(p_name), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
      'àáâãåçèéêëìíîïñòóôõùúûýÿ', 'aaaaaceeeeiiiinoooouuuyy'),
    '[^a-z0-9]+', '-', 'g')), ''), 'rezept');
$$;

-- p_rezept null = neues Rezept. p_geaendert_am = Stand, den die App geladen hat (bei neuem Rezept null).
-- p_daten:
--   name, untertitel, quelle, typ, kategorie, basis_portionen, portion_g, ergibt_g, chargengroesse, besonderes,
--   portionen_annahme, ergibt_annahme,
--   gruppen: [{id?, titel,
--              zutaten:  [{id?, bezeichnung, menge_g, annahme, notiz, ist_basis}],
--              schritte: [{id?, text, geraet_id, temperatur_c, aktiv_min, unbeaufsichtigt_min, haccp, annahme}]}],
--   erledigt: [uuid der offenen Punkte]
-- Das Dokument ist vollständig: Gruppen, Zutaten und Schritte, die fehlen, werden gelöscht. Die Reihenfolge ist die des Dokuments.
-- Einträge mit id werden geändert (Verknüpfungen zu Artikel und Komponente bleiben), Einträge ohne id neu angelegt.
create function public.rezept_speichern(p_rezept uuid, p_geaendert_am timestamptz, p_daten jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  alt rezept%rowtype;
  v_id uuid := p_rezept;
  v_typ rezept_typ := (p_daten->>'typ')::rezept_typ;
  v_name text := nullif(btrim(p_daten->>'name'), '');
  v_slug text;
  v_basis text;
  v_n integer;
  neu timestamptz := clock_timestamp();
  g jsonb; z jsonb; s jsonb;
  gi integer := 0; zi integer; si integer;
  v_gid uuid; v_zid uuid; v_sid uuid;
  g_ids uuid[] := '{}'; z_ids uuid[] := '{}'; s_ids uuid[] := '{}';
  basis_anzahl integer := 0;
begin
  if v_name is null then
    raise exception 'Das Rezept braucht einen Namen.';
  end if;
  if v_typ is null then
    raise exception 'Der Typ (Gericht oder Komponente) fehlt.';
  end if;

  if v_id is null then
    -- Neues Rezept: freie Adresse suchen.
    v_basis := rezept_slug(v_name);
    v_slug := v_basis;
    v_n := 1;
    while exists (select 1 from rezept where slug = v_slug) loop
      v_n := v_n + 1;
      v_slug := v_basis || '-' || v_n;
    end loop;
    -- Basisportionen gleich mitgeben: ein Gericht ohne Basisportionen lässt die Tabelle nicht zu.
    insert into rezept (slug, typ, name, basis_portionen)
    values (v_slug, v_typ, v_name, (p_daten->>'basis_portionen')::integer) returning id into v_id;
  else
    select * into alt from rezept where id = v_id for update;
    if not found then
      raise exception 'Rezept nicht gefunden';
    end if;
    if alt.geaendert_am is distinct from p_geaendert_am then
      raise exception 'Das Rezept wurde inzwischen geändert. Bitte neu laden und die Änderung erneut eingeben.' using errcode = '40001';
    end if;
    v_slug := alt.slug;
    -- Typ wechseln nur, wenn keine Verknüpfung dagegen spricht.
    if v_typ = 'gericht' and alt.typ = 'komponente' and (
         exists (select 1 from rezept_komponente where komponente_id = v_id)
         or exists (select 1 from zutat where komponente_id = v_id)) then
      raise exception 'Typ nicht geändert: Das Rezept wird in einem Gericht als Komponente verwendet.';
    end if;
    if v_typ = 'komponente' and alt.typ = 'gericht' and exists (select 1 from rezept_komponente where gericht_id = v_id) then
      raise exception 'Typ nicht geändert: Das Gericht hat eigene Komponenten.';
    end if;
  end if;

  update rezept set
    name = v_name,
    untertitel = nullif(btrim(p_daten->>'untertitel'), ''),
    quelle = nullif(btrim(p_daten->>'quelle'), ''),
    typ = v_typ,
    kategorie = nullif(btrim(p_daten->>'kategorie'), ''),
    basis_portionen = (p_daten->>'basis_portionen')::integer,
    portion_g = (p_daten->>'portion_g')::numeric,
    ergibt_g = (p_daten->>'ergibt_g')::numeric,
    chargengroesse = nullif(btrim(p_daten->>'chargengroesse'), ''),
    besonderes = nullif(btrim(p_daten->>'besonderes'), ''),
    -- Eine Annahme kann nur an einem vorhandenen Wert hängen.
    portionen_annahme = coalesce((p_daten->>'portionen_annahme')::boolean, false) and (p_daten->>'basis_portionen') is not null,
    ergibt_annahme = coalesce((p_daten->>'ergibt_annahme')::boolean, false) and (p_daten->>'ergibt_g') is not null,
    geaendert_am = neu
  where id = v_id;

  for g in select value from jsonb_array_elements(coalesce(p_daten->'gruppen', '[]'::jsonb)) with ordinality order by ordinality loop
    gi := gi + 1;
    v_gid := (g->>'id')::uuid;
    if v_gid is null then
      insert into zutatengruppe (rezept_id, titel, reihenfolge)
      values (v_id, nullif(btrim(g->>'titel'), ''), gi) returning id into v_gid;
    else
      update zutatengruppe set titel = nullif(btrim(g->>'titel'), ''), reihenfolge = gi
      where id = v_gid and rezept_id = v_id;
      if not found then
        raise exception 'Nicht gespeichert: Eine Gruppe gehört nicht zu diesem Rezept.';
      end if;
    end if;
    if v_gid = any(g_ids) then
      raise exception 'Nicht gespeichert: Eine Gruppe kommt doppelt vor.';
    end if;
    g_ids := g_ids || v_gid;

    zi := 0;
    for z in select value from jsonb_array_elements(coalesce(g->'zutaten', '[]'::jsonb)) with ordinality order by ordinality loop
      zi := zi + 1;
      if nullif(btrim(z->>'bezeichnung'), '') is null then
        raise exception 'Nicht gespeichert: Eine Zutat hat keine Bezeichnung.';
      end if;
      if coalesce((z->>'ist_basis')::boolean, false) then
        basis_anzahl := basis_anzahl + 1;
        if (z->>'menge_g') is null then
          raise exception 'Basiszutat nicht gesetzt: Sie hat keine Menge in Gramm.';
        end if;
      end if;
      v_zid := (z->>'id')::uuid;
      if v_zid is null then
        insert into zutat (gruppe_id, bezeichnung, menge_g, ist_basis, annahme, notiz, reihenfolge)
        values (v_gid, btrim(z->>'bezeichnung'), (z->>'menge_g')::numeric, coalesce((z->>'ist_basis')::boolean, false),
                coalesce((z->>'annahme')::boolean, false) and (z->>'menge_g') is not null, nullif(btrim(z->>'notiz'), ''), zi)
        returning id into v_zid;
      else
        update zutat set
          gruppe_id = v_gid,
          bezeichnung = btrim(z->>'bezeichnung'),
          menge_g = (z->>'menge_g')::numeric,
          ist_basis = coalesce((z->>'ist_basis')::boolean, false),
          annahme = coalesce((z->>'annahme')::boolean, false) and (z->>'menge_g') is not null,
          notiz = nullif(btrim(z->>'notiz'), ''),
          reihenfolge = zi
        where id = v_zid and gruppe_id in (select id from zutatengruppe where rezept_id = v_id);
        if not found then
          raise exception 'Nicht gespeichert: Eine Zutat gehört nicht zu diesem Rezept.';
        end if;
      end if;
      if v_zid = any(z_ids) then
        raise exception 'Nicht gespeichert: Eine Zutat kommt doppelt vor.';
      end if;
      z_ids := z_ids || v_zid;
    end loop;

    si := 0;
    for s in select value from jsonb_array_elements(coalesce(g->'schritte', '[]'::jsonb)) with ordinality order by ordinality loop
      si := si + 1;
      if nullif(btrim(s->>'text'), '') is null then
        raise exception 'Nicht gespeichert: Ein Schritt hat keinen Text.';
      end if;
      v_sid := (s->>'id')::uuid;
      if v_sid is null then
        insert into schritt (gruppe_id, text, reihenfolge, geraet_id, temperatur_c, aktiv_min, unbeaufsichtigt_min, haccp, annahme)
        values (v_gid, btrim(s->>'text'), si, (s->>'geraet_id')::uuid, (s->>'temperatur_c')::numeric,
                coalesce((s->>'aktiv_min')::numeric, 0), coalesce((s->>'unbeaufsichtigt_min')::numeric, 0),
                nullif(btrim(s->>'haccp'), ''), coalesce((s->>'annahme')::boolean, false))
        returning id into v_sid;
      else
        update schritt set
          gruppe_id = v_gid,
          text = btrim(s->>'text'),
          reihenfolge = si,
          geraet_id = (s->>'geraet_id')::uuid,
          temperatur_c = (s->>'temperatur_c')::numeric,
          aktiv_min = coalesce((s->>'aktiv_min')::numeric, 0),
          unbeaufsichtigt_min = coalesce((s->>'unbeaufsichtigt_min')::numeric, 0),
          haccp = nullif(btrim(s->>'haccp'), ''),
          annahme = coalesce((s->>'annahme')::boolean, false)
        where id = v_sid and gruppe_id in (select id from zutatengruppe where rezept_id = v_id);
        if not found then
          raise exception 'Nicht gespeichert: Ein Schritt gehört nicht zu diesem Rezept.';
        end if;
      end if;
      if v_sid = any(s_ids) then
        raise exception 'Nicht gespeichert: Ein Schritt kommt doppelt vor.';
      end if;
      s_ids := s_ids || v_sid;
    end loop;
  end loop;

  if basis_anzahl > 1 then
    raise exception 'Nicht gespeichert: Es gibt mehr als eine Basiszutat.';
  end if;

  -- Was im Dokument fehlt, wird gelöscht (zuerst Zutaten und Schritte, dann leere Gruppen).
  delete from zutat where gruppe_id in (select id from zutatengruppe where rezept_id = v_id) and id <> all(z_ids);
  delete from schritt where gruppe_id in (select id from zutatengruppe where rezept_id = v_id) and id <> all(s_ids);
  delete from zutatengruppe where rezept_id = v_id and id <> all(g_ids);

  update offener_punkt set erledigt = true
  where rezept_id = v_id
    and id in (select x::uuid from jsonb_array_elements_text(coalesce(p_daten->'erledigt', '[]'::jsonb)) x);

  return jsonb_build_object('id', v_id, 'slug', v_slug, 'geaendert_am', neu);
end
$$;

revoke execute on function public.rezept_slug(text) from public, anon;
grant execute on function public.rezept_slug(text) to authenticated;
revoke execute on function public.rezept_speichern(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.rezept_speichern(uuid, timestamptz, jsonb) to authenticated;

comment on function public.rezept_speichern(uuid, timestamptz, jsonb) is
  'Rezept aus der App speichern oder neu anlegen: Kopf, Gruppen, Zutaten, Schritte als ein Dokument. Prüft den geladenen Stand (geaendert_am).';
