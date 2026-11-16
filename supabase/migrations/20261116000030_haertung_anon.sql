-- Härtung: Die Rolle anon (Aufruf nur mit dem Publishable Key, ohne Anmeldung) braucht in diesem Projekt nichts.
-- Bisher hatte sie die üblichen Rechte auf alle Tabellen, Views, Sequenzen und sechs Funktionen;
-- gesperrt war sie nur durch Row Level Security. Diese Migration nimmt die Rechte selbst weg (zweite Sperre),
-- auch für alles, was künftig angelegt wird. Für angemeldete Benutzer (authenticated) ändert sich nichts.
-- Nur Standard-PostgreSQL, gilt gleich auf einem selbst gehosteten Supabase.

-- 1. Bestehende Objekte
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;

-- 2. Künftige Objekte, die Migrationen (Rolle postgres) anlegen
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke execute on functions from anon;
-- Neue Funktionen sind in PostgreSQL sonst für alle (PUBLIC) ausführbar. Das lässt sich nur ohne «in schema» abstellen.
-- authenticated und service_role behalten ihr Recht über die Vorgabe im Schema public.
alter default privileges for role postgres revoke execute on functions from public;

-- 3. Kontrolle: bricht ab (und macht alles rückgängig), falls anon noch etwas darf oder authenticated etwas verloren hat.
do $$
declare
  n int;
begin
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
    and has_table_privilege('anon', c.oid, 'select, insert, update, delete');
  if n > 0 then raise exception 'anon hat noch Rechte auf % Tabellen oder Views', n; end if;

  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute');
  if n > 0 then raise exception 'anon darf noch % Funktionen ausführen', n; end if;

  -- Trigger-Funktionen brauchen kein Ausführungsrecht des Benutzers; alle anderen muss die App aufrufen können.
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'public' and p.prorettype <> 'trigger'::regtype
    and not has_function_privilege('authenticated', p.oid, 'execute');
  if n > 0 then raise exception 'authenticated darf % Funktionen nicht mehr ausführen', n; end if;

  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relkind in ('r', 'v') and c.relname <> 'app_admin'
    and not has_table_privilege('authenticated', c.oid, 'select');
  if n > 0 then raise exception 'authenticated kann % Tabellen oder Views nicht mehr lesen', n; end if;
end $$;
