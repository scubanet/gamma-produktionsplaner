"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, DataTable, Notice } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatZahl } from "@/lib/format";
import { formatChf, type Offerte, type Summe } from "@/lib/offerte";

type Zeile = Offerte & { summe: Summe | undefined };

async function laden(): Promise<Zeile[]> {
  const [a, s] = await Promise.all([
    supabase
      .from("anlass")
      .select("id, nummer, name, kunde, datum, ort, gaeste, angebotsform, betrieb, bemerkung, status")
      .eq("status", "offerte")
      .order("nummer", { ascending: false }),
    supabase.from("offerte_summe").select("*"),
  ]);
  if (a.error) throw a.error;
  if (s.error) throw s.error;
  const summen = new Map((s.data ?? []).map((x) => [x.anlass_id, x]));
  return (a.data ?? []).map((o) => ({ ...o, summe: summen.get(o.id) }));
}

export default function Offerten() {
  const router = useRouter();
  const [zeilen, setZeilen] = useState<Zeile[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [legtAn, setLegtAn] = useState(false);

  useEffect(() => {
    laden().then(setZeilen, (e: Error) => setFehler(e.message));
  }, []);

  async function neu() {
    setLegtAn(true);
    setFehler(null);
    // Ohne Saison: Offerten zählen nicht für Produktionswellen, bis sie bestätigt sind. Nummer setzt die Datenbank.
    const r = await supabase.from("anlass").insert({ name: "Neue Offerte", status: "offerte" }).select("id").single();
    setLegtAn(false);
    if (r.error) return setFehler(`Offerte nicht angelegt: ${r.error.message}`);
    router.push(`/offerten/bearbeiten/?id=${r.data.id}`);
  }

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Verkauf</div>
          <h1 className="pl-h1">Offerten</h1>
        </div>
        <div className="pl-actions">
          <Button variant="primary" onClick={neu} disabled={legtAn}>
            {legtAn ? "Wird angelegt …" : "Offerte erstellen"}
          </Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Fehler">{fehler}</Notice> : null}

      <Card title="Offene Offerten" meta={zeilen ? `${zeilen.length} Offerte(n)` : undefined}>
        {zeilen ? (
          zeilen.length ? (
            <DataTable
              columns={[
                { key: "nummer", label: "Nummer", render: (r) => <Button href={`/offerten/bearbeiten/?id=${r.id as string}`} ariaLabel={`Offerte ${r.nummer as string} öffnen`}>{(r.nummer as string) ?? "[Nummer]"}</Button> },
                { key: "name", label: "Anlass", subKey: "kundeText" },
                { key: "datumText", label: "Datum", numeric: true },
                { key: "gaesteText", label: "Gäste", numeric: true },
                { key: "preis", label: "Preis pro Gast", numeric: true },
                { key: "total", label: "Total exkl. MWST", numeric: true },
                { key: "db", label: "Deckungsbeitrag", numeric: true },
              ]}
              rows={zeilen.map((z) => ({
                id: z.id,
                nummer: z.nummer,
                name: z.name,
                kundeText: z.kunde ?? "[Kunde]",
                datumText: z.datum ? formatDatum(z.datum) : "[Datum]",
                gaesteText: z.gaeste === null ? "[Gäste]" : formatZahl(z.gaeste),
                preis: formatChf(z.summe?.preis_pro_gast_chf ?? null),
                total: formatChf(z.summe?.umsatz_netto_chf ?? null),
                db: z.summe?.deckungsbeitrag_pct == null ? "[Preis]" : `${formatZahl(z.summe.deckungsbeitrag_pct, 1)} %`,
              }))}
            />
          ) : (
            <p className="pl-muted">Noch keine Offerten. «Offerte erstellen» legt eine neue an.</p>
          )
        ) : (
          <p className="pl-muted" role="status">{fehler ? "Keine Daten." : "Offerten werden geladen …"}</p>
        )}
      </Card>
    </>
  );
}
