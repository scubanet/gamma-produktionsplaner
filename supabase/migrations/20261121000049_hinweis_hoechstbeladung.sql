-- Hinweis bei Höchstbeladung (21.11.2026). Entscheid Dominik (21.11.2026): Der Scan warnt gelb, wenn in der Kiste mehr
-- liegt als die Höchstbeladung des Gebindes laut Hersteller (gebinde.max_beladung_kg, Migration 48). Er sperrt nichts.
-- beutel_einpacken ist unverändert aus Migration 45 bis auf diesen Hinweis nach dem Einpacken.

create or replace function public.beutel_einpacken(
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
  v_netto numeric;
  v_max numeric;
  v_gebinde text;
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

  -- Höchstbeladung des Gebindes laut Hersteller: warnt nur, sperrt nichts. Beutel in Stück haben kein Gewicht und zählen nicht.
  select g.netto_kg, gb.max_beladung_kg, gb.name into v_netto, v_max, v_gebinde
  from kiste_gewicht g join gebinde gb on gb.id = g.gebinde_id where g.kiste_id = v_kiste.id;
  if v_max is not null and v_netto > v_max then
    v_hinweise := v_hinweise || jsonb_build_object('code', 'ueber_hoechstbeladung',
      'text', 'Kiste über der Höchstbeladung: ' || trim_scale(v_netto)::text || ' kg, erlaubt ' || trim_scale(v_max)::text || ' kg (' || v_gebinde || ').');
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

comment on function public.beutel_einpacken(text, text, boolean, timestamptz, boolean) is 'Scannt einen Beutel in eine offene Kiste: prüft, bucht ein (Zustand in_kiste, Lagerbewegung) und gibt das Ergebnis zurück. Ohne Netz gescannte Beutel werden immer eingebucht; Abweichungen stehen in lagereinheit.klaeren. Gelber Hinweis über der Höchstbeladung des Gebindes.';
