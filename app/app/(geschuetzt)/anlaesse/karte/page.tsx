"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, DataTable, Dialog, Notice, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { dezimal, fehlerText, nachRubrik, type Karte, type KartenPosition } from "@/lib/anlass";
import { formatChf } from "@/lib/offerte";

type Daten = { karte: Karte | null; anlass: { id: string; name: string } | null; positionen: KartenPosition[] };
type Form = { id: string | null; rubrik: string; name: string; menge: string; preis: string; fehler: string | null };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

async function laden(id: string): Promise<Daten> {
  const k = await supabase.from("karte").select("*").eq("id", id).maybeSingle();
  if (k.error) throw k.error;
  const [p, a] = await Promise.all([
    supabase.from("karte_position").select("*").eq("karte_id", id),
    k.data?.anlass_id ? supabase.from("anlass").select("id, name").eq("id", k.data.anlass_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (p.error) throw p.error;
  if (a.error) throw a.error;
  return { karte: k.data, anlass: a.data, positionen: p.data ?? [] };
}

function KarteBearbeiten() {
  const id = useSearchParams().get("id") ?? "";
  const [daten, setDaten] = useState<Daten | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [meldung, setMeldung] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [offen, setOffen] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const anfrage = useRef(0);

  const neuLaden = useCallback(() => {
    const nr = ++anfrage.current;
    return laden(id).then(
      (d) => {
        if (nr === anfrage.current) setDaten(d);
      },
      (e: Error) => {
        if (nr === anfrage.current) setHinweis(`Karte nicht geladen: ${e.message}`);
      },
    );
  }, [id]);

  useEffect(() => {
    if (id) neuLaden();
  }, [id, neuLaden]);

  if (!id) return <Notice title="Keine Karte gewählt">Bitte eine Karte im Anlass öffnen.</Notice>;
  if (daten && !daten.karte) return <Notice title="Karte nicht gefunden">Die Karte gibt es nicht oder sie wurde gelöscht.</Notice>;

  const melden = (text: string) => {
    setHinweis(null);
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };
  const k = daten?.karte ?? null;
  const preis = form ? dezimal(form.preis, 100000) : null;

  function oeffnen(p: KartenPosition | null, rubrik = "") {
    setForm(
      p
        ? { id: p.id, rubrik: p.rubrik ?? "", name: p.name, menge: p.menge ?? "", preis: p.preis_chf === null ? "" : p.preis_chf.toFixed(2), fehler: null }
        : { id: null, rubrik, name: "", menge: "", preis: "", fehler: null },
    );
    setOffen(true);
  }

  async function speichern() {
    if (!form || !k) return;
    if (form.name.trim() === "") return setForm({ ...form, fehler: "Bezeichnung eingeben, z.B. «Passugger Prickelnd»." });
    if (preis === undefined) return setForm({ ...form, fehler: "Preis: Zahl mit höchstens 2 Stellen, z.B. 9.50, oder leer." });
    const d = { rubrik: form.rubrik.trim() || null, name: form.name.trim(), menge: form.menge.trim() || null, preis_chf: preis };
    setSpeichert(true);
    const r = form.id
      ? await supabase.from("karte_position").update(d).eq("id", form.id)
      : await supabase.from("karte_position").insert({ ...d, karte_id: k.id, reihenfolge: Math.max(0, ...(daten?.positionen ?? []).map((p) => p.reihenfolge)) + 1 });
    setSpeichert(false);
    if (r.error) return setForm({ ...form, fehler: fehlerText(r.error) });
    setOffen(false);
    await neuLaden();
    melden(`${d.name} gespeichert.`);
  }

  async function entfernen(p: KartenPosition) {
    const r = await supabase.from("karte_position").delete().eq("id", p.id);
    if (r.error) return setHinweis(`${p.name} nicht entfernt: ${fehlerText(r.error)}`);
    await neuLaden();
    melden(`${p.name} entfernt.`);
  }

  async function umbenennen() {
    if (!k || name === null) return;
    if (name.trim() === "") return setHinweis("Name der Karte eingeben.");
    const r = await supabase.from("karte").update({ name: name.trim() }).eq("id", k.id);
    if (r.error) return setHinweis(fehlerText(r.error));
    setName(null);
    await neuLaden();
    melden("Name gespeichert.");
  }

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb pl-print-hide">
            <a href="/anlaesse/">Anlässe</a> · {daten?.anlass ? <a href={`/anlaesse/bearbeiten/?id=${daten.anlass.id}`}>{daten.anlass.name}</a> : "ohne Anlass"}
          </div>
          <h1 className="pl-h1">{k?.name ?? "Karte"}</h1>
          {daten?.anlass ? <div className="pl-sub">{daten.anlass.name}</div> : null}
        </div>
        <div className="pl-actions pl-print-hide">
          <Button onClick={() => setName(k?.name ?? "")}>Umbenennen</Button>
          <Button onClick={() => oeffnen(null)}>+ Position</Button>
          <Button variant="primary" onClick={() => window.print()} disabled={!k}>Drucken / als PDF sichern</Button>
        </div>
      </header>

      {hinweis ? (
        <div className="pl-print-hide">
          <Notice role="alert" title="Fehler">{hinweis}</Notice>
        </div>
      ) : null}
      {daten && daten.positionen.some((p) => p.preis_chf === null) ? (
        <div className="pl-print-hide">
          <Notice title="Positionen ohne Preis">{daten.positionen.filter((p) => p.preis_chf === null).length} Position(en) ohne Preis erscheinen im Druck als [Preis].</Notice>
        </div>
      ) : null}
      <p className="pl-small pl-print-hide" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      {name !== null ? (
        <div className="pl-print-hide">
          <form
            className="pl-actions"
            onSubmit={(e) => {
              e.preventDefault();
              umbenennen();
            }}
          >
            <TextField id="karte-name" label="Name der Karte" value={name} onChange={(e) => setName(wert(e))} />
            <Button type="submit" variant="primary">Name speichern</Button>
            <Button onClick={() => setName(null)}>Abbrechen</Button>
          </form>
        </div>
      ) : null}

      {daten ? (
        daten.positionen.length ? (
          nachRubrik(daten.positionen).map((g) => (
            <Card key={g.rubrik} title={g.rubrik} meta="Preise in CHF">
              <DataTable
                columns={[
                  { key: "name", label: "Bezeichnung" },
                  { key: "menge", label: "Menge" },
                  { key: "preisText", label: "Preis", numeric: true },
                  {
                    key: "aktion",
                    printHidden: true,
                    label: <span className="pl-sr">Aktionen</span>,
                    render: (r) => (
                      <span className="pl-actions pl-print-hide">
                        <Button ariaLabel={`${r.name as string} bearbeiten`} onClick={() => oeffnen(r.p as KartenPosition)}>Bearbeiten</Button>
                        <Button ariaLabel={`${r.name as string} entfernen`} onClick={() => entfernen(r.p as KartenPosition)}>Entfernen</Button>
                      </span>
                    ),
                  },
                ]}
                rows={g.positionen.map((p) => ({
                  id: p.id,
                  p,
                  name: p.name,
                  menge: p.menge ?? "",
                  preisText: p.preis_chf === null ? "[Preis]" : formatChf(p.preis_chf).replace("CHF ", ""),
                }))}
              />
              <div className="pl-print-hide">
                <Button variant="dashed" onClick={() => oeffnen(null, g.rubrik === "Ohne Rubrik" ? "" : g.rubrik)}>+ Position in {g.rubrik}</Button>
              </div>
            </Card>
          ))
        ) : (
          <p className="pl-muted pl-print-hide">Noch keine Positionen. «+ Position» legt die erste an.</p>
        )
      ) : (
        <p className="pl-muted" role="status">{hinweis ? "Keine Daten." : "Karte wird geladen …"}</p>
      )}

      <Dialog
        open={offen}
        id="position"
        title={form?.id ? `Position ${form.name}` : "Position hinzufügen"}
        onClose={() => setOffen(false)}
        onCancel={(e) => speichert && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
            <Button variant="primary" onClick={speichern} disabled={speichert}>{speichert ? "Wird gespeichert …" : "Position speichern"}</Button>
          </>
        }
      >
        {form ? (
          <>
            <div className="pl-grid-2">
              <TextField id="pos-rubrik" label="Rubrik" value={form.rubrik} onChange={(e) => setForm({ ...form, rubrik: wert(e), fehler: null })} placeholder="Süssgetränke" />
              <TextField id="pos-name" label="Bezeichnung" value={form.name} onChange={(e) => setForm({ ...form, name: wert(e), fehler: null })} />
              <TextField id="pos-menge" label="Menge" value={form.menge} onChange={(e) => setForm({ ...form, menge: wert(e), fehler: null })} placeholder="33cl" />
              <TextField
                id="pos-preis"
                label="Preis CHF"
                numeric
                value={form.preis}
                invalid={preis === undefined}
                onChange={(e) => setForm({ ...form, preis: wert(e), fehler: null })}
                hint={preis === undefined ? "Zahl mit höchstens 2 Stellen" : "leer = [Preis]"}
              />
            </div>
            {form.fehler ? <Notice role="alert" title="Nicht gespeichert">{form.fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </>
  );
}

export default function KartePage() {
  return (
    <Suspense>
      <KarteBearbeiten />
    </Suspense>
  );
}
