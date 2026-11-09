"use client";

import { useState } from "react";
import { Button, Checkbox, Dialog, Fieldset, Notice, Select, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import {
  fehlertext, formularAus, sperreAus, umschalten, updateAus,
  type Formular, type Hinweis, type Regeneration, type System, type Zuteilung,
} from "@/lib/systemzuteilung";

type Props = {
  zeile: Zuteilung;
  hinweise: Hinweis[];
  systeme: System[];
  regenerationen: Regeneration[];
  onClose: () => void;
  /** Neuer Stand aus der Datenbank (nach Speichern oder nach einem Konflikt). */
  onAktualisiert: (zeile: Zuteilung, hinweise: Hinweis[], gespeichert: boolean) => void;
  /** Gespeichert, aber nicht nachgeladen: die Seite lädt alles neu. */
  onNeuLaden: () => void;
};

const checked = (e: unknown) => (e as { target: HTMLInputElement }).target.checked;
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

async function nachladen(id: string) {
  const [z, h] = await Promise.all([
    supabase.from("komponente_zuteilung").select("*").eq("id", id).maybeSingle(),
    supabase.from("komponente_pruefhinweis").select("*").eq("komponente_id", id),
  ]);
  if (z.error || h.error) return { fehler: (z.error ?? h.error)!.message };
  return { zeile: z.data, hinweise: h.data ?? [] };
}

export function KomponenteBearbeiten({ zeile, hinweise, systeme, regenerationen, onClose, onAktualisiert, onNeuLaden }: Props) {
  const [offen, setOffen] = useState(true);
  const [basis, setBasis] = useState<{ zeile: Zuteilung; hinweise: Hinweis[] }>({ zeile, hinweise });
  const [f, setF] = useState<Formular>(() => formularAus(zeile));
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  const produktionsSysteme = systeme.filter((s) => s.code !== "TK");
  const tk = systeme.find((s) => s.code === "TK");
  const set = (teil: Partial<Formular>) => setF((alt) => ({ ...alt, ...teil }));
  const id = basis.zeile.id!;

  async function speichern() {
    const r = updateAus(f);
    if ("fehler" in r) return setFehler(r.fehler);
    setSpeichert(true);
    setFehler(null);

    let q = supabase.from("komponente").update(r.update).eq("id", id);
    for (const b of sperreAus(basis.zeile)) q = b.op === "is" ? q.is(b.spalte, null) : q.filter(b.spalte, "eq", b.wert);
    const u = await q.select("id");
    if (u.error) {
      setSpeichert(false);
      return setFehler(fehlertext(u.error));
    }

    const neu = await nachladen(id);
    setSpeichert(false);
    if ("fehler" in neu) {
      if (u.data.length) onNeuLaden();
      return setFehler(`${u.data.length ? "Gespeichert, aber" : "Nicht gespeichert und"} nicht neu geladen: ${neu.fehler}`);
    }
    if (!neu.zeile) return setFehler("Nicht gespeichert: Komponente nicht gefunden oder keine Berechtigung.");

    if (!u.data.length) {
      // Jemand anderes hat die Komponente inzwischen geändert: neuen Stand zeigen, Eingaben verwerfen.
      setBasis({ zeile: neu.zeile, hinweise: neu.hinweise });
      setF(formularAus(neu.zeile));
      onAktualisiert(neu.zeile, neu.hinweise, false);
      return setFehler("Nicht gespeichert: Die Komponente wurde inzwischen von jemand anderem geändert. Der aktuelle Stand ist geladen, bitte die Änderung erneut eingeben.");
    }
    onAktualisiert(neu.zeile, neu.hinweise, true);
    setOffen(false);
  }

  return (
    <Dialog
      open={offen}
      id="komponente-bearbeiten"
      title={basis.zeile.name ?? "[Komponente]"}
      meta={`${basis.zeile.kategorie} · Excel-Zeile ${basis.zeile.quelle_zeile}`}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
          <Button variant="primary" onClick={speichern} disabled={speichert}>
            {speichert ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </>
      }
    >
      {basis.hinweise.length ? (
        <div>
          <div className="pl-label">Prüfhinweise (gespeicherter Stand)</div>
          {basis.hinweise.map((h) => (
            <div key={h.code}>
              <StatusPill status={h.farbe === "rot" ? "critical" : "warn"}>{h.farbe}</StatusPill> {h.text}
            </div>
          ))}
        </div>
      ) : null}

      <Fieldset
        legend="Produktion"
        hint={
          <>
            <span className="pl-assumed">Haltbarkeiten</span> sind Annahmen aus der Excel:{" "}
            {produktionsSysteme.filter((s) => s.bemerkung).map((s) => `${s.code}: ${s.bemerkung}`).join(" · ")}. Keine Produktion = Status offen.
          </>
        }
      >
        {produktionsSysteme.map((s) => (
          <Checkbox
            key={s.code}
            label={`${s.code} · ${s.name} (${s.haltbarkeit_tage ? `${s.haltbarkeit_tage} Tage` : "vor Ort"})`}
            checked={f.produktion.includes(s.code)}
            onChange={(e) => set({ produktion: umschalten(f.produktion, s.code, checked(e), produktionsSysteme.map((x) => x.code)) })}
          />
        ))}
      </Fieldset>

      <Fieldset
        legend="Lagerung"
        hint={
          tk ? (
            <>
              TK: {tk.name}, <span className="pl-assumed">{tk.haltbarkeit_tage} Tage</span> (Annahme aus der Excel); {tk.bemerkung ?? ""}.
              Lagerung Tage ab 1 übersteuern die Haltbarkeit der Produktion; leer = Haltbarkeit aus der Produktion.
            </>
          ) : undefined
        }
      >
        <Checkbox label="0–2 °C" checked={f.lager_0_2} onChange={(e) => set({ lager_0_2: checked(e) })} />
        <Checkbox label="TK" checked={f.lager_tk} onChange={(e) => set({ lager_tk: checked(e) })} />
        <Checkbox label="gedeckt" checked={f.lager_gedeckt} onChange={(e) => set({ lager_gedeckt: checked(e) })} />
        <TextField id="lager-tage" label="Lagerung Tage" numeric value={f.lager_tage} onChange={(e) => set({ lager_tage: wert(e) })} placeholder="leer = aus Produktion" />
      </Fieldset>

      <Fieldset legend="Regeneration">
        {regenerationen.map((r) => (
          <Checkbox
            key={r.code}
            label={r.code === r.name ? r.name : `${r.code} · ${r.name}`}
            checked={f.regeneration.includes(r.code)}
            onChange={(e) => set({ regeneration: umschalten(f.regeneration, r.code, checked(e), regenerationen.map((x) => x.code)) })}
          />
        ))}
      </Fieldset>

      <div className="pl-grid-2">
        <Select
          id="cf-stufe"
          label="CF-Stufe"
          value={f.cf_stufe}
          onChange={(v) => set({ cf_stufe: v })}
          hint="CF 4 und 5 = Zukauf"
          options={[{ value: "", label: "keine Angabe" }, ...[0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `CF ${n}` }))]}
        />
        <TextField id="bemerkung" label="Bemerkung" value={f.bemerkung} onChange={(e) => set({ bemerkung: wert(e) })} />
      </div>

      {fehler ? <Notice role="alert" title="Nicht gespeichert">{fehler}</Notice> : null}
    </Dialog>
  );
}
