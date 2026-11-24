"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, DataTable, Dialog, EmptyState, KpiTile, Notice, Select, Skeleton, StatusPill, TextField, type DataTableColumn } from "@/lib/planer";
import { useStufe } from "@/components/Anmeldung";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { fehlerText } from "@/lib/fehler";
import { formatDatum, formatZahl } from "@/lib/format";
import { darf } from "@/lib/stufe";
import { heuteSchweiz } from "@/lib/lager";
import {
  ARTEN, artLabel, gradText, grenzeText, heuteKennzahlen, istAbweichung, messungEingabe, monatsGrenzen, standPill, stelleEingabe, stelleFormular, stelleStandard, temperaturAus, zeitSchweiz,
  type Art, type Heute, type Kuehlstelle, type Messung, type MessungFormular, type StelleFormular,
} from "@/lib/temperatur";

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;
const VISUM_SPEICHER = "gamma.temperatur.visum";

/** Letzte 12 Monate als «2026-11», neuester zuerst. */
function monate(heute: string): { value: string; label: string }[] {
  const [j, m] = heute.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(j, m - 1 - i, 1));
    const v = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    return { value: v, label: new Intl.DateTimeFormat("de-CH", { month: "long", year: "numeric", timeZone: "UTC" }).format(d) };
  });
}

type Daten = { stand: Heute[]; stellen: Kuehlstelle[]; liste: Messung[] };

async function laden(monat: string): Promise<Daten> {
  const g = monatsGrenzen(monat);
  const [h, s, liste] = await Promise.all([
    supabase.from("temperatur_heute").select("*").order("reihenfolge").order("name"),
    supabase.from("kuehlstelle").select("*").order("reihenfolge").order("name"),
    g
      ? alleSeiten<Messung>((von, bis) => supabase.from("temperatur_liste").select("*").gte("tag", g.von).lte("tag", g.bis).order("gemessen_am").order("id").range(von, bis))
      : Promise.resolve([] as Messung[]),
  ]);
  if (h.error) throw h.error;
  if (s.error) throw s.error;
  return { stand: h.data, stellen: s.data, liste };
}

export default function Temperaturkontrolle() {
  const stufe = useStufe();
  const planen = darf(stufe, "planen");
  const admin = stufe === "admin";
  const heute = heuteSchweiz();
  const [stand, setStand] = useState<Heute[] | null>(null);
  const [stellen, setStellen] = useState<Kuehlstelle[] | null>(null);
  const [liste, setListe] = useState<Messung[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState("");
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const [monat, setMonat] = useState(heute.slice(0, 7));
  const [stelleFilter, setStelleFilter] = useState("");
  const [messen, setMessen] = useState<Heute | null>(null);
  const [bearbeiten, setBearbeiten] = useState<Kuehlstelle | "neu" | null>(null);
  const [storno, setStorno] = useState<Messung | null>(null);

  const neuLaden = useCallback(
    () =>
      laden(monat).then(
        (d) => {
          setStand(d.stand);
          setStellen(d.stellen);
          setListe(d.liste);
          setFehler(null);
        },
        (e: Error) => setFehler(fehlerText(e)),
      ),
    [monat],
  );
  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const melden = (text: string) => {
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };

  const kpi = heuteKennzahlen(stand ?? []);
  const warten = fehler ? "–" : <Skeleton variant="zahl" />;
  const zeilen = useMemo(() => (liste ?? []).filter((m) => !stelleFilter || m.kuehlstelle_id === stelleFilter), [liste, stelleFilter]);
  const abweichungenMonat = zeilen.filter((m) => m.status === "abweichung").length;

  const listeSpalten: DataTableColumn[] = [
    { key: "tag", label: "Datum", numeric: true, render: (r) => formatDatum(r.tag as string) },
    { key: "zeit", label: "Zeit", numeric: true, render: (r) => zeitSchweiz(r.gemessen_am as string) },
    { key: "kuehlstelle", label: "Kühlstelle", subKey: "unterzeile" },
    {
      key: "temperatur",
      label: "Temperatur",
      numeric: true,
      render: (r) => <span style={r.status === "storniert" ? { textDecoration: "line-through" } : undefined}>{gradText(r.temperatur as number)}</span>,
    },
    {
      key: "status",
      label: "Stand",
      render: (r) =>
        r.status === "storniert" ? <StatusPill status="neutral">storniert</StatusPill> : r.status === "abweichung" ? <StatusPill status="critical">Abweichung</StatusPill> : <StatusPill status="ok">ok</StatusPill>,
    },
    { key: "visum", label: "Visum", render: (r) => <span className="pl-mono">{r.visum as string}</span> },
    {
      key: "massnahme",
      label: "Massnahme / Bemerkung",
      detail: true,
      render: (r) => (
        <span className="pl-small">
          {[r.massnahme, r.bemerkung, r.storno_grund ? `Storniert: ${r.storno_grund as string}` : null].filter(Boolean).join(" · ") || "–"}
        </span>
      ),
    },
    ...(admin
      ? [
          {
            key: "aktion",
            label: <span className="pl-sr">Aktionen</span>,
            printHidden: true,
            render: (r: Record<string, unknown>) =>
              r.status === "storniert" ? null : (
                <Button ariaLabel={`Messung ${gradText(r.temperatur as number)} vom ${formatDatum(r.tag as string)} stornieren`} onClick={() => setStorno(r as unknown as Messung)}>
                  Stornieren
                </Button>
              ),
          } as DataTableColumn,
        ]
      : []),
  ];

  const stellenSpalten: DataTableColumn[] = [
    { key: "name", label: "Kühlstelle", subKey: "unterzeile" },
    { key: "grenze", label: "Grenze", render: (r) => grenzeText(r.grenze_min as number | null, r.grenze_max as number) },
    { key: "messungen_pro_tag", label: "Messungen pro Tag", numeric: true },
    { key: "aktiv", label: "Stand", render: (r) => <StatusPill status={r.aktiv ? "ok" : "neutral"}>{r.aktiv ? "aktiv" : "deaktiviert"}</StatusPill> },
    {
      key: "aktion",
      label: <span className="pl-sr">Aktionen</span>,
      printHidden: true,
      render: (r) => (
        <Button ariaLabel={`${r.name as string} bearbeiten`} onClick={() => setBearbeiten(r as unknown as Kuehlstelle)}>
          Bearbeiten
        </Button>
      ),
    },
  ];

  const monatLabel = monate(heute).find((m) => m.value === monat)?.label ?? monat;

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Produktion Hünenberg · Hygiene</div>
          <h1 className="pl-h1">Temperaturkontrolle</h1>
          <div className="pl-sub">Tägliche Messung der Kühl- und Tiefkühlräume und des Economats. Abweichungen brauchen eine Massnahme.</div>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button icon="print" onClick={() => window.print()}>Liste drucken</Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Temperaturkontrolle nicht geladen">{fehler}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      <div className="pl-grid-4 pl-print-hide">
        <KpiTile label="Kühlstellen" value={stand ? formatZahl(kpi.stellen) : warten} detail="aktiv" />
        <KpiTile label="Heute gemessen" value={stand ? `${formatZahl(kpi.gemessen)} von ${formatZahl(kpi.soll)}` : warten} detail="Messungen nach Soll der Kühlstellen" />
        <KpiTile label="Noch offen" value={stand ? formatZahl(kpi.offen) : warten} detail="Kühlstellen mit fehlender Messung heute" />
        <KpiTile label="Abweichungen heute" value={stand ? formatZahl(kpi.abweichungen) : warten} detail="Kühlstellen mit einer Messung ausserhalb der Grenze" />
      </div>

      <section className="pl-stack pl-print-hide" aria-label="Heute messen">
        {stand ? (
          stand.length ? (
            <div className="pl-grid-3">
              {stand.map((k) => {
                const p = standPill(k);
                return (
                  <Card
                    key={k.kuehlstelle_id}
                    title={k.name}
                    meta={`${artLabel(k.art)} · ${grenzeText(k.grenze_min, k.grenze_max)}`}
                    actions={<StatusPill status={p.status}>{p.text}</StatusPill>}
                  >
                    <p className="pl-small">
                      {k.letzte_am ? `Zuletzt heute ${zeitSchweiz(k.letzte_am)}: ${gradText(k.letzte_temperatur)}` : "Heute noch nicht gemessen."}
                    </p>
                    <Button variant="primary" icon="plus" ariaLabel={`Temperatur ${k.name} erfassen`} onClick={() => setMessen(k)}>
                      Temperatur erfassen
                    </Button>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <EmptyState
                title="Noch keine Kühlstelle erfasst"
                text={planen ? "Erfasse zuerst die Kühl- und TK-Räume und das Economat mit ihren Grenzwerten." : "Ein Admin oder Benutzer erfasst die Kühlstellen."}
                {...(planen ? { actionLabel: "Kühlstelle erfassen", onAction: () => setBearbeiten("neu") } : {})}
              />
            </Card>
          )
        ) : fehler ? null : (
          <Skeleton variant="zeile" label="Kühlstellen werden geladen" />
        )}
      </section>

      <Card
        title={`Temperaturkontrollliste ${monatLabel}`}
        meta={liste ? `${formatZahl(zeilen.length)} Messungen · ${formatZahl(abweichungenMonat)} Abweichungen` : undefined}
      >
        <div className="pl-grid-2 pl-print-hide">
          <Select id="temp-monat" label="Monat" value={monat} onChange={setMonat} options={monate(heute)} />
          <Select
            id="temp-stelle"
            label="Kühlstelle"
            value={stelleFilter}
            onChange={setStelleFilter}
            options={[{ value: "", label: "Alle Kühlstellen" }, ...(stellen ?? []).map((s) => ({ value: s.id, label: s.name }))]}
          />
        </div>
        {liste ? (
          zeilen.length ? (
            <DataTable
              columns={listeSpalten}
              rows={zeilen.map((m) => ({ ...m, unterzeile: `${artLabel(m.art)} · ${grenzeText(m.grenze_min, m.grenze_max)}` }))}
            />
          ) : (
            <EmptyState title="Keine Messungen in diesem Monat" text="Messungen erscheinen hier, sobald sie erfasst sind." />
          )
        ) : fehler ? (
          <p className="pl-muted">Keine Daten, siehe Hinweis oben.</p>
        ) : (
          <Skeleton variant="zeile" />
        )}
        <p className="pl-small">
          Jede Messung hält die Grenze fest, die beim Messen galt. Messungen werden nie geändert; eine falsche Eingabe storniert ein Admin mit Grund, der richtige Wert wird neu erfasst.
        </p>
      </Card>

      {planen ? (
        <Card
          title="Kühlstellen"
          meta="Grenzwerte gelten für neue Messungen"
          actions={<Button icon="plus" onClick={() => setBearbeiten("neu")}>Kühlstelle erfassen</Button>}
        >
          {stellen ? (
            stellen.length ? (
              <DataTable columns={stellenSpalten} rows={stellen.map((s) => ({ ...s, unterzeile: artLabel(s.art) + (s.bemerkung ? ` · ${s.bemerkung}` : "") }))} />
            ) : (
              <p className="pl-muted">Noch keine Kühlstelle.</p>
            )
          ) : (
            <Skeleton variant="zeile" />
          )}
          <p className="pl-small">
            Standard: Kühlung 0 bis +2 °C, Tiefkühlung höchstens −18 °C, Economat höchstens +18 °C. <span className="pl-assumed">2 Messungen pro Tag</span> sind eine Annahme (morgens und abends) und pro Kühlstelle änderbar.
          </p>
        </Card>
      ) : null}

      {messen ? (
        <MessenDialog
          key={messen.kuehlstelle_id}
          stelle={messen}
          onClose={() => setMessen(null)}
          onErfasst={(text) => {
            melden(text);
            neuLaden();
          }}
        />
      ) : null}
      {bearbeiten ? (
        <StelleDialog
          key={bearbeiten === "neu" ? "neu" : bearbeiten.id}
          stelle={bearbeiten === "neu" ? null : bearbeiten}
          onClose={() => setBearbeiten(null)}
          onGespeichert={(text) => {
            melden(text);
            neuLaden();
          }}
        />
      ) : null}
      {storno ? (
        <StornoDialog
          key={storno.id}
          messung={storno}
          onClose={() => setStorno(null)}
          onStorniert={(text) => {
            melden(text);
            neuLaden();
          }}
        />
      ) : null}
    </>
  );
}

function visumLesen(): string {
  try {
    return localStorage.getItem(VISUM_SPEICHER) ?? "";
  } catch {
    return "";
  }
}
function visumMerken(v: string) {
  try {
    localStorage.setItem(VISUM_SPEICHER, v);
  } catch {
    /* ohne Speicher: Visum jedes Mal eintippen */
  }
}

function MessenDialog({ stelle, onClose, onErfasst }: { stelle: Heute; onClose: () => void; onErfasst: (text: string) => void }) {
  const [offen, setOffen] = useState(true);
  const [f, setF] = useState<MessungFormular>({ temperatur: "", visum: visumLesen(), massnahme: "", bemerkung: "" });
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const set = (teil: Partial<MessungFormular>) => setF((alt) => ({ ...alt, ...teil }));
  const t = temperaturAus(f.temperatur);
  const abw = t !== null && stelle.grenze_max !== null && istAbweichung(t, stelle.grenze_min, stelle.grenze_max);

  async function erfassen() {
    const a = messungEingabe(stelle, f);
    if ("fehler" in a) return setFehler(a.fehler);
    setSpeichert(true);
    setFehler(null);
    const r = await supabase.rpc("temperatur_erfassen", a);
    setSpeichert(false);
    if (r.error) return setFehler(fehlerText(r.error));
    visumMerken(a.p_visum);
    onErfasst(`${stelle.name}: ${gradText(a.p_temperatur)} erfasst${abw ? ", Abweichung mit Massnahme" : ""}.`);
    setOffen(false);
  }

  return (
    <Dialog
      open={offen}
      id="temperatur-messen"
      title={`Temperatur ${stelle.name}`}
      meta={`${artLabel(stelle.art)} · Grenze ${grenzeText(stelle.grenze_min, stelle.grenze_max)}`}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
          <Button variant="primary" onClick={erfassen} disabled={speichert}>{speichert ? "Wird erfasst …" : "Erfassen"}</Button>
        </>
      }
    >
      {fehler ? <Notice role="alert" title="Nicht erfasst">{fehler}</Notice> : null}
      <TextField id="temp-wert" label="Temperatur in °C" numeric required invalid={abw} value={f.temperatur} onChange={(e) => set({ temperatur: wert(e) })} placeholder="z.B. 1.5 oder −19" hint="Eine Stelle nach dem Punkt; Minus für Tiefkühlung." />
      {abw ? (
        <Notice role="alert" title={`Abweichung: ${gradText(t)} liegt ausserhalb von ${grenzeText(stelle.grenze_min, stelle.grenze_max)}`}>
          Ware prüfen und die Massnahme festhalten, z.B. «Tür war offen, nach 30 Min. nachgemessen» oder «Ware in Kühlraum 2 umgelagert, Service informiert».
        </Notice>
      ) : null}
      {abw ? <TextField id="temp-massnahme" label="Massnahme" required multiline rows={3} value={f.massnahme} onChange={(e) => set({ massnahme: wert(e) })} /> : null}
      <TextField id="temp-visum" label="Visum" required autoComplete="off" value={f.visum} onChange={(e) => set({ visum: wert(e) })} placeholder="Kürzel, z.B. DW" hint="Wird auf diesem Gerät für die nächste Messung vorgeschlagen." />
      <TextField id="temp-bemerkung" label="Bemerkung (freiwillig)" value={f.bemerkung} onChange={(e) => set({ bemerkung: wert(e) })} />
    </Dialog>
  );
}

function StelleDialog({ stelle, onClose, onGespeichert }: { stelle: Kuehlstelle | null; onClose: () => void; onGespeichert: (text: string) => void }) {
  const [offen, setOffen] = useState(true);
  const [f, setF] = useState<StelleFormular>(stelle ? stelleFormular(stelle) : stelleStandard());
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const set = (teil: Partial<StelleFormular>) => setF((alt) => ({ ...alt, ...teil }));

  function artWechseln(art: string) {
    // Bei einer neuen Kühlstelle wandern die Standard-Grenzwerte mit; bei einer bestehenden bleiben sie stehen.
    const s = stelleStandard(art as Art);
    set(stelle ? { art: art as Art } : { art: art as Art, min: s.min, max: s.max });
  }

  async function speichern() {
    const d = stelleEingabe(f);
    if ("fehler" in d) return setFehler(d.fehler);
    setSpeichert(true);
    setFehler(null);
    const r = stelle ? await supabase.from("kuehlstelle").update(d).eq("id", stelle.id) : await supabase.from("kuehlstelle").insert(d);
    setSpeichert(false);
    if (r.error) return setFehler(r.error.code === "23505" ? "Diesen Namen gibt es schon." : fehlerText(r.error));
    onGespeichert(stelle ? `${d.name} gespeichert.` : `${d.name} erfasst.`);
    setOffen(false);
  }

  return (
    <Dialog
      open={offen}
      id="kuehlstelle"
      title={stelle ? `Kühlstelle ${stelle.name}` : "Kühlstelle erfassen"}
      meta="Kühlraum, Kühlschrank, Tiefkühler oder Economat"
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
          <Button variant="primary" onClick={speichern} disabled={speichert}>{speichert ? "Wird gespeichert …" : "Speichern"}</Button>
        </>
      }
    >
      {fehler ? <Notice role="alert" title="Nicht gespeichert">{fehler}</Notice> : null}
      <TextField id="ks-name" label="Name" required value={f.name} onChange={(e) => set({ name: wert(e) })} placeholder="z.B. Kühlraum 1" />
      <Select id="ks-art" label="Art" value={f.art} onChange={artWechseln} options={ARTEN.map((a) => ({ value: a.art, label: a.label }))} />
      <div className="pl-grid-2">
        <TextField id="ks-min" label="Untere Grenze °C" numeric value={f.min} onChange={(e) => set({ min: wert(e) })} hint="Leer: keine untere Grenze" />
        <TextField id="ks-max" label="Obere Grenze °C" numeric required value={f.max} onChange={(e) => set({ max: wert(e) })} />
      </div>
      <div className="pl-grid-2">
        <TextField id="ks-anzahl" label="Messungen pro Tag" numeric required value={f.messungen} onChange={(e) => set({ messungen: wert(e) })} hint="1 bis 6" />
        <TextField id="ks-reihe" label="Reihenfolge" numeric value={f.reihenfolge} onChange={(e) => set({ reihenfolge: wert(e) })} hint="Kleinere Zahl steht weiter vorne" />
      </div>
      <TextField id="ks-bemerkung" label="Bemerkung (freiwillig)" value={f.bemerkung} onChange={(e) => set({ bemerkung: wert(e) })} placeholder="z.B. Standort, Gerätenummer" />
      {stelle ? <Checkbox label="Aktiv (wird täglich gemessen)" checked={f.aktiv} onChange={(e) => set({ aktiv: (e as { target: HTMLInputElement }).target.checked })} /> : null}
      {stelle ? <p className="pl-small">Neue Grenzwerte gelten ab der nächsten Messung; bestehende Messungen behalten ihre Grenze.</p> : null}
    </Dialog>
  );
}

function StornoDialog({ messung, onClose, onStorniert }: { messung: Messung; onClose: () => void; onStorniert: (text: string) => void }) {
  const [offen, setOffen] = useState(true);
  const [grund, setGrund] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  async function stornieren() {
    if (!grund.trim()) return setFehler("Bitte einen Grund angeben, z.B. «Tippfehler, richtig 1.5 °C».");
    setSpeichert(true);
    setFehler(null);
    const r = await supabase.rpc("temperatur_stornieren", { p_messung: messung.id as string, p_grund: grund.trim() });
    setSpeichert(false);
    if (r.error) return setFehler(fehlerText(r.error));
    onStorniert(`Messung ${gradText(messung.temperatur)} vom ${formatDatum(messung.tag)} storniert.`);
    setOffen(false);
  }

  return (
    <Dialog
      open={offen}
      id="temperatur-storno"
      title="Messung stornieren"
      meta={`${messung.kuehlstelle ?? ""} · ${formatDatum(messung.tag)} ${zeitSchweiz(messung.gemessen_am)} · ${gradText(messung.temperatur)}`}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
          <Button variant="primary" onClick={stornieren} disabled={speichert}>{speichert ? "Wird storniert …" : "Stornieren"}</Button>
        </>
      }
    >
      {fehler ? <Notice role="alert" title="Nicht storniert">{fehler}</Notice> : null}
      <p className="pl-small">Die Messung bleibt durchgestrichen in der Liste stehen. Den richtigen Wert danach neu erfassen.</p>
      <TextField id="storno-grund" label="Grund" required value={grund} onChange={(e) => setGrund(wert(e))} />
    </Dialog>
  );
}
