-- Leitstand: Stand der Checkliste pro Saison und Welle.
--   welle_nr = 0: Komponenten ohne Welle (Zukauf, offen, nur vor Ort), siehe Migration 21.
-- Die App zeigt an, gezählt wird hier.
create view public.leitstand_wellen with (security_invoker = true) as
select saison_id, welle_nr, count(*)::int as aufgaben, count(erledigt_am)::int as erledigt
from public.produktion_checkliste
group by saison_id, welle_nr;

comment on view public.leitstand_wellen is 'Leitstand: Anzahl Aufgaben und erledigte Aufgaben der Checkliste pro Saison und Welle (welle_nr 0 = ohne Welle).';
