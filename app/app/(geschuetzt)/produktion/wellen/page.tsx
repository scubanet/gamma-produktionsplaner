"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, DataTable, Dialog, KpiTile, Notice, SegmentedControl, StatusPill, TextField, type DataTableColumn } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { datumGueltig, hinweisPill, planNachWelle, vorschlagNachTag, type PlanWelle, type PlanZeile, type Uebersicht, type Vorschlag } from "@/lib/wellen";

type Daten = { uebersicht: Uebersicht; vorschlag: Vorschlag[]; plan: PlanZeile[] };
type WelleForm = { welle: PlanWelle; datum: string; bemerkung: string; fehler: string | null };

const STATUS_PILL: Record<string, "ok" | "warn" | "info"> = { ok: "ok", offen: "warn", Zukauf: "info" };
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

async function laden(): Promise<Daten | null> {
  // Pilot: eine Saison. Gibt es mehrere, die jüngste.
  const u = await supabase.from("wellen_uebersicht").select("*").order("saison", { ascending: false }).limit(1).maybeSingle();
  if (u.error) throw u.error;
  if (!u.data?.saison_id) return null;
  const saison = u.data.saison_id;
  const [vorschlag, plan] = await Promise.all([
    alleSeiten<Vorschlag>((von, bis) => supabase.from("wellen_vorschlag").select("*").eq("saison_id", saison).order("produktion_am").order("komponente_id").range(von, bis)),
    alleSeiten<PlanZeile>((von, bis) => supabase.from("wellenplan").select("*").eq("saison_id", saison).order("nummer").order("komponente_id").range(von, bis)),
  ]);
  return { uebersicht: u.data, vorschlag, plan };
}

export default function Wellen() {
  const [daten, setDaten] = useState<Daten | null | undefined>(undefined);
  const [hinweis, setHinweis] = useState<{ titel: string; text: string } | null>(null);
  const [meldung, setMeldung] = useState("");
  const [ansicht, setAnsicht] = useState<"" | "plan" | "vorschlag">("");
  const [uebernehmenOffen, setUebernehmenOffen] = useState(false);
  const [uebernimmt, setUebernimmt] = useState(false);
  const [form, setForm] = useState<WelleForm | null>(null);
  const [formOffen, setFormOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const anfrage = useRef(0);

  const neuLaden = useCallback(() => {
    const nr = ++anfrage.current;
    return laden().then(
      (d) => {
        if (nr === anfrage.current) setDaten(d);
        return true;
      },
      (e: Error) => {
        if (nr === anfrage.current) setHinweis({ titel: "Wellen nicht geladen", text: e.message });
        return false;
      },
    );
  }, []);

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const melden = (text: string) => {
    setHinweis(null);
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };

  const u = daten?.uebersicht ?? null;
  const hatPlan = (u?.plan_wellen ?? 0) > 0;
  const zeigt = ansicht || (hatPlan ? "plan" : "vorschlag");
  const planWellen = planNachWelle(daten?.plan ?? []);
  const vorschlagWellen = vorschlagNachTag(daten?.vorschlag ?? []);

  async function uebernehmen() {
    if (!u?.saison_id) return;
    setUebernimmt(true);
    const r = await supabase.rpc("wellenplan_uebernehmen", { p_saison: u.saison_id });
    setUebernimmt(false);
    setUebernehmenOffen(false);
    if (r.error) return setHinweis({ titel: "Vorschlag nicht übernommen", text: r.error.message });
    setAnsicht("plan");
    if (await neuLaden()) melden(`Wellenplan mit ${r.data} Welle(n) angelegt.`);
  }

  async function welleSpeichern() {
    if (!form) return;
    if (!datumGueltig(form.datum)) return setForm({ ...form, fehler: "Datum im Kalender wählen." });
    setSpeichert(true);
    const r = await supabase.from("produktionswelle").update({ datum: form.datum, bemerkung: form.bemerkung.trim() || null }).eq("id", form.welle.welleId);
    setSpeichert(false);
    if (r.error) return setForm({ ...form, fehler: r.error.message });
    setFormOffen(false);
    if (await neuLaden()) melden(`Welle ${form.welle.nummer} gespeichert: ${formatDatum(form.datum)}. Prüfhinweise neu gerechnet.`);
  }

  // Menge der Welle hängt an der Annahme, wie Services den Wellen zugeordnet werden (Text unter den Tabellen).
  const mengeSpalte: DataTableColumn = { key: "mengeText", label: <span className="pl-assumed">Menge</span>, numeric: true };
  const basisSpalten: DataTableColumn[] = [
    { key: "komponente", label: "Komponente", subKey: "kategorie" },
    { key: "status", label: "Status", render: (r) => <StatusPill status={STATUS_PILL[r.status as string] ?? "neutral"}>{r.status as string}</StatusPill> },
    mengeSpalte,
    { key: "haltbarkeit", label: <span className="pl-assumed">Haltbarkeit</span>, numeric: true },
  ];

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            <a href="/produktion/">Produktionsplan</a> · {u?.saison ?? "…"}
          </div>
          <h1 className="pl-h1">Produktionswellen</h1>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button href="/produktion/">Produktionsliste</Button>
          <Button onClick={() => window.print()} disabled={!daten}>Drucken / PDF</Button>
          <Button variant="primary" onClick={() => setUebernehmenOffen(true)} disabled={!vorschlagWellen.length}>
            {hatPlan ? "Vorschlag neu übernehmen" : "Vorschlag übernehmen"}
          </Button>
        </div>
      </header>

      {hinweis ? <Notice role="alert" title={hinweis.titel}>{hinweis.text}</Notice> : null}
      <p className="pl-small pl-print-hide" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      {daten === null ? <Notice title="Keine Saison">Es gibt noch keine Saison mit Anlässen.</Notice> : null}

      {u ? (
        <>
          <div className="pl-grid-4">
            <KpiTile label={hatPlan ? "Wellen im Plan" : "Wellen im Vorschlag"} value={formatZahl((hatPlan ? u.plan_wellen : u.vorschlag_wellen) ?? 0)} detail={hatPlan ? `Vorschlag: ${u.vorschlag_wellen}` : "noch kein Plan gespeichert"} />
            <KpiTile label="Komponenten mit Welle" value={formatZahl(u.komponenten_mit_welle ?? 0)} detail="haben eine Haltbarkeit" />
            <KpiTile label="ohne Welle" value={formatZahl((u.komponenten_offen ?? 0) + (u.komponenten_zukauf ?? 0) + (u.komponenten_vor_ort ?? 0))} detail={`${u.komponenten_offen} offen · ${u.komponenten_zukauf} Zukauf · ${u.komponenten_vor_ort} nur vor Ort`} />
            <KpiTile label="Prüfhinweise rot / gelb" value={hatPlan ? `${u.hinweise_rot} / ${u.hinweise_gelb}` : "–"} detail="zeigen an, sperren nichts" />
          </div>

          {(u.services_ohne_datum ?? 0) > 0 ? (
            <Notice title={`${u.services_ohne_datum} von ${u.services} Services ohne Datum`}>
              Ohne Datum weiss die Datenbank nicht, aus welcher Welle ein Service bedient wird: Die Mengen stehen als [Menge]. Bitte das Datum bei den Services im Anlass eintragen.
            </Notice>
          ) : null}
          {(u.komponenten_offen ?? 0) > 0 ? (
            <Notice title={`${u.komponenten_offen} Komponenten noch offen`}>
              Ohne Produktionssystem gibt es keine Haltbarkeit und darum keine Welle. Zuteilen in der Systemzuteilung.
            </Notice>
          ) : null}

          {hatPlan ? (
            <div className="pl-print-hide">
              <div className="pl-label">Ansicht</div>
              <SegmentedControl label="Ansicht" value={zeigt} onChange={(v) => setAnsicht(v as "plan" | "vorschlag")} options={[{ value: "plan", label: "Wellenplan" }, { value: "vorschlag", label: "Vorschlag der Datenbank" }]} />
            </div>
          ) : null}

          {zeigt === "plan"
            ? planWellen.map((w) => (
                <Card
                  key={w.welleId}
                  title={`Welle ${w.nummer} · ${w.datum ? formatDatum(w.datum) : "[Datum]"}`}
                  meta={`spätestens ${w.spaetestens ? formatDatum(w.spaetestens) : "[Datum]"}${w.bemerkung ? ` · ${w.bemerkung}` : ""} · ${w.zeilen.length} Komponenten${w.rot || w.gelb ? ` · ${w.rot} rot, ${w.gelb} gelb` : ""}`}
                  actions={
                    <span className="pl-print-hide">
                      <Button
                        ariaLabel={`Datum der Welle ${w.nummer} ändern`}
                        onClick={() => {
                          setForm({ welle: w, datum: w.datum ?? "", bemerkung: w.bemerkung ?? "", fehler: null });
                          setFormOffen(true);
                        }}
                      >
                        Datum ändern
                      </Button>
                    </span>
                  }
                >
                  <DataTable
                    columns={[
                      ...basisSpalten,
                      { key: "haltbarBis", label: "haltbar bis", numeric: true },
                      {
                        key: "hinweis",
                        label: "Prüfhinweis",
                        render: (r) =>
                          r.farbe ? (
                            <span className="pl-sub">
                              <StatusPill status={hinweisPill(r.farbe as string) ?? "neutral"}>{r.farbe as string}</StatusPill> {r.hinweis as string}
                            </span>
                          ) : null,
                      },
                      { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                    ]}
                    rows={w.zeilen.map((z) => ({
                      id: `${z.komponente_id}-${z.einheit}`,
                      komponente: z.komponente,
                      kategorie: z.kategorie,
                      status: z.status ?? "",
                      mengeText: formatMenge(z.menge, z.einheit),
                      haltbarkeit: z.haltbarkeit_tage === null ? "[Haltbarkeit]" : `${z.haltbarkeit_tage} Tage`,
                      haltbarBis: z.haltbar_bis ? formatDatum(z.haltbar_bis) : "[Datum]",
                      farbe: z.hinweis_farbe,
                      hinweis: z.hinweis,
                      herleitung: z.herleitung ?? "[Herleitung fehlt]",
                    }))}
                  />
                </Card>
              ))
            : vorschlagWellen.map((w) => (
                <Card key={w.datum} title={`Welle ${w.nr} · ${formatDatum(w.datum)}`} meta={`spätester Produktionstag: Tag vor der Anlieferung, danach alle «Haltbarkeit» Tage · ${w.zeilen.length} Komponenten`}>
                  <DataTable
                    columns={[
                      ...basisSpalten,
                      { key: "haltbarBis", label: "haltbar bis", numeric: true },
                      {
                        key: "hinweis",
                        label: "Prüfhinweis",
                        render: (r) =>
                          r.hinweis ? (
                            <span className="pl-sub">
                              <StatusPill status="warn">gelb</StatusPill> {r.hinweis as string}
                            </span>
                          ) : null,
                      },
                      { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                    ]}
                    rows={w.zeilen.map((z) => ({
                      id: `${z.komponente_id}-${z.einheit_total}`,
                      komponente: z.komponente,
                      kategorie: z.kategorie,
                      status: z.status ?? "",
                      mengeText: formatMenge(z.menge, z.einheit_total),
                      haltbarkeit: `${z.haltbarkeit_tage} Tage`,
                      haltbarBis: z.haltbar_bis ? formatDatum(z.haltbar_bis) : "[Datum]",
                      hinweis:
                        [
                          (z.tage_ueber_haltbarkeit ?? 0) > 0 ? `letzter Service am ${formatDatum(z.letzter_service)}: ${z.tage_ueber_haltbarkeit} Tag(e) nach Ablauf der Haltbarkeit` : null,
                          z.anlieferung_knapp ? `Produktion am Tag der Anlieferung (${formatDatum(z.erste_anlieferung)}) oder später: Vorlauf prüfen` : null,
                        ]
                          .filter(Boolean)
                          .join("; ") || null,
                      herleitung: z.herleitung ?? "[Herleitung fehlt]",
                    }))}
                  />
                </Card>
              ))}

          {daten && !(zeigt === "plan" ? planWellen : vorschlagWellen).length ? <p className="pl-muted">Keine Wellen: Noch keine Komponente mit Haltbarkeit in einer Menülinie dieser Saison.</p> : null}

          <p className="pl-small">
            <span className="pl-assumed">Haltbarkeit</span>: Annahme aus der Excel, noch mit Philipp und dem Küchenchef zu bestätigen. <span className="pl-assumed">Menge</span>: Annahme zur Zuordnung wie im
            Raster der Excel: Ein Service wird aus der spätesten Welle bedient, die vor seinem Datum produziert wird. Termine wie in der Excel: erste Welle am Tag vor der Anlieferung, danach alle «Haltbarkeit» Tage.
          </p>
        </>
      ) : daten === undefined ? (
        <p className="pl-muted" role="status">{hinweis ? "Keine Daten." : "Wellen werden geladen …"}</p>
      ) : null}

      <Dialog
        open={uebernehmenOffen}
        id="uebernehmen"
        title={hatPlan ? "Vorschlag neu übernehmen" : "Vorschlag übernehmen"}
        onClose={() => setUebernehmenOffen(false)}
        onCancel={(e) => uebernimmt && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setUebernehmenOffen(false)} disabled={uebernimmt}>Abbrechen</Button>
            <Button variant="primary" onClick={uebernehmen} disabled={uebernimmt}>{uebernimmt ? "Wird übernommen …" : "Als Wellenplan übernehmen"}</Button>
          </>
        }
      >
        <p>
          Aus dem Vorschlag entstehen {u?.vorschlag_wellen ?? 0} Wellen mit Datum und Komponenten. Das Datum jeder Welle lässt sich danach ändern.
        </p>
        {hatPlan ? <Notice title="Ersetzt den bestehenden Plan">Geänderte Daten und Bemerkungen der {u?.plan_wellen} bestehenden Wellen gehen verloren.</Notice> : null}
      </Dialog>

      <Dialog
        open={formOffen}
        id="welle"
        title={form ? `Welle ${form.welle.nummer}` : "Welle"}
        meta={form?.welle.spaetestens ? `spätestens ${formatDatum(form.welle.spaetestens)}` : undefined}
        onClose={() => setFormOffen(false)}
        onCancel={(e) => speichert && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setFormOffen(false)} disabled={speichert}>Abbrechen</Button>
            <Button variant="primary" onClick={welleSpeichern} disabled={speichert}>{speichert ? "Wird gespeichert …" : "Welle speichern"}</Button>
          </>
        }
      >
        {form ? (
          <>
            <div className="pl-grid-2">
              <TextField id="welle-datum" type="date" label="Produktionstag" value={form.datum} onChange={(e) => setForm({ ...form, datum: wert(e), fehler: null })} hint="Früher ist möglich, solange die Haltbarkeit bis zum letzten Service reicht; die Prüfhinweise zeigen es." />
              <TextField id="welle-bemerkung" label="Bemerkung" value={form.bemerkung} onChange={(e) => setForm({ ...form, bemerkung: wert(e), fehler: null })} />
            </div>
            {form.fehler ? <Notice role="alert" title="Nicht gespeichert">{form.fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </>
  );
}
