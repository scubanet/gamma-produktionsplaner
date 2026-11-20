-- Lager, Etappe 2 (20.11.2026). Spezifikation: docs/spezifikation-etiketten-packliste.md, Fassung 2.
--  1. etikett_vorschlag: beutel_rest leer statt 0, wenn es keinen Vorschlag gibt
--  2. lager_recht: eine Stelle, die prüft, wer was darf (die Arbeit «Stufen» ersetzt sie später)
--  3. lager_einheit, lager_bestand: Stand pro Beutel und pro Produkt
--  4. lager_bedarf: Bedarf der Spiele gegen den Bestand
--  5. produkt_einlagern: Beutel ohne Welle anlegen (Anfangsbestand, Produktion ausserhalb einer Welle)
--  6. einheit_ausbuchen: Beutel entsorgen

-- 1. Vorschlag ----------------------------------------------------------------------------------------------------
-- Unverändert wie Migration 41, nur beutel_rest: greatest(null, 0) ergäbe 0; ohne Vorschlag soll der Rest leer sein.
create or replace view public.etikett_vorschlag with (security_invoker = true) as
with s0 as (
  -- Hat ein Service der Komponente kein Datum oder liegt er vor der ersten Welle, ist die Verteilung auf die Wellen
  -- unbekannt (wie in wellen_vorschlag): dann gibt es für keine Welle der Komponente einen Vorschlag.
  select b.*, (count(*) filter (where b.welle_nr is null)
               over (partition by b.saison_id, b.komponente_id, b.einheit_total))::int as ohne_welle
  from bedarf_service_welle b
), s as (
  select w.saison_id, w.komponente_id, w.welle_nr, w.einheit_total, w.service, w.reihenfolge, w.datum, w.menge, w.zeilen_ohne_menge, w.ohne_welle,
         r.beutel_g,
         case when w.ohne_welle = 0 and w.einheit_total in ('kg', 'l') and w.menge is not null and r.beutel_g is not null
              then ceil(w.menge * 1000 / r.beutel_g)::int end as beutel
  from s0 w
  join komponente k on k.id = w.komponente_id
  left join rezept r on r.id = k.rezept_id
  where w.welle_nr is not null
), g as (
  select s.saison_id, s.komponente_id, s.welle_nr, s.einheit_total, min(s.beutel_g) as beutel_g,
         count(*)::int as services,
         count(*) filter (where s.menge is null)::int as services_ohne_menge,
         max(s.ohne_welle) as services_ohne_welle,
         case when max(s.ohne_welle) = 0 and count(*) filter (where s.menge is null) = 0 then round(sum(s.menge), 3) end as menge_welle,
         case when count(*) filter (where s.beutel is null) = 0 then sum(s.beutel)::int end as beutel,
         string_agg(s.service || ': ' || coalesce(trim_scale(round(s.menge, 3))::text, '[Menge]') || ' ' || s.einheit_total
                    || coalesce(' ÷ ' || trim_scale(round(s.beutel_g / 1000, 3))::text || ' kg = ' || s.beutel || ' Beutel', ''),
                    ' + ' order by s.datum, s.reihenfolge) as je_service
  from s
  group by s.saison_id, s.komponente_id, s.welle_nr, s.einheit_total
), da as (
  -- Schon etikettiert für diese Zeile der Checkliste.
  select c.saison_id, c.komponente_id, c.welle_nr, e.einheit, count(*)::int as beutel, sum(e.menge) as menge
  from charge c
  join lagereinheit e on e.charge_id = c.id
  where e.zustand <> 'entsorgt'
  group by c.saison_id, c.komponente_id, c.welle_nr, e.einheit
)
select g.saison_id, g.komponente_id, g.welle_nr, g.einheit_total as einheit,
       g.menge_welle, g.beutel_g,
       case when g.einheit_total in ('kg', 'l') then round(g.beutel_g / 1000, 3) end as menge_pro_beutel,
       g.beutel,
       g.einheit_total = 'l' as liter_annahme,
       case
         when k.produkt_id is null then 'kein Produkt'
         when k.rezept_id is null then 'kein Rezept'
         when g.services_ohne_welle > 0 then 'Service ohne Datum oder vor der ersten Welle'
         when g.services_ohne_menge > 0 then 'Menge fehlt'
         when g.einheit_total = 'Stk' then 'Stück: Anzahl von Hand'
         when g.beutel_g is null then 'Füllmenge pro Beutel fehlt'
         else 'gerechnet'
       end as status,
       coalesce(da.beutel, 0) as beutel_vorhanden,
       -- Was nach den schon etikettierten Beuteln noch fehlt (nie unter 0); ohne Vorschlag leer.
       case when g.beutel is not null then greatest(g.beutel - coalesce(da.beutel, 0), 0) end as beutel_rest,
       coalesce(da.menge, 0) as menge_vorhanden,
       concat_ws('; ',
         case when g.services_ohne_welle > 0
              then g.services_ohne_welle || ' Service(s) ohne Datum oder vor der ersten Welle: Verteilung auf die Wellen unbekannt' end,
         g.je_service,
         case when g.beutel is not null and g.beutel_g is not null
              then 'zusammen ' || g.beutel || ' Beutel = ' || trim_scale(round(g.beutel * g.beutel_g / 1000, 3))::text || ' ' || g.einheit_total
                   || ' (Bedarf der Welle ' || coalesce(trim_scale(g.menge_welle)::text, '[Menge]') || ' ' || g.einheit_total || '; pro Spiel aufgerundet)' end,
         case when g.einheit_total = 'l' and g.beutel is not null then 'Annahme: 1 l = 1 kg' end,
         case when g.einheit_total = 'Stk' then 'Stück lassen sich nicht in Beutel umrechnen' end,
         case when g.beutel_g is null and g.einheit_total <> 'Stk' and k.rezept_id is not null then 'Füllmenge pro Beutel am Rezept erfassen' end
       ) as herleitung,
       -- Für die Vorschau des Etiketts, mit denselben Ausdrücken wie etikett_beutel.
       'P' || lpad(p.nr::text, 4, '0') as produkt_code, p.name as produkt, p.kategorie,
       k.lager_tk as tk,
       case when k.lager_tk then 'TK −18 °C' when k.lager_0_2 then '0–2 °C' when k.lager_trocken then 'Economat' end as lagerung,
       (select string_agg(ra.name, ', ' order by ra.reihenfolge)
        from regenerationsart ra where ra.code = any (k.regeneration)) as regeneration,
       'siehe Rezept'::text as allergene
from g
join komponente k on k.id = g.komponente_id
left join produkt p on p.id = k.produkt_id
left join da on da.saison_id = g.saison_id and da.komponente_id = g.komponente_id and da.welle_nr = g.welle_nr and da.einheit = g.einheit_total;

-- 2. Rechte -------------------------------------------------------------------------------------------------------
-- Bis die Stufen (Admin, Benutzer, Küche) gebaut sind: Einlagern und Ausbuchen von nicht produzierten Etiketten dürfen
-- alle Angemeldeten, Entsorgen von Ware nur Admins. Jede Lager-Funktion fragt hier; die Arbeit «Stufen» ersetzt den Körper.
create function public.lager_recht(p_recht text)
returns boolean
language sql
stable
set search_path = public
as $$
  select (select auth.uid()) is not null
     and case p_recht
           when 'einlagern' then true
           when 'etikett_stornieren' then true
           when 'entsorgen' then ist_admin()
           else false
         end;
$$;
comment on function public.lager_recht(text) is 'Darf der angemeldete Benutzer das? Rechte: einlagern, etikett_stornieren, entsorgen. Einzige Stelle für die Rechte des Lagers.';
revoke execute on function public.lager_recht(text) from public, anon;
grant execute on function public.lager_recht(text) to authenticated;

-- 3. Stand pro Beutel und pro Produkt -----------------------------------------------------------------------------
-- «heute» ist der Tag in der Schweiz. Ein Beutel ist abgelaufen, wenn sein Verbrauchsdatum vor heute liegt.
create view public.lager_einheit with (security_invoker = true) as
select e.id as lagereinheit_id, e.seriennummer, e.laufnummer, e.menge, e.einheit, e.zustand, e.erstellt_am,
       c.id as charge_id, c.produziert_am, c.verbrauchen_bis, c.datum_annahme, c.saison_id, c.welle_nr,
       c.verbrauchen_bis - (now() at time zone 'Europe/Zurich')::date as tage_bis_ablauf,
       c.verbrauchen_bis < (now() at time zone 'Europe/Zurich')::date as abgelaufen,
       p.id as produkt_id, p.nr as produkt_nr, 'P' || lpad(p.nr::text, 4, '0') as produkt_code, p.name as produkt, p.kategorie,
       c.komponente_id,
       case when k.lager_tk then 'TK −18 °C' when k.lager_0_2 then '0–2 °C' when k.lager_trocken then 'Economat' end as lagerung,
       (select b.grund from lagerbewegung b where b.lagereinheit_id = e.id and b.art = 'entsorgt' order by b.zeitpunkt desc limit 1) as entsorgt_grund,
       -- Das Verbrauchsdatum ist an der Charge festgehalten. Hat die Systemzuteilung seither eine andere Haltbarkeit, zeigt das Lager einen Hinweis.
       c.haltbarkeit_tage, z.haltbarkeit_tage as haltbarkeit_heute,
       c.haltbarkeit_tage is distinct from z.haltbarkeit_tage as haltbarkeit_abweichend
from lagereinheit e
join charge c on c.id = e.charge_id
join produkt p on p.id = c.produkt_id
join komponente k on k.id = c.komponente_id
join komponente_zuteilung z on z.id = c.komponente_id;

comment on view public.lager_einheit is 'Lager: jeder Beutel mit Produkt, Charge, Zustand und Ablauf (tage_bis_ablauf negativ = abgelaufen).';

-- Bestand pro Produkt und Einheit: nur Beutel im Zustand «im Lager». Abgelaufene zählen nicht zum verfügbaren Bestand.
create view public.lager_bestand with (security_invoker = true) as
select l.produkt_id, l.produkt_nr, l.produkt_code, l.produkt, l.kategorie, l.einheit,
       count(*) filter (where not l.abgelaufen)::int as beutel,
       coalesce(sum(l.menge) filter (where not l.abgelaufen), 0) as menge,
       min(l.verbrauchen_bis) filter (where not l.abgelaufen) as fruehestes_datum,
       min(l.tage_bis_ablauf) filter (where not l.abgelaufen) as tage_bis_ablauf,
       count(*) filter (where l.abgelaufen)::int as beutel_abgelaufen,
       coalesce(sum(l.menge) filter (where l.abgelaufen), 0) as menge_abgelaufen,
       string_agg(distinct l.lagerung, ', ') as lagerung
from lager_einheit l
where l.zustand = 'im_lager'
group by l.produkt_id, l.produkt_nr, l.produkt_code, l.produkt, l.kategorie, l.einheit;

comment on view public.lager_bestand is 'Lager: verfügbarer Bestand pro Produkt und Einheit (ohne abgelaufene Beutel), frühestes Verbrauchsdatum, abgelaufene Beutel getrennt.';

-- 4. Bedarf gegen Bestand -----------------------------------------------------------------------------------------
-- Pro Spiel und Produkt: was das Spiel braucht und was dafür im Lager liegt. Es zählen nur Beutel, deren Verbrauchsdatum
-- am Service-Datum noch gültig ist, und nur Komponenten, die ein Etikett bekommen (Status ok, mit Haltbarkeit, nicht nur vor Ort).
-- Der Bestand wird nicht auf die Spiele verteilt: derselbe Beutel steht bei jedem Spiel, für das er reicht.
create view public.lager_bedarf with (security_invoker = true) as
select b.saison_id, b.anlass_id, a.name as anlass, b.service_id, b.service, b.reihenfolge, b.datum,
       k.produkt_id, 'P' || lpad(p.nr::text, 4, '0') as produkt_code, p.name as produkt, b.komponente_id,
       b.einheit_total as einheit, round(b.menge, 3) as bedarf,
       coalesce(l.beutel, 0) as beutel_im_lager, coalesce(l.menge, 0) as menge_im_lager,
       case when b.menge is null then null else coalesce(l.menge, 0) >= b.menge end as gedeckt,
       concat_ws('; ',
         'Bedarf ' || coalesce(trim_scale(round(b.menge, 3))::text, '[Menge]') || ' ' || b.einheit_total,
         'im Lager ' || trim_scale(coalesce(l.menge, 0))::text || ' ' || b.einheit_total || ' in ' || coalesce(l.beutel, 0) || ' Beutel'
           || coalesce(', haltbar bis mindestens ' || to_char(b.datum, 'DD.MM.YYYY'), ' (Service ohne Datum: alle nicht abgelaufenen)'),
         'nicht auf die Spiele verteilt'
       ) as herleitung
from service_komponente_bedarf b
join anlass a on a.id = b.anlass_id
join komponente_zuteilung z on z.id = b.komponente_id
join komponente k on k.id = b.komponente_id
left join produkt p on p.id = k.produkt_id
left join lateral (
  select count(*)::int as beutel, sum(e.menge) as menge
  from lager_einheit e
  where e.produkt_id = k.produkt_id and e.einheit = b.einheit_total and e.zustand = 'im_lager'
    and not e.abgelaufen and (b.datum is null or e.verbrauchen_bis >= b.datum)
) l on true
where z.status = 'ok' and z.haltbarkeit_tage is not null and not z.nur_vor_ort;

comment on view public.lager_bedarf is 'Lager gegen Bedarf: pro Spiel und Produkt der Bedarf und der Bestand, der am Service-Datum noch haltbar ist. Nicht auf die Spiele verteilt.';

-- 5. Einlagern ohne Welle -----------------------------------------------------------------------------------------
-- Anfangsbestand und Produktion ausserhalb einer Welle. Die Komponente liefert Produkt, Lagerung und Haltbarkeit.
-- Das Produktionsdatum ist von Hand gesetzt (Annahme) und darf nicht in der Zukunft liegen.
create function public.produkt_einlagern(
  p_komponente uuid, p_anzahl integer, p_menge numeric, p_einheit text, p_produziert_am date, p_verbrauchen_bis date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_benutzer uuid := auth.uid();
  v_heute date := (now() at time zone 'Europe/Zurich')::date;
  v_produkt uuid;
  v_tage integer;
  v_bis date;
  v_charge uuid;
  v_charge_bis date;
  v_start integer;
  v_einheit uuid;
  v_serie text;
  v_serien text[] := '{}';
  i integer;
  versuch integer;
begin
  if not lager_recht('einlagern') then
    raise exception 'Keine Berechtigung zum Einlagern.' using errcode = '42501';
  end if;
  if p_anzahl is null or p_anzahl < 1 or p_anzahl > 500 then
    raise exception 'Anzahl Beutel: eine ganze Zahl von 1 bis 500.' using errcode = '22023';
  end if;
  if p_menge is null or p_menge <= 0 then
    raise exception 'Menge pro Beutel: eine Zahl über 0.' using errcode = '22023';
  end if;
  if p_einheit is null or p_einheit not in ('kg', 'l', 'Stk') then
    raise exception 'Einheit: kg, l oder Stk.' using errcode = '22023';
  end if;
  if p_produziert_am is null or p_produziert_am > v_heute then
    raise exception 'Produktionsdatum: heute oder früher.' using errcode = '22023';
  end if;

  select k.produkt_id, z.haltbarkeit_tage into v_produkt, v_tage
  from komponente k join komponente_zuteilung z on z.id = k.id
  where k.id = p_komponente;
  if not found then
    raise exception 'Komponente nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_produkt is null then
    raise exception 'Diese Komponente ist noch keinem Produkt zugeordnet.' using errcode = '23514';
  end if;

  -- Gleichzeitige Aufrufe für dieselbe Komponente nacheinander, damit Charge und Laufnummern eindeutig bleiben.
  perform 1 from komponente k where k.id = p_komponente for update;

  select c.id, c.verbrauchen_bis into v_charge, v_charge_bis from charge c
  where c.komponente_id = p_komponente and c.saison_id is null and c.welle_nr is null and c.produziert_am = p_produziert_am;

  if v_charge is not null then
    if p_verbrauchen_bis is not null and p_verbrauchen_bis <> v_charge_bis then
      raise exception 'Für diesen Produktionstag gibt es schon Beutel, verbrauchen bis %. Weitere Beutel bekommen dasselbe Datum.', to_char(v_charge_bis, 'DD.MM.YYYY') using errcode = '23514';
    end if;
    v_bis := v_charge_bis;
  else
    if v_tage is not null then
      v_bis := p_produziert_am + v_tage;
      if p_verbrauchen_bis is not null and p_verbrauchen_bis > v_bis then
        raise exception 'Das Verbrauchsdatum lässt sich nur kürzen, nicht über die Haltbarkeit hinaus verlängern.' using errcode = '23514';
      end if;
      v_bis := coalesce(p_verbrauchen_bis, v_bis);
    elsif p_verbrauchen_bis is not null then
      v_bis := p_verbrauchen_bis;
    else
      raise exception 'Die Haltbarkeit fehlt: bitte das Verbrauchsdatum von Hand setzen.' using errcode = '23514';
    end if;
    if v_bis < p_produziert_am then
      raise exception 'Das Verbrauchsdatum liegt vor dem Produktionsdatum.' using errcode = '23514';
    end if;
    -- Ohne Welle ist das Produktionsdatum immer von Hand gesetzt.
    insert into charge (produkt_id, komponente_id, saison_id, welle_nr, produziert_am, haltbarkeit_tage, verbrauchen_bis, datum_annahme, erstellt_von)
    values (v_produkt, p_komponente, null, null, p_produziert_am, v_tage, v_bis, true, v_benutzer)
    returning id into v_charge;
  end if;

  select coalesce(max(e.laufnummer), 0) into v_start from lagereinheit e where e.charge_id = v_charge;

  for i in 1..p_anzahl loop
    versuch := 0;
    loop
      versuch := versuch + 1;
      select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') into v_serie from generate_series(1, 8);
      exit when not exists (select 1 from lagereinheit e where e.seriennummer = v_serie);
      if versuch > 20 then
        raise exception 'Keine freie Seriennummer gefunden, bitte nochmals versuchen.' using errcode = '40001';
      end if;
    end loop;
    insert into lagereinheit (charge_id, seriennummer, laufnummer, menge, einheit)
    values (v_charge, v_serie, v_start + i, p_menge, p_einheit)
    returning id into v_einheit;
    insert into lagerbewegung (lagereinheit_id, art, grund, benutzer) values (v_einheit, 'eingang', 'ohne Welle eingelagert', v_benutzer);
    insert into druckauftrag (lagereinheit_id, erstellt_von) values (v_einheit, v_benutzer);
    v_serien := v_serien || v_serie;
  end loop;

  return jsonb_build_object('charge_id', v_charge, 'anzahl', p_anzahl, 'produziert_am', p_produziert_am,
                            'verbrauchen_bis', v_bis, 'seriennummern', to_jsonb(v_serien));
end
$$;

comment on function public.produkt_einlagern(uuid, integer, numeric, text, date, date) is 'Legt Beutel ohne Welle an (Anfangsbestand, Produktion ausserhalb einer Welle): Charge ohne Saison und Welle, Beutel im Lager, Druckaufträge.';

-- 6. Ausbuchen ----------------------------------------------------------------------------------------------------
-- Ein Beutel im Lager wird «entsorgt». Gründe: abgelaufen, beschädigt, Qualität (nur mit dem Recht «entsorgen») oder
-- nicht produziert (zu viele Etiketten angelegt; das Recht «etikett_stornieren»). Offene Druckaufträge des Beutels entfallen.
create function public.einheit_ausbuchen(p_seriennummer text, p_grund text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_benutzer uuid := auth.uid();
  v_einheit lagereinheit%rowtype;
begin
  if p_grund is null or p_grund not in ('abgelaufen', 'beschädigt', 'Qualität', 'nicht produziert') then
    raise exception 'Grund: abgelaufen, beschädigt, Qualität oder nicht produziert.' using errcode = '22023';
  end if;
  if not lager_recht(case when p_grund = 'nicht produziert' then 'etikett_stornieren' else 'entsorgen' end) then
    raise exception 'Ware entsorgen dürfen nur Admins. «Nicht produziert» dürfen alle ausbuchen.' using errcode = '42501';
  end if;

  select * into v_einheit from lagereinheit e where e.seriennummer = upper(btrim(p_seriennummer)) for update;
  if not found then
    raise exception 'Beutel mit dieser Seriennummer nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_einheit.zustand <> 'im_lager' then
    raise exception 'Der Beutel ist nicht im Lager (Zustand: %).', replace(v_einheit.zustand, '_', ' ') using errcode = '23514';
  end if;

  update lagereinheit set zustand = 'entsorgt' where id = v_einheit.id;
  insert into lagerbewegung (lagereinheit_id, art, grund, benutzer) values (v_einheit.id, 'entsorgt', p_grund, v_benutzer);
  delete from druckauftrag d where d.lagereinheit_id = v_einheit.id and d.status = 'offen';

  return jsonb_build_object('seriennummer', v_einheit.seriennummer, 'zustand', 'entsorgt', 'grund', p_grund);
end
$$;

comment on function public.einheit_ausbuchen(text, text) is 'Bucht einen Beutel aus dem Lager aus (Zustand entsorgt) und hält Grund und Benutzer als Lagerbewegung fest.';

revoke execute on function public.produkt_einlagern(uuid, integer, numeric, text, date, date) from public, anon;
revoke execute on function public.einheit_ausbuchen(text, text) from public, anon;
grant execute on function public.produkt_einlagern(uuid, integer, numeric, text, date, date) to authenticated;
grant execute on function public.einheit_ausbuchen(text, text) to authenticated;
grant select on public.lager_einheit, public.lager_bestand, public.lager_bedarf to authenticated;
