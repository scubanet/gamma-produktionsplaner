-- Systemzuteilung wird ab jetzt in der App gepflegt (Aufgabe 3).
-- Die Datenbank prüft die Werte, bevor sie gespeichert werden; die App zeigt die Meldung nur an.

-- Lagerung Tage: leer = Haltbarkeit aus der Produktion. 0 hätte keine Wirkung (der View
-- komponente_zuteilung übersteuert nur bei mehr als 0 Tagen), darum ab 1 Tag.
alter table public.komponente
  add constraint komponente_lager_tage_check check (lager_tage is null or lager_tage >= 1);

-- Produktion und Regeneration sind Arrays von Codes; ein Fremdschlüssel geht auf Arrays nicht,
-- darum ein Trigger gegen die Tabellen produktionssystem und regenerationsart.
-- TK ist Lagerung (lager_tk), kein Produktionssystem einer Komponente.
create or replace function public.komponente_codes_pruefen()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  unbekannt text;
begin
  if array_position(new.produktion, null) is not null or array_position(new.regeneration, null) is not null then
    raise exception 'Leerer Code in Produktion oder Regeneration' using errcode = '23514';
  end if;

  if 'TK' = any (new.produktion) then
    raise exception 'TK ist Lagerung, kein Produktionssystem: bitte unter Lagerung erfassen' using errcode = '23514';
  end if;

  select string_agg(c, ', ') into unbekannt
  from unnest(new.produktion) c
  where not exists (select 1 from produktionssystem p where p.code = c);
  if unbekannt is not null then
    raise exception 'Unbekanntes Produktionssystem: %', unbekannt using errcode = '23514';
  end if;

  select string_agg(c, ', ') into unbekannt
  from unnest(new.regeneration) c
  where not exists (select 1 from regenerationsart r where r.code = c);
  if unbekannt is not null then
    raise exception 'Unbekannte Regenerationsart: %', unbekannt using errcode = '23514';
  end if;

  if cardinality(new.produktion) <> (select count(distinct c) from unnest(new.produktion) c)
     or cardinality(new.regeneration) <> (select count(distinct c) from unnest(new.regeneration) c) then
    raise exception 'Ein Code ist doppelt erfasst' using errcode = '23514';
  end if;

  return new;
end
$$;

create trigger komponente_codes_pruefen
  before insert or update of produktion, regeneration on public.komponente
  for each row execute function public.komponente_codes_pruefen();
