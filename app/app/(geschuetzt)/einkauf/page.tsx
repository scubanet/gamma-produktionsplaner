"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DataTable, KpiTile, Notice, Select, StatusPill, Skeleton, EmptyState } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { formatChf } from "@/lib/offerte";
import { standText } from "@/lib/zutat-vorschlag";
import { bestellschlussText, herkunftText, istAnnahme, nachLieferant, zutatenStandText, type ArtikelZeile, type Position, type Summe } from "@/lib/einkauf";
import { ArtikelZuordnen, type Ziel } from "@/components/einkauf/ArtikelZuordnen";
import { fehlerText } from "@/lib/fehler";

type Daten = { summe: Summe; artikel: ArtikelZeile[]; positionen: Position[]; zutaten: { zutaten: number | null; verknuepft: number | null } | null };

/** Summe, Artikel, Positionen und Zähler in einer Abfrage (Migration 39): die Datenbank rechnet den Unterbau nur einmal. */
async function laden(): Promise<Daten | null> {
  // Pilot: eine Saison. Gibt es mehrere, nimmt die Funktion die jüngste; ohne Saison ist die Antwort null.
  const r = await supabase.rpc("einkauf_liste");
  if (r.error) throw r.error;
  const d = r.data as unknown as { summe: Summe | null; artikel: ArtikelZeile[]; positionen: Position[]; zutaten: Daten["zutaten"] } | null;
  if (!d?.summe) return null;
  return { summe: d.summe, artikel: d.artikel, positionen: d.positionen, zutaten: d.zutaten };
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
        if (nr === anfrage.current) setFehler(`Einkauf nicht geladen: ${fehlerText(e)}`);
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
  // Über das Rezept gerechnet, aber noch nicht vollständig: Zutaten ohne Artikel oder mit Menge von Hand.
  const rezeptOffen = (daten?.positionen ?? []).filter((p) => p.typ === "rezept" && ((p.zutaten_ohne_artikel ?? 0) > 0 || (p.zutaten_ohne_menge ?? 0) > 0) && passt(p));
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
    { key: "herleitung", label: "Herleitung", detail: true, render: (r: Record<string, unknown>) => <span className="pl-small">{r.herleitung as string}</span> },
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
      id: `${p.bezug_id ?? p.bezug}-${p.komponente_id}-${p.einheit}`,
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
          <div className="pl-crumb">Einkauf · {s?.saison ?? <Skeleton variant="zahl" />}{bezug ? ` · nur ${bezug}` : ""}</div>
          <h1 className="pl-h1">Einkaufsliste</h1>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button icon="print" variant="primary" onClick={() => window.print()} disabled={!daten}>Drucken / PDF</Button>
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
              detail={`ganze Saison: ${s.positionen_artikel} Position(en), davon ${s.positionen_artikel_ohne_kosten} ohne Kosten (nicht in der Summe)${s.positionen_rezept ? `; ${s.positionen_rezept} über das Rezept, ${s.positionen_rezept_nicht_freigegeben ?? 0} davon nicht freigegeben` : ""}`}
            />
            <KpiTile
              label="Nächster Bestellschluss"
              value={s.naechster_bestellschluss ? bestellschlussText(s.naechster_bestellschluss) : "[Bestelltermin]"}
              detail={`aus Liefertagen und Vorlauf der Lieferanten${(s.bestellschluesse_vorbei ?? 0) > 0 ? `; ${s.bestellschluesse_vorbei} Termin(e) schon vorbei` : ""}`}
            />
            <KpiTile label="Zukauf ohne Artikel" value={formatZahl(s.positionen_zukauf ?? 0)} detail={<>CF-Stufe 4 oder 5, Artikel noch zuordnen. <a className="pl-link pl-print-hide" href="#zukauf">Zur Liste</a></>} />
            <KpiTile label="Noch nicht verknüpft" value={formatZahl(s.positionen_offen ?? 0)} detail={<>weder Rezept mit verknüpften Zutaten noch Hauptartikel. <a className="pl-link pl-print-hide" href="#offen">Zur Liste</a></>} />
          </div>
          <p className="pl-small pl-print-hide">
            <a href="/einkauf/zutaten/">{standText(daten?.zutaten ?? null)}</a>
          </p>

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
                  { key: "artikel", label: "Artikel", subKey: "unterzeile", subDetail: true },
                  { key: "bezug", label: "Für", subKey: "bedarfText" },
                  { key: "mengeText", label: "Menge", numeric: true, render: (r) => <span className={r.annahme ? "pl-assumed" : undefined}>{r.mengeText as string}</span> },
                  { key: "kosten", label: <span className="pl-assumed">Kosten</span>, numeric: true },
                  { key: "liefertermin", label: <span className="pl-assumed">Lieferung</span>, numeric: true },
                  { key: "bestellen", label: <span className="pl-assumed">Bestellen bis</span>, numeric: true },
                  { key: "herleitung", label: "Herleitung", detail: true, render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                ]}
                rows={g.zeilen.map((z) => ({
                  id: `${z.bezug_id ?? z.bezug}-${z.lieferant_id}-${z.artikel_id}`,
                  artikel: z.artikel,
                  unterzeile: `${z.artikelnummer ?? "[Artikelnummer]"} · für ${z.komponenten_namen} · ${herkunftText(z)}`,
                  annahme: istAnnahme(z),
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
          {daten && !artikel.length ? <EmptyState title={`Noch kein Artikel in der Einkaufsliste${bezug ? ` für ${bezug}` : ""}`} text="Artikel kommen aus den Rezepten, sobald Zutaten verknüpft sind, sonst über den Hauptartikel der Komponente." actionLabel="Zutaten zuordnen" href="/einkauf/zutaten/" /> : null}

          <p className="pl-small">
            <span className="pl-assumed">gestrichelt</span> = Annahme, bitte prüfen: das Rezept ist nicht freigegeben, Liter sind als Kilogramm gerechnet, oder die Menge läuft über den Hauptartikel
            (Menge der Komponente plus Verlust) statt über das Rezept. Aus dem Rezept: Bedarf der Komponente ÷ Ergibt-Menge = Faktor, Zutat × Faktor, plus Verlust des Artikels.
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

          {rezeptOffen.length ? (
            <Card title="Aus dem Rezept, noch unvollständig" meta={`${rezeptOffen.length} Position(en): die verknüpften Zutaten stehen in der Liste, Kosten erst, wenn alle Zutaten einen Artikel und eine Menge haben`}>
              <DataTable
                columns={[
                  { key: "komponente", label: "Komponente", subKey: "kategorie" },
                  { key: "rezept", label: "Rezept", render: (r) => <span className={r.rezeptStatus === "freigegeben" ? undefined : "pl-assumed"}>{r.rezept as string}</span>, subKey: "rezeptStatusText" },
                  { key: "bezug", label: "Für", subKey: "bedarfText" },
                  { key: "stand", label: "Zutaten" },
                  { key: "herleitung", label: "Herleitung", detail: true, render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                ]}
                rows={rezeptOffen.map((p) => ({
                  id: `${p.bezug_id ?? p.bezug}-${p.komponente_id}-${p.einheit}`,
                  komponente: p.komponente,
                  kategorie: p.kategorie,
                  rezept: p.rezept ?? "[Rezept]",
                  rezeptStatus: p.rezept_status,
                  rezeptStatusText: p.rezept_status === "freigegeben" ? "freigegeben" : `Rezept ${p.rezept_status ?? "[Status]"}`,
                  bezug: p.bezug,
                  bedarfText: p.bedarf_am ? `Bedarf am ${formatDatum(p.bedarf_am)}` : "[Datum]",
                  stand: zutatenStandText(p),
                  herleitung: p.herleitung,
                }))}
              />
              <p className="pl-small pl-print-hide">
                <a href="/einkauf/zutaten/">Zutaten zuordnen</a>. «Menge von Hand»: Der Artikel wird in einem Gebinde ohne hinterlegtes Gewicht geführt (Flasche, Dose, Tetrapack).
              </p>
            </Card>
          ) : null}

          <div id="zukauf" className="pl-anker">
          <Card title="Zukauf ohne Artikel" meta={`${zukauf.length} Position(en): Artikel [Artikel]`}>
            {zukauf.length ? <DataTable columns={ohneArtikelSpalten} rows={ohneArtikelZeilen(zukauf)} /> : <p className="pl-muted">Keine.</p>}
          </Card>
          </div>

          <div id="offen" className="pl-anker">
          <Card title="Noch nicht verknüpft" meta={`${offen.length} Position(en) ohne Rezept mit verknüpften Zutaten und ohne Hauptartikel; erscheinen nicht in der Bestellliste`}>
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
          </div>
        </>
      ) : daten === undefined ? (
        (fehler ? <p className="pl-muted" role="status">Keine Daten.</p> : <Skeleton variant="zeile" label="Einkaufsliste wird geladen" />)
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
