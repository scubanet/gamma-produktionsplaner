"use client";

import { useState } from "react";
import { Button, Card, Select, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import { ANLASS_SPALTEN, STATUS, fehlerText, kopfAus, kopfUpdate, type Anlass, type Kopf } from "@/lib/anlass";

export type Stamm = {
  saisons: { id: string; name: string }[];
  betriebe: { code: string; name: string; faktor_vk: number }[];
  angebotsformen: { code: string; name: string }[];
};

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

export function AnlassKopf({ anlass, stamm, onGespeichert, onFehler }: {
  anlass: Anlass;
  stamm: Stamm;
  onGespeichert: (a: Anlass) => void;
  onFehler: (text: string) => void;
}) {
  const [k, setK] = useState<Kopf>(() => kopfAus(anlass));
  const [speichert, setSpeichert] = useState(false);
  const set = (teil: Partial<Kopf>) => setK((x) => ({ ...x, ...teil }));

  async function speichern() {
    const r = kopfUpdate(k);
    if ("fehler" in r) return onFehler(r.fehler);
    setSpeichert(true);
    const u = await supabase.from("anlass").update(r.update).eq("id", anlass.id).select(ANLASS_SPALTEN).single();
    setSpeichert(false);
    if (u.error) return onFehler(fehlerText(u.error));
    setK(kopfAus(u.data));
    onGespeichert(u.data);
  }

  return (
    <Card title="Anlass" meta="Saison und Datum bestimmen die Produktionswellen">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          speichern();
        }}
      >
        <div className="pl-grid-3">
          <TextField id="name" label="Anlass" value={k.name} onChange={(e) => set({ name: wert(e) })} required />
          <TextField id="nummer" label="Nummer" value={k.nummer} onChange={(e) => set({ nummer: wert(e) })} placeholder="[Nummer]" />
          <TextField id="kunde" label="Kunde" value={k.kunde} onChange={(e) => set({ kunde: wert(e) })} placeholder="[Kunde]" />
          <TextField id="datum" type="date" label="Datum von" value={k.datum} onChange={(e) => set({ datum: wert(e) })} />
          <TextField id="datum-bis" type="date" label="Datum bis" value={k.datum_bis} onChange={(e) => set({ datum_bis: wert(e) })} hint="leer bei eintägigem Anlass" />
          <TextField id="ort" label="Ort" value={k.ort} onChange={(e) => set({ ort: wert(e) })} placeholder="[Ort]" />
          <Select
            id="saison"
            label="Saison"
            value={k.saison_id}
            onChange={(v) => set({ saison_id: v })}
            options={[{ value: "", label: "[Saison wählen]" }, ...stamm.saisons.map((s) => ({ value: s.id, label: s.name }))]}
            hint="ohne Saison zählt der Anlass nicht für Produktionswellen"
          />
          <TextField id="vorlauf" label="Vorlauf (Tage)" numeric value={k.vorlauf_tage} onChange={(e) => set({ vorlauf_tage: wert(e) })} hint="Anlieferung vor dem ersten Tag" />
          <Select id="status" label="Status" value={k.status} onChange={(v) => set({ status: v })} options={STATUS.map((s) => ({ value: s.wert, label: s.label }))} />
          <Select
            id="betrieb"
            label="Betrieb"
            value={k.betrieb}
            onChange={(v) => set({ betrieb: v })}
            options={[{ value: "", label: "[Betrieb wählen]" }, ...stamm.betriebe.map((b) => ({ value: b.code, label: `${b.name} (Faktor ${formatZahl(b.faktor_vk, 1)})` }))]}
          />
          <Select
            id="angebotsform"
            label="Angebotsform"
            value={k.angebotsform}
            onChange={(v) => set({ angebotsform: v })}
            options={[{ value: "", label: "[Angebotsform wählen]" }, ...stamm.angebotsformen.map((a) => ({ value: a.code, label: a.name }))]}
          />
          <TextField id="gaeste" label="Gäste (Richtwert)" numeric value={k.gaeste} onChange={(e) => set({ gaeste: wert(e) })} hint="für Mengen zählen die Gäste der Services" />
          <TextField id="bemerkung" label="Interne Bemerkung" value={k.bemerkung} onChange={(e) => set({ bemerkung: wert(e) })} />
        </div>
        <div className="pl-actions">
          <Button type="submit" variant="primary" disabled={speichert}>
            {speichert ? "Wird gespeichert …" : "Anlass speichern"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
