"use client";

import { Fragment, useState } from "react";
import { Button, Checkbox, Dialog, Fieldset, Notice, Select, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import {
  basisOptionen, rezeptArgs, rezeptFormular,
  type Gruppe, type Punkt, type Rezept, type RezeptFormular, type ZutatRoh,
} from "@/lib/rezepte";

type Props = {
  rezept: Rezept;
  gruppen: Gruppe[];
  zutaten: ZutatRoh[];
  offen: Punkt[];
  onClose: () => void;
  /** Gespeichert: die Seite lädt Liste und Rezept neu. */
  onGespeichert: () => void;
};

const checked = (e: unknown) => (e as { target: HTMLInputElement }).target.checked;
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

export function RezeptBearbeiten({ rezept, gruppen, zutaten, offen, onClose, onGespeichert }: Props) {
  const [auf, setAuf] = useState(true);
  const [f, setF] = useState<RezeptFormular>(() => rezeptFormular(rezept, zutaten));
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  const set = (teil: Partial<RezeptFormular>) => {
    setFehler(null);
    setF((alt) => ({ ...alt, ...teil }));
  };
  const setZutat = (id: string, teil: Partial<{ menge: string; annahme: boolean }>) =>
    set({ zutaten: { ...f.zutaten, [id]: { ...f.zutaten[id], ...teil } } });
  const gericht = f.typ === "gericht";
  const basis = basisOptionen(zutaten, f);
  const sortiert = <T extends { reihenfolge: number }>(a: T[]) => [...a].sort((x, y) => x.reihenfolge - y.reihenfolge);

  async function speichern() {
    const r = rezeptArgs(rezept, zutaten, f);
    if ("fehler" in r) return setFehler(r.fehler);
    setSpeichert(true);
    setFehler(null);
    const q = await supabase.rpc("rezept_speichern", r.args);
    setSpeichert(false);
    if (q.error) return setFehler(q.error.message);
    onGespeichert();
    setAuf(false);
  }

  return (
    <Dialog
      open={auf}
      id="rezept-bearbeiten"
      title={`${rezept.name} bearbeiten`}
      meta="Mengen gelten für die Basis des Rezepts (Basisportionen bzw. eine Charge)"
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          <Button onClick={() => setAuf(false)} disabled={speichert}>Abbrechen</Button>
          <Button variant="primary" onClick={speichern} disabled={speichert}>
            {speichert ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </>
      }
    >
      <TextField id="rezept-name" label="Name" required value={f.name} onChange={(e) => set({ name: wert(e) })} hint="Die Adresse des Rezepts (Link) bleibt gleich" />

      <div className="pl-grid-2">
        <Select
          id="rezept-typ"
          label="Typ"
          value={f.typ}
          onChange={(v) => set({ typ: v as RezeptFormular["typ"] })}
          hint="Gericht skaliert nach Portionen, Komponente nach Chargen"
          options={[{ value: "gericht", label: "Gericht" }, { value: "komponente", label: "Komponente" }]}
        />
        <TextField id="rezept-kategorie" label="Kategorie" value={f.kategorie} onChange={(e) => set({ kategorie: wert(e) })} placeholder="z.B. Sauce, Brot, Hauptgang" />
      </div>

      {gericht ? (
        <>
          <div className="pl-grid-2">
            <TextField id="rezept-portionen" label="Basisportionen" numeric value={f.basis_portionen} onChange={(e) => set({ basis_portionen: wert(e) })} hint="Für so viele Portionen gelten die Mengen" />
            <TextField id="rezept-portion" label="Portion in Gramm" numeric value={f.portion_g} onChange={(e) => set({ portion_g: wert(e) })} placeholder="leer = [Portion]" />
          </div>
          <Checkbox label="Portionen sind eine Annahme" checked={f.portionen_annahme} onChange={(e) => set({ portionen_annahme: checked(e) })} />
        </>
      ) : (
        <>
          <div className="pl-grid-2">
            <TextField id="rezept-ergibt" label="Ergibt pro Charge in Gramm" numeric value={f.ergibt_g} onChange={(e) => set({ ergibt_g: wert(e) })} placeholder="leer = [Menge]" />
            <TextField id="rezept-charge" label="Chargengrösse (Text)" value={f.chargengroesse} onChange={(e) => set({ chargengroesse: wert(e) })} placeholder="z.B. 5 Liter, GN 1/1 × 65 mm" />
          </div>
          <Checkbox label="Ergibt-Menge ist eine Annahme" checked={f.ergibt_annahme} onChange={(e) => set({ ergibt_annahme: checked(e) })} />
        </>
      )}

      <Select
        id="rezept-basiszutat"
        label="Basiszutat (100 % für die Skalierung)"
        value={basis.some((b) => b.value === f.basis_zutat) ? f.basis_zutat : ""}
        onChange={(v) => set({ basis_zutat: v })}
        hint="Zur Auswahl stehen Zutaten mit einer Menge in Gramm"
        options={[{ value: "", label: "keine Basiszutat" }, ...basis]}
      />

      {sortiert(gruppen).map((g) => {
        const zs = sortiert(zutaten.filter((z) => z.gruppe_id === g.id));
        if (!zs.length) return null;
        return (
          <Fragment key={g.id}>
            <div>
              <div className="pl-label">{g.titel ? `Zutaten · ${g.titel}` : "Zutaten"}</div>
              <div className="pl-small">Menge in Gramm; leer = Menge fehlt. Die Originalangabe bleibt als Notiz stehen.</div>
            </div>
            {zs.map((z) => (
              <div className="pl-grid-2" key={z.id}>
                <TextField
                  id={`zutat-${z.id}`}
                  label={z.bezeichnung}
                  numeric
                  value={f.zutaten[z.id]?.menge ?? ""}
                  onChange={(e) => setZutat(z.id, { menge: wert(e) })}
                  hint={z.notiz ? `Original: ${z.notiz}` : undefined}
                  placeholder="g"
                />
                <Checkbox
                  label={<>Annahme<span className="pl-sr"> bei {z.bezeichnung}</span></>}
                  checked={!!f.zutaten[z.id]?.annahme}
                  onChange={(e) => setZutat(z.id, { annahme: checked(e) })}
                />
              </div>
            ))}
          </Fragment>
        );
      })}

      {offen.length ? (
        <Fieldset legend="Offene Punkte" hint="Angekreuzte Punkte gelten nach dem Speichern als erledigt und verschwinden von der Rezeptkarte.">
          {offen.map((p) => (
            <Checkbox
              key={p.id}
              label={p.text}
              checked={f.erledigt.includes(p.id)}
              onChange={(e) => set({ erledigt: checked(e) ? [...f.erledigt, p.id] : f.erledigt.filter((x) => x !== p.id) })}
            />
          ))}
        </Fieldset>
      ) : null}

      {fehler ? <Notice role="alert" title="Nicht gespeichert">{fehler}</Notice> : null}
    </Dialog>
  );
}
