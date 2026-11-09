-- Skalierung der Rezeptkarte (Aufgabe 4). Die App zeigt nur an; Faktor und Mengen rechnet die Datenbank.
-- Wert: bei Gerichten Portionen, bei Komponenten Chargen (1 Charge = ergibt_g).
-- Zeiten werden nicht skaliert: Arbeitszeit wächst nicht linear mit der Menge.

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
      else trim_scale(p_wert) || ' Charge(n) à ' || trim_scale(r.ergibt_g) || ' g = Faktor ' || trim_scale(p_wert)
    end
  from rezept r
  where r.id = p_rezept
    and p_wert > 0
    and (r.typ = 'komponente' or r.basis_portionen > 0);
$$;

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
         z.menge_g, round(z.menge_g * f.faktor, 1), z.skal_pct
  from zutat_skaliert z
  cross join public.rezept_faktor(p_rezept, p_wert) f
  where z.rezept_id = p_rezept;
$$;

-- Komponenten eines Gerichts (rezept_komponente): Menge für die gewählten Portionen und
-- wie viele Chargen der Komponente das sind.
create or replace function public.rezept_komponenten_skaliert(p_rezept uuid, p_wert numeric)
returns table (
  komponente_id uuid, name text, reihenfolge integer, menge_pro_portion_g numeric,
  menge_g numeric, ergibt_g numeric, chargen numeric
)
language sql
stable
set search_path = public
as $$
  select rk.komponente_id, k.name, rk.reihenfolge, rk.menge_pro_portion_g,
         round(rk.menge_pro_portion_g * f.portionen, 1),
         k.ergibt_g,
         round(rk.menge_pro_portion_g * f.portionen / nullif(k.ergibt_g, 0), 2)
  from rezept_komponente rk
  join rezept k on k.id = rk.komponente_id
  cross join public.rezept_faktor(p_rezept, p_wert) f
  where rk.gericht_id = p_rezept;
$$;
