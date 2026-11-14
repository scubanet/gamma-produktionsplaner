-- Rezept als Grundlage für Produktion, Logistik und Service (Entscheid Dominik, 14.11.2026).
-- Etappe 1: Die Angaben im Rezept erfassen. Die Berechnung pro Anlass folgt in einer eigenen Migration.
--   Schritt:  Rüstzeit (einmal) und Menge pro Durchgang (was das Gerät in einem Durchgang fasst).
--             aktiv_min und unbeaufsichtigt_min gelten pro Durchgang. Ohne Menge pro Durchgang ist ein Durchgang
--             eine Basis-Charge des Rezepts (wie bisher).
--   Rezept:   Gebinde (bei GAMMA die IFCO-Box, gekühlt und TK), Verpackung im Gebinde, Füllmenge pro Gebinde,
--             Aufwand für die Ausgabe im Service in Minuten pro 100 Portionen.
--   Lagerung und Regeneration bleiben in der Systemzuteilung der Komponente (massgebend); das Rezept zeigt sie
--   über die Verknüpfung komponente.rezept_id.

-- 1. Gebinde ---------------------------------------------------------------------
create table public.gebinde (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (btrim(name) <> ''),
  laenge_mm   integer check (laenge_mm > 0),
  breite_mm   integer check (breite_mm > 0),
  hoehe_mm    integer check (hoehe_mm > 0),
  tara_g      numeric(10,2) check (tara_g >= 0),
  volumen_l   numeric(10,2) check (volumen_l > 0),
  bemerkung   text,
  aktiv       boolean not null default true
);
comment on table public.gebinde is 'Transportgebinde (IFCO-Box usw.) mit Mass, Tara und Volumen für die Logistik.';
alter table public.gebinde enable row level security;
create policy pilot_angemeldet on public.gebinde for all to authenticated using (true) with check (true);

-- Mass, Tara und Volumen sind nicht bekannt und werden in den Stammdaten erfasst, nicht geschätzt.
insert into public.gebinde (name, bemerkung) values
  ('IFCO-Box', 'Standard bei GAMMA für gekühlte und TK-Produkte. Typ, Mass, Tara und Volumen noch erfassen.');

-- 2. Rezept und Schritt -------------------------------------------------------------
alter table public.rezept
  add column gebinde_id uuid references public.gebinde(id),
  add column verpackung text,
  add column fuellmenge_g numeric(12,2) check (fuellmenge_g > 0),
  add column service_min_pro_100 numeric(8,2) check (service_min_pro_100 >= 0),
  add column service_rolle text;
create index on public.rezept (gebinde_id);
comment on column public.rezept.fuellmenge_g is 'Menge des fertigen Produkts in einem Gebinde, in Gramm.';
comment on column public.rezept.service_min_pro_100 is 'Aufwand für Anrichten und Ausgabe vor Ort in Minuten pro 100 Portionen.';

alter table public.schritt
  add column ruest_min numeric(8,2) not null default 0 check (ruest_min >= 0),
  add column menge_pro_durchgang_g numeric(12,2) check (menge_pro_durchgang_g > 0);
comment on column public.schritt.ruest_min is 'Rüstzeit in Minuten, fällt einmal an, unabhängig von der Menge.';
comment on column public.schritt.menge_pro_durchgang_g is 'Menge in Gramm, die in einem Durchgang verarbeitet wird (Kapazität des Geräts). Leer = eine Basis-Charge.';

-- 3. rezept_speichern: neue Felder im Dokument ----------------------------------------
-- Wie Migration 18, dazu im Kopf gebinde_id, verpackung, fuellmenge_g, service_min_pro_100, service_rolle
-- und pro Schritt ort, rolle, ruest_min, menge_pro_durchgang_g.
create or replace function public.rezept_speichern(p_rezept uuid, p_geaendert_am timestamptz, p_daten jsonb)
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
    -- Planung (Migration 23). Fehlt ein Schlüssel im Dokument, bleibt der gespeicherte Wert.
    gebinde_id = case when p_daten ? 'gebinde_id' then (p_daten->>'gebinde_id')::uuid else gebinde_id end,
    verpackung = case when p_daten ? 'verpackung' then nullif(btrim(p_daten->>'verpackung'), '') else verpackung end,
    fuellmenge_g = case when p_daten ? 'fuellmenge_g' then (p_daten->>'fuellmenge_g')::numeric else fuellmenge_g end,
    service_min_pro_100 = case when p_daten ? 'service_min_pro_100' then (p_daten->>'service_min_pro_100')::numeric else service_min_pro_100 end,
    service_rolle = case when p_daten ? 'service_rolle' then nullif(btrim(p_daten->>'service_rolle'), '') else service_rolle end,
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
        insert into schritt (gruppe_id, text, reihenfolge, geraet_id, temperatur_c, aktiv_min, unbeaufsichtigt_min, haccp, annahme,
                             ort, rolle, ruest_min, menge_pro_durchgang_g)
        values (v_gid, btrim(s->>'text'), si, (s->>'geraet_id')::uuid, (s->>'temperatur_c')::numeric,
                coalesce((s->>'aktiv_min')::numeric, 0), coalesce((s->>'unbeaufsichtigt_min')::numeric, 0),
                nullif(btrim(s->>'haccp'), ''), coalesce((s->>'annahme')::boolean, false),
                nullif(btrim(s->>'ort'), ''), nullif(btrim(s->>'rolle'), ''),
                coalesce((s->>'ruest_min')::numeric, 0), (s->>'menge_pro_durchgang_g')::numeric)
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
          annahme = coalesce((s->>'annahme')::boolean, false),
          ort = case when s ? 'ort' then nullif(btrim(s->>'ort'), '') else ort end,
          rolle = case when s ? 'rolle' then nullif(btrim(s->>'rolle'), '') else rolle end,
          ruest_min = case when s ? 'ruest_min' then coalesce((s->>'ruest_min')::numeric, 0) else ruest_min end,
          menge_pro_durchgang_g = case when s ? 'menge_pro_durchgang_g' then (s->>'menge_pro_durchgang_g')::numeric else menge_pro_durchgang_g end
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

