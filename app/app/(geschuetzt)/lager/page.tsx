"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DataTable, Dialog, EmptyState, KpiTile, Notice, SegmentedControl, Select, Skeleton, StatusPill, TextField, type DataTableColumn } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { fehlerText } from "@/lib/fehler";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import {
  ablaufStatus, ablaufText, bedarfProSpiel, bedarfsEinheit, bestandFiltern, einheitenVon, einlagernEingabe, GRUENDE, herkunftText, heuteSchweiz, kennzahlen, produktCode, BALD_TAGE, LAGERARTEN,
  type Ablauf, type Bestand, type Einheit, type EinlagernFormular, type LagerBedarf,
} from "@/lib/lager";

type Daten = { bestand: Bestand[]; einheiten: Einheit[]; bedarf: LagerBedarf[] };
type Komponente = { id: string; name: string; kategorie: string; produkt: { nr: number } | null };
type Ergebnis = { anzahl: number; produziert_am: string; verbrauchen_bis: string; seriennummern: string[] };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

async function laden(): Promise<Daten> {
  const [bestand, einheiten, bedarf] = await Promise.all([
    alleSeiten<Bestand>((von, bis) => supabase.from("lager_bestand").select("*").order("produkt").order("produkt_id").order("einheit").range(von, bis)),
    alleSeiten<Einheit>((von, bis) => supabase.from("lager_einheit").select("*").eq("zustand", "im_lager").order("verbrauchen_bis").order("seriennummer").range(von, bis)),
    alleSeiten<LagerBedarf>((von, bis) => supabase.from("lager_bedarf").select("*").order("datum").order("reihenfolge").order("produkt").order("service_id").order("komponente_id").order("einheit").range(von, bis)),
  ]);
  return { bestand, einheiten, bedarf };
}

export default function Lager() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState("");
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const [suche, setSuche] = useState("");
  const [ablauf, setAblauf] = useState<Ablauf>("");
  const [lagerart, setLagerart] = useState("");
  // Gewähltes Produkt (mit Einheit): seine Beutel stehen unter der Bestandsliste.
  const [wahl, setWahl] = useState<{ produktId: string; einheit: string } | null>(null);
  const [spiel, setSpiel] = useState("");
  const [einlagern, setEinlagern] = useState(false);
  const [ausbuchen, setAusbuchen] = useState<Einheit | null>(null);

  const neuLaden = useCallback(
    () =>
      laden().then(
        (d) => {
          setDaten(d);
          setFehler(null);
        },
        (e: Error) => setFehler(fehlerText(e)),
      ),
    [],
  );
  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const melden = (text: string) => {
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };

  const zeilen = useMemo(() => bestandFiltern(daten?.bestand ?? [], { suche, ablauf, lagerart }), [daten, suche, ablauf, lagerart]);
  const kpi = kennzahlen(daten?.bestand ?? []);
  const gewaehlt = wahl ? (daten?.bestand ?? []).find((z) => z.produkt_id === wahl.produktId && z.einheit === wahl.einheit) ?? null : null;
  const beutel = wahl ? einheitenVon(daten?.einheiten ?? [], wahl.produktId, wahl.einheit) : [];
  const spiele = useMemo(() => bedarfProSpiel(daten?.bedarf ?? []), [daten]);
  const spielId = spiel || spiele[0]?.serviceId || "";
  const bedarf = (daten?.bedarf ?? []).filter((z) => z.service_id === spielId);
  const warten = fehler ? "–" : <Skeleton variant="zahl" />;

  const bestandSpalten: DataTableColumn[] = [
    {
      key: "produkt",
      label: "Produkt",
      subKey: "unterzeile",
      render: (r) => (
        <button type="button" className="pl-link" onClick={() => setWahl({ produktId: r.produkt_id as string, einheit: r.einheit as string })} aria-label={`Beutel von ${r.produkt as string} zeigen`}>
          {r.produkt as string}
        </button>
      ),
    },
    { key: "lagerung", label: "Lagerung", render: (r) => (r.lagerung as string | null) ?? "[Lagerung]" },
    { key: "beutel", label: "Beutel", numeric: true, render: (r) => formatZahl(r.beutel as number) },
    { key: "menge", label: "Menge", numeric: true, render: (r) => formatMenge(r.menge as number, r.einheit as string) },
    {
      key: "fruehestes_datum",
      label: "Frühestes Verbrauchsdatum",
      numeric: true,
      render: (r) =>
        r.fruehestes_datum ? (
          <>
            {formatDatum(r.fruehestes_datum as string)} <StatusPill status={ablaufStatus(r.tage_bis_ablauf as number | null)}>{ablaufText(r.tage_bis_ablauf as number | null)}</StatusPill>
          </>
        ) : (
          "–"
        ),
    },
    {
      key: "beutel_abgelaufen",
      label: "Davon abgelaufen",
      numeric: true,
      render: (r) => ((r.beutel_abgelaufen as number) ? <StatusPill status="critical">{`${formatZahl(r.beutel_abgelaufen as number)} · ${formatMenge(r.menge_abgelaufen as number, r.einheit as string)}`}</StatusPill> : "–"),
    },
  ];

  const beutelSpalten: DataTableColumn[] = [
    { key: "seriennummer", label: "Seriennummer", render: (r) => <span className="pl-mono">{r.seriennummer as string}</span> },
    { key: "menge", label: "Menge", numeric: true, render: (r) => formatMenge(r.menge as number, r.einheit as string) },
    { key: "produziert_am", label: "Produziert", numeric: true, render: (r) => <span className={r.datum_annahme ? "pl-assumed" : undefined}>{formatDatum(r.produziert_am as string)}</span> },
    {
      key: "verbrauchen_bis",
      label: "Verbrauchen bis",
      numeric: true,
      render: (r) => (
        <>
          {formatDatum(r.verbrauchen_bis as string)} <StatusPill status={ablaufStatus(r.tage_bis_ablauf as number | null)}>{ablaufText(r.tage_bis_ablauf as number | null)}</StatusPill>
          {r.haltbarkeit_abweichend ? (
            <span className="pl-sub">
              gedruckt mit {r.haltbarkeit_tage === null ? "Datum von Hand" : `${r.haltbarkeit_tage} Tagen`}; Systemzuteilung heute {r.haltbarkeit_heute === null ? "ohne Haltbarkeit" : `${r.haltbarkeit_heute} Tage`}
            </span>
          ) : null}
        </>
      ),
    },
    { key: "herkunft", label: "Herkunft", render: (r) => herkunftText(r as unknown as Einheit) },
    {
      key: "aktion",
      label: <span className="pl-sr">Aktionen</span>,
      printHidden: true,
      render: (r) => (
        <Button ariaLabel={`Beutel ${r.seriennummer as string} ausbuchen`} onClick={() => setAusbuchen(r as unknown as Einheit)}>
          Ausbuchen
        </Button>
      ),
    },
  ];

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Produktion Hünenberg</div>
          <h1 className="pl-h1">Lager</h1>
          <div className="pl-sub">Etikettierte Beutel mit Seriennummer. Der Bestand entsteht beim Anlegen der Etiketten.</div>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button variant="primary" icon="plus" onClick={() => setEinlagern(true)}>Produkt einlagern</Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Lager nicht geladen">{fehler}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      <div className="pl-grid-4">
        <KpiTile label="Beutel im Lager" value={daten ? formatZahl(kpi.beutel) : warten} detail="verfügbar, ohne abgelaufene" />
        <KpiTile label="Produkte mit Bestand" value={daten ? formatZahl(kpi.produkte) : warten} />
        <KpiTile label="Läuft bald ab" value={daten ? formatZahl(kpi.bald) : warten} detail={`Produkte mit einem Beutel, der in höchstens ${BALD_TAGE} Tagen abläuft`} />
        <KpiTile label="Abgelaufen" value={daten ? formatZahl(kpi.abgelaufen) : warten} detail="Beutel im Lager nach dem Verbrauchsdatum; zählen nicht zum Bestand" />
      </div>

      <div className="pl-grid-3 pl-print-hide">
        <TextField id="lager-suche" type="search" label="Produkt suchen" value={suche} onChange={(e) => setSuche(wert(e))} placeholder="Name, Produktnummer oder Kategorie" />
        <div>
          <div className="pl-label">Ablauf</div>
          <SegmentedControl
            label="Ablauf"
            value={ablauf}
            onChange={(v) => setAblauf(v as Ablauf)}
            options={[{ value: "", label: "Alle" }, { value: "bald", label: "läuft bald ab" }, { value: "abgelaufen", label: "abgelaufen" }]}
          />
        </div>
        <Select
          id="lager-lagerart"
          label="Lagerart"
          value={lagerart}
          onChange={setLagerart}
          options={[{ value: "", label: "Alle Lagerarten" }, ...LAGERARTEN.map((l) => ({ value: l, label: l }))]}
        />
      </div>

      <Card title="Bestand" meta={daten ? `${formatZahl(zeilen.length)} von ${formatZahl(daten.bestand.length)} Zeilen (Produkt und Einheit)` : undefined}>
        {daten ? (
          zeilen.length ? (
            <DataTable
              columns={bestandSpalten}
              rows={zeilen.map((z) => ({ ...z, id: `${z.produkt_id}-${z.einheit}`, unterzeile: `${z.produkt_code ?? "[Produkt]"} · ${z.kategorie ?? "[Kategorie]"}` }))}
              isSelected={(r) => !!wahl && r.produkt_id === wahl.produktId && r.einheit === wahl.einheit}
            />
          ) : daten.bestand.length ? (
            <EmptyState title="Kein Produkt für diese Filter" actionLabel="Filter zurücksetzen" onAction={() => { setSuche(""); setAblauf(""); setLagerart(""); }} />
          ) : (
            <EmptyState title="Das Lager ist leer" text="Bestand entsteht, wenn im Küchenpass Etiketten angelegt werden, oder mit «Produkt einlagern»." />
          )
        ) : fehler ? (
          <p className="pl-muted">Keine Daten, siehe Hinweis oben.</p>
        ) : (
          <Skeleton variant="zeile" label="Lager wird geladen" />
        )}
      </Card>

      {gewaehlt ? (
        <Card
          title={`Beutel: ${gewaehlt.produkt ?? "[Produkt]"}`}
          meta={`${gewaehlt.produkt_code ?? ""} · ${formatZahl(beutel.length)} Beutel im Lager; die zuerst ablaufenden zuoberst`}
          actions={<Button onClick={() => setWahl(null)}>Schliessen</Button>}
        >
          {beutel.length ? <DataTable columns={beutelSpalten} rows={beutel.map((e) => ({ ...e, id: e.lagereinheit_id }))} /> : <p className="pl-muted">Keine Beutel im Lager.</p>}
          <p className="pl-small">
            <span className="pl-assumed">Produziert</span> gestrichelt: Datum von Hand gesetzt (Annahme). Ausbuchen setzt den Beutel auf «entsorgt» und hält Grund und Benutzer fest.
          </p>
        </Card>
      ) : null}

      <Card title="Bedarf der Spiele gegen das Lager" meta="Es zählen Beutel, die am Service-Datum noch haltbar sind. Der Bestand ist nicht auf die Spiele verteilt.">
        {daten ? (
          spiele.length ? (
            <>
              <Select
                id="lager-spiel"
                label="Spiel"
                value={spielId}
                onChange={setSpiel}
                options={spiele.map((s) => ({ value: s.serviceId, label: `${s.titel}${s.datum ? ` · ${formatDatum(s.datum)}` : ""} · ${s.gedeckt} von ${s.produkte} gedeckt` }))}
              />
              <DataTable
                columns={[
                  { key: "produkt", label: "Produkt", subKey: "produkt_code" },
                  { key: "bedarf", label: "Bedarf", numeric: true, render: (r) => (r.bedarf === null ? "[Menge]" : formatMenge(r.bedarf as number, r.einheit as string)) },
                  { key: "menge_im_lager", label: "Im Lager", numeric: true, render: (r) => `${formatMenge(r.menge_im_lager as number, r.einheit as string)} · ${formatZahl(r.beutel_im_lager as number)} Beutel` },
                  { key: "gedeckt", label: "Stand", render: (r) => (r.gedeckt === null ? "[Menge]" : <StatusPill status={r.gedeckt ? "ok" : "info"}>{r.gedeckt ? "gedeckt" : "fehlt noch"}</StatusPill>) },
                  { key: "herleitung", label: "Herleitung", detail: true, render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                ]}
                rows={bedarf.map((z) => ({ ...z, id: `${z.komponente_id}-${z.einheit}` }))}
              />
              <p className="pl-small">Nur Produkte, die ein Etikett bekommen (Status ok, mit Haltbarkeit, nicht nur vor Ort). «Fehlt noch» ist kein Fehler: produziert wird nach dem Wellenplan.</p>
            </>
          ) : (
            <EmptyState title="Noch kein Bedarf" text="Bedarf entsteht aus Anlässen mit Menülinie und Service." href="/anlaesse/" actionLabel="Anlässe" />
          )
        ) : fehler ? (
          <p className="pl-muted">Keine Daten, siehe Hinweis oben.</p>
        ) : (
          <Skeleton variant="zeile" />
        )}
      </Card>

      {einlagern ? (
        <EinlagernDialog
          bedarf={daten?.bedarf ?? []}
          onClose={() => setEinlagern(false)}
          onErstellt={(text) => {
            melden(text);
            neuLaden();
          }}
        />
      ) : null}
      {ausbuchen ? (
        <AusbuchenDialog
          key={ausbuchen.lagereinheit_id}
          einheit={ausbuchen}
          onClose={() => setAusbuchen(null)}
          onAusgebucht={(text) => {
            melden(text);
            neuLaden();
          }}
        />
      ) : null}
    </>
  );
}

/** Beutel ohne Welle anlegen: Anfangsbestand oder Produktion ausserhalb einer Welle. */
function EinlagernDialog({ bedarf, onClose, onErstellt }: { bedarf: LagerBedarf[]; onClose: () => void; onErstellt: (text: string) => void }) {
  const [offen, setOffen] = useState(true);
  const [komponenten, setKomponenten] = useState<Komponente[] | null>(null);
  const [suche, setSuche] = useState("");
  const [f, setF] = useState<EinlagernFormular>({ komponente: "", anzahl: "", menge: "", einheit: "kg", produziert_am: heuteSchweiz(), verbrauchen_bis: "" });
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);

  useEffect(() => {
    let gilt = true;
    alleSeiten<Komponente>((von, bis) => supabase.from("komponente").select("id, name, kategorie, produkt(nr)").not("produkt_id", "is", null).order("name").order("id").range(von, bis)).then(
      (k) => gilt && setKomponenten(k),
      (e: Error) => gilt && setFehler(fehlerText(e)),
    );
    return () => {
      gilt = false;
    };
  }, []);

  const set = (teil: Partial<EinlagernFormular>) => setF((alt) => ({ ...alt, ...teil }));
  const treffer = useMemo(() => {
    const s = suche.trim().toLocaleLowerCase("de-CH");
    const alle = komponenten ?? [];
    const passend = s ? alle.filter((k) => `${k.name} ${k.kategorie} ${produktCode(k.produkt?.nr)}`.toLocaleLowerCase("de-CH").includes(s)) : alle;
    // Das gewählte Produkt bleibt in der Liste, auch wenn die Suche es nicht mehr trifft.
    const gewaehlt = alle.find((k) => k.id === f.komponente);
    const liste = passend.slice(0, 50);
    return gewaehlt && !liste.includes(gewaehlt) ? [gewaehlt, ...liste] : liste;
  }, [komponenten, suche, f.komponente]);
  // Einheit, in der das gewählte Produkt im Bedarf steht: nur damit zählt der Bestand gegen den Bedarf.
  const imBedarf = f.komponente ? bedarfsEinheit(bedarf, f.komponente) : null;

  async function anlegen() {
    const a = einlagernEingabe(f, heuteSchweiz());
    if ("fehler" in a) return setFehler(a.fehler);
    setSpeichert(true);
    setFehler(null);
    const r = await supabase.rpc("produkt_einlagern", a);
    setSpeichert(false);
    if (r.error) return setFehler(fehlerText(r.error));
    const e = r.data as unknown as Ergebnis;
    setErgebnis(e);
    onErstellt(`${formatZahl(e.anzahl)} Beutel eingelagert, verbrauchen bis ${formatDatum(e.verbrauchen_bis)}.`);
  }

  return (
    <Dialog
      open={offen}
      id="einlagern"
      title="Produkt einlagern"
      meta="Ohne Welle: Anfangsbestand oder Produktion ausserhalb des Wellenplans"
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        ergebnis ? (
          <Button variant="primary" onClick={() => setOffen(false)}>Schliessen</Button>
        ) : (
          <>
            <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
            <Button variant="primary" onClick={anlegen} disabled={speichert || !komponenten}>{speichert ? "Wird eingelagert …" : "Einlagern"}</Button>
          </>
        )
      }
    >
      {fehler ? <Notice role="alert" title="Nicht eingelagert">{fehler}</Notice> : null}
      {ergebnis ? (
        <>
          <Notice role="status" title={`${formatZahl(ergebnis.anzahl)} Beutel im Lager angelegt`}>
            Produziert am {formatDatum(ergebnis.produziert_am)}, verbrauchen bis {formatDatum(ergebnis.verbrauchen_bis)}. Die Etiketten stehen in den Druckaufträgen.
          </Notice>
          <div>
            <div className="pl-label">Seriennummern</div>
            <p className="pl-mono pl-small">{ergebnis.seriennummern.join(" · ")}</p>
          </div>
        </>
      ) : !komponenten ? (
        fehler ? null : <Skeleton variant="zeile" label="Produkte werden geladen" />
      ) : (
        <>
          <div className="pl-grid-2">
            <TextField id="einlagern-suche" type="search" label="Produkt suchen" value={suche} onChange={(e) => setSuche(wert(e))} placeholder="Name oder Kategorie" />
            <Select
              id="einlagern-komponente"
              label="Produkt"
              value={f.komponente}
              onChange={(v) => {
                const e = bedarfsEinheit(bedarf, v);
                set({ komponente: v, ...(e ? { einheit: e } : {}) });
              }}
              hint={treffer.length >= 50 ? "Die ersten 50 Treffer; Suche eingrenzen" : `${treffer.length} Treffer`}
              options={[{ value: "", label: "Bitte wählen" }, ...treffer.map((k) => ({ value: k.id, label: `${k.name} · ${produktCode(k.produkt?.nr)} · ${k.kategorie}` }))]}
            />
            <TextField id="einlagern-anzahl" label="Anzahl Beutel" numeric value={f.anzahl} onChange={(e) => set({ anzahl: wert(e) })} required />
            <div className="pl-grid-2">
              <TextField id="einlagern-menge" label="Menge pro Beutel" numeric value={f.menge} onChange={(e) => set({ menge: wert(e) })} required />
              <Select
                id="einlagern-einheit"
                label="Einheit"
                value={f.einheit}
                onChange={(v) => set({ einheit: v })}
                hint={imBedarf && imBedarf !== f.einheit ? `Im Bedarf steht dieses Produkt in ${imBedarf}: in ${f.einheit} zählt der Bestand nicht dagegen` : undefined}
                options={[{ value: "kg", label: "kg" }, { value: "l", label: "l" }, { value: "Stk", label: "Stk" }]} />
            </div>
            <TextField id="einlagern-produziert" type="date" label="Produziert am" value={f.produziert_am} onChange={(e) => set({ produziert_am: wert(e) })} hint="heute oder früher; gilt als Annahme" required />
            <TextField id="einlagern-bis" type="date" label="Verbrauchen bis" value={f.verbrauchen_bis} onChange={(e) => set({ verbrauchen_bis: wert(e) })} hint="leer = Produktionsdatum + Haltbarkeit der Systemzuteilung; nur kürzen möglich" />
          </div>
        </>
      )}
    </Dialog>
  );
}

/** Einen Beutel aus dem Lager ausbuchen, mit Grund. */
function AusbuchenDialog({ einheit, onClose, onAusgebucht }: { einheit: Einheit; onClose: () => void; onAusgebucht: (text: string) => void }) {
  const [offen, setOffen] = useState(true);
  const [grund, setGrund] = useState<string>(einheit.abgelaufen ? "abgelaufen" : "nicht produziert");
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  async function ausbuchen() {
    setSpeichert(true);
    setFehler(null);
    const r = await supabase.rpc("einheit_ausbuchen", { p_seriennummer: einheit.seriennummer ?? "", p_grund: grund });
    setSpeichert(false);
    if (r.error) return setFehler(fehlerText(r.error));
    onAusgebucht(`Beutel ${einheit.seriennummer} ausgebucht (${grund}).`);
    setOffen(false);
  }

  return (
    <Dialog
      open={offen}
      id="ausbuchen"
      title={`Beutel ${einheit.seriennummer} ausbuchen?`}
      meta={`${einheit.produkt ?? "[Produkt]"} · ${formatMenge(einheit.menge, einheit.einheit)} · verbrauchen bis ${formatDatum(einheit.verbrauchen_bis)}`}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          <Button variant="primary" onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
          <Button onClick={ausbuchen} disabled={speichert}>{speichert ? "Wird ausgebucht …" : "Ausbuchen"}</Button>
        </>
      }
    >
      {fehler ? <Notice role="alert" title="Nicht ausgebucht">{fehler}</Notice> : null}
      <Select
        id="ausbuchen-grund"
        label="Grund"
        value={grund}
        onChange={setGrund}
        hint="«Nicht produziert»: zu viele Etiketten angelegt, darf jede angemeldete Person. Ware entsorgen (abgelaufen, beschädigt, Qualität) dürfen nur Admins."
        options={GRUENDE.map((g) => ({ value: g, label: g }))}
      />
      <p className="pl-small">Der Beutel zählt danach nicht mehr zum Bestand. Das lässt sich in der App nicht rückgängig machen.</p>
    </Dialog>
  );
}
