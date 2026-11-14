-- Produktionsliste pro Spiel (Wunsch Dominik, 14.11.2026): Eine Menülinie gilt für mehrere Services
-- («Spiel 1 und 6»), geliefert wird aber an verschiedenen Tagen. Die Liste zeigt darum den Bedarf je Service.
-- Wie anlass_komponente_bedarf, aber eine Zeile pro Service, Gericht und Komponente, mit Datum und Anlieferung.
create view public.service_gericht_bedarf with (security_invoker = true) as
select s.id as service_id, s.name as service, s.reihenfolge, s.datum, s.datum - a.vorlauf_tage as anlieferung,
       l.anlass_id, l.id as menuelinie_id, l.name as menuelinie,
       mg.gang, mg.bezeichnung as gericht, mk.komponente_id, mk.bezeichnung as komponente,
       s.gaeste, mg.anteil, mk.menge_pro_gast, mk.einheit,
       round(s.gaeste * mg.anteil * mk.menge_pro_gast / case when mk.einheit = 'Stk' then 1 else 1000 end, 3) as menge_total,
       case mk.einheit when 'g' then 'kg' when 'ml' then 'l' else 'Stk' end as einheit_total
from service s
join anlass a on a.id = s.anlass_id
join menuelinie l on l.id = s.menuelinie_id
join menuelinie_gericht mg on mg.menuelinie_id = l.id
join menuelinie_komponente mk on mk.linie_gericht_id = mg.id;
