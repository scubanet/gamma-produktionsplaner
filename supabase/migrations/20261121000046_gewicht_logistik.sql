-- Gewicht für die Logistik (21.11.2026), Aufgabe S3 aus docs/plan-scan-app.md. Spezifikation Fassung 3, Abschnitt «Gewicht für die Logistik».
-- Entscheide Dominik: Beim Beladen ist das Gewicht der Engpass; gezählt werden nur die Speisen in den IFCO-Kisten;
-- die Nutzlast prüft die App nicht (20. und 21.11.2026). Economat-Ware ist ungekühlt und eine eigene Transportart;
-- keine Obergrenze pro Kiste nach Gewicht; das Gewicht der Beutel-Verpackung wird nicht gerechnet; IFCO-Kisten gibt es in
-- verschiedenen Höhen mit verschiedener Tara, die Höhe wird pro Kiste beim Packen gewählt (21.11.2026).
--
--  1. transportart: gekühlt, tiefgekühlt, ungekühlt aus der Lagerart der Systemzuteilung
--  2. komponente_packmass: Gebinde, Tara und Füllmenge einer Komponente, ohne das Rezept lesen zu müssen
--  3. kiste.gebinde_id: das Gebinde wird beim Anlegen der Kiste gewählt; kiste_erstellen nimmt es entgegen
--  4. kiste_gewicht: Gewicht pro Kiste
--  5. logistik_gewicht: Kisten und Gewicht pro Spiel und Transportart, Soll und Ist
--
-- Eine unvollständige Zahl wird nie als Total ausgegeben: Was sich nicht wiegen lässt (Beutel in Stück, fehlende Menge,
-- fehlende Tara, fehlende Lagerart), steht als eigene Anzahl daneben, und das betroffene Total ist leer.

-- 1. Transportart -------------------------------------------------------------------------------------------------
create function public.transportart(p_tk boolean, p_0_2 boolean, p_trocken boolean)
returns text
language sql
immutable
as $$
  select case when p_tk then 'tiefgekühlt' when p_0_2 then 'gekühlt' when p_trocken then 'ungekühlt' end;
$$;
comment on function public.transportart(boolean, boolean, boolean) is 'Transportart aus der Lagerart der Systemzuteilung: tiefgekühlt (TK), gekühlt (0–2 °C), ungekühlt (Economat; kann mit gekühlt mitfahren). Leer = Lagerart fehlt.';

-- 2. Packmass -----------------------------------------------------------------------------------------------------
-- Gebinde, Tara, Füllmenge pro Gebinde und pro Beutel stehen am Rezept. Die Stufe «Scannen» liest keine Rezepte, braucht
-- aber diese vier Angaben für Gewicht und Kistenzahl. Die Funktion gibt nur sie heraus (erhöhte Rechte), sonst nichts vom Rezept.
create function public.komponente_packmass()
returns table (komponente_id uuid, gebinde text, tara_g numeric, fuellmenge_g numeric, beutel_g numeric)
language sql
stable
security definer
set search_path = public
as $$
  select k.id, g.name, g.tara_g, r.fuellmenge_g, r.beutel_g
  from komponente k
  join rezept r on r.id = k.rezept_id
  left join gebinde g on g.id = r.gebinde_id
  where (select auth.uid()) is not null;
$$;
comment on function public.komponente_packmass() is 'Pro Komponente mit Rezept: Gebinde, Tara, Füllmenge pro Gebinde und pro Beutel. Für alle Stufen lesbar, auch ohne Zugriff auf Rezepte.';
revoke execute on function public.komponente_packmass() from public, anon;
grant execute on function public.komponente_packmass() to authenticated;

-- 3. Gebinde pro Kiste ---------------------------------------------------------------------------------------------
-- Entscheid Dominik (21.11.2026): Die Höhe der IFCO-Kiste wird pro Kiste gewählt, nicht am Produkt. Jede Höhe ist ein
-- Gebinde in den Stammdaten mit eigener Tara.
alter table public.kiste add column gebinde_id uuid references public.gebinde(id) on delete restrict;
comment on column public.kiste.gebinde_id is 'Gebinde dieser Kiste (IFCO in einer bestimmten Höhe), beim Anlegen gewählt. Liefert die Tara.';
create index on public.kiste (gebinde_id);

-- Wie Migration 45, dazu das Gebinde. Ohne Angabe gilt das einzige aktive Gebinde; gibt es mehrere, muss gewählt werden.
drop function public.kiste_erstellen(uuid);
create function public.kiste_erstellen(p_service uuid, p_gebinde uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_benutzer uuid := auth.uid();
  v_gebinde uuid := p_gebinde;
  v_gebinde_name text;
  v_code text;
  v_nr integer;
  v_kiste uuid;
  versuch integer := 0;
begin
  if not lager_recht('packen') then
    raise exception 'Keine Berechtigung zum Packen.' using errcode = '42501';
  end if;
  if v_gebinde is null then
    if (select count(*) from gebinde g where g.aktiv) <> 1 then
      raise exception 'Bitte das Gebinde der Kiste wählen.' using errcode = '22023';
    end if;
    select g.id into v_gebinde from gebinde g where g.aktiv;
  end if;
  select g.name into v_gebinde_name from gebinde g where g.id = v_gebinde and g.aktiv;
  if not found then
    raise exception 'Gebinde nicht gefunden oder nicht aktiv.' using errcode = 'P0002';
  end if;
  -- Gleichzeitige Aufrufe für dasselbe Spiel nacheinander, damit die Laufnummern eindeutig bleiben.
  perform 1 from service s where s.id = p_service for update;
  if not found then
    raise exception 'Spiel nicht gefunden.' using errcode = 'P0002';
  end if;
  loop
    versuch := versuch + 1;
    select 'K-' || string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') into v_code from generate_series(1, 6);
    exit when not exists (select 1 from kiste k where k.code = v_code);
    if versuch > 20 then
      raise exception 'Kein freier Kistencode gefunden, bitte nochmals versuchen.' using errcode = '40001';
    end if;
  end loop;
  select coalesce(max(k.laufnummer), 0) + 1 into v_nr from kiste k where k.service_id = p_service;
  insert into kiste (service_id, code, laufnummer, gebinde_id, erstellt_von) values (p_service, v_code, v_nr, v_gebinde, v_benutzer) returning id into v_kiste;
  insert into druckauftrag (kiste_id, erstellt_von) values (v_kiste, v_benutzer);
  return jsonb_build_object('kiste_id', v_kiste, 'code', v_code, 'laufnummer', v_nr, 'gebinde', v_gebinde_name);
end
$$;
comment on function public.kiste_erstellen(uuid, uuid) is 'Legt eine Kiste für ein Spiel an (Code, Laufnummer im Spiel, Gebinde) und den Druckauftrag für ihr Etikett. Ohne Gebinde gilt das einzige aktive.';
revoke execute on function public.kiste_erstellen(uuid, uuid) from public, anon;
grant execute on function public.kiste_erstellen(uuid, uuid) to authenticated;

-- 4. Gewicht pro Kiste --------------------------------------------------------------------------------------------
-- Netto = Summe der Beutel in kg; Liter zählen als 1 l = 1 kg (Annahme, wie in der Planung). Beutel in Stück haben kein
-- Gewicht und werden gezählt. Tara aus dem Gebinde der Kiste.
-- Brutto = Netto + Tara, nur wenn die Tara bekannt ist und kein Beutel in Stück in der Kiste liegt.
create view public.kiste_gewicht with (security_invoker = true) as
select ki.id as kiste_id, ki.service_id, ki.code, ki.laufnummer, ki.zustand,
       i.transportart, i.beutel, i.netto_kg, i.beutel_stueck, i.liter_annahme,
       ki.gebinde_id, g.name as gebinde, round(g.tara_g / 1000, 3) as tara_kg,
       case when i.beutel > 0 and i.beutel_stueck = 0 and g.tara_g is not null then round(i.netto_kg + g.tara_g / 1000, 3) end as brutto_kg,
       case when i.beutel = 0 then 'Kiste ist leer'
            else concat_ws('; ',
              i.beutel - i.beutel_stueck || ' Beutel = ' || trim_scale(i.netto_kg)::text || ' kg',
              case when i.beutel_stueck > 0 then i.beutel_stueck || ' Beutel in Stück ohne Gewicht' end,
              case when i.liter_annahme then 'Annahme: 1 l = 1 kg' end,
              case when g.tara_g is not null then 'Tara ' || trim_scale(round(g.tara_g / 1000, 3))::text || ' kg (' || g.name || ')'
                   else 'Tara [Gewicht]: ' || coalesce('am Gebinde ' || g.name || ' nicht erfasst', 'Kiste ohne Gebinde') end,
              case when i.transportart is null then 'Lagerart fehlt oder gemischt' end
            ) end as herleitung
from kiste ki
left join gebinde g on g.id = ki.gebinde_id
cross join lateral (
  select count(*)::int as beutel,
         coalesce(sum(e.menge) filter (where e.einheit in ('kg', 'l')), 0) as netto_kg,
         count(*) filter (where e.einheit = 'Stk')::int as beutel_stueck,
         coalesce(bool_or(e.einheit = 'l'), false) as liter_annahme,
         -- Eine Transportart, wenn alle Beutel dieselbe haben; sonst leer.
         case when count(distinct transportart(k.lager_tk, k.lager_0_2, k.lager_trocken)) = 1
                   and count(*) filter (where transportart(k.lager_tk, k.lager_0_2, k.lager_trocken) is null) = 0
              then min(transportart(k.lager_tk, k.lager_0_2, k.lager_trocken)) end as transportart
  from lagereinheit e
  join charge c on c.id = e.charge_id
  join komponente k on k.id = c.komponente_id
  where e.kiste_id = ki.id and e.zustand in ('in_kiste', 'verbraucht')
) i;

comment on view public.kiste_gewicht is 'Gewicht pro Kiste: Netto (Beutel in kg, 1 l = 1 kg), Tara aus dem Gebinde der Kiste, Brutto nur wenn vollständig. Beutel in Stück gezählt, ohne Gewicht.';

-- 5. Gewicht pro Spiel und Transportart ---------------------------------------------------------------------------
-- Soll: Planwert vor dem Packen aus dem Bedarf des Spiels (gleiche Regel wie packliste_soll: nur Komponenten mit Etikett).
--   Kisten: pro Produkt Bedarf ÷ Füllmenge pro Gebinde, aufgerundet (sortenrein), summiert.
--   Tara im Soll: vom Gebinde, das am Rezept gewählt ist (Planwert). Im Ist zählt das Gebinde der einzelnen Kiste.
-- Ist: aus den gepackten Kisten (kiste_gewicht), ohne aufgelöste und leere Kisten.
-- Transportart leer: Lagerart fehlt in der Systemzuteilung (beim Ist auch: Kiste mit gemischter Lagerart).
create view public.logistik_gewicht with (security_invoker = true) as
with soll as (
  select b.service_id, transportart(k.lager_tk, k.lager_0_2, k.lager_trocken) as transportart,
         count(*)::int as produkte,
         count(*) filter (where b.einheit_total = 'Stk')::int as produkte_stueck,
         count(*) filter (where b.einheit_total <> 'Stk' and b.menge is null)::int as produkte_ohne_menge,
         count(*) filter (where b.einheit_total <> 'Stk' and pm.fuellmenge_g is null)::int as produkte_ohne_fuellmenge,
         count(*) filter (where b.einheit_total <> 'Stk' and pm.tara_g is null)::int as produkte_ohne_tara,
         coalesce(bool_or(b.einheit_total = 'l'), false) as liter_annahme,
         case when count(*) filter (where b.einheit_total <> 'Stk' and b.menge is null) = 0
              then coalesce(round(sum(b.menge) filter (where b.einheit_total <> 'Stk'), 3), 0) end as netto_kg,
         case when count(*) filter (where b.einheit_total <> 'Stk' and (b.menge is null or pm.fuellmenge_g is null)) = 0
              then coalesce(sum(ceil(b.menge * 1000 / pm.fuellmenge_g)) filter (where b.einheit_total <> 'Stk'), 0)::int end as kisten,
         case when count(*) filter (where b.einheit_total <> 'Stk' and (b.menge is null or pm.fuellmenge_g is null or pm.tara_g is null)) = 0
              then coalesce(round(sum(ceil(b.menge * 1000 / pm.fuellmenge_g) * pm.tara_g / 1000) filter (where b.einheit_total <> 'Stk'), 3), 0) end as tara_kg
  from service_komponente_bedarf b
  join komponente_zuteilung z on z.id = b.komponente_id
  join komponente k on k.id = b.komponente_id
  left join komponente_packmass() pm on pm.komponente_id = k.id
  where z.status = 'ok' and z.haltbarkeit_tage is not null and not z.nur_vor_ort and k.produkt_id is not null
  group by b.service_id, transportart(k.lager_tk, k.lager_0_2, k.lager_trocken)
), ist as (
  select g.service_id, g.transportart,
         count(*)::int as kisten, sum(g.beutel)::int as beutel, sum(g.beutel_stueck)::int as beutel_stueck,
         round(sum(g.netto_kg), 3) as netto_kg,
         count(*) filter (where g.tara_kg is null)::int as kisten_ohne_tara,
         case when count(*) filter (where g.brutto_kg is null) = 0 then round(sum(g.brutto_kg), 3) end as brutto_kg,
         bool_or(g.liter_annahme) as liter_annahme
  from kiste_gewicht g
  where g.zustand <> 'aufgeloest' and g.beutel > 0
  group by g.service_id, g.transportart
), z as (
  select coalesce(s.service_id, i.service_id) as service_id, coalesce(s.transportart, i.transportart) as transportart,
         s.produkte, s.produkte_stueck, s.produkte_ohne_menge, s.produkte_ohne_fuellmenge, s.produkte_ohne_tara,
         s.kisten as soll_kisten, s.netto_kg as soll_netto_kg,
         case when s.produkte_stueck = 0 then round(s.netto_kg + s.tara_kg, 3) end as soll_brutto_kg,
         coalesce(i.kisten, 0) as ist_kisten, coalesce(i.beutel, 0) as ist_beutel, coalesce(i.beutel_stueck, 0) as ist_beutel_stueck,
         coalesce(i.netto_kg, 0) as ist_netto_kg, coalesce(i.kisten_ohne_tara, 0) as ist_kisten_ohne_tara,
         case when i.service_id is null then 0 else i.brutto_kg end as ist_brutto_kg,
         coalesce(s.liter_annahme, false) or coalesce(i.liter_annahme, false) as liter_annahme
  from soll s
  full join ist i on i.service_id = s.service_id and i.transportart is not distinct from s.transportart
)
select z.service_id, sv.anlass_id, sv.name as service, sv.reihenfolge, sv.datum,
       z.transportart,
       case z.transportart when 'gekühlt' then 1 when 'tiefgekühlt' then 2 when 'ungekühlt' then 3 else 4 end as sortierung,
       coalesce(z.produkte, 0) as produkte, coalesce(z.produkte_stueck, 0) as produkte_stueck,
       coalesce(z.produkte_ohne_menge, 0) as produkte_ohne_menge, coalesce(z.produkte_ohne_fuellmenge, 0) as produkte_ohne_fuellmenge,
       coalesce(z.produkte_ohne_tara, 0) as produkte_ohne_tara,
       z.soll_kisten, z.soll_netto_kg, z.soll_brutto_kg,
       z.ist_kisten, z.ist_beutel, z.ist_beutel_stueck, z.ist_netto_kg, z.ist_kisten_ohne_tara, z.ist_brutto_kg,
       z.liter_annahme,
       concat_ws('; ',
         case when z.transportart is null then 'Lagerart fehlt in der Systemzuteilung (oder Kiste mit gemischter Lagerart)' end,
         case when z.produkte is not null then
           'Soll: ' || z.produkte || ' Produkte, ' || coalesce(trim_scale(z.soll_netto_kg)::text, '[Gewicht]') || ' kg ohne Tara'
           || ', rund ' || coalesce(z.soll_kisten::text, '[Kisten]') || ' Kisten (pro Produkt Bedarf ÷ Füllmenge pro Gebinde, aufgerundet)'
           || ', mit Tara ' || coalesce(trim_scale(z.soll_brutto_kg)::text, '[Gewicht]') || ' kg' end,
         case when z.produkte_stueck > 0 then z.produkte_stueck || ' Produkte in Stück ohne Gewicht' end,
         case when z.produkte_ohne_menge > 0 then z.produkte_ohne_menge || ' Produkte ohne Menge im Bedarf' end,
         case when z.produkte_ohne_fuellmenge > 0 then z.produkte_ohne_fuellmenge || ' Produkte ohne Füllmenge pro Gebinde am Rezept' end,
         case when z.produkte_ohne_tara > 0 then z.produkte_ohne_tara || ' Produkte ohne Tara für den Planwert (Gebinde am Rezept oder Tara am Gebinde fehlt)' end,
         'Ist: ' || z.ist_kisten || ' Kisten, ' || z.ist_beutel || ' Beutel, ' || trim_scale(z.ist_netto_kg)::text || ' kg ohne Tara, mit Tara '
           || coalesce(trim_scale(z.ist_brutto_kg)::text, '[Gewicht]') || ' kg',
         case when z.ist_beutel_stueck > 0 then z.ist_beutel_stueck || ' Beutel in Stück ohne Gewicht' end,
         case when z.ist_kisten_ohne_tara > 0 then z.ist_kisten_ohne_tara || ' Kisten ohne Tara' end,
         case when z.liter_annahme then 'Annahme: 1 l = 1 kg' end
       ) as herleitung
from z
join service sv on sv.id = z.service_id;

comment on view public.logistik_gewicht is 'Angabe für die Logistik: pro Spiel und Transportart Kisten und Gewicht, als Soll aus dem Bedarf (Planwert) und als Ist aus den gepackten Kisten. Leere Totale = unvollständig, die fehlenden Teile stehen als Anzahl daneben. Keine Prüfung der Nutzlast.';

grant select on public.kiste_gewicht, public.logistik_gewicht to authenticated;
