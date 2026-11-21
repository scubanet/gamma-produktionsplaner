-- Packen-Kern (21.11.2026), Aufgabe S2 aus docs/plan-scan-app.md. Spezifikation: docs/spezifikation-etiketten-packliste.md, Fassung 3.
-- Entscheide Dominik: Jeder Beutel wird in eine IFCO-Kiste gescannt; jede Kiste ist sortenrein (20.11.2026). Gepackt
-- wird pro Spiel, eine Kiste gehört immer genau einem Spiel; ein Produkt ausserhalb des Bedarfs wird nach Bestätigung
-- eingepackt und als «zusätzlich» geführt (21.11.2026).
--
--  1. kiste, scan; lagereinheit, lagerbewegung und druckauftrag mit Kiste
--  2. packliste_soll, packliste, packliste_ohne_etikett, etikett_kiste
--  3. kiste_erstellen
--  4. beutel_einpacken, beutel_auspacken, kiste_aufloesen
--  5. scan_erfassen (Verladen, Ankunft)
--  6. service_abschliessen
--
-- Zustand, Lagerbewegung und Scan schreiben nur diese Funktionen, je in einer Transaktion. Ergebnisse eines Scans
-- (grün, gelb, rot) kommen als Antwort zurück, nicht als Fehler: beide Oberflächen zeigen sie nur an.
-- Noch nicht hier: Gewicht und Tara (S3), ZPL und Druck (Etappe 3).

-- 1. Tabellen -----------------------------------------------------------------------------------------------------
-- Der Kistencode hat eine eigene Form (K-XXXXXX), damit er sich beim Eintippen von einer Seriennummer unterscheidet.
create table public.kiste (
  id           uuid primary key default gen_random_uuid(),
  service_id   uuid not null references public.service(id) on delete restrict,
  code         text not null unique check (code ~ '^K-[A-HJKMNP-Z2-9]{6}$'),
  laufnummer   integer not null check (laufnummer > 0),
  zustand      text not null default 'offen' check (zustand in ('offen', 'verladen', 'angekommen', 'abgeschlossen', 'aufgeloest')),
  -- Sortenrein: gesetzt durch den ersten eingepackten Beutel, wieder leer, wenn die Kiste leer ist.
  produkt_id   uuid references public.produkt(id) on delete restrict,
  erstellt_am  timestamptz not null default now(),
  erstellt_von uuid references auth.users(id) on delete set null,
  unique (service_id, laufnummer)
);
comment on table public.kiste is 'IFCO-Kiste für genau ein Spiel (Service), sortenrein. zustand ist massgebend. Wird nur von den Pack-Funktionen geschrieben.';
create index on public.kiste (produkt_id);
create index on public.kiste (erstellt_von);

alter table public.lagereinheit add column kiste_id uuid references public.kiste(id) on delete restrict;
alter table public.lagereinheit add column klaeren text;
comment on column public.lagereinheit.kiste_id is 'Kiste, in der der Beutel liegt. Bleibt nach «verbraucht» stehen, damit sichtbar ist, in welchem Spiel er verbraucht wurde.';
comment on column public.lagereinheit.klaeren is 'Ohne Netz eingepackt, obwohl die Prüfung dagegen sprach (Ergebnis-Code). Leer, sobald jemand auspackt oder bestätigt.';
create index on public.lagereinheit (kiste_id);

alter table public.lagerbewegung add column kiste_id uuid references public.kiste(id) on delete restrict;
create index on public.lagerbewegung (kiste_id);

-- Druckauftrag für ein Kisten-Etikett: genau eine der beiden Spalten ist gesetzt.
alter table public.druckauftrag alter column lagereinheit_id drop not null;
alter table public.druckauftrag add column kiste_id uuid references public.kiste(id) on delete cascade;
alter table public.druckauftrag add constraint druckauftrag_ziel check (num_nonnulls(lagereinheit_id, kiste_id) = 1);
create index on public.druckauftrag (kiste_id);

create table public.scan (
  id          uuid primary key default gen_random_uuid(),
  -- Vom Gerät vergeben: ein nach einem Funkloch doppelt gesendeter Scan wird nur einmal gespeichert.
  scan_nummer uuid not null unique,
  quelle      text not null check (quelle in ('ios', 'web')),
  service_id  uuid not null references public.service(id) on delete restrict,
  stufe       text not null check (stufe in ('verladen', 'angekommen')),
  code        text not null,
  -- Leer bei unbekanntem Code.
  kiste_id    uuid references public.kiste(id) on delete restrict,
  ergebnis    text not null,
  antwort     jsonb not null,
  zeitpunkt   timestamptz not null,
  erfasst_am  timestamptz not null default now(),
  benutzer    uuid references auth.users(id) on delete set null
);
comment on table public.scan is 'Jeder Scan einer Kiste beim Verladen und bei der Ankunft, auch abgelehnte. zeitpunkt ist der echte Scan-Zeitpunkt, erfasst_am der Eingang in der Datenbank.';
create index on public.scan (service_id);
create index on public.scan (kiste_id);
create index on public.scan (benutzer);

alter table public.kiste enable row level security;
alter table public.scan enable row level security;
-- Lesen dürfen alle Stufen, auch «Scannen» (Regeln wie in Migration 44). Geschrieben wird nur über die Funktionen unten.
create policy lesen on public.kiste for select to authenticated using (true);
create policy lesen on public.scan for select to authenticated using (true);
revoke all on public.kiste, public.scan from anon;
revoke insert, update, delete, truncate on public.kiste, public.scan from authenticated;

-- 2. Packliste ----------------------------------------------------------------------------------------------------
-- Soll pro Spiel, Produkt und Einheit aus dem Bedarf des Spiels. Es zählen nur Komponenten, die ein Etikett bekommen:
-- Status ok, mit Haltbarkeit, nicht nur vor Ort (gleiche Regel wie lager_bedarf). Fehlt bei einer Zeile die Menge,
-- ist das Soll leer ([Menge]) und gilt nie als erreicht.
create view public.packliste_soll with (security_invoker = true) as
select b.service_id, k.produkt_id, b.einheit_total as einheit,
       case when count(*) filter (where b.menge is null) = 0 then round(sum(b.menge), 3) end as soll,
       count(*)::int as komponenten
from service_komponente_bedarf b
join komponente_zuteilung z on z.id = b.komponente_id
join komponente k on k.id = b.komponente_id
where z.status = 'ok' and z.haltbarkeit_tage is not null and not z.nur_vor_ort and k.produkt_id is not null
group by b.service_id, k.produkt_id, b.einheit_total;

comment on view public.packliste_soll is 'Packliste: Soll pro Spiel, Produkt und Einheit aus dem Bedarf (nur Komponenten mit Etikett). Einzige Stelle für das Soll; beutel_einpacken liest daraus.';

-- Soll und Ist pro Spiel, Produkt und Einheit. Ist = Beutel in den Kisten des Spiels (eingepackt oder schon verbraucht).
-- Produkte ohne Soll, die trotzdem gepackt sind, stehen als «zusätzlich» (Ersatz, Reserve).
create view public.packliste with (security_invoker = true) as
with ist as (
  select ki.service_id, c.produkt_id, e.einheit,
         count(*)::int as beutel, sum(e.menge) as menge,
         count(*) filter (where e.klaeren is not null)::int as zu_klaeren,
         count(distinct ki.id)::int as kisten
  from lagereinheit e
  join kiste ki on ki.id = e.kiste_id
  join charge c on c.id = e.charge_id
  where e.zustand in ('in_kiste', 'verbraucht')
  group by ki.service_id, c.produkt_id, e.einheit
), z as (
  select coalesce(s.service_id, i.service_id) as service_id, coalesce(s.produkt_id, i.produkt_id) as produkt_id,
         coalesce(s.einheit, i.einheit) as einheit,
         s.soll, s.produkt_id is not null as im_bedarf,
         coalesce(i.menge, 0) as ist, coalesce(i.beutel, 0) as beutel, coalesce(i.kisten, 0) as kisten, coalesce(i.zu_klaeren, 0) as zu_klaeren
  from packliste_soll s
  full join ist i on i.service_id = s.service_id and i.produkt_id = s.produkt_id and i.einheit = s.einheit
)
select z.service_id, sv.anlass_id, sv.name as service, sv.reihenfolge, sv.datum,
       z.produkt_id, 'P' || lpad(p.nr::text, 4, '0') as produkt_code, p.name as produkt, p.kategorie,
       z.einheit, z.soll, z.ist, z.beutel, z.kisten, z.zu_klaeren,
       case when not z.im_bedarf then 'zusaetzlich'
            when z.soll is null then 'ohne_soll'
            when z.ist >= z.soll then 'erreicht'
            else 'offen' end as status,
       concat_ws('; ',
         case when z.im_bedarf then 'Soll ' || coalesce(trim_scale(z.soll)::text, '[Menge]') || ' ' || z.einheit || ' aus dem Bedarf des Spiels'
              else 'nicht im Bedarf dieses Spiels: zusätzlich gepackt' end,
         'Ist ' || trim_scale(z.ist)::text || ' ' || z.einheit || ' in ' || z.beutel || ' Beutel und ' || z.kisten || ' Kisten',
         case when z.zu_klaeren > 0 then z.zu_klaeren || ' Beutel zu klären (ohne Netz gescannt)' end
       ) as herleitung
from z
join service sv on sv.id = z.service_id
join produkt p on p.id = z.produkt_id;

comment on view public.packliste is 'Packliste pro Spiel: Soll und Ist je Produkt und Einheit. status: offen, erreicht, ohne_soll (Menge im Bedarf fehlt), zusaetzlich (nicht im Bedarf, nach Bestätigung gepackt).';

-- Was im Bedarf des Spiels steht, aber kein Etikett bekommt (Zukauf, offen, nur vor Ort, ohne Haltbarkeit, ohne Produkt):
-- eigener Abschnitt der Packliste, ohne Soll und Ist.
create view public.packliste_ohne_etikett with (security_invoker = true) as
select b.service_id, b.komponente_id, z.name as komponente, z.kategorie, b.einheit_total as einheit, round(b.menge, 3) as menge,
       case when z.status <> 'ok' then 'Status ' || z.status
            when z.nur_vor_ort then 'nur vor Ort'
            when z.haltbarkeit_tage is null then 'Haltbarkeit fehlt'
            else 'kein Produkt' end as grund
from service_komponente_bedarf b
join komponente_zuteilung z on z.id = b.komponente_id
join komponente k on k.id = b.komponente_id
where not (z.status = 'ok' and z.haltbarkeit_tage is not null and not z.nur_vor_ort and k.produkt_id is not null);

comment on view public.packliste_ohne_etikett is 'Packliste, Abschnitt «ohne Etikett»: Komponenten im Bedarf des Spiels, die nicht gescannt werden, mit Grund.';

-- Alle Felder des Kisten-Etiketts und der Stand der Kiste. Das Gewicht folgt mit S3.
create view public.etikett_kiste with (security_invoker = true) as
select ki.id as kiste_id, ki.code, ki.laufnummer, ki.zustand, ki.erstellt_am,
       (select count(*)::int from kiste x where x.service_id = ki.service_id and x.zustand <> 'aufgeloest') as kisten_im_spiel,
       ki.service_id, sv.name as service, sv.reihenfolge, sv.datum,
       sv.anlass_id, a.name as anlass, ml.name as menuelinie,
       ki.produkt_id, 'P' || lpad(p.nr::text, 4, '0') as produkt_code, p.name as produkt,
       coalesce(i.beutel, 0) as beutel, i.menge_text, i.fruehestes_datum, i.lagerung, coalesce(i.zu_klaeren, 0) as zu_klaeren,
       'https://gamma.atoll-os.com/e/?k=' || ki.code as qr_text
from kiste ki
join service sv on sv.id = ki.service_id
join anlass a on a.id = sv.anlass_id
left join menuelinie ml on ml.id = sv.menuelinie_id
left join produkt p on p.id = ki.produkt_id
left join lateral (
  select sum(m.beutel)::int as beutel, string_agg(trim_scale(m.menge)::text || ' ' || m.einheit, ' + ' order by m.einheit) as menge_text,
         min(m.fruehestes) as fruehestes_datum, sum(m.zu_klaeren)::int as zu_klaeren,
         (select string_agg(distinct case when k.lager_tk then 'TK −18 °C' when k.lager_0_2 then '0–2 °C' when k.lager_trocken then 'Economat' end, ', ')
          from lagereinheit e join charge c on c.id = e.charge_id join komponente k on k.id = c.komponente_id
          where e.kiste_id = ki.id and e.zustand in ('in_kiste', 'verbraucht')) as lagerung
  from (
    select e.einheit, count(*) as beutel, sum(e.menge) as menge, min(c.verbrauchen_bis) as fruehestes,
           count(*) filter (where e.klaeren is not null) as zu_klaeren
    from lagereinheit e join charge c on c.id = e.charge_id
    where e.kiste_id = ki.id and e.zustand in ('in_kiste', 'verbraucht')
    group by e.einheit
  ) m
) i on true;

comment on view public.etikett_kiste is 'Alle Felder des Kisten-Etiketts und der Stand jeder Kiste: Anlass, Menülinie, Spiel, ein Produkt mit Anzahl Beutel und Menge, frühestes Verbrauchsdatum. Packliste und (ab Etappe 3) ZPL lesen daraus.';

grant select on public.packliste_soll, public.packliste, public.packliste_ohne_etikett, public.etikett_kiste to authenticated;

-- 3. Kiste anlegen ------------------------------------------------------------------------------------------------
create function public.kiste_erstellen(p_service uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_benutzer uuid := auth.uid();
  v_code text;
  v_nr integer;
  v_kiste uuid;
  versuch integer := 0;
begin
  if not lager_recht('packen') then
    raise exception 'Keine Berechtigung zum Packen.' using errcode = '42501';
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
  insert into kiste (service_id, code, laufnummer, erstellt_von) values (p_service, v_code, v_nr, v_benutzer) returning id into v_kiste;
  insert into druckauftrag (kiste_id, erstellt_von) values (v_kiste, v_benutzer);
  return jsonb_build_object('kiste_id', v_kiste, 'code', v_code, 'laufnummer', v_nr);
end
$$;
comment on function public.kiste_erstellen(uuid) is 'Legt eine Kiste für ein Spiel an (Code, Laufnummer im Spiel) und den Druckauftrag für ihr Etikett.';

-- 4. Ein- und Auspacken -------------------------------------------------------------------------------------------
-- Stand einer Kiste für die Antwort eines Scans.
create function public.kiste_stand(p_kiste uuid)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object('code', k.code, 'laufnummer', k.laufnummer, 'zustand', k.zustand,
                            'produkt_code', k.produkt_code, 'produkt', k.produkt, 'beutel', k.beutel, 'menge', k.menge_text)
  from etikett_kiste k where k.kiste_id = p_kiste;
$$;
revoke execute on function public.kiste_stand(uuid) from public, anon, authenticated;

-- Scan eines Beutels in eine offene Kiste. Antwort: ergebnis (Code), farbe (gruen, gelb, rot), eingepackt, meldung,
-- hinweise (gelb, sperren nicht), bestaetigung (true: nochmals mit p_bestaetigt aufrufen), kiste (Stand), soll und ist.
-- Reihenfolge der Prüfungen wie in der Spezifikation. Ein wiederholter Aufruf mit demselben Beutel und derselben Kiste ändert nichts.
-- p_ohne_netz: Der Beutel wurde ohne Netz gescannt und liegt wirklich in der Kiste. Er wird immer eingebucht; spricht
-- eine Prüfung dagegen, steht ihr Code in lagereinheit.klaeren («zu klären»). Nicht eingebucht wird nur, was es nicht gibt
-- (unbekannter Code) oder was abgeschlossen ist (Beutel verbraucht oder entsorgt, Kiste abgeschlossen oder aufgelöst).
create function public.beutel_einpacken(
  p_seriennummer text, p_kiste text, p_bestaetigt boolean default false,
  p_zeitpunkt timestamptz default now(), p_ohne_netz boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_benutzer uuid := auth.uid();
  v_zeit timestamptz := least(coalesce(p_zeitpunkt, now()), now());
  v_tag date := (least(coalesce(p_zeitpunkt, now()), now()) at time zone 'Europe/Zurich')::date;
  v_kiste kiste%rowtype;
  v_einheit lagereinheit%rowtype;
  v_charge charge%rowtype;
  v_service service%rowtype;
  v_produkt text;
  v_soll numeric;
  v_im_bedarf boolean;
  v_ist numeric;
  v_aelter record;
  v_code text;          -- Ergebnis, das gegen das Einpacken spricht
  v_meldung text;
  v_rot boolean := false;
  v_hinweise jsonb := '[]'::jsonb;
  v_alt_kiste uuid;
begin
  if not lager_recht('packen') then
    raise exception 'Keine Berechtigung zum Packen.' using errcode = '42501';
  end if;

  select * into v_kiste from kiste k where k.code = upper(btrim(p_kiste)) for update;
  if not found then
    return jsonb_build_object('ergebnis', 'unbekannt', 'farbe', 'rot', 'eingepackt', false, 'meldung', 'Unbekannte Kiste.');
  end if;
  select * into v_einheit from lagereinheit e where e.seriennummer = upper(btrim(p_seriennummer)) for update;
  if not found then
    return jsonb_build_object('ergebnis', 'unbekannt', 'farbe', 'rot', 'eingepackt', false, 'meldung', 'Unbekannter Code.', 'kiste', kiste_stand(v_kiste.id));
  end if;
  select * into v_charge from charge c where c.id = v_einheit.charge_id;
  select * into v_service from service s where s.id = v_kiste.service_id;
  select p.name into v_produkt from produkt p where p.id = v_charge.produkt_id;

  -- Schon in dieser Kiste: nichts ändern. Mit Bestätigung gilt ein «zu klären» als geklärt.
  if v_einheit.zustand = 'in_kiste' and v_einheit.kiste_id = v_kiste.id then
    if v_einheit.klaeren is not null and p_bestaetigt and not p_ohne_netz then
      update lagereinheit set klaeren = null where id = v_einheit.id;
      insert into lagerbewegung (lagereinheit_id, art, grund, zeitpunkt, benutzer, kiste_id)
      values (v_einheit.id, 'korrektur', 'geklärt: ' || v_einheit.klaeren, v_zeit, v_benutzer, v_kiste.id);
      return jsonb_build_object('ergebnis', 'bestaetigt', 'farbe', 'gruen', 'eingepackt', true,
                                'meldung', v_produkt || ' bleibt in der Kiste, geklärt.', 'kiste', kiste_stand(v_kiste.id));
    end if;
    return jsonb_build_object('ergebnis', 'schon_in_kiste', 'farbe', 'gelb', 'eingepackt', false,
                              'meldung', 'Beutel ist schon in dieser Kiste, schon gezählt.', 'kiste', kiste_stand(v_kiste.id));
  end if;

  -- Was auch ohne Netz nie eingebucht wird.
  if v_kiste.zustand in ('abgeschlossen', 'aufgeloest') then
    return jsonb_build_object('ergebnis', 'kiste_nicht_offen', 'farbe', 'rot', 'eingepackt', false,
                              'meldung', 'Kiste ist ' || case v_kiste.zustand when 'abgeschlossen' then 'abgeschlossen' else 'aufgelöst' end || '.', 'kiste', kiste_stand(v_kiste.id));
  end if;
  if v_einheit.zustand in ('verbraucht', 'entsorgt') then
    return jsonb_build_object('ergebnis', v_einheit.zustand, 'farbe', 'rot', 'eingepackt', false,
                              'meldung', 'Beutel ist ' || v_einheit.zustand || '.', 'kiste', kiste_stand(v_kiste.id));
  end if;

  -- Rot: wird mit Netz nicht eingepackt. Die erste zutreffende Prüfung zählt.
  if v_kiste.zustand <> 'offen' then
    v_code := 'kiste_nicht_offen'; v_meldung := 'Kiste ist schon verladen.'; v_rot := true;
  elsif v_einheit.zustand = 'in_kiste' then
    v_code := 'andere_kiste';
    v_meldung := 'Beutel ist in einer anderen Kiste (' || (select k.code from kiste k where k.id = v_einheit.kiste_id) || ').';
    v_rot := true;
  elsif v_kiste.produkt_id is not null and v_kiste.produkt_id <> v_charge.produkt_id then
    v_code := 'anderes_produkt';
    v_meldung := 'Anderes Produkt als in der Kiste (' || (select p.name from produkt p where p.id = v_kiste.produkt_id) || ').';
    v_rot := true;
  elsif v_charge.verbrauchen_bis < greatest(coalesce(v_service.datum, v_tag), v_tag) then
    v_code := 'abgelaufen';
    v_meldung := 'Verbrauchsdatum ' || to_char(v_charge.verbrauchen_bis, 'DD.MM.YYYY')
                 || case when v_service.datum is not null and v_charge.verbrauchen_bis < v_service.datum
                         then ' liegt vor dem Service-Datum ' || to_char(v_service.datum, 'DD.MM.YYYY') || '.' else ' ist abgelaufen.' end;
    v_rot := true;
  end if;

  -- Gelb mit Bestätigung: nicht im Bedarf, Soll erreicht.
  if v_code is null then
    select s.soll, true into v_soll, v_im_bedarf from packliste_soll s
    where s.service_id = v_kiste.service_id and s.produkt_id = v_charge.produkt_id and s.einheit = v_einheit.einheit;
    v_im_bedarf := coalesce(v_im_bedarf, false);
    select coalesce(sum(e.menge), 0) into v_ist
    from lagereinheit e join kiste k on k.id = e.kiste_id join charge c on c.id = e.charge_id
    where k.service_id = v_kiste.service_id and c.produkt_id = v_charge.produkt_id and e.einheit = v_einheit.einheit
      and e.zustand in ('in_kiste', 'verbraucht');
    if not v_im_bedarf then
      v_code := 'nicht_im_bedarf'; v_meldung := v_produkt || ' steht nicht im Bedarf dieses Spiels. Als «zusätzlich» einpacken?';
    elsif v_soll is not null and v_ist >= v_soll then
      v_code := 'soll_erreicht';
      v_meldung := 'Soll ist schon erreicht (' || trim_scale(v_ist)::text || ' von ' || trim_scale(v_soll)::text || ' ' || v_einheit.einheit || '). Trotzdem einpacken?';
    end if;
  end if;

  if v_code is not null and not p_ohne_netz and (v_rot or not p_bestaetigt) then
    return jsonb_build_object('ergebnis', v_code, 'farbe', case when v_rot then 'rot' else 'gelb' end, 'eingepackt', false,
                              'meldung', v_meldung, 'bestaetigung', not v_rot, 'kiste', kiste_stand(v_kiste.id));
  end if;

  -- Hinweise, die nicht sperren.
  if v_service.datum is null then
    v_hinweise := v_hinweise || jsonb_build_object('code', 'service_ohne_datum', 'text', 'Service ohne Datum: Verbrauchsdatum nur gegen heute geprüft.');
  end if;
  select e.seriennummer, c.verbrauchen_bis into v_aelter
  from lagereinheit e join charge c on c.id = e.charge_id
  where c.produkt_id = v_charge.produkt_id and e.zustand = 'im_lager' and e.id <> v_einheit.id
    and c.verbrauchen_bis < v_charge.verbrauchen_bis and c.verbrauchen_bis >= greatest(coalesce(v_service.datum, v_tag), v_tag)
  order by c.verbrauchen_bis, e.seriennummer limit 1;
  if found then
    v_hinweise := v_hinweise || jsonb_build_object('code', 'aelterer_beutel',
      'text', 'Älterer Beutel im Lager: ' || v_aelter.seriennummer || ', bis ' || to_char(v_aelter.verbrauchen_bis, 'DD.MM.YYYY') || '.');
  end if;

  -- Einpacken. Ohne Netz aus einer anderen Kiste: dort auspacken, hier einpacken.
  if v_einheit.zustand = 'in_kiste' then
    v_alt_kiste := v_einheit.kiste_id;
    insert into lagerbewegung (lagereinheit_id, art, grund, zeitpunkt, benutzer, kiste_id)
    values (v_einheit.id, 'ausgepackt', 'ohne Netz in eine andere Kiste gescannt', v_zeit, v_benutzer, v_alt_kiste);
  end if;
  update lagereinheit set zustand = 'in_kiste', kiste_id = v_kiste.id,
         klaeren = case when p_ohne_netz and v_code is not null and not (p_bestaetigt and not v_rot) then v_code end
  where id = v_einheit.id;
  insert into lagerbewegung (lagereinheit_id, art, grund, zeitpunkt, benutzer, kiste_id)
  values (v_einheit.id, 'eingepackt',
          nullif(concat_ws('; ', case when p_ohne_netz then 'ohne Netz gescannt' end,
                                 case v_code when 'nicht_im_bedarf' then 'zusätzlich' when 'soll_erreicht' then 'über dem Soll' else v_code end), ''),
          v_zeit, v_benutzer, v_kiste.id);
  if v_kiste.produkt_id is null then
    update kiste set produkt_id = v_charge.produkt_id where id = v_kiste.id;
  end if;
  if v_alt_kiste is not null and not exists (select 1 from lagereinheit e where e.kiste_id = v_alt_kiste and e.zustand = 'in_kiste') then
    update kiste set produkt_id = null where id = v_alt_kiste;
  end if;

  if p_ohne_netz and v_code is not null and not (p_bestaetigt and not v_rot) then
    return jsonb_build_object('ergebnis', v_code, 'farbe', case when v_rot then 'rot' else 'gelb' end, 'eingepackt', true, 'klaeren', true,
                              'meldung', 'Eingebucht, zu klären: ' || v_meldung, 'hinweise', v_hinweise, 'kiste', kiste_stand(v_kiste.id));
  end if;
  return jsonb_build_object('ergebnis', 'ok', 'farbe', case when jsonb_array_length(v_hinweise) > 0 or v_code is not null then 'gelb' else 'gruen' end,
                            'eingepackt', true,
                            'meldung', v_produkt || case v_code when 'nicht_im_bedarf' then ' zusätzlich eingepackt.' when 'soll_erreicht' then ' über dem Soll eingepackt.' else ' eingepackt.' end,
                            'hinweise', v_hinweise, 'kiste', kiste_stand(v_kiste.id),
                            'soll', v_soll, 'ist', v_ist + v_einheit.menge, 'einheit', v_einheit.einheit);
end
$$;
comment on function public.beutel_einpacken(text, text, boolean, timestamptz, boolean) is 'Scannt einen Beutel in eine offene Kiste: prüft, bucht ein (Zustand in_kiste, Lagerbewegung) und gibt das Ergebnis zurück. Ohne Netz gescannte Beutel werden immer eingebucht; Abweichungen stehen in lagereinheit.klaeren.';

-- Beutel zurück ins Lager. Erlaubt, solange die Kiste offen oder angekommen ist.
create function public.beutel_auspacken(p_seriennummer text, p_zeitpunkt timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_benutzer uuid := auth.uid();
  v_zeit timestamptz := least(coalesce(p_zeitpunkt, now()), now());
  v_einheit lagereinheit%rowtype;
  v_kiste kiste%rowtype;
begin
  if not lager_recht('packen') then
    raise exception 'Keine Berechtigung zum Packen.' using errcode = '42501';
  end if;
  select * into v_einheit from lagereinheit e where e.seriennummer = upper(btrim(p_seriennummer));
  if not found then
    return jsonb_build_object('ergebnis', 'unbekannt', 'farbe', 'rot', 'ausgepackt', false, 'meldung', 'Unbekannter Code.');
  end if;
  if v_einheit.zustand <> 'in_kiste' then
    return jsonb_build_object('ergebnis', 'nicht_in_kiste', 'farbe', 'rot', 'ausgepackt', false,
                              'meldung', 'Beutel ist in keiner Kiste (Zustand: ' || replace(v_einheit.zustand, '_', ' ') || ').');
  end if;
  -- Zuerst die Kiste sperren, dann den Beutel (gleiche Reihenfolge wie beim Einpacken).
  select * into v_kiste from kiste k where k.id = v_einheit.kiste_id for update;
  select * into v_einheit from lagereinheit e where e.id = v_einheit.id for update;
  if v_einheit.zustand <> 'in_kiste' or v_einheit.kiste_id is distinct from v_kiste.id then
    return jsonb_build_object('ergebnis', 'nicht_in_kiste', 'farbe', 'rot', 'ausgepackt', false, 'meldung', 'Beutel wurde inzwischen umgepackt. Bitte nochmals scannen.');
  end if;
  if v_kiste.zustand not in ('offen', 'angekommen') then
    return jsonb_build_object('ergebnis', 'kiste_nicht_offen', 'farbe', 'rot', 'ausgepackt', false,
                              'meldung', 'Auspacken geht nur, solange die Kiste offen oder angekommen ist (Zustand: ' || v_kiste.zustand || ').', 'kiste', kiste_stand(v_kiste.id));
  end if;
  update lagereinheit set zustand = 'im_lager', kiste_id = null, klaeren = null where id = v_einheit.id;
  insert into lagerbewegung (lagereinheit_id, art, zeitpunkt, benutzer, kiste_id) values (v_einheit.id, 'ausgepackt', v_zeit, v_benutzer, v_kiste.id);
  if not exists (select 1 from lagereinheit e where e.kiste_id = v_kiste.id and e.zustand = 'in_kiste') then
    update kiste set produkt_id = null where id = v_kiste.id;
  end if;
  return jsonb_build_object('ergebnis', 'ok', 'farbe', 'gruen', 'ausgepackt', true, 'meldung', 'Beutel ist zurück im Lager.', 'kiste', kiste_stand(v_kiste.id));
end
$$;
comment on function public.beutel_auspacken(text, timestamptz) is 'Packt einen Beutel aus seiner Kiste aus (zurück im Lager), solange die Kiste offen oder angekommen ist.';

-- Alle Beutel einer Kiste zurück ins Lager, die Kiste gilt danach als aufgelöst (zählt nicht mehr, bleibt als Verlauf stehen).
create function public.kiste_aufloesen(p_kiste text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_benutzer uuid := auth.uid();
  v_kiste kiste%rowtype;
  v_n integer;
begin
  if not lager_recht('packen') then
    raise exception 'Keine Berechtigung zum Packen.' using errcode = '42501';
  end if;
  select * into v_kiste from kiste k where k.code = upper(btrim(p_kiste)) for update;
  if not found then
    raise exception 'Kiste nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_kiste.zustand not in ('offen', 'angekommen') then
    raise exception 'Auflösen geht nur, solange die Kiste offen oder angekommen ist (Zustand: %).', v_kiste.zustand using errcode = '23514';
  end if;
  with aus as (
    update lagereinheit set zustand = 'im_lager', kiste_id = null, klaeren = null
    where kiste_id = v_kiste.id and zustand = 'in_kiste' returning id
  ), bew as (
    insert into lagerbewegung (lagereinheit_id, art, grund, benutzer, kiste_id)
    select id, 'ausgepackt', 'Kiste aufgelöst', v_benutzer, v_kiste.id from aus returning 1
  )
  select count(*) into v_n from bew;
  update kiste set zustand = 'aufgeloest', produkt_id = null where id = v_kiste.id;
  delete from druckauftrag d where d.kiste_id = v_kiste.id and d.status = 'offen';
  return jsonb_build_object('code', v_kiste.code, 'zustand', 'aufgeloest', 'beutel', v_n);
end
$$;
comment on function public.kiste_aufloesen(text) is 'Packt alle Beutel einer Kiste aus (zurück im Lager) und löst die Kiste auf. Auch für ein abgesagtes Spiel.';

-- 5. Verladen und Ankunft -----------------------------------------------------------------------------------------
-- Scan einer Kiste in der Stufe «verladen» oder «angekommen». Jeder Scan wird gespeichert, auch der abgelehnte.
-- Dieselbe Scan-Nummer nochmals: das gespeicherte Ergebnis kommt zurück, gespeichert wird nichts.
-- Zählt: ok. Zählt nicht: anderes Spiel, schon gescannt, unbekannt, Kiste abgeschlossen oder aufgelöst.
create function public.scan_erfassen(
  p_code text, p_service uuid, p_stufe text, p_scan_nummer uuid, p_quelle text, p_zeitpunkt timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_benutzer uuid := auth.uid();
  v_zeit timestamptz := least(coalesce(p_zeitpunkt, now()), now());
  v_alt jsonb;
  v_text text := upper(btrim(coalesce(p_code, '')));
  v_code text;
  v_kiste kiste%rowtype;
  v_ergebnis text;
  v_farbe text;
  v_meldung text;
  v_hinweise jsonb := '[]'::jsonb;
  v_antwort jsonb;
  v_offen integer;
begin
  if not lager_recht('packen') then
    raise exception 'Keine Berechtigung zum Scannen.' using errcode = '42501';
  end if;
  if p_stufe is null or p_stufe not in ('verladen', 'angekommen') then
    raise exception 'Stufe: verladen oder angekommen.' using errcode = '22023';
  end if;
  if p_quelle is null or p_quelle not in ('ios', 'web') then
    raise exception 'Quelle: ios oder web.' using errcode = '22023';
  end if;
  if p_scan_nummer is null then
    raise exception 'Scan-Nummer fehlt.' using errcode = '22023';
  end if;
  -- Gleichzeitige Scans desselben Spiels nacheinander (zwei Geräte, doppelt gesendete Scans).
  perform 1 from service s where s.id = p_service for update;
  if not found then
    raise exception 'Spiel nicht gefunden.' using errcode = 'P0002';
  end if;
  select s.antwort into v_alt from scan s where s.scan_nummer = p_scan_nummer;
  if found then
    return v_alt || jsonb_build_object('wiederholt', true);
  end if;

  -- Der Code steht allein oder in der Adresse des QR-Codes (…/e/?k=K-XXXXXX).
  v_code := substring(v_text from 'K-[A-HJKMNP-Z2-9]{6}');
  if v_code is not null then
    select * into v_kiste from kiste k where k.code = v_code for update;
  end if;

  if v_kiste.id is null then
    v_ergebnis := 'unbekannt'; v_farbe := 'rot'; v_meldung := 'Unbekannter Code.';
  elsif v_kiste.service_id <> p_service then
    v_ergebnis := 'anderes_spiel'; v_farbe := 'rot';
    v_meldung := 'Kiste gehört zu einem anderen Spiel (' || (select s.name from service s where s.id = v_kiste.service_id) || ').';
  elsif v_kiste.zustand in ('abgeschlossen', 'aufgeloest') then
    v_ergebnis := 'kiste_nicht_offen'; v_farbe := 'rot';
    v_meldung := 'Kiste ist ' || case v_kiste.zustand when 'abgeschlossen' then 'abgeschlossen' else 'aufgelöst' end || '.';
  elsif (p_stufe = 'verladen' and v_kiste.zustand in ('verladen', 'angekommen')) or (p_stufe = 'angekommen' and v_kiste.zustand = 'angekommen') then
    v_ergebnis := 'schon_gescannt'; v_farbe := 'rot'; v_meldung := 'Kiste ist schon gescannt.';
  else
    v_ergebnis := 'ok'; v_farbe := 'gruen';
    v_meldung := 'Kiste ' || v_kiste.laufnummer || case p_stufe when 'verladen' then ' verladen.' else ' angekommen.' end;
    if not exists (select 1 from lagereinheit e where e.kiste_id = v_kiste.id and e.zustand = 'in_kiste') then
      v_hinweise := v_hinweise || jsonb_build_object('code', 'kiste_leer', 'text', 'Kiste ist leer.');
    end if;
    if p_stufe = 'angekommen' and v_kiste.zustand = 'offen' then
      v_hinweise := v_hinweise || jsonb_build_object('code', 'nicht_verladen', 'text', 'Kiste wurde beim Verladen nicht gescannt.');
    end if;
    if p_stufe = 'verladen' then
      select count(*) into v_offen from packliste p where p.service_id = p_service and p.status in ('offen', 'ohne_soll');
      if v_offen > 0 then
        v_hinweise := v_hinweise || jsonb_build_object('code', 'soll_offen', 'text', 'Soll des Spiels ist noch nicht gepackt: ' || v_offen || ' Produkte offen.');
      end if;
    end if;
    if jsonb_array_length(v_hinweise) > 0 then
      v_farbe := 'gelb';
    end if;
    update kiste set zustand = p_stufe where id = v_kiste.id;
  end if;

  v_antwort := jsonb_build_object('ergebnis', v_ergebnis, 'farbe', v_farbe, 'zaehlt', v_ergebnis = 'ok', 'meldung', v_meldung, 'hinweise', v_hinweise,
    'kiste', case when v_kiste.id is not null then kiste_stand(v_kiste.id) end,
    -- Stand der Stufe im Spiel: «14 von 18 Kisten».
    'kisten_gescannt', (select count(*) from kiste k where k.service_id = p_service
                        and k.zustand = any (case p_stufe when 'verladen' then array['verladen', 'angekommen', 'abgeschlossen'] else array['angekommen', 'abgeschlossen'] end)),
    'kisten_total', (select count(*) from kiste k where k.service_id = p_service and k.zustand <> 'aufgeloest'));
  insert into scan (scan_nummer, quelle, service_id, stufe, code, kiste_id, ergebnis, antwort, zeitpunkt, benutzer)
  values (p_scan_nummer, p_quelle, p_service, p_stufe, left(btrim(coalesce(p_code, '')), 500), v_kiste.id, v_ergebnis, v_antwort, v_zeit, v_benutzer);
  return v_antwort;
end
$$;
comment on function public.scan_erfassen(text, uuid, text, uuid, text, timestamptz) is 'Scan einer Kiste beim Verladen oder bei der Ankunft: prüft, setzt den Zustand der Kiste, speichert den Scan und gibt das Ergebnis zurück. Dieselbe Scan-Nummer wird nur einmal gespeichert.';

-- 6. Abschluss des Spiels -----------------------------------------------------------------------------------------
-- Angekommene Kisten: alle Beutel «verbraucht». Kisten ohne Ankunfts-Scan brauchen einen Entscheid pro Kiste
-- (p_entscheide: {"K-XXXXXX": "verbraucht" | "lager" | "entsorgt"}); fehlt einer, bricht die Funktion ab und nennt die Kisten.
-- «lager» (zurück ins Lager, Verbrauchsdatum unverändert) geht nur für Kisten, die nie verladen wurden: ob und mit welchem
-- Datum Ware vom Anlassort zurück ins Lager darf, ist offen (Spezifikation, Punkt 7).
create function public.service_abschliessen(p_service uuid, p_entscheide jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_benutzer uuid := auth.uid();
  v_kiste kiste%rowtype;
  v_entscheid text;
  v_fehlen text;
  v_klaeren integer;
  v_n integer;
  v_verbraucht integer := 0;
  v_lager integer := 0;
  v_entsorgt integer := 0;
  v_kisten integer := 0;
begin
  if not lager_recht('spiel_abschliessen') then
    raise exception 'Keine Berechtigung, ein Spiel abzuschliessen.' using errcode = '42501';
  end if;
  perform 1 from service s where s.id = p_service for update;
  if not found then
    raise exception 'Spiel nicht gefunden.' using errcode = 'P0002';
  end if;
  perform 1 from kiste k where k.service_id = p_service for update;

  select count(*) into v_klaeren from lagereinheit e join kiste k on k.id = e.kiste_id
  where k.service_id = p_service and e.zustand = 'in_kiste' and e.klaeren is not null;
  if v_klaeren > 0 then
    raise exception '% Beutel sind noch zu klären (ohne Netz gescannt). Zuerst auspacken oder bestätigen.', v_klaeren using errcode = '23514';
  end if;

  select string_agg(k.code || ' (Kiste ' || k.laufnummer || ', ' || k.zustand || ')', ', ' order by k.laufnummer) into v_fehlen
  from kiste k
  where k.service_id = p_service and k.zustand in ('offen', 'verladen')
    and exists (select 1 from lagereinheit e where e.kiste_id = k.id and e.zustand = 'in_kiste')
    and coalesce(p_entscheide->>k.code, '') not in ('verbraucht', 'lager', 'entsorgt');
  if v_fehlen is not null then
    raise exception 'Kisten ohne Ankunfts-Scan brauchen einen Entscheid (verbraucht, zurück ins Lager oder entsorgt): %', v_fehlen using errcode = '23514';
  end if;

  for v_kiste in select * from kiste k where k.service_id = p_service and k.zustand in ('offen', 'verladen', 'angekommen') order by k.laufnummer loop
    v_entscheid := case when v_kiste.zustand = 'angekommen' then 'verbraucht' else coalesce(p_entscheide->>v_kiste.code, 'verbraucht') end;
    if v_entscheid = 'lager' and v_kiste.zustand <> 'offen' then
      raise exception 'Kiste % war verladen: zurück ins Lager geht nur für Kisten, die nie verladen wurden.', v_kiste.code using errcode = '23514';
    end if;
    if v_entscheid = 'entsorgt' and not lager_recht('entsorgen') then
      raise exception 'Ware entsorgen dürfen nur Admins.' using errcode = '42501';
    end if;
    with geaendert as (
      update lagereinheit set
        zustand = case v_entscheid when 'verbraucht' then 'verbraucht' when 'lager' then 'im_lager' else 'entsorgt' end,
        kiste_id = case when v_entscheid = 'lager' then null else kiste_id end
      where kiste_id = v_kiste.id and zustand = 'in_kiste' returning id
    ), bew as (
      insert into lagerbewegung (lagereinheit_id, art, grund, benutzer, kiste_id)
      select id, case v_entscheid when 'verbraucht' then 'verbraucht' when 'lager' then 'ausgepackt' else 'entsorgt' end,
             'Abschluss des Spiels' || case when v_kiste.zustand <> 'angekommen' then ', Kiste ohne Ankunfts-Scan' else '' end, v_benutzer, v_kiste.id
      from geaendert returning 1
    )
    select count(*) into v_n from bew;
    if v_entscheid = 'verbraucht' then v_verbraucht := v_verbraucht + v_n;
    elsif v_entscheid = 'lager' then v_lager := v_lager + v_n;
    else v_entsorgt := v_entsorgt + v_n;
    end if;
    update kiste set zustand = 'abgeschlossen', produkt_id = case when v_entscheid = 'lager' then null else produkt_id end where id = v_kiste.id;
    delete from druckauftrag d where d.kiste_id = v_kiste.id and d.status = 'offen';
    v_kisten := v_kisten + 1;
  end loop;

  return jsonb_build_object('kisten', v_kisten, 'verbraucht', v_verbraucht, 'zurueck_im_lager', v_lager, 'entsorgt', v_entsorgt);
end
$$;
comment on function public.service_abschliessen(uuid, jsonb) is 'Schliesst ein Spiel ab: Beutel angekommener Kisten sind verbraucht; Kisten ohne Ankunfts-Scan brauchen einen Entscheid pro Kiste. Zurück ins Lager nur für nie verladene Kisten.';

revoke execute on function public.kiste_erstellen(uuid) from public, anon;
revoke execute on function public.beutel_einpacken(text, text, boolean, timestamptz, boolean) from public, anon;
revoke execute on function public.beutel_auspacken(text, timestamptz) from public, anon;
revoke execute on function public.kiste_aufloesen(text) from public, anon;
revoke execute on function public.scan_erfassen(text, uuid, text, uuid, text, timestamptz) from public, anon;
revoke execute on function public.service_abschliessen(uuid, jsonb) from public, anon;
grant execute on function public.kiste_erstellen(uuid) to authenticated;
grant execute on function public.beutel_einpacken(text, text, boolean, timestamptz, boolean) to authenticated;
grant execute on function public.beutel_auspacken(text, timestamptz) to authenticated;
grant execute on function public.kiste_aufloesen(text) to authenticated;
grant execute on function public.scan_erfassen(text, uuid, text, uuid, text, timestamptz) to authenticated;
grant execute on function public.service_abschliessen(uuid, jsonb) to authenticated;
