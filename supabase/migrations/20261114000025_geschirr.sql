-- Geschirr und Besteck pro Anlass, Etappe 3 (Entscheide Dominik, 14.11.2026):
--   Erfasst wird am Anlass. Ein Standard pro Angebotsform und Gang schlägt die Positionen vor; im Anlass
--   lässt sich jede Position übersteuern (Stück pro Gast, Wechselfaktor, Reserve) oder ergänzen.
--   Drei Ebenen in einer Tabelle: pro Gast und Gang; Abweichung für ein Gericht als eigene Position im Gang;
--   Material für die Ausgabe als feste Stückzahl ohne Gang.
-- Bedarf = Gäste × Stück pro Gast × Wechselfaktor × (1 + Reserve), aufgerundet.
-- Annahme: Gäste = grösster Service des Anlasses (zwischen den Services wird abgewaschen); ohne Service die Gäste des Anlasses.
-- Eigener Bestand zuerst, der Rest ist Zusatzbedarf Miete. Gleichzeitige Anlässe sind noch nicht berücksichtigt.

-- 1. Artikel für den Service ---------------------------------------------------------
create table public.service_artikel (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique check (btrim(name) <> ''),
  art             text not null default 'teller' check (art in ('teller', 'besteck', 'glas', 'serviette', 'ausgabe', 'sonstiges')),
  anzahl_eigen    integer not null default 0 check (anzahl_eigen >= 0),
  mietpreis_chf   numeric(10,2) check (mietpreis_chf >= 0),
  stueck_pro_korb integer check (stueck_pro_korb > 0),
  gewicht_g       numeric(10,2) check (gewicht_g >= 0),
  aktiv           boolean not null default true
);
comment on table public.service_artikel is 'Geschirr, Besteck, Gläser und Material für die Ausgabe: eigener Bestand, Mietpreis pro Stück und Anlass, Stück pro Korb, Gewicht.';
alter table public.service_artikel enable row level security;
create policy pilot_angemeldet on public.service_artikel for all to authenticated using (true) with check (true);

-- 2. Standard pro Angebotsform und Gang (Vorschlag) --------------------------------------
create table public.geschirr_standard (
  id              uuid primary key default gen_random_uuid(),
  angebotsform    text not null references public.angebotsform(code),
  gang            text not null check (btrim(gang) <> ''),
  artikel_id      uuid not null references public.service_artikel(id) on delete cascade,
  stueck_pro_gast numeric(6,2) not null default 1 check (stueck_pro_gast > 0),
  wechselfaktor   numeric(5,2) not null default 1 check (wechselfaktor > 0),
  reserve_pct     numeric(5,2) not null default 0 check (reserve_pct between 0 and 100),
  unique (angebotsform, gang, artikel_id)
);
create index on public.geschirr_standard (artikel_id);
alter table public.geschirr_standard enable row level security;
create policy pilot_angemeldet on public.geschirr_standard for all to authenticated using (true) with check (true);

-- 3. Positionen am Anlass -----------------------------------------------------------------
create table public.anlass_geschirr (
  id              uuid primary key default gen_random_uuid(),
  anlass_id       uuid not null references public.anlass(id) on delete cascade,
  artikel_id      uuid not null references public.service_artikel(id),
  gang            text check (gang is null or btrim(gang) <> ''),   -- leer = Ausgabe oder ganzer Anlass
  stueck_pro_gast numeric(6,2) check (stueck_pro_gast > 0),
  wechselfaktor   numeric(5,2) not null default 1 check (wechselfaktor > 0),
  reserve_pct     numeric(5,2) not null default 0 check (reserve_pct between 0 and 100),
  stueck_fix      integer check (stueck_fix >= 0),
  aus_standard    boolean not null default false,
  bemerkung       text,
  -- genau eines: pro Gast oder feste Stückzahl
  constraint anlass_geschirr_art_check check ((stueck_pro_gast is null) <> (stueck_fix is null))
);
create index on public.anlass_geschirr (anlass_id);
create index on public.anlass_geschirr (artikel_id);
create unique index anlass_geschirr_position_key on public.anlass_geschirr (anlass_id, coalesce(gang, ''), artikel_id);
alter table public.anlass_geschirr enable row level security;
create policy pilot_angemeldet on public.anlass_geschirr for all to authenticated using (true) with check (true);

-- 4. Standard in den Anlass übernehmen: nur Gänge, die im Menü des Anlasses vorkommen; Bestehendes bleibt.
create function public.anlass_geschirr_vorschlagen(p_anlass uuid)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_form text;
  n integer;
begin
  select angebotsform into v_form from anlass where id = p_anlass;
  if not found then
    raise exception 'Anlass nicht gefunden';
  end if;
  if v_form is null then
    raise exception 'Der Anlass hat keine Angebotsform. Im Kopf des Anlasses wählen, dann den Standard übernehmen.';
  end if;
  insert into anlass_geschirr (anlass_id, artikel_id, gang, stueck_pro_gast, wechselfaktor, reserve_pct, aus_standard)
  select p_anlass, gs.artikel_id, gs.gang, gs.stueck_pro_gast, gs.wechselfaktor, gs.reserve_pct, true
  from geschirr_standard gs
  where gs.angebotsform = v_form
    and gs.gang in (select mg.gang from menuelinie ml join menuelinie_gericht mg on mg.menuelinie_id = ml.id where ml.anlass_id = p_anlass)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end
$$;
revoke execute on function public.anlass_geschirr_vorschlagen(uuid) from public, anon;
grant execute on function public.anlass_geschirr_vorschlagen(uuid) to authenticated;

-- 5. Bedarf pro Position --------------------------------------------------------------------
create view public.anlass_geschirr_bedarf with (security_invoker = true) as
with g as (
  select a.id as anlass_id,
         coalesce((select max(s.gaeste) from service s where s.anlass_id = a.id), a.gaeste) as gaeste,
         (select count(*) from service s where s.anlass_id = a.id) as services
  from anlass a
)
select ag.id, ag.anlass_id, ag.gang, ag.artikel_id, sa.name as artikel, sa.art,
       ag.stueck_pro_gast, ag.wechselfaktor, ag.reserve_pct, ag.stueck_fix, ag.aus_standard, ag.bemerkung,
       g.gaeste, b.bedarf,
       least(sa.anzahl_eigen, b.bedarf) as eigen,
       greatest(b.bedarf - sa.anzahl_eigen, 0) as miete,
       case when b.bedarf <= sa.anzahl_eigen then 0 else round((b.bedarf - sa.anzahl_eigen) * sa.mietpreis_chf, 2) end as mietkosten_chf,
       ceil(b.bedarf::numeric / sa.stueck_pro_korb)::int as koerbe,
       round(b.bedarf * sa.gewicht_g / 1000, 2) as gewicht_kg,
       case
         when ag.stueck_fix is not null then 'feste Stückzahl'
         when g.gaeste is null then '[Gäste]'
         else g.gaeste || ' Gäste × ' || trim_scale(ag.stueck_pro_gast) || ' Stück × Wechselfaktor ' || trim_scale(ag.wechselfaktor)
              || case when ag.reserve_pct > 0 then ' + ' || trim_scale(ag.reserve_pct) || ' % Reserve' else '' end || ', aufgerundet'
              || case when g.services > 1 then ' (grösster von ' || g.services || ' Services)' else '' end
       end as herleitung
from anlass_geschirr ag
join service_artikel sa on sa.id = ag.artikel_id
join g on g.anlass_id = ag.anlass_id
cross join lateral (
  select case when ag.stueck_fix is not null then ag.stueck_fix
              else ceil(g.gaeste * ag.stueck_pro_gast * ag.wechselfaktor * (1 + ag.reserve_pct / 100))::int end as bedarf
) b;
