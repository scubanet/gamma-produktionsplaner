-- Temperaturkontrolle der Lager (24.11.2026).
-- Entscheid Dominik (24.11.2026): Die Temperaturkontrollliste deckt vorerst die tägliche Messung der Kühl- und
-- TK-Räume ab (inkl. Economat); erfasst wird in der Web-App, am Handy bedienbar. Wareneingang, Kerntemperatur pro
-- Charge und Transport kommen später dazu.
-- Grenzwerte aus den fachlichen Vorgaben: Kühlung 0–2 °C (Systemzuteilung «0–2 °C»), TK höchstens −18 °C,
-- Economat höchstens +18 °C. Pro Kühlstelle übersteuerbar.
--
--  1. kuehlstelle: Kühlraum, Kühlschrank, Tiefkühler, Economat mit Grenzwerten und Messungen pro Tag
--  2. temperaturmessung: jede Messung mit den damals gültigen Grenzwerten, Visum und Massnahme
--  3. temperatur_recht, temperatur_erfassen, temperatur_stornieren
--  4. temperatur_liste, temperatur_heute
--
-- Messungen werden nie geändert oder gelöscht (Nachweis). Eine falsche Eingabe storniert ein Admin mit Grund; der
-- richtige Wert wird neu erfasst.

-- 1. Kühlstellen --------------------------------------------------------------------------------------------------
create table public.kuehlstelle (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique check (length(trim(name)) between 1 and 60),
  art               text not null check (art in ('kuehlung', 'tk', 'economat')),
  -- Untere Grenze leer: keine (z.B. TK). Obere Grenze immer gesetzt.
  grenze_min        numeric(4,1) check (grenze_min between -40 and 40),
  grenze_max        numeric(4,1) not null check (grenze_max between -40 and 40),
  -- Annahme bis zum Entscheid: 2 Messungen pro Tag (morgens und abends).
  messungen_pro_tag integer not null default 2 check (messungen_pro_tag between 1 and 6),
  aktiv             boolean not null default true,
  reihenfolge       integer not null default 0,
  bemerkung         text,
  erstellt_am       timestamptz not null default now(),
  check (grenze_min is null or grenze_min < grenze_max)
);
comment on table public.kuehlstelle is 'Raum oder Gerät, dessen Temperatur täglich kontrolliert wird. Grenzwerte gelten für neue Messungen; jede Messung hält die damaligen fest. Mit Messungen nicht löschbar, nur deaktivieren.';
comment on column public.kuehlstelle.messungen_pro_tag is 'Soll-Anzahl Messungen pro Tag. Standard 2 ist eine Annahme (morgens und abends), pro Kühlstelle übersteuerbar.';

alter table public.kuehlstelle enable row level security;
-- Lesen alle ausser «Scannen»; anlegen, ändern und löschen nur Admin und Benutzer (wie Stammdaten, Migration 44).
create policy lesen on public.kuehlstelle for select to authenticated using (not (select public.ist_scannen()));
create policy anlegen on public.kuehlstelle for insert to authenticated with check ((select public.ist_planer()));
create policy aendern on public.kuehlstelle for update to authenticated using ((select public.ist_planer())) with check ((select public.ist_planer()));
create policy loeschen on public.kuehlstelle for delete to authenticated using ((select public.ist_planer()));
revoke all on public.kuehlstelle from anon;

-- 2. Messungen ----------------------------------------------------------------------------------------------------
create table public.temperaturmessung (
  id             uuid primary key default gen_random_uuid(),
  kuehlstelle_id uuid not null references public.kuehlstelle(id) on delete restrict,
  gemessen_am    timestamptz not null default now(),
  temperatur     numeric(4,1) not null check (temperatur between -40 and 40),
  -- Grenzwerte zum Zeitpunkt der Messung: eine spätere Änderung an der Kühlstelle schreibt die Liste nicht um.
  grenze_min     numeric(4,1),
  grenze_max     numeric(4,1) not null,
  abweichung     boolean not null,
  massnahme      text,
  visum          text not null check (length(trim(visum)) between 1 and 10),
  bemerkung      text,
  erfasst_von    uuid references auth.users(id) on delete set null,
  storniert_am   timestamptz,
  storniert_von  uuid references auth.users(id) on delete set null,
  storno_grund   text,
  check (not abweichung or length(trim(coalesce(massnahme, ''))) > 0),
  check ((storniert_am is null) = (storno_grund is null))
);
comment on table public.temperaturmessung is 'Temperaturkontrollliste: eine Zeile pro Messung. Geschrieben nur über temperatur_erfassen und temperatur_stornieren; nie geändert oder gelöscht.';
create index on public.temperaturmessung (kuehlstelle_id, gemessen_am);
create index on public.temperaturmessung (erfasst_von);
create index on public.temperaturmessung (storniert_von);

alter table public.temperaturmessung enable row level security;
create policy lesen on public.temperaturmessung for select to authenticated using (not (select public.ist_scannen()));
revoke all on public.temperaturmessung from anon;
revoke insert, update, delete, truncate on public.temperaturmessung from authenticated;

-- 3. Rechte und Funktionen ----------------------------------------------------------------------------------------
create function public.temperatur_recht(p_recht text)
returns boolean
language sql
stable
set search_path = public
as $$
  select (select auth.uid()) is not null
     and case p_recht
           when 'erfassen' then not ist_scannen()
           when 'stornieren' then ist_admin()
           else false
         end;
$$;
comment on function public.temperatur_recht(text) is 'Darf der angemeldete Benutzer das? Rechte: erfassen (alle ausser Scannen), stornieren (Admin). Einzige Stelle für die Rechte der Temperaturkontrolle.';
revoke execute on function public.temperatur_recht(text) from public, anon;
grant execute on function public.temperatur_recht(text) to authenticated;

create function public.temperatur_erfassen(
  p_kuehlstelle uuid, p_temperatur numeric, p_visum text, p_massnahme text default null, p_bemerkung text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k kuehlstelle%rowtype;
  v_t numeric(4,1) := round(p_temperatur, 1);
  v_abw boolean;
  v_id uuid;
begin
  if not temperatur_recht('erfassen') then
    raise exception 'Keine Berechtigung, Temperaturen zu erfassen.' using errcode = '42501';
  end if;
  if p_temperatur is null or p_temperatur < -40 or p_temperatur > 40 then
    raise exception 'Temperatur: eine Zahl von −40 bis +40 °C.' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_visum, ''))) not between 1 and 10 then
    raise exception 'Visum: 1 bis 10 Zeichen.' using errcode = '22023';
  end if;
  select * into k from kuehlstelle where id = p_kuehlstelle;
  if not found then
    raise exception 'Kühlstelle nicht gefunden.' using errcode = 'P0002';
  end if;
  if not k.aktiv then
    raise exception 'Die Kühlstelle «%» ist deaktiviert.', k.name using errcode = '23514';
  end if;
  v_abw := v_t > k.grenze_max or (k.grenze_min is not null and v_t < k.grenze_min);
  if v_abw and length(trim(coalesce(p_massnahme, ''))) = 0 then
    raise exception 'Abweichung: % °C liegt ausserhalb der Grenze. Bitte die Massnahme eintragen.', v_t using errcode = '23514';
  end if;
  insert into temperaturmessung (kuehlstelle_id, temperatur, grenze_min, grenze_max, abweichung, massnahme, visum, bemerkung, erfasst_von)
  values (k.id, v_t, k.grenze_min, k.grenze_max, v_abw, nullif(trim(p_massnahme), ''), upper(trim(p_visum)), nullif(trim(p_bemerkung), ''), auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'kuehlstelle', k.name, 'temperatur', v_t, 'abweichung', v_abw);
end;
$$;
comment on function public.temperatur_erfassen(uuid, numeric, text, text, text) is 'Erfasst eine Messung mit den aktuellen Grenzwerten der Kühlstelle. Bei Abweichung ist die Massnahme Pflicht.';
revoke execute on function public.temperatur_erfassen(uuid, numeric, text, text, text) from public, anon;
grant execute on function public.temperatur_erfassen(uuid, numeric, text, text, text) to authenticated;

create function public.temperatur_stornieren(p_messung uuid, p_grund text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not temperatur_recht('stornieren') then
    raise exception 'Nur Admins dürfen Messungen stornieren.' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_grund, ''))) = 0 then
    raise exception 'Bitte einen Grund für das Storno angeben.' using errcode = '22023';
  end if;
  update temperaturmessung set storniert_am = now(), storniert_von = auth.uid(), storno_grund = trim(p_grund)
  where id = p_messung and storniert_am is null;
  if not found then
    raise exception 'Messung nicht gefunden oder schon storniert.' using errcode = 'P0002';
  end if;
end;
$$;
comment on function public.temperatur_stornieren(uuid, text) is 'Storniert eine falsch erfasste Messung (nur Admin). Die Zeile bleibt mit Grund sichtbar.';
revoke execute on function public.temperatur_stornieren(uuid, text) from public, anon;
grant execute on function public.temperatur_stornieren(uuid, text) to authenticated;

-- 4. Views --------------------------------------------------------------------------------------------------------
-- «Tag» ist der Tag in der Schweiz.
create view public.temperatur_liste with (security_invoker = true) as
select m.id, m.kuehlstelle_id, k.name as kuehlstelle, k.art, k.reihenfolge,
       m.gemessen_am, (m.gemessen_am at time zone 'Europe/Zurich')::date as tag,
       m.temperatur, m.grenze_min, m.grenze_max, m.abweichung, m.massnahme, m.visum, m.bemerkung,
       m.storniert_am, m.storno_grund,
       case when m.storniert_am is not null then 'storniert' when m.abweichung then 'abweichung' else 'ok' end as status
from temperaturmessung m
join kuehlstelle k on k.id = m.kuehlstelle_id;

create view public.temperatur_heute with (security_invoker = true) as
with heute as (
  select m.* from temperaturmessung m
  where m.storniert_am is null
    and (m.gemessen_am at time zone 'Europe/Zurich')::date = (now() at time zone 'Europe/Zurich')::date
), agg as (
  select h.kuehlstelle_id, count(*)::int as messungen, bool_or(h.abweichung) as abweichung, max(h.gemessen_am) as letzte_am
  from heute h group by h.kuehlstelle_id
)
select k.id as kuehlstelle_id, k.name, k.art, k.grenze_min, k.grenze_max, k.messungen_pro_tag, k.reihenfolge,
       coalesce(a.messungen, 0) as messungen,
       greatest(k.messungen_pro_tag - coalesce(a.messungen, 0), 0) as fehlend,
       coalesce(a.abweichung, false) as abweichung,
       a.letzte_am,
       (select h.temperatur from heute h where h.kuehlstelle_id = k.id order by h.gemessen_am desc limit 1) as letzte_temperatur,
       case when coalesce(a.abweichung, false) then 'abweichung'
            when coalesce(a.messungen, 0) < k.messungen_pro_tag then 'offen'
            else 'ok' end as status
from kuehlstelle k
left join agg a on a.kuehlstelle_id = k.id
where k.aktiv;
