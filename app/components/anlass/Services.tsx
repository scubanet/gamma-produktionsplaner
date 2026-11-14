"use client";

import { useState } from "react";
import { Button, Card, DataTable, Dialog, Notice, Select, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatZahl } from "@/lib/format";
import { fehlerText, ganzzahl, geaenderteDaten, ungueltigesDatum, type Menuelinie, type Service } from "@/lib/anlass";

type Form = { id: string | null; name: string; datum: string; gaeste: string; menuelinie_id: string; fehler: string | null };
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

export function Services({ anlassId, services, linien, onGeaendert, onMeldung, onFehler }: {
  anlassId: string;
  services: Service[];
  linien: Menuelinie[];
  onGeaendert: () => Promise<void>;
  onMeldung: (text: string) => void;
  onFehler: (titel: string, text: string) => void;
}) {
  const [form, setForm] = useState<Form | null>(null);
  const [offen, setOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  // Alle Daten in einem Dialog: Service-ID → Datum (JJJJ-MM-TT oder leer).
  const [daten, setDaten] = useState<Record<string, string> | null>(null);
  const [datenOffen, setDatenOffen] = useState(false);
  const [datenFehler, setDatenFehler] = useState<string | null>(null);
  const sortiert = [...services].sort((a, b) => a.reihenfolge - b.reihenfolge);
  const ohneDatum = services.filter((s) => !s.datum).length;
  const linienName = new Map(linien.map((l) => [l.id, l.name]));
  const gaeste = form ? ganzzahl(form.gaeste, 0, 100000) : null;

  function oeffnen(s: Service | null) {
    setForm(
      s
        ? { id: s.id, name: s.name, datum: s.datum ?? "", gaeste: String(s.gaeste), menuelinie_id: s.menuelinie_id ?? "", fehler: null }
        : { id: null, name: "", datum: "", gaeste: "", menuelinie_id: linien[0]?.id ?? "", fehler: null },
    );
    setOffen(true);
  }

  async function speichern() {
    if (!form) return;
    if (form.name.trim() === "") return setForm({ ...form, fehler: "Bezeichnung eingeben, z.B. «Spiel 1»." });
    if (gaeste === undefined || gaeste === null) return setForm({ ...form, fehler: "Gäste: ganze Zahl ab 0." });
    const daten = { name: form.name.trim(), datum: form.datum || null, gaeste, menuelinie_id: form.menuelinie_id || null };
    setSpeichert(true);
    const r = form.id
      ? await supabase.from("service").update(daten).eq("id", form.id)
      : await supabase.from("service").insert({ ...daten, anlass_id: anlassId, reihenfolge: Math.max(0, ...services.map((s) => s.reihenfolge)) + 1 });
    setSpeichert(false);
    if (r.error) return setForm({ ...form, fehler: fehlerText(r.error) });
    setOffen(false);
    await onGeaendert();
    onMeldung(`Service ${daten.name} gespeichert.`);
  }

  function datenOeffnen() {
    setDaten(Object.fromEntries(services.map((s) => [s.id, s.datum ?? ""])));
    setDatenFehler(null);
    setDatenOffen(true);
  }

  async function datenSpeichern() {
    if (!daten) return;
    if (ungueltigesDatum(daten) !== null) return setDatenFehler("Datum im Kalender wählen oder als TT.MM.JJJJ eingeben.");
    const neu = geaenderteDaten(services, daten);
    if (!neu.length) return setDatenOffen(false);
    setSpeichert(true);
    const fehler: string[] = [];
    for (const n of neu) {
      const r = await supabase.from("service").update({ datum: n.datum }).eq("id", n.id);
      if (r.error) fehler.push(`${n.name}: ${fehlerText(r.error)}`);
    }
    setSpeichert(false);
    await onGeaendert();
    if (fehler.length) return setDatenFehler(`${neu.length - fehler.length} von ${neu.length} gespeichert. Nicht gespeichert: ${fehler.join("; ")}`);
    setDatenOffen(false);
    onMeldung(`Datum bei ${neu.length} Service(s) gespeichert. Wellen, Einkauf und Mengen rechnen neu.`);
  }

  async function entfernen(s: Service) {
    const r = await supabase.from("service").delete().eq("id", s.id);
    if (r.error) return onFehler(`Service ${s.name} nicht entfernt`, fehlerText(r.error));
    await onGeaendert();
    onMeldung(`Service ${s.name} entfernt.`);
  }

  return (
    <Card title="Services" meta="je Spiel oder Tag mit Gästen und Menülinie" actions={
        <span className="pl-actions">
          {services.length > 1 ? <Button onClick={datenOeffnen}>{ohneDatum ? `Daten erfassen (${ohneDatum} fehlen)` : "Daten ändern"}</Button> : null}
          <Button variant="dashed" onClick={() => oeffnen(null)}>+ Service</Button>
        </span>
      }
    >
      {services.length ? (
        <DataTable
          columns={[
            { key: "name", label: "Service" },
            { key: "datumText", label: "Datum", numeric: true },
            { key: "gaesteText", label: "Gäste", numeric: true },
            { key: "linie", label: "Menülinie" },
            {
              key: "aktion",
              label: <span className="pl-sr">Aktionen</span>,
              render: (r) => (
                <span className="pl-actions">
                  <Button ariaLabel={`Service ${r.name as string} bearbeiten`} onClick={() => oeffnen(r.service as Service)}>Bearbeiten</Button>
                  <Button ariaLabel={`Service ${r.name as string} entfernen`} onClick={() => entfernen(r.service as Service)}>Entfernen</Button>
                </span>
              ),
            },
          ]}
          rows={sortiert.map((s) => ({
            id: s.id,
            service: s,
            name: s.name,
            datumText: s.datum ? formatDatum(s.datum) : "[Datum]",
            gaesteText: formatZahl(s.gaeste),
            linie: s.menuelinie_id ? linienName.get(s.menuelinie_id) ?? "[Menülinie]" : "[Menülinie]",
          }))}
        />
      ) : (
        <p className="pl-muted">Noch keine Services. Ohne Service zählt eine Menülinie keine Gäste.</p>
      )}

      <Dialog
        open={offen}
        id="service"
        title={form?.id ? `Service ${form.name}` : "Service hinzufügen"}
        onClose={() => setOffen(false)}
        onCancel={(e) => speichert && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
            <Button variant="primary" onClick={speichern} disabled={speichert}>{speichert ? "Wird gespeichert …" : "Service speichern"}</Button>
          </>
        }
      >
        {form ? (
          <>
            <div className="pl-grid-2">
              <TextField id="service-name" label="Service" value={form.name} onChange={(e) => setForm({ ...form, name: wert(e), fehler: null })} placeholder="Spiel 1" />
              <TextField id="service-datum" type="date" label="Datum" value={form.datum} onChange={(e) => setForm({ ...form, datum: wert(e), fehler: null })} />
              <TextField
                id="service-gaeste"
                label="Gäste"
                numeric
                value={form.gaeste}
                invalid={gaeste === undefined}
                onChange={(e) => setForm({ ...form, gaeste: wert(e), fehler: null })}
                hint={gaeste === undefined ? "ganze Zahl ab 0" : undefined}
              />
              <Select
                id="service-linie"
                label="Menülinie"
                value={form.menuelinie_id}
                onChange={(v) => setForm({ ...form, menuelinie_id: v, fehler: null })}
                options={[{ value: "", label: "[keine Menülinie]" }, ...linien.map((l) => ({ value: l.id, label: l.name }))]}
              />
            </div>
            {form.fehler ? <Notice role="alert" title="Nicht gespeichert">{form.fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={datenOffen}
        id="service-daten"
        title="Daten der Services"
        meta={`${services.length} Services, ${ohneDatum} ohne Datum`}
        onClose={() => setDatenOffen(false)}
        onCancel={(e) => speichert && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setDatenOffen(false)} disabled={speichert}>Abbrechen</Button>
            <Button variant="primary" onClick={datenSpeichern} disabled={speichert}>{speichert ? "Wird gespeichert …" : "Daten speichern"}</Button>
          </>
        }
      >
        {daten ? (
          <>
            <div className="pl-grid-2">
              {sortiert.map((s) => (
                <TextField
                  key={s.id}
                  id={`service-datum-${s.id}`}
                  type="date"
                  label={`${s.name}${s.menuelinie_id ? ` · ${linienName.get(s.menuelinie_id) ?? "[Menülinie]"}` : ""}`}
                  value={daten[s.id] ?? ""}
                  onChange={(e) => {
                    setDaten({ ...daten, [s.id]: wert(e) });
                    setDatenFehler(null);
                  }}
                />
              ))}
            </div>
            <p className="pl-small">Ohne Datum weiss die Datenbank nicht, aus welcher Welle ein Service bedient wird. Ein leeres Feld entfernt das Datum.</p>
            {datenFehler ? <Notice role="alert" title="Nicht gespeichert">{datenFehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </Card>
  );
}
