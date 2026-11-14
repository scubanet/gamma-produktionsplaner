"use client";

import { useState } from "react";
import { Button, Card, Checkbox, DataTable, Dialog, Notice, Select, TextField, type DataTableColumn } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { fehlerText, formularAus, werteAus, type Feld, type Formular, type Zeile } from "@/lib/stammdaten";

type Tabelle = "lohnsatz" | "energiepreis" | "fixkosten" | "geraet" | "gebinde" | "service_artikel" | "geschirr_standard";

/** Eine Stammdaten-Tabelle mit Erfassen, Ändern und Löschen im Dialog. */
export function Stammtabelle({ tabelle, titel, meta, einzahl, felder, schluessel, zeilen, ladefehler, spalten, anzeige, onGeaendert, onMeldung }: {
  tabelle: Tabelle;
  titel: string;
  meta: string;
  einzahl: string;
  felder: Feld[];
  /** Spalten, die eine Zeile eindeutig bestimmen (Primärschlüssel). */
  schluessel: string[];
  zeilen: Zeile[] | null;
  ladefehler: boolean;
  spalten: DataTableColumn[];
  anzeige: (z: Zeile) => Record<string, unknown>;
  onGeaendert: () => Promise<boolean>;
  onMeldung: (text: string) => void;
}) {
  const [form, setForm] = useState<Formular | null>(null);
  const [original, setOriginal] = useState<Zeile | null>(null);
  const [offen, setOffen] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [arbeitet, setArbeitet] = useState(false);

  function oeffnen(z: Zeile | null) {
    setOriginal(z);
    setForm(formularAus(felder, z));
    setFehler(null);
    setOffen(true);
  }

  // Die Tabellen sind zur Laufzeit gewählt; die Typen der vier Tabellen prüft werteAus über die Feldbeschreibung.
  const tab = () => supabase.from(tabelle);
  const filter = <Q extends { eq: (s: string, v: never) => Q }>(q: Q): Q => schluessel.reduce((x, s) => x.eq(s, original![s] as never), q);

  async function speichern() {
    if (!form) return;
    const r = werteAus(felder, form);
    if ("fehler" in r) return setFehler(r.fehler);
    setArbeitet(true);
    const q = original ? await filter(tab().update(r.werte as never)).select() : await tab().insert(r.werte as never).select();
    setArbeitet(false);
    if (q.error) return setFehler(fehlerText(q.error));
    if (!q.data?.length) return setFehler("Nicht gespeichert: Eintrag nicht gefunden oder keine Berechtigung.");
    setOffen(false);
    if (await onGeaendert()) onMeldung(`${einzahl} gespeichert.`);
  }

  async function loeschen() {
    if (!original) return;
    setArbeitet(true);
    const q = await filter(tab().delete()).select();
    setArbeitet(false);
    if (q.error) return setFehler(fehlerText(q.error));
    setOffen(false);
    if (await onGeaendert()) onMeldung(`${einzahl} gelöscht.`);
  }

  return (
    <Card title={titel} meta={meta} actions={<Button variant="dashed" onClick={() => oeffnen(null)}>+ {einzahl}</Button>}>
      {zeilen ? (
        zeilen.length ? (
          <DataTable
            columns={[
              ...spalten,
              {
                key: "aktion",
                label: <span className="pl-sr">Aktionen</span>,
                render: (r) => (
                  <Button ariaLabel={`${einzahl} ${(r.aria ?? r.name) as string} bearbeiten`} onClick={() => oeffnen(r.zeile as Zeile)}>
                    Bearbeiten
                  </Button>
                ),
              },
            ]}
            rows={zeilen.map((z, i) => ({ id: schluessel.map((s) => String(z[s])).join("|") || i, zeile: z, ...anzeige(z) }))}
          />
        ) : (
          <p className="pl-muted">Noch nichts erfasst. Bis dahin stehen die Kosten als [Preis].</p>
        )
      ) : (
        <p className="pl-muted" role="status">{ladefehler ? "Keine Daten." : "Wird geladen …"}</p>
      )}

      <Dialog
        open={offen}
        id={`stamm-${tabelle}`}
        title={original ? `${einzahl} bearbeiten` : `${einzahl} erfassen`}
        onClose={() => setOffen(false)}
        onCancel={(e) => arbeitet && e.preventDefault()}
        actions={
          <>
            {original ? <Button onClick={loeschen} disabled={arbeitet}>Löschen</Button> : null}
            <Button onClick={() => setOffen(false)} disabled={arbeitet}>Abbrechen</Button>
            <Button variant="primary" onClick={speichern} disabled={arbeitet}>{arbeitet ? "Wird gespeichert …" : "Speichern"}</Button>
          </>
        }
      >
        {form ? (
          <>
            <div className="pl-grid-2">
              {felder.map((x) => {
                const id = `${tabelle}-${x.key}`;
                const set = (v: string | boolean) => {
                  setFehler(null);
                  setForm({ ...form, [x.key]: v });
                };
                if (x.art === "ja_nein") return <Checkbox key={x.key} label={x.label} checked={!!form[x.key]} onChange={(e) => set((e as { target: HTMLInputElement }).target.checked)} />;
                if (x.art === "auswahl")
                  return <Select key={x.key} id={id} label={x.label} value={String(form[x.key])} onChange={set} hint={x.hint} options={[{ value: "", label: "[wählen]" }, ...(x.optionen ?? [])]} />;
                return (
                  <TextField
                    key={x.key}
                    id={id}
                    label={x.label}
                    type={x.art === "datum" ? "date" : "text"}
                    numeric={x.art === "betrag" || x.art === "ganz"}
                    value={String(form[x.key])}
                    hint={x.hint}
                    onChange={(e) => set((e as { target: HTMLInputElement }).target.value)}
                  />
                );
              })}
            </div>
            {fehler ? <Notice role="alert" title="Nicht gespeichert">{fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </Card>
  );
}
