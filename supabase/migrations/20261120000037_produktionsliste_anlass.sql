-- Produktionsliste pro Anlass (20.11.2026, Plan Datenkette, Aufgabe 6).
-- Entscheid Dominik (20.11.2026): Die Wahl des Anlasses filtert die Mengen; Wellen bleiben für die Saison.
-- Gleiche Spalten wie produktionsliste (Migration 03, 26), dazu anlass_id. Menge = Bedarf dieses Anlasses;
-- Haltbarkeit kommt aus der Systemzuteilung, Wellen und Start aus der Saison (eine Welle bedient mehrere Anlässe).
create view public.produktionsliste_anlass with (security_invoker = true) as
with bedarf as (
  select b.anlass_id, a.saison_id, b.komponente_id, b.einheit_total,
         case when count(*) filter (where b.menge_total is null) = 0 then sum(b.menge_total) end as menge_total,
         count(*) filter (where b.menge_total is null) as zeilen_ohne_menge
  from anlass_komponente_bedarf b
  join anlass a on a.id = b.anlass_id
  where b.komponente_id is not null
  group by b.anlass_id, a.saison_id, b.komponente_id, b.einheit_total
)
select b.anlass_id, b.saison_id, k.kategorie, k.name as komponente, k.status, b.menge_total, b.einheit_total,
       k.haltbarkeit_tage, p.wellen, p.start_ab, k.id as komponente_id, b.zeilen_ohne_menge
from bedarf b
join komponente_zuteilung k on k.id = b.komponente_id
left join produktionsliste p on p.saison_id = b.saison_id and p.komponente_id = b.komponente_id and p.einheit_total = b.einheit_total;

comment on view public.produktionsliste_anlass is 'Produktionsliste pro Anlass: Menge aus dem Bedarf des Anlasses; Wellen und Start aus der Saison (produktionsliste).';

grant select on public.produktionsliste_anlass to authenticated;
