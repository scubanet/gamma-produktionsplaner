"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, DataTable, Notice, Select, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatZahl } from "@/lib/format";
import { STATUS, statusLabel, statusPill, zeitraum } from "@/lib/anlass";
import type { Database } from "@/lib/database.types";

type Zeile = Database["public"]["Views"]["anlass_uebersicht"]["Row"];

async function laden(): Promise<Zeile[]> {
  const r = await supabase.from("anlass_uebersicht").select("*").neq("status", "offerte").order("datum", { nullsFirst: false });
  if (r.error) throw r.error;
  return r.data ?? [];
}

export default function Anlaesse() {
  const router = useRouter();
  const [zeilen, setZeilen] = useState<Zeile[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [legtAn, setLegtAn] = useState(false);

  useEffect(() => {
    laden().then(setZeilen, (e: Error) => setFehler(`Anlässe nicht geladen: ${e.message}`));
  }, []);

  const sichtbar = useMemo(() => (zeilen ?? []).filter((z) => !status || z.status === status), [zeilen, status]);

  async function neu() {
    setLegtAn(true);
    setFehler(null);
    const r = await supabase.from("anlass").insert({ name: "Neuer Anlass", status: "option" }).select("id").single();
    setLegtAn(false);
    if (r.error) return setFehler(`Anlass nicht angelegt: ${r.error.message}`);
    router.push(`/anlaesse/bearbeiten/?id=${r.data.id}`);
  }

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Planung</div>
          <h1 className="pl-h1">Anlässe</h1>
        </div>
        <div className="pl-actions">
          <Button variant="primary" onClick={neu} disabled={legtAn}>
            {legtAn ? "Wird angelegt …" : "Anlass erfassen"}
          </Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Fehler">{fehler}</Notice> : null}

      <div className="pl-grid-3">
        <Select
          id="status"
          label="Status"
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "Alle Status" }, ...STATUS.map((s) => ({ value: s.wert, label: s.label }))]}
          hint="Offerten stehen unter Offerten und werden dort bestätigt."
        />
      </div>

      <Card title="Anlässe" meta={zeilen ? `${sichtbar.length} von ${zeilen.length}` : undefined}>
        {zeilen ? (
          sichtbar.length ? (
            <DataTable
              columns={[
                {
                  key: "name",
                  label: "Anlass",
                  render: (r) => (
                    <Button href={`/anlaesse/bearbeiten/?id=${r.id as string}`} ariaLabel={`Anlass ${r.name as string} öffnen`}>
                      {r.name as string}
                    </Button>
                  ),
                },
                { key: "nummerText", label: "Nummer" },
                { key: "datumText", label: "Datum", numeric: true },
                { key: "ortText", label: "Ort" },
                { key: "status", label: "Status", render: (r) => <StatusPill status={statusPill(r.status as string)}>{statusLabel(r.status as string)}</StatusPill> },
                { key: "saisonText", label: "Saison" },
                { key: "servicesText", label: "Services / Gäste", numeric: true },
                { key: "linien", label: "Menülinien", numeric: true },
              ]}
              rows={sichtbar.map((z) => ({
                id: z.id,
                name: z.name,
                status: z.status ?? "",
                nummerText: z.nummer ?? "[Nummer]",
                datumText: zeitraum(z.datum ?? null, z.datum_bis ?? null, formatDatum),
                ortText: z.ort ?? "[Ort]",
                saisonText: z.saison ?? "[Saison]",
                servicesText: z.services ? `${z.services} / ${formatZahl(z.gaeste_services ?? 0)}` : "[Services]",
                linien: z.menuelinien ?? 0,
              }))}
            />
          ) : (
            <p className="pl-muted">Keine Anlässe mit diesem Status.</p>
          )
        ) : (
          <p className="pl-muted" role="status">{fehler ? "Keine Daten." : "Anlässe werden geladen …"}</p>
        )}
      </Card>
    </>
  );
}
