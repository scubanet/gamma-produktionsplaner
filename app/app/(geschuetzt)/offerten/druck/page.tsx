"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, DataTable, Notice } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatZahl } from "@/lib/format";
import { formatChf, heuteIso, nachGang, type Offerte, type Position, type Summe } from "@/lib/offerte";

type Daten = { offerte: Offerte; positionen: Position[]; summe: Summe | null; angebotsform: string | null; mengentypen: string[] };

async function laden(id: string): Promise<Daten | null> {
  const [a, p, s, m] = await Promise.all([
    supabase.from("anlass").select("id, nummer, name, kunde, datum, ort, gaeste, angebotsform, betrieb, bemerkung, status").eq("id", id).maybeSingle(),
    supabase.from("offerte_position").select("*").eq("anlass_id", id),
    supabase.from("offerte_summe").select("*").eq("anlass_id", id).maybeSingle(),
    supabase.from("mengentyp").select("code").order("reihenfolge"),
  ]);
  for (const x of [a, p, s, m]) if (x.error) throw x.error;
  if (!a.data) return null;
  let angebotsform: string | null = null;
  if (a.data.angebotsform) {
    const f = await supabase.from("angebotsform").select("name").eq("code", a.data.angebotsform).maybeSingle();
    if (f.error) throw f.error;
    angebotsform = f.data?.name ?? null;
  }
  return { offerte: a.data, positionen: p.data ?? [], summe: s.data, angebotsform, mengentypen: (m.data ?? []).map((x) => x.code) };
}

function Druck() {
  const id = useSearchParams().get("id") ?? "";
  const [daten, setDaten] = useState<Daten | null | undefined>(undefined);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (id) laden(id).then(setDaten, (e: Error) => setFehler(e.message));
  }, [id]);

  if (!id) return <Notice title="Keine Offerte gewählt">Bitte eine Offerte aus der Liste öffnen.</Notice>;
  if (fehler) return <Notice role="alert" title="Offerte nicht geladen">{fehler}</Notice>;
  if (daten === undefined) return <p className="pl-muted" role="status">Offerte wird geladen …</p>;
  if (daten === null) return <Notice title="Offerte nicht gefunden">Die Offerte gibt es nicht oder sie wurde gelöscht.</Notice>;

  const { offerte: o, summe: s } = daten;
  // Was im PDF als Platzhalter erscheinen würde: [Feld] wie gedruckt.
  const fehlt = [
    !o.kunde && "Kunde",
    !o.datum && "Datum",
    !o.ort && "Ort",
    !o.gaeste && "Gäste",
    !daten.angebotsform && "Angebotsform",
    !daten.positionen.length && "Gerichte",
    (!s || s.preis_pro_gast_chf === null) && "Preis",
  ].filter(Boolean) as string[];

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">GAMMA Catering · Hünenberg ZG</div>
          <h1 className="pl-h1">Offerte {o.nummer ?? "[Nummer]"}</h1>
          <div className="pl-sub">vom {formatDatum(heuteIso())}</div>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button href={`/offerten/bearbeiten/?id=${o.id}`}>Zurück zur Offerte</Button>
          <Button variant="primary" onClick={() => window.print()}>Drucken / als PDF sichern</Button>
        </div>
      </header>

      {fehlt.length ? (
        <div className="pl-print-hide">
          <Notice title="Offerte noch unvollständig" items={fehlt.map((f) => `${f}: erscheint im PDF als [${f}]`)} />
        </div>
      ) : null}

      <Card title="Für">
        <div className="pl-grid-3">
          <div>
            <div className="pl-label">Kunde</div>
            <div>{o.kunde ?? "[Kunde]"}</div>
          </div>
          <div>
            <div className="pl-label">Anlass</div>
            <div>{o.name}</div>
          </div>
          <div>
            <div className="pl-label">Datum und Ort</div>
            <div>
              {o.datum ? formatDatum(o.datum) : "[Datum]"} · {o.ort ?? "[Ort]"}
            </div>
          </div>
          <div>
            <div className="pl-label">Gäste</div>
            <div>{o.gaeste === null ? "[Gäste]" : formatZahl(o.gaeste)}</div>
          </div>
          <div>
            <div className="pl-label">Angebotsform</div>
            <div>{daten.angebotsform ?? "[Angebotsform]"}</div>
          </div>
        </div>
      </Card>

      <Card title="Menü">
        {daten.positionen.length ? (
          nachGang(daten.positionen, daten.mengentypen).map((g) => (
            <div key={g.gang}>
              <div className="pl-eyebrow">{g.gang}</div>
              <ul>
                {g.positionen.map((p) => (
                  <li key={p.gericht_id}>{p.bezeichnung}</li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p>[Gerichte]</p>
        )}
      </Card>

      <Card title="Preis" meta="in CHF">
        <DataTable
          columns={[
            { key: "label", label: "Position" },
            { key: "wert", label: "Betrag", numeric: true },
          ]}
          rows={[
            { id: "p", label: "Preis pro Gast exkl. MWST", wert: formatChf(s?.preis_pro_gast_chf ?? null) },
            { id: "g", label: "Anzahl Gäste", wert: o.gaeste === null ? "[Gäste]" : formatZahl(o.gaeste) },
            { id: "n", label: "Total exkl. MWST", wert: formatChf(s?.umsatz_netto_chf ?? null) },
            { id: "m", label: `MWST ${s?.mwst_satz != null ? formatZahl(s.mwst_satz * 100, 1) : "[Satz]"} %`, wert: formatChf(s?.mwst_chf ?? null) },
            { id: "t", label: "Total inkl. MWST", wert: formatChf(s?.total_brutto_chf ?? null) },
          ]}
        />
        <p className="pl-small">Gültigkeit der Offerte: [Gültigkeit]. Konditionen: [Konditionen].</p>
      </Card>
    </>
  );
}

export default function OfferteDruck() {
  return (
    <Suspense>
      <Druck />
    </Suspense>
  );
}
