-- Produktionsliste als Checkliste: pro Komponente und Saison abhaken und eine zuständige Person eintragen.
-- Wunsch Dominik (10.11.2026). Erledigt gilt für die Komponente in der ganzen Saison (über alle Menülinien).
-- Abhaken pro Produktionswelle folgt bei Bedarf mit produktionswelle / welle_komponente.

create table public.produktion_aufgabe (
  saison_id     uuid not null references public.saison(id) on delete cascade,
  komponente_id uuid not null references public.komponente(id) on delete cascade,
  zustaendig    text check (zustaendig is null or (trim(zustaendig) <> '' and length(zustaendig) <= 80)),
  erledigt_am   timestamptz,
  erledigt_von  uuid references auth.users(id) on delete set null,
  geaendert_am  timestamptz not null default now(),
  geaendert_von uuid references auth.users(id) on delete set null default auth.uid(),
  primary key (saison_id, komponente_id)
);
comment on table public.produktion_aufgabe is 'Checkliste der Produktionsliste: zuständige Person und Erledigt-Status pro Komponente und Saison.';
create index on public.produktion_aufgabe (komponente_id);
create index on public.produktion_aufgabe (erledigt_von);
create index on public.produktion_aufgabe (geaendert_von);

-- Wer abhakt und wann geändert wurde, setzt die Datenbank, nicht die App.
create function public.produktion_aufgabe_stempel()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.geaendert_am := now();
  new.geaendert_von := auth.uid();
  if new.erledigt_am is null then
    new.erledigt_von := null;
  elsif tg_op = 'INSERT' or old.erledigt_am is null then
    new.erledigt_am := now();
    new.erledigt_von := auth.uid();
  else
    new.erledigt_am := old.erledigt_am;
    new.erledigt_von := old.erledigt_von;
  end if;
  new.zustaendig := nullif(trim(new.zustaendig), '');
  return new;
end;
$$;
revoke execute on function public.produktion_aufgabe_stempel() from public, anon, authenticated;

create trigger produktion_aufgabe_stempel
  before insert or update on public.produktion_aufgabe
  for each row execute function public.produktion_aufgabe_stempel();

alter table public.produktion_aufgabe enable row level security;
create policy pilot_angemeldet on public.produktion_aufgabe for all to authenticated using (true) with check (true);
