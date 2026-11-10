"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, DataTable, Dialog, Notice, Select, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { fehlerText } from "@/lib/anlass";

export type Vorlage = { id: string; name: string; anlassId: string | null; anlass: string | null; positionen: number };
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

export function Karten({ anlassId, karten, vorlagen, onMeldung }: {
  anlassId: string;
  karten: Vorlage[];
  vorlagen: Vorlage[];
  onMeldung: (text: string) => void;
}) {
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [form, setForm] = useState<{ vorlage: string; name: string; fehler: string | null }>({ vorlage: "", name: "", fehler: null });
  const [arbeitet, setArbeitet] = useState(false);

  async function anlegen() {
    if (form.name.trim() === "" && !form.vorlage) return setForm({ ...form, fehler: "Name eingeben, z.B. «Getränkekarte»." });
    setArbeitet(true);
    const r = form.vorlage
      ? await supabase.rpc("karte_kopieren", { p_karte: form.vorlage, p_anlass: anlassId, p_name: form.name })
      : await supabase.from("karte").insert({ anlass_id: anlassId, name: form.name.trim() }).select("id").single();
    setArbeitet(false);
    if (r.error) return setForm({ ...form, fehler: fehlerText(r.error) });
    const id = typeof r.data === "string" ? r.data : (r.data as { id: string }).id;
    setOffen(false);
    onMeldung("Karte angelegt.");
    router.push(`/anlaesse/karte/?id=${id}`);
  }

  return (
    <Card
      title="Getränke- und Barkarten"
      actions={
        <Button
          variant="dashed"
          onClick={() => {
            setForm({ vorlage: "", name: "", fehler: null });
            setOffen(true);
          }}
        >
          + Karte
        </Button>
      }
    >
      {karten.length ? (
        <DataTable
          columns={[
            {
              key: "name",
              label: "Karte",
              render: (r) => (
                <Button href={`/anlaesse/karte/?id=${r.id as string}`} ariaLabel={`Karte ${r.name as string} öffnen`}>
                  {r.name as string}
                </Button>
              ),
            },
            { key: "positionen", label: "Positionen", numeric: true },
          ]}
          rows={karten.map((k) => ({ id: k.id, name: k.name, positionen: k.positionen }))}
        />
      ) : (
        <p className="pl-muted">Noch keine Karte für diesen Anlass.</p>
      )}

      <Dialog
        open={offen}
        id="karte-neu"
        title="Karte hinzufügen"
        onClose={() => setOffen(false)}
        onCancel={(e) => arbeitet && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setOffen(false)} disabled={arbeitet}>Abbrechen</Button>
            <Button variant="primary" onClick={anlegen} disabled={arbeitet}>{arbeitet ? "Wird angelegt …" : "Karte anlegen"}</Button>
          </>
        }
      >
        <Select
          id="karte-vorlage"
          label="Vorlage"
          value={form.vorlage}
          onChange={(v) => setForm({ ...form, vorlage: v, fehler: null })}
          options={[{ value: "", label: "Leere Karte" }, ...vorlagen.map((v) => ({ value: v.id, label: `${v.name} (${v.anlass ?? "ohne Anlass"}, ${v.positionen} Positionen)` }))]}
          hint="Mit Vorlage werden alle Positionen samt Preisen kopiert."
        />
        <TextField id="karte-name" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: wert(e), fehler: null })} placeholder={form.vorlage ? "leer = Name der Vorlage" : "Getränkekarte"} />
        {form.fehler ? <Notice role="alert" title="Karte nicht angelegt">{form.fehler}</Notice> : null}
      </Dialog>
    </Card>
  );
}
