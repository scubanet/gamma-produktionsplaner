"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, DataTable, Dialog, KpiTile, Notice, SegmentedControl, Select, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatChf } from "@/lib/offerte";
import {
  artText, formAus, gewicht, mengeProGast, mietkosten, nachGang, OHNE_GANG, positionDaten, stueck,
  type Bedarf, type PositionForm, type ServiceArtikel,
} from "@/lib/geschirr";

type Daten = { zeilen: Bedarf[]; artikel: ServiceArtikel[]; standard: number };
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

async function laden(anlassId: string, angebotsform: string | null): Promise<Daten> {
  const [z, a, s] = await Promise.all([
    supabase.from("anlass_geschirr_bedarf").select("*").eq("anlass_id", anlassId),
    supabase.from("service_artikel").select("id, name, art").eq("aktiv", true).order("name"),
    angebotsform
      ? supabase.from("geschirr_standard").select("id", { count: "exact", head: true }).eq("angebotsform", angebotsform)
      : Promise.resolve({ count: 0, error: null }),
  ]);
  if (z.error) throw z.error;
  if (a.error) throw a.error;
  if (s.error) throw s.error;
  return { zeilen: z.data ?? [], artikel: a.data ?? [], standard: s.count ?? 0 };
}

/** Geschirr und Besteck am Anlass: Standard übernehmen, Positionen übersteuern, Bedarf mit Herleitung. */
export function Geschirr({ anlassId, angebotsform, gaenge, onMeldung, onFehler }: {
  anlassId: string;
  angebotsform: string | null;
  /** Gänge aus den Menülinien des Anlasses, in ihrer Reihenfolge. */
  gaenge: string[];
  onMeldung: (text: string) => void;
  onFehler: (titel: string, text: string) => void;
}) {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [ladeFehler, setLadeFehler] = useState<string | null>(null);
  const [form, setForm] = useState<(PositionForm & { fehler: string | null }) | null>(null);
  const [offen, setOffen] = useState(false);
  const [arbeitet, setArbeitet] = useState(false);

  const neuLaden = useCallback(
    () =>
      laden(anlassId, angebotsform).then(
        (d) => {
          setDaten(d);
          setLadeFehler(null);
        },
        (e: Error) => setLadeFehler(e.message),
      ),
    [anlassId, angebotsform],
  );

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  async function standardUebernehmen() {
    setArbeitet(true);
    const r = await supabase.rpc("anlass_geschirr_vorschlagen", { p_anlass: anlassId });
    setArbeitet(false);
    if (r.error) return onFehler("Standard nicht übernommen", r.error.message);
    await neuLaden();
    onMeldung(r.data ? `${r.data} Position(en) aus dem Standard übernommen. Bestehende Positionen bleiben unverändert.` : "Keine neue Position: Der Standard ist schon übernommen oder hat für diese Gänge keine Einträge.");
  }

  async function speichern() {
    if (!form) return;
    const p = positionDaten(form);
    if ("fehler" in p) return setForm({ ...form, fehler: p.fehler });
    setArbeitet(true);
    // Eine von Hand geänderte Position gilt nicht mehr als Standard.
    const r = form.id
      ? await supabase.from("anlass_geschirr").update({ ...p.daten, aus_standard: false }).eq("id", form.id)
      : await supabase.from("anlass_geschirr").insert({ ...p.daten, anlass_id: anlassId, artikel_id: form.artikel_id });
    setArbeitet(false);
    if (r.error) return setForm({ ...form, fehler: r.error.code === "23505" ? "Diesen Artikel gibt es in diesem Gang schon. Die bestehende Position bearbeiten." : r.error.message });
    setOffen(false);
    await neuLaden();
    onMeldung("Position gespeichert. Bedarf neu gerechnet.");
  }

  async function entfernen(z: Bedarf) {
    if (!z.id) return;
    const r = await supabase.from("anlass_geschirr").delete().eq("id", z.id);
    if (r.error) return onFehler("Position nicht entfernt", r.error.message);
    await neuLaden();
    onMeldung(`${z.artikel ?? "Position"} entfernt.`);
  }

  const zeilen = daten?.zeilen ?? [];
  const gruppen = nachGang(zeilen, gaenge);
  const miete = zeilen.filter((z) => (z.miete ?? 0) > 0);
  const kosten = mietkosten(zeilen);
  const gaeste = zeilen[0]?.gaeste ?? null;

  return (
    <Card
      title="Geschirr und Besteck"
      meta="pro Gast und Gang, Abweichungen pro Gericht als eigene Position, Material für die Ausgabe als feste Stückzahl"
      actions={
        <span className="pl-actions pl-print-hide">
          <Button onClick={standardUebernehmen} disabled={arbeitet || !daten}>Standard übernehmen</Button>
          <Button variant="dashed" onClick={() => { setForm({ ...formAus(null, gaenge[0] ?? ""), fehler: null }); setOffen(true); }} disabled={!daten?.artikel.length}>+ Position</Button>
        </span>
      }
    >
      <div className="pl-stack">
        {ladeFehler ? <Notice role="alert" title="Geschirr nicht geladen">{ladeFehler}</Notice> : null}
        {daten && !daten.artikel.length ? (
          <Notice title="Noch keine Artikel">Teller, Besteck und Material zuerst in den Stammdaten unter «Geschirr und Besteck» erfassen.</Notice>
        ) : null}
        {daten && daten.artikel.length && !daten.standard && !zeilen.length ? (
          <Notice title="Kein Standard für diese Angebotsform">
            {angebotsform ? "In den Stammdaten unter «Standard Geschirr» festlegen, was pro Gast und Gang gilt. Oder die Positionen hier von Hand erfassen." : "Der Anlass hat keine Angebotsform. Im Kopf des Anlasses wählen."}
          </Notice>
        ) : null}

        {zeilen.length ? (
          <>
            <div className="pl-grid-4">
              <KpiTile label="Positionen" value={String(zeilen.length)} detail={`${zeilen.filter((z) => z.aus_standard).length} aus dem Standard, ${zeilen.filter((z) => !z.aus_standard).length} angepasst oder ergänzt`} />
              <KpiTile label="Gäste für die Rechnung" value={gaeste === null ? "[Gäste]" : <span className="pl-assumed">{stueck(gaeste)}</span>} detail="grösster Service; Annahme: dazwischen wird abgewaschen" />
              <KpiTile label="Zusatzbedarf Miete" value={miete.length ? `${miete.length} Artikel` : "–"} detail={miete.length ? `${stueck(miete.reduce((s, z) => s + (z.miete ?? 0), 0))} Stück über dem eigenen Bestand` : "eigener Bestand reicht"} />
              <KpiTile label="Mietkosten" value={kosten === null ? "[Preis]" : formatChf(kosten)} detail="Stück über dem Bestand × Mietpreis" />
            </div>
            {gruppen.map((g) => (
              <div key={g.gang}>
                <div className="pl-eyebrow" style={{ marginBottom: 8 }}>{g.gang}</div>
                <DataTable
                  columns={[
                    { key: "artikel", label: "Artikel", subKey: "sub" },
                    { key: "proGast", label: "pro Gast × Wechsel", numeric: true },
                    { key: "bedarf", label: "Bedarf", numeric: true },
                    { key: "eigen", label: "eigen", numeric: true },
                    { key: "miete", label: "Miete", render: (r) => ((r.mieteZahl as number) > 0 ? <StatusPill status="info">{`+ ${stueck(r.mieteZahl as number)} Miete`}</StatusPill> : <StatusPill status="ok">eigen gedeckt</StatusPill>) },
                    { key: "koerbe", label: "Körbe", numeric: true },
                    { key: "gewicht", label: "Gewicht", numeric: true },
                    { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                    {
                      key: "aktion",
                      label: <span className="pl-sr">Aktionen</span>,
                      printHidden: true,
                      render: (r) => (
                        <span className="pl-actions">
                          <Button ariaLabel={`${r.artikel as string} bearbeiten`} onClick={() => { setForm({ ...formAus(r.z as Bedarf), fehler: null }); setOffen(true); }}>Bearbeiten</Button>
                          <Button ariaLabel={`${r.artikel as string} entfernen`} onClick={() => entfernen(r.z as Bedarf)}>Entfernen</Button>
                        </span>
                      ),
                    },
                  ]}
                  rows={g.zeilen.map((z) => ({
                    id: z.id,
                    z,
                    artikel: z.artikel,
                    sub: [artText(z.art), z.aus_standard ? "Standard" : "angepasst", z.bemerkung].filter(Boolean).join(" · "),
                    proGast: mengeProGast(z),
                    bedarf: stueck(z.bedarf),
                    eigen: stueck(z.eigen, "–"),
                    mieteZahl: z.miete ?? 0,
                    koerbe: stueck(z.koerbe, "[Körbe]"),
                    gewicht: gewicht(z.gewicht_kg),
                    herleitung: z.herleitung ?? "",
                  }))}
                />
              </div>
            ))}
            <p className="pl-small">
              Bedarf = Gäste × Stück pro Gast × Wechselfaktor, plus Reserve, aufgerundet. <span className="pl-assumed">Annahme</span>: Es zählt der grösste Service des Anlasses.
              Gleichzeitige Anlässe sind beim eigenen Bestand noch nicht berücksichtigt. [Körbe] und [Gewicht]: Stück pro Korb und Gewicht beim Artikel in den Stammdaten erfassen.
            </p>
          </>
        ) : daten && daten.artikel.length ? (
          <p className="pl-muted">Noch keine Positionen. «Standard übernehmen» schlägt sie für die Gänge des Menüs vor.</p>
        ) : !daten && !ladeFehler ? (
          <p className="pl-muted" role="status">Geschirr wird geladen …</p>
        ) : null}
      </div>

      <Dialog
        open={offen}
        id="geschirr-position"
        title={form?.id ? "Position bearbeiten" : "Position hinzufügen"}
        meta="gilt nur für diesen Anlass"
        onClose={() => setOffen(false)}
        onCancel={(e) => arbeitet && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setOffen(false)} disabled={arbeitet}>Abbrechen</Button>
            <Button variant="primary" onClick={speichern} disabled={arbeitet}>{arbeitet ? "Wird gespeichert …" : "Position speichern"}</Button>
          </>
        }
      >
        {form ? (
          <>
            <div className="pl-grid-2">
              <Select id="geschirr-artikel" label="Artikel" value={form.artikel_id} onChange={(v) => setForm({ ...form, artikel_id: v, fehler: null })} options={[{ value: "", label: "[Artikel]" }, ...(daten?.artikel ?? []).map((a) => ({ value: a.id, label: `${a.name} · ${artText(a.art)}` }))]} />
              <Select id="geschirr-gang" label="Gang" value={form.gang} onChange={(v) => setForm({ ...form, gang: v, fehler: null })} options={[...[...new Set([...gaenge, ...(form.gang ? [form.gang] : [])])].map((g) => ({ value: g, label: g })), { value: "", label: OHNE_GANG }]} />
            </div>
            <div>
              <div className="pl-label">Menge</div>
              <SegmentedControl label="Menge" value={form.art} onChange={(v) => setForm({ ...form, art: v as "gast" | "fix", fehler: null })} options={[{ value: "gast", label: "pro Gast" }, { value: "fix", label: "feste Stückzahl" }]} />
            </div>
            {form.art === "gast" ? (
              <div className="pl-grid-3">
                <TextField id="geschirr-stueck" label="Stück pro Gast" numeric value={form.stueck_pro_gast} onChange={(e) => setForm({ ...form, stueck_pro_gast: wert(e), fehler: null })} />
                <TextField id="geschirr-faktor" label="Wechselfaktor" numeric value={form.wechselfaktor} onChange={(e) => setForm({ ...form, wechselfaktor: wert(e), fehler: null })} hint="z.B. 1.5: jeder zweite Gast nimmt einen zweiten" />
                <TextField id="geschirr-reserve" label="Reserve %" numeric value={form.reserve_pct} onChange={(e) => setForm({ ...form, reserve_pct: wert(e), fehler: null })} />
              </div>
            ) : (
              <TextField id="geschirr-fix" label="Feste Stückzahl" numeric value={form.stueck_fix} onChange={(e) => setForm({ ...form, stueck_fix: wert(e), fehler: null })} hint="z.B. Platten, Wärmebehälter, Vorlegebesteck" />
            )}
            <TextField id="geschirr-bemerkung" label="Bemerkung" value={form.bemerkung} onChange={(e) => setForm({ ...form, bemerkung: wert(e), fehler: null })} placeholder="z.B. nur für die Suppen, Dessert im Glas" />
            {form.fehler ? <Notice role="alert" title="Nicht gespeichert">{form.fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </Card>
  );
}
