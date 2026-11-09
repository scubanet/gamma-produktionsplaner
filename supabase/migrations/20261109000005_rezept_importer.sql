-- Import der Rezeptbibliothek (rezepte.json, kompakt)
-- [slug, typ, name, untertitel, kategorie, quelle, portionen, portion_g, ergibt_g, [offene Punkte], [[komponente_slug, g_pro_portion]],
--  [[titel, [[zutat, menge_g, flags(1=Basis,2=Annahme), notiz]], [[text, gerät, temperatur, aktiv_min, unbeaufsichtigt_min, haccp, annahme]]]]]
create function importer.rezepte(d jsonb)
returns int language plpgsql set search_path = public as $$
declare r jsonb; g jsonb; z jsonb; s jsonb; rid uuid; gid uuid; gi int; zi int; si int; n int := 0;
begin
  insert into geraet (name)
  select distinct xs.v->>1 from jsonb_array_elements(d) xr(v), jsonb_array_elements(xr.v->11) xg(v), jsonb_array_elements(xg.v->2) xs(v)
  where xs.v->>1 is not null on conflict (name) do nothing;
  for r in select * from jsonb_array_elements(d) loop
    insert into rezept (slug, typ, name, untertitel, kategorie, quelle, basis_portionen, portion_g, ergibt_g)
    values (r->>0, (r->>1)::rezept_typ, r->>2, r->>3, r->>4, r->>5, (r->>6)::int, (r->>7)::numeric, (r->>8)::numeric)
    on conflict (slug) do nothing returning id into rid;
    continue when rid is null;
    n := n + 1;
    insert into offener_punkt (rezept_id, text) select rid, t from jsonb_array_elements_text(r->9) t;
    gi := 0;
    for g in select * from jsonb_array_elements(r->11) loop
      gi := gi + 1;
      insert into zutatengruppe (rezept_id, titel, reihenfolge) values (rid, g->>0, gi) returning id into gid;
      zi := 0;
      for z in select * from jsonb_array_elements(g->1) loop
        zi := zi + 1;
        insert into zutat (gruppe_id, bezeichnung, menge_g, ist_basis, annahme, notiz, reihenfolge)
        values (gid, z->>0, (z->>1)::numeric, ((z->>2)::int & 1) = 1, ((z->>2)::int & 2) = 2, z->>3, zi);
      end loop;
      si := 0;
      for s in select * from jsonb_array_elements(g->2) loop
        si := si + 1;
        insert into schritt (gruppe_id, text, reihenfolge, geraet_id, temperatur_c, aktiv_min, unbeaufsichtigt_min, haccp, annahme)
        values (gid, s->>0, si, (select id from geraet where name = s->>1), (s->>2)::numeric,
                coalesce((s->>3)::numeric, 0), coalesce((s->>4)::numeric, 0), s->>5, coalesce((s->>6)::boolean, false));
      end loop;
    end loop;
  end loop;
  insert into rezept_komponente (gericht_id, komponente_id, menge_pro_portion_g, reihenfolge)
  select rg.id, rk.id, (xc.c->>1)::numeric, xc.ord
  from jsonb_array_elements(d) xr(v)
  cross join lateral jsonb_array_elements(xr.v->10) with ordinality xc(c, ord)
  join rezept rg on rg.slug = xr.v->>0
  join rezept rk on rk.slug = xc.c->>0
  on conflict do nothing;
  return n;
end $$;
revoke all on function importer.rezepte(jsonb) from public, anon, authenticated;
