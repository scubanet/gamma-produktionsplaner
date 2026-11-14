"use client";

import { useState } from "react";
import { Button, Checkbox, Dialog, Notice, Select, TextField } from "@/lib/planer";

type Props = {
  komponente: string;
  meta: string;
  wert: string | null;
  /** Bereits verwendete Namen der Saison, zur schnellen Auswahl. */
  bekannte: string[];
  /** Text unter dem Feld: wofür der Eintrag gilt. */
  hinweis?: string;
  /** «Entfernen» anbieten, auch wenn kein einzelner Wert vorbelegt ist (mehrere Personen über die Wellen). */
  entfernbar?: boolean;
  /** Anzahl Wellen der Komponente. Ab 2 erscheint die Wahl «für alle Wellen». */
  alleWellen?: number;
  onClose: () => void;
  /** Speichert und liefert eine Fehlermeldung oder null. fuerAlle: für alle Wellen der Komponente. */
  onSpeichern: (zustaendig: string | null, fuerAlle: boolean) => Promise<string | null>;
};

const wertAus = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

export function ZustaendigDialog({ komponente, meta, wert, bekannte, hinweis, entfernbar, alleWellen, onClose, onSpeichern }: Props) {
  const [offen, setOffen] = useState(true);
  const [name, setName] = useState(wert ?? "");
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [fuerAlle, setFuerAlle] = useState(false);

  async function speichern(neu: string | null) {
    const bereinigt = neu?.trim() || null;
    if (bereinigt && bereinigt.length > 80) return setFehler("Höchstens 80 Zeichen.");
    setSpeichert(true);
    setFehler(null);
    const f = await onSpeichern(bereinigt, fuerAlle);
    setSpeichert(false);
    if (f) return setFehler(f);
    setOffen(false);
  }

  return (
    <Dialog
      open={offen}
      id="zustaendig"
      title={`Zuständig: ${komponente}`}
      meta={meta}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          {wert || entfernbar ? <Button onClick={() => speichern(null)} disabled={speichert}>Entfernen</Button> : null}
          <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
          <Button variant="primary" onClick={() => speichern(name)} disabled={speichert}>
            {speichert ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </>
      }
    >
      {fehler ? <Notice title="Nicht gespeichert">{fehler}</Notice> : null}
      {bekannte.length ? (
        <Select
          id="zustaendig-liste"
          label="Aus der Liste wählen"
          value={bekannte.includes(name.trim()) ? name.trim() : ""}
          onChange={setName}
          options={[{ value: "", label: "– bisher eingetragene Personen –" }, ...bekannte.map((b) => ({ value: b, label: b }))]}
        />
      ) : null}
      <TextField
        id="zustaendig-name"
        label="Name oder Posten"
        value={name}
        onChange={(e) => setName(wertAus(e))}
        placeholder="z.B. Remo, Patisserie, Frühschicht"
        hint={hinweis ?? "Gilt für diese Komponente in dieser Saison."}
      />
      {alleWellen && alleWellen > 1 ? (
        <Checkbox
          label={`Für alle ${alleWellen} Wellen dieser Komponente`}
          checked={fuerAlle}
          onChange={(e) => setFuerAlle((e as { target: HTMLInputElement }).target.checked)}
        />
      ) : null}
    </Dialog>
  );
}
