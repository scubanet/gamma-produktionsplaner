"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DataTable, KpiTile, Notice, Select, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { formatChf } from "@/lib/offerte";
import { bestellschlussText, nachLieferant, type ArtikelZeile, type Position, type Summe } from "@/lib/einkauf";
import { ArtikelZuordnen, type Ziel } from "@/components/einkauf/ArtikelZuordnen";

type Daten = { summe: Summe; artikel: ArtikelZeile[]; positionen: Position[] };

async function laden(): Promise<Daten | null> {
  const s = await supabase.from("einkauf_summe").select("*").order("saison", { ascending: false }).limit(1).maybeSingle();
  if (s.error) throw s.error;
  if (!s.data?.saison_id) return null;
  const saison = s.data.saison_id;
  const [artikel, positionen] = await Promise.all([
    alleSeiten<ArtikelZeile>((von, bis) => supabase.from("einkauf_artikel").select("*").eq("saison_id", saison).order("sortierung").order("artikel_id").range(von, bis)),
    alleSeiten<Position>((von, bis) => supabase.from("einkauf_position").select("*").eq("saison_id", saison).order("sortierung").order("komponente_id").order("einheit").range(von, bis)),
  ]);
  return { summe: s.data, artikel, positionen };
}

export default function Einkauf() {
  const [daten, setDaten] = useState<Daten | null | undefined>(undefined);
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState("");
  const [bezug, setBezug] = useState("");
  const [ziel, setZiel] = useState<Ziel | null>(null);
  const [zielOffen, setZielOffen] = useState(false);
  const [oeffnung, setOeffnung] = useState(0);
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const anfrage = useRef(0);

  const neuLaden = useCallback(() => {
    const nr = ++anfrage.current;
    return laden().then(
      (d) => {
        if (nr === anfrage.current) setDaten(d);
        return true;
      },
      (e: Error) => {
        if (nr === anfrage.current) setFehler(`Einkauf nicht geladen: ${e.message}`);
        return false;
      },
    );
  }, []);

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const s = daten?.summe ?? null;
  const bezuege = useMemo(() => {
    const alle = [...(daten?.artikel ?? []), ...(daten?.positionen ?? [])];
    const m = new Map<string, number>();
    for (const x of alle) if (x.bezug) m.set(x.bezug, x.sortierung ?? 0);
    return [...m.entries()].sort((a, b) => a[1] - b[1]).map(([b]) => b);
  }, [daten]);
  const passt = (x: { bezug: string | null }) => !bezug || x.bezug === bezug;
  const artikel = (daten?.artikel ?? []).filter(passt);
  const zukauf = (daten?.positionen ?? []).filter((p) => p.typ === "zukauf" && passt(p));
  const offen = (daten?.positionen ?? []).filter((p) => p.typ === "offen" && passt(p));
  // Verknüpfte Komponenten, je Komponente einmal: hier lässt sich der Hauptartikel ändern oder entfernen.
  const verknuepft = [...new Map((daten?.positionen ?? []).filter((p) => p.typ === "artikel").map((p) => [p.komponente_id, p])).values()];

  const zuordnen = (p: { komponente_id: string | null; komponente: string | null; einheit?: string | null; artikel?: string | null }) => {
    if (!p.komponente_id) return;
    setZiel({ komponenteId: p.komponente_id, komponente: p.komponente ?? "[Komponente]", einheit: p.einheit ?? null, artikel: p.artikel ?? null });
    setOeffnung((n) => n + 1);
    setZielOffen(true);
  };

  const ohneArtikelSpalten = [
    { key: "komponente", label: "Komponente", subKey: "kategorie" },
    { key: "bezug", label: "Für", subKey: "bedarfText" },
    { key: "mengeText", label: "Menge", numeric: true },
    { key: "herleitung", label: "Herleitung", render: (r: Record<string, unknown>) => <span className="pl-small">{r.herleitung as string}</span> },
    {
      key: "aktion",
      label: <span className="pl-sr">Aktionen</span>,
      printHidden: true,
      render: (r: Record<string, unknown>) => (
        <Button ariaLabel={`Artikel für ${r.komponente as string} zuordnen`} onClick={() => zuordnen(r.p as Position)}>
          Artikel zuordnen
        </Button>
      ),
    },
  ];
  const ohneArtikelZeilen = (liste: Position[]) =>
    liste.map((p) => ({
      id: `${p.bezug}-${p.komponente_id}-${p.einheit}`,
      p,
      komponente: p.komponente,
      kategorie: `${p.kategorie}${p.nur_vor_ort ? " · nur vor Ort" : ""}`,
      bezug: p.bezug,
      bedarfText: p.bedarf_am ? `Bedarf am ${formatDatum(p.bedarf_am)}` : "[Datum]",
      mengeText: formatMenge(p.menge_komponente, p.einheit),
      herleitung: p.herleitung ?? "[Herleitung fehlt]",
    }));

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Einkauf · {s?.saison ?? "…"}{bezug ? ` · nur ${bezug}` : ""}</div>
          <h1 className="pl-h1">Einkaufsliste</h1>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button href="/einkauf/lieferanten/">Lieferanten</Button>
          <Button href="/einkauf/zuordnen/">Artikel zuordnen</Button>
          <Button variant="primary" onClick={() => window.print()} disabled={!daten}>Drucken / PDF</Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Fehler">{fehler}</Notice> : null}
      <p className="pl-small pl-print-hide" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>
      {daten === null ? <Notice title="Keine Saison">Es gibt noch keine Saison mit Anlässen.</Notice> : null}

      {s ? (
        <>
          <div className="pl-grid-4">
            <KpiTile
              label="Warenkosten verknüpfter Artikel"
              value={s.kosten_chf === null ? "[Preis]" : <span className="pl-assumed">{formatChf(s.kosten_chf)}</span>}
              detail={`ganze Saison: ${s.positionen_artikel} Position(en), davon ${s.positionen_artikel_ohne_kosten} ohne Kosten (nicht in der Summe); Menge der Komponente plus Verlust (Annahme)`}
            />
            <KpiTile
              label="Nächster Bestellschluss"
              value={s.naechster_bestellschluss ? bestellschlussText(s.naechster_bestellschluss) : "[Bestelltermin]"}
              detail={`aus Liefertagen und Vorlauf der Lieferanten${(s.bestellschluesse_vorbei ?? 0) > 0 ? `; ${s.bestellschluesse_vorbei} Termin(e) schon vorbei` : ""}`}
            />
            <KpiTile label="Zukauf ohne Artikel" value={formatZahl(s.positionen_zukauf ?? 0)} detail="CF-Stufe 4 oder 5, Artikel noch zuordnen" />
            <KpiTile label="Noch nicht verknüpft" value={formatZahl(s.positionen_offen ?? 0)} detail="Komponenten ohne Hauptartikel" />
          </div>

          {(s.positionen_nicht_im_plan ?? 0) > 0 ? (
            <div className="pl-print-hide">
              <Notice title={`${s.positionen_nicht_im_plan} Position(en) nicht im Wellenplan`}>
                Seit der Übernahme sind Komponenten dazugekommen. Sie stehen unter «Neu im Vorschlag» mit dem Termin des Vorschlags. Im Wellenplan «Vorschlag neu übernehmen».
              </Notice>
            </div>
          ) : null}
          {s.aus_vorschlag ? (
            <div className="pl-print-hide">
              <Notice title="Wellen aus dem Vorschlag">Es ist noch kein Wellenplan gespeichert. Die Einkaufsliste rechnet mit den Terminen des Vorschlags.</Notice>
            </div>
          ) : null}

          <div className="pl-grid-3 pl-print-hide">
            <Select id="bezug" label="Welle oder Anlass" value={bezug} onChange={setBezug} options={[{ value: "", label: "Alle" }, ...bezuege.map((b) => ({ value: b, label: b }))]} />
          </div>

          {nachLieferant(artikel).map((g) => (
            <Card key={g.titel} title={g.titel} meta={`${g.zeilen.length} Artikelzeile(n)`}>
              <DataTable
                columns={[
                  { key: "artikel", label: "Artikel", subKey: "unterzeile" },
                  { key: "bezug", label: "Für", subKey: "bedarfText" },
                  { key: "mengeText", label: "Menge", numeric: true, render: (r) => <span className="pl-assumed">{r.mengeText as string}</span> },
                  { key: "kosten", label: <span className="pl-assumed">Kosten</span>, numeric: true },
                  { key: "liefertermin", label: <span className="pl-assumed">Lieferung</span>, numeric: true },
                  { key: "bestellen", label: <span className="pl-assumed">Bestellen bis</span>, numeric: true },
                  { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                ]}
                rows={g.zeilen.map((z) => ({
                  id: `${z.bezug}-${z.artikel_id}`,
                  artikel: z.artikel,
                  unterzeile: `${z.artikelnummer ?? "[Artikelnummer]"} · für ${z.komponenten_namen}`,
                  bezug: z.bezug,
                  bedarfText: z.bedarf_am ? `Bedarf am ${formatDatum(z.bedarf_am)}` : "[Datum]",
                  mengeText: z.menge_artikel === null ? "[Menge]" : `${formatZahl(z.menge_artikel, z.artikel_einheit === "Stk" ? 0 : 2)} ${z.artikel_einheit ?? ""}`,
                  // Fehlt der Preis, steht [Preis]; fehlt nur die Menge, steht [Menge].
                  kosten: z.kosten_chf !== null ? formatChf(z.kosten_chf) : z.preis_pro_einheit === null ? "[Preis]" : "[Menge]",
                  liefertermin: z.liefertermin ? formatDatum(z.liefertermin) : "[Liefertermin]",
                  bestellen: bestellschlussText(z.bestellen_bis),
                  herleitung: z.herleitung,
                }))}
              />
            </Card>
          ))}
          {daten && !artikel.length ? <p className="pl-muted">Noch keine Komponente mit Hauptartikel{bezug ? ` in ${bezug}` : ""}. Unten zuordnen.</p> : null}

          <p className="pl-small">
            <span className="pl-assumed">gestrichelt</span> = Annahme, bitte prüfen: Artikelmenge = Menge der Komponente plus Verlust des Artikels, solange Rezepte nicht mit Artikeln verknüpft sind.
            Annahme: Ware trifft einen Tag vor Bedarf ein; daraus folgen Lieferung und «Bestellen bis». Die Mengen im Wellenplan sind immer aktuell, das Datum kommt aus dem Plan.
            Bestellungen werden hier nicht gespeichert.
          </p>

          {verknuepft.length ? (
            <div className="pl-print-hide">
              <Card title="Verknüpfte Komponenten" meta="Hauptartikel ändern oder Zuordnung entfernen">
                <DataTable
                  columns={[
                    { key: "komponente", label: "Komponente", subKey: "kategorie" },
                    { key: "artikel", label: "Hauptartikel", subKey: "lieferant" },
                    {
                      key: "aktion",
                      label: <span className="pl-sr">Aktionen</span>,
                      render: (r) => (
                        <Button ariaLabel={`Artikel für ${r.komponente as string} ändern`} onClick={() => zuordnen(r.p as Position)}>
                          Artikel ändern
                        </Button>
                      ),
                    },
                  ]}
                  rows={verknuepft.map((p) => ({ id: p.komponente_id, p, komponente: p.komponente, kategorie: p.kategorie, artikel: p.artikel, lieferant: p.lieferant ?? "[Lieferant]" }))}
                />
              </Card>
            </div>
          ) : null}

          <Card title="Zukauf ohne Artikel" meta={`${zukauf.length} Position(en): Artikel [Artikel]`}>
            {zukauf.length ? <DataTable columns={ohneArtikelSpalten} rows={ohneArtikelZeilen(zukauf)} /> : <p className="pl-muted">Keine.</p>}
          </Card>

          <Card title="Noch nicht verknüpft" meta={`${offen.length} Position(en) ohne Hauptartikel; erscheinen nicht in der Bestellliste`}>
            {offen.length ? (
              <DataTable
                columns={[
                  ...ohneArtikelSpalten.slice(0, 1),
                  { key: "status", label: "Status", render: (r: Record<string, unknown>) => <StatusPill status={r.status === "ok" ? "ok" : "warn"}>{r.status as string}</StatusPill> },
                  ...ohneArtikelSpalten.slice(1),
                ]}
                rows={ohneArtikelZeilen(offen).map((r) => ({ ...r, status: r.p.status ?? "" }))}
              />
            ) : (
              <p className="pl-muted">Keine.</p>
            )}
          </Card>
        </>
      ) : daten === undefined ? (
        <p className="pl-muted" role="status">{fehler ? "Keine Daten." : "Einkaufsliste wird geladen …"}</p>
      ) : null}

      <ArtikelZuordnen
        key={oeffnung}
        ziel={ziel}
        offen={zielOffen}
        onClose={() => setZielOffen(false)}
        onGespeichert={async (text) => {
          setZielOffen(false);
          setFehler(null);
          if (!(await neuLaden())) return;
          setMeldung(text);
          requestAnimationFrame(() => meldungRef.current?.focus());
        }}
      />
    </>
  );
}
