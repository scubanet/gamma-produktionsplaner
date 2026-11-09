"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, DataTable, ItemList, Notice, Select, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import { haltbarkeitText, leerAnzeige, type Zuteilung } from "@/lib/systemzuteilung";
import {
  gruppieren, mengeText, suchen, warenkostenText,
  type Gericht, type GerichtKomponente, type Quantum, type Warenkosten,
} from "@/lib/katalog";

type Daten = {
  gerichte: Gericht[];
  komponenten: GerichtKomponente[];
  zuteilung: Map<string, Zuteilung>;
  warenkosten: Map<string, Warenkosten>;
  quantum: Quantum[];
  angebotsformen: { code: string; name: string }[];
  einheiten: Map<string, string>;
  kategorien: string[];
  kollektion: string;
};

const STATUS_PILL: Record<string, "ok" | "warn" | "info"> = { ok: "ok", offen: "warn", Zukauf: "info" };

async function laden(): Promise<Daten> {
  const [g, gk, z, w, q, a, m, k, ko] = await Promise.all([
    supabase.from("gericht_katalog").select("id, code, name, kategorie, gang, mengentyp, quelle_zeile"),
    supabase.from("gericht_komponente").select("gericht_id, reihenfolge, komponente_id, bezeichnung, verweis_kategorie, menge_pro_portion"),
    supabase.from("komponente_zuteilung").select("*"),
    supabase.from("gericht_warenkosten").select("*"),
    supabase.from("quantum").select("*"),
    supabase.from("angebotsform").select("code, name").order("reihenfolge"),
    supabase.from("mengentyp").select("code, einheit"),
    supabase.from("kategorie").select("code").order("reihenfolge"),
    supabase.from("kollektion").select("name").order("stand", { ascending: false }).limit(1),
  ]);
  for (const x of [g, gk, z, w, q, a, m, k, ko]) if (x.error) throw x.error;
  return {
    gerichte: g.data ?? [],
    komponenten: gk.data ?? [],
    zuteilung: new Map((z.data ?? []).map((x) => [x.id ?? "", x])),
    warenkosten: new Map((w.data ?? []).map((x) => [x.gericht_id ?? "", x])),
    quantum: q.data ?? [],
    angebotsformen: a.data ?? [],
    einheiten: new Map((m.data ?? []).map((x) => [x.code, x.einheit])),
    kategorien: (k.data ?? []).map((x) => x.code),
    kollektion: ko.data?.[0]?.name ?? "[Kollektion]",
  };
}

function Katalogansicht() {
  const router = useRouter();
  const gewaehlt = useSearchParams().get("g");
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [suche, setSuche] = useState("");
  const [kategorie, setKategorie] = useState("");

  useEffect(() => {
    laden().then(setDaten, (e: Error) => setFehler(e.message));
  }, []);

  const treffer = useMemo(() => (daten ? suchen(daten.gerichte, suche, kategorie) : []), [daten, suche, kategorie]);
  const gruppen = useMemo(() => (daten ? gruppieren(treffer, daten.kategorien) : []), [daten, treffer]);
  const komponentenZahl = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of daten?.komponenten ?? []) m.set(k.gericht_id, (m.get(k.gericht_id) ?? 0) + 1);
    return m;
  }, [daten]);
  const gericht = daten?.gerichte.find((g) => g.id === gewaehlt) ?? gruppen[0]?.gerichte[0] ?? null;

  const komponenten = useMemo(
    () => (daten && gericht ? daten.komponenten.filter((k) => k.gericht_id === gericht.id).sort((a, b) => a.reihenfolge - b.reihenfolge) : []),
    [daten, gericht],
  );
  const wk = gericht && daten ? warenkostenText(daten.warenkosten.get(gericht.id)) : null;
  const einheit = gericht?.mengentyp ? daten?.einheiten.get(gericht.mengentyp) ?? "[Einheit]" : "[Einheit]";

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Katalog · {daten ? `${daten.kollektion} · ${formatZahl(daten.gerichte.length)} Gerichte` : "…"}</div>
          <h1 className="pl-h1">{gericht?.name ?? "Katalog"}</h1>
        </div>
      </header>

      {fehler ? <Notice title="Katalog nicht geladen">{fehler}</Notice> : null}

      <div className="pl-row">
        <div className="pl-col-side">
          <TextField id="suche" type="search" label="Gericht suchen" value={suche} onChange={(e) => setSuche((e as { target: HTMLInputElement }).target.value)} />
          <Select
            id="kategorie"
            label="Kategorie"
            value={kategorie}
            onChange={setKategorie}
            options={[{ value: "", label: "Alle Kategorien" }, ...(daten?.kategorien ?? []).map((k) => ({ value: k, label: k }))]}
          />
          {daten ? (
            treffer.length ? (
              <ItemList
                label="Gerichte"
                value={gericht?.id}
                onSelect={(id) => router.replace(`/katalog/?g=${encodeURIComponent(id)}`)}
                groups={gruppen.map((gr) => ({
                  title: gr.titel,
                  items: gr.gerichte.map((g) => ({ id: g.id, label: g.name, sub: `${g.gang ?? "[Gang]"} · ${komponentenZahl.get(g.id) ?? 0} Komponenten` })),
                }))}
              />
            ) : (
              <p className="pl-muted">Keine Gerichte für diese Suche.</p>
            )
          ) : (
            <p className="pl-muted" role="status">{fehler ? "Keine Daten." : "Katalog wird geladen …"}</p>
          )}
        </div>

        <div className="pl-col-main">
          {gericht && daten ? (
            <>
              <Card title={`${gericht.kategorie} · Excel-Zeile ${gericht.quelle_zeile}`} meta={gericht.code ?? "ohne Code"}>
                <div className="pl-grid-3">
                  <div>
                    <div className="pl-label">Gang</div>
                    <div>{gericht.gang ?? "[Gang]"}</div>
                  </div>
                  <div>
                    <div className="pl-label">Mengentyp (Quantum)</div>
                    <div>{gericht.mengentyp ?? "[Mengentyp]"}</div>
                    <div className="pl-small">Einheit {einheit} pro Gast</div>
                  </div>
                  <div>
                    <div className="pl-label">Warenkosten pro Portion</div>
                    <div className={wk?.annahme ? "pl-mono pl-assumed" : "pl-mono"}>{wk?.text}</div>
                    <div className="pl-small">{wk?.sub}</div>
                  </div>
                </div>
              </Card>

              <Card title="Komponenten" meta="Status, Produktion und Haltbarkeit aus der Systemzuteilung">
                <DataTable
                  columns={[
                    { key: "name", label: "Komponente", subKey: "verweis" },
                    { key: "status", label: "Status", render: (r) => <StatusPill status={STATUS_PILL[r.status as string] ?? "neutral"}>{r.status as string}</StatusPill> },
                    { key: "produktion", label: "Produktion" },
                    { key: "haltbarkeit", label: <span className="pl-assumed">Haltbarkeit</span>, numeric: true },
                    { key: "menge", label: "Menge / Portion", numeric: true },
                  ]}
                  rows={komponenten.map((k) => {
                    const z = k.komponente_id ? daten.zuteilung.get(k.komponente_id) : undefined;
                    return {
                      id: `${k.gericht_id}-${k.reihenfolge}`,
                      name: k.bezeichnung ?? z?.name ?? "[Komponente]",
                      verweis: k.verweis_kategorie ? `Basiskomponente aus ${k.verweis_kategorie}` : undefined,
                      status: z?.status ?? "offen",
                      produktion: z ? (z.produktion ?? []).join(", ") || leerAnzeige(z, "Produktion") : "[Produktion]",
                      haltbarkeit: z ? haltbarkeitText(z) : "[Haltbarkeit]",
                      menge: mengeText(k.menge_pro_portion),
                    };
                  })}
                />
                <p className="pl-small">
                  Menge / Portion aus der Excel in kg; [Menge] = in der Excel nicht erfasst, die Menge ergibt sich dann aus dem Quantum.{" "}
                  <span className="pl-assumed">Haltbarkeit</span>: Annahme aus der Excel, noch zu bestätigen.
                </p>
              </Card>

              <Card title="Quantum pro Gast" meta={`Mengentyp ${gericht.mengentyp ?? "[Mengentyp]"}, aus dem Verkaufstool`}>
                <DataTable
                  columns={[
                    { key: "name", label: "Angebotsform" },
                    { key: "menge", label: "Menge pro Gast", numeric: true },
                  ]}
                  rows={daten.angebotsformen.map((a) => {
                    const q = daten.quantum.find((x) => x.angebotsform === a.code && x.mengentyp === gericht.mengentyp);
                    return { id: a.code, name: a.name, menge: q ? `${formatZahl(q.menge_pro_gast)} ${einheit}` : "[Quantum]" };
                  })}
                />
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function Katalog() {
  return (
    <Suspense>
      <Katalogansicht />
    </Suspense>
  );
}
