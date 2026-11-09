-- Nachbesserung der Skalierung aus dem Review (Aufgabe 4). Migration 8 ist eingespielt und bleibt unverändert.

-- 1. Annahmen bei Ergibt-Menge und Portionen festhalten (Quelle: offene Punkte der Rezepte).
alter table public.rezept
  add column ergibt_annahme boolean not null default false,
  add column portionen_annahme boolean not null default false;

comment on column public.rezept.ergibt_annahme is 'Ergibt-Menge (ergibt_g) ist eine Annahme, siehe offene Punkte';
comment on column public.rezept.portionen_annahme is 'Basisportionen und Portionsgrösse sind eine Annahme, siehe offene Punkte';

-- «Ergibt-Menge fehlt; … angenommen», «Ergibt … angenommen»; Kuchenteig ist ein Platzhalter bis das Rezept vorliegt.
update public.rezept set ergibt_annahme = true where slug in ('sugo', 'sweetchili', 'shokupan', 'shiopan', 'kuchenteig');
-- «Portionen: … angenommen»
update public.rezept set portionen_annahme = true where slug in ('cheesecake', 'pate', 'meatloaf');

-- 2. Herleitung auch ohne ergibt_g (sonst wird der ganze Text null).
create or replace function public.rezept_faktor(p_rezept uuid, p_wert numeric)
returns table (faktor numeric, portionen numeric, chargen numeric, ergibt_g numeric, herleitung text)
language sql
stable
set search_path = public
as $$
  select
    case when r.typ = 'gericht' then p_wert / r.basis_portionen else p_wert end,
    case when r.typ = 'gericht' then p_wert end,
    case when r.typ = 'komponente' then p_wert end,
    case when r.typ = 'gericht' then p_wert * r.portion_g else p_wert * r.ergibt_g end,
    case when r.typ = 'gericht'
      then trim_scale(p_wert) || ' Portionen / ' || r.basis_portionen || ' Basisportionen = Faktor '
           || trim_scale(round(p_wert / r.basis_portionen, 3))
      else trim_scale(p_wert) || ' Charge(n) à ' || coalesce(trim_scale(r.ergibt_g) || ' g', '[Menge]')
           || ' = Faktor ' || trim_scale(p_wert)
    end
  from rezept r
  where r.id = p_rezept
    and p_wert > 0
    and (r.typ = 'komponente' or r.basis_portionen > 0);
$$;

-- 3. Zutaten bleiben sichtbar, auch wenn kein Faktor bestimmt werden kann (menge_g dann null).
--    Feinere Rundung: kleine Mengen (Gewürze, Gellan) dürfen nicht auf 0 fallen.
create or replace function public.rezept_zutaten_skaliert(p_rezept uuid, p_wert numeric)
returns table (
  id uuid, gruppe_id uuid, reihenfolge integer, bezeichnung text, notiz text,
  ist_basis boolean, annahme boolean, menge_basis_g numeric, menge_g numeric, skal_pct numeric
)
language sql
stable
set search_path = public
as $$
  select z.id, z.gruppe_id, z.reihenfolge, z.bezeichnung, z.notiz, z.ist_basis, z.annahme,
         z.menge_g, round(z.menge_g * f.faktor, 3), z.skal_pct
  from zutat_skaliert z
  left join lateral public.rezept_faktor(p_rezept, p_wert) f on true
  where z.rezept_id = p_rezept;
$$;

-- 4. Komponenten mit Herleitung und Annahme-Kennzeichen der Chargenmenge.
--    Rückgabetyp ändert sich, darum neu anlegen.
drop function public.rezept_komponenten_skaliert(uuid, numeric);

create function public.rezept_komponenten_skaliert(p_rezept uuid, p_wert numeric)
returns table (
  komponente_id uuid, name text, reihenfolge integer, menge_pro_portion_g numeric,
  menge_g numeric, ergibt_g numeric, chargen numeric, ergibt_annahme boolean, herleitung text
)
language sql
stable
set search_path = public
as $$
  select rk.komponente_id, k.name, rk.reihenfolge, rk.menge_pro_portion_g,
         round(rk.menge_pro_portion_g * f.portionen, 3),
         k.ergibt_g,
         round(rk.menge_pro_portion_g * f.portionen / nullif(k.ergibt_g, 0), 2),
         k.ergibt_annahme,
         trim_scale(rk.menge_pro_portion_g) || ' g × ' || trim_scale(f.portionen) || ' Portionen = '
           || trim_scale(round(rk.menge_pro_portion_g * f.portionen, 3)) || ' g; '
           || coalesce(trim_scale(round(rk.menge_pro_portion_g * f.portionen, 3)) || ' g / '
                       || trim_scale(nullif(k.ergibt_g, 0)) || ' g je Charge = '
                       || trim_scale(round(rk.menge_pro_portion_g * f.portionen / nullif(k.ergibt_g, 0), 2)) || ' Chargen',
                       'Chargenmenge [Menge]')
  from rezept_komponente rk
  join rezept k on k.id = rk.komponente_id
  cross join public.rezept_faktor(p_rezept, p_wert) f
  where rk.gericht_id = p_rezept;
$$;
