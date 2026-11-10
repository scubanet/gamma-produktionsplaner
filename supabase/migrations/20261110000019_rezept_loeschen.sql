-- Rezepte löschen, aber nur durch Administratoren.
-- Entscheid Dominik (10.11.2026): Admin-Liste; verknüpfte Rezepte werden nicht gelöscht; Löschen ist endgültig.
-- Die Admin-Liste ist bewusst klein gehalten und lässt sich später ins Rollenkonzept überführen.

-- 1. Admin-Liste. Gepflegt wird sie per Migration bzw. SQL, nicht über die App.
create table public.app_admin (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  bemerkung   text,
  erstellt_am timestamptz not null default now()
);
comment on table public.app_admin is 'Benutzer mit Admin-Rechten (z.B. Rezepte löschen). Pflege per Migration oder SQL.';

alter table public.app_admin enable row level security;
-- Jeder sieht nur, ob er selbst Admin ist. Kein Schreiben über die API.
create policy app_admin_eigene_zeile on public.app_admin
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.app_admin from anon;
revoke insert, update, delete, truncate on public.app_admin from authenticated;

-- Erster Admin: der bisher einzige Benutzer des Pilots (Dominik).
insert into public.app_admin (user_id, bemerkung)
select id, 'Erster Admin (Pilot)' from auth.users order by created_at limit 1;

create function public.ist_admin()
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from app_admin where user_id = (select auth.uid()));
$$;
revoke execute on function public.ist_admin() from public, anon;
grant execute on function public.ist_admin() to authenticated;

-- 2. Rezept: lesen, anlegen und ändern wie bisher für alle Angemeldeten, löschen nur für Admins.
--    Ersetzt die Pilot-Policy «für alles» auf dieser einen Tabelle.
drop policy pilot_angemeldet on public.rezept;
create policy rezept_lesen on public.rezept for select to authenticated using (true);
create policy rezept_anlegen on public.rezept for insert to authenticated with check (true);
create policy rezept_aendern on public.rezept for update to authenticated using (true) with check (true);
create policy rezept_loeschen_admin on public.rezept for delete to authenticated using ((select public.ist_admin()));

-- 3. Löschen mit Prüfung der Verknüpfungen. Zutatengruppen, Zutaten, Schritte und offene Punkte gehen mit (on delete cascade).
create function public.rezept_loeschen(p_rezept uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_name text;
  v_wo text;
begin
  if not ist_admin() then
    raise exception 'Nur Administratoren dürfen Rezepte löschen.' using errcode = '42501';
  end if;
  select name into v_name from rezept where id = p_rezept for update;
  if not found then
    raise exception 'Rezept nicht gefunden';
  end if;

  select concat_ws('; ',
    (select 'Katalog-Gericht: ' || string_agg(g.name, ', ' order by g.name) from gericht_katalog g where g.rezept_id = p_rezept),
    (select 'Komponente der Systemzuteilung: ' || string_agg(k.name, ', ' order by k.name) from komponente k where k.rezept_id = p_rezept),
    (select 'Anlass: ' || string_agg(a.name, ', ' order by a.name) from anlass_gericht ag join anlass a on a.id = ag.anlass_id where ag.rezept_id = p_rezept),
    (select 'Komponente im Gericht: ' || string_agg(r.name, ', ' order by r.name) from rezept_komponente rk join rezept r on r.id = rk.gericht_id where rk.komponente_id = p_rezept),
    (select 'Zutat im Rezept: ' || string_agg(distinct r.name, ', ' order by r.name)
       from zutat z join zutatengruppe zg on zg.id = z.gruppe_id join rezept r on r.id = zg.rezept_id
      where z.komponente_id = p_rezept and r.id <> p_rezept)
  ) into v_wo;
  if v_wo <> '' then
    raise exception 'Nicht gelöscht: «%» wird noch verwendet (%). Zuerst die Verknüpfung lösen.', v_name, v_wo using errcode = '23503';
  end if;

  delete from rezept where id = p_rezept;
end
$$;
revoke execute on function public.rezept_loeschen(uuid) from public, anon;
grant execute on function public.rezept_loeschen(uuid) to authenticated;

comment on function public.rezept_loeschen(uuid) is
  'Rezept endgültig löschen. Nur für Admins (app_admin); lehnt ab, solange das Rezept verknüpft ist.';
