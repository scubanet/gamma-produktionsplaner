"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, DataTable, EmptyState, KpiTile, Notice, SegmentedControl, Skeleton, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import { formatChf } from "@/lib/offerte";
import { vorschlagDetail } from "@/lib/artikel-vorschlag";
import { filtern, gruppieren, rezepteText, umfangText, type ZutatOffen, type ZutatVorschlagZeile } from "@/lib/zutat-vorschlag";
import { ArtikelWaehlen } from "@/components/einkauf/ArtikelWaehlen";
import { fehlerText } from "@/lib/fehler";

type Verknuepft = { schluessel: string; bezeichnung: string; artikel_id: string; artikel: string; artikel_einheit: string | null; preis_pro_einheit: number | null; anzahl: number; rezepte_anzahl: number };
type Daten = { saisonId: string; saison: string; offen: ZutatOffen[]; verknuepft: Verknuepft[]; zutaten: number; mitArtikel: number };

async function laden(): Promise<Daten | null> {
  // Pilot: eine Saison. Gibt es mehrere, die jüngste (wie in der Einkaufsliste).
  const s = await supabase.from("einkauf_summe").select("saison_id, saison").order("saison", { ascending: false }).limit(1).maybeSingle();
  if (s.error) throw s.error;
  if (!s.data?.saison_id) return null;
  const saisonId = s.data.saison_id;
  const [v, k, st] = await Promise.all([
    supabase.rpc("zutat_artikel_vorschlag", { p_saison: saisonId }),
    supabase.rpc("zutat_artikel_verknuepft", { p_saison: saisonId }),
    supabase.from("einkauf_zutaten_stand").select("zutaten, verknuepft").eq("saison_id", saisonId).maybeSingle(),
  ]);
  for (const x of [v, k, st]) if (x.error) throw x.error;
  return {
    saisonId,
    saison: s.data.saison ?? "[Saison]",
    offen: gruppieren((v.data ?? []) as ZutatVorschlagZeile[]),
    verknuepft: ((k.data ?? []) as Verknuepft[]).sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de-CH") || a.artikel.localeCompare(b.artikel, "de-CH")),
    zutaten: st.data?.zutaten ?? 0,
    mitArtikel: st.data?.verknuepft ?? 0,
  };
}

export default function ZutatenZuordnenSeite() {
  const [daten, setDaten] = useState<Daten | null | undefined>(undefined);
  const [fehler, setFehler] = useState<{ titel: string; text: string } | null>(null);
  const [meldung, setMeldung] = useState("");
  const [suche, setSuche] = useState("");
  const [treffer, setTreffer] = useState<"" | "mit" | "ohne">("");
  const [weitere, setWeitere] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [ziel, setZiel] = useState<ZutatOffen | null>(null);
  const [zielOffen, setZielOffen] = useState(false);
  const [zielFehler, setZielFehler] = useState<string | null>(null);
  const [oeffnung, setOeffnung] = useState(0);
  const meldungRef = useRef<HTMLParagraphElement>(null);

  const neuLaden = useCallback(
    () =>
      laden().then(
        (d) => {
          setDaten(d);
          return true;
        },
        (e: Error) => {
          setFehler({ titel: "Zutaten nicht geladen", text: fehlerText(e) });
          return false;
        },
      ),
    [],
  );

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const melden = (text: string) => {
    setFehler(null);
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };

  /** Alle offenen Zutaten mit dieser Bezeichnung verknüpfen; gibt den Fehlertext zurück oder null. */
  async function zuordnen(z: ZutatOffen, artikelId: string, artikel: string): Promise<string | null> {
    if (!daten || speichert) return null;
    setSpeichert(true);
    const r = await supabase.rpc("zutat_artikel_zuordnen", { p_saison: daten.saisonId, p_schluessel: z.schluessel, p_artikel: artikelId, p_weitere: weitere });
    setSpeichert(false);
    if (r.error) return fehlerText(r.error);
    if (!r.data) return "Keine offene Zutat mit dieser Bezeichnung gefunden. Seite neu laden.";
    if (await neuLaden()) melden(`${z.bezeichnung}: ${formatZahl(r.data)} ${r.data === 1 ? "Zutat" : "Zutaten"} mit ${artikel} verknüpft. Lösen unten unter «Verknüpfte Zutaten».`);
    return null;
  }

  async function loesen(v: Verknuepft) {
    if (speichert) return;
    setSpeichert(true);
    const r = await supabase.rpc("zutat_artikel_loesen", { p_schluessel: v.schluessel, p_artikel: v.artikel_id });
    setSpeichert(false);
    if (r.error) return setFehler({ titel: "Nicht gelöst", text: `${v.bezeichnung}: ${fehlerText(r.error)}` });
    if (await neuLaden()) melden(`${v.bezeichnung}: Verknüpfung mit ${v.artikel} bei ${formatZahl(r.data ?? 0)} Zutaten gelöst.`);
  }

  const alle = useMemo(() => daten?.offen ?? [], [daten]);
  const liste = filtern(alle, { suche, treffer });
  const offeneZutaten = alle.reduce((n, z) => n + z.anzahl, 0);

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            <a href="/einkauf/">Einkauf</a> · {daten?.saison ?? <Skeleton variant="zahl" />}
          </div>
          <h1 className="pl-h1">Zutaten zuordnen</h1>
        </div>
      </header>

      {fehler ? <Notice role="alert" title={fehler.titel}>{fehler.text}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>
      {daten === null ? <Notice title="Keine Saison">Es gibt noch keine Saison mit Anlässen.</Notice> : null}

      {daten ? (
        <>
          <div className="pl-grid-3">
            <KpiTile label="Zutaten der Saison verknüpft" value={`${formatZahl(daten.mitArtikel)} von ${formatZahl(daten.zutaten)}`} detail="in den Rezepten der Komponenten dieser Saison, ohne Unterrezepte" />
            <KpiTile label="Offene Bezeichnungen" value={formatZahl(alle.length)} detail={`${formatZahl(offeneZutaten)} Zutaten; gleiche Bezeichnung wird einmal entschieden`} />
            <KpiTile label="mit Vorschlag" value={formatZahl(alle.filter((z) => z.vorschlaege.length).length)} detail="ähnlicher Artikel in der Preisliste gefunden" />
          </div>

          <div className="pl-grid-3">
            <TextField id="zutat-suche" type="search" label="Zutat suchen" value={suche} onChange={(e) => setSuche((e as { target: HTMLInputElement }).target.value)} />
            <div>
              <div className="pl-label">Vorschlag</div>
              <SegmentedControl
                label="Vorschlag"
                value={treffer}
                onChange={(v) => setTreffer(v as "" | "mit" | "ohne")}
                options={[{ value: "", label: "Alle" }, { value: "mit", label: "mit Vorschlag" }, { value: "ohne", label: "ohne Vorschlag" }]}
              />
            </div>
            <Checkbox label="auch in Rezepten ausserhalb der Saison verknüpfen" checked={weitere} onChange={() => setWeitere((w) => !w)} />
          </div>

          <Card title="Zutaten ohne Artikel" meta={`${formatZahl(liste.length)} von ${formatZahl(alle.length)} Bezeichnungen, nach Filter. Ein Klick auf den Vorschlag verknüpft.`}>
            {liste.length ? (
              <DataTable
                columns={[
                  {
                    key: "bezeichnung",
                    label: "Zutat",
                    render: (r) => {
                      const z = r.z as ZutatOffen;
                      return (
                        <>
                          <strong>{z.bezeichnung}</strong>
                          <span className="pl-sub">{umfangText(z.anzahl, z.rezepteAnzahl)}{z.weitere ? `; ${formatZahl(z.weitere)} weitere ausserhalb der Saison` : ""}</span>
                          <span className="pl-sub">{rezepteText(z.rezepte, z.rezepteAnzahl)}</span>
                        </>
                      );
                    },
                  },
                  {
                    key: "vorschlaege",
                    label: <span className="pl-assumed">Vorschläge aus der Preisliste</span>,
                    render: (r) => {
                      const z = r.z as ZutatOffen;
                      return (
                        <div className="pl-stack">
                          {z.vorschlaege.map((v) => (
                            <div key={v.artikelId} className="pl-actions">
                              <Button
                                disabled={speichert}
                                ariaLabel={`${v.artikel} mit ${z.bezeichnung} verknüpfen`}
                                onClick={async () => {
                                  const f = await zuordnen(z, v.artikelId, v.artikel);
                                  if (f) setFehler({ titel: "Nicht gespeichert", text: `${z.bezeichnung}: ${f}` });
                                }}
                              >
                                {v.artikel}
                              </Button>
                              <span className="pl-small">{vorschlagDetail(v)}</span>
                            </div>
                          ))}
                          {z.vorschlaege.length ? null : <span className="pl-muted">kein ähnlicher Artikel</span>}
                        </div>
                      );
                    },
                  },
                  {
                    key: "aktion",
                    label: <span className="pl-sr">Aktionen</span>,
                    render: (r) => {
                      const z = r.z as ZutatOffen;
                      return (
                        <Button
                          variant="dashed"
                          icon="search"
                          ariaLabel={`Anderen Artikel für ${z.bezeichnung} suchen`}
                          onClick={() => {
                            setZiel(z);
                            setZielFehler(null);
                            setOeffnung((n) => n + 1);
                            setZielOffen(true);
                          }}
                        >
                          Artikel suchen
                        </Button>
                      );
                    },
                  },
                ]}
                rows={liste.map((z) => ({ id: z.schluessel, z }))}
              />
            ) : alle.length ? (
              <EmptyState
                title={suche.trim() ? `Nichts gefunden für «${suche.trim()}»` : "Keine Zutaten für diese Filter"}
                actionLabel="Filter zurücksetzen"
                onAction={() => {
                  setSuche("");
                  setTreffer("");
                }}
              />
            ) : (
              <EmptyState title="Alle Zutaten dieser Saison sind verknüpft" />
            )}
            <p className="pl-small">
              <span className="pl-assumed">Vorschläge</span>: die drei ähnlichsten Artikel nach dem Namen (ab 50 % Ähnlichkeit, Prozentzahl hinter dem Preis). Ein ähnlicher Name ist noch nicht der richtige
              Artikel: vor dem Klick prüfen. Verknüpft werden alle offenen Zutaten mit genau dieser Bezeichnung in den Rezepten der Saison; bestehende Verknüpfungen bleiben. Zutaten, die ein Unterrezept sind,
              stehen nicht in der Liste.
            </p>
          </Card>

          <details className="pl-details">
            <summary>Verknüpfte Zutaten ({formatZahl(daten.verknuepft.length)} Bezeichnungen)</summary>
            {daten.verknuepft.length ? (
              <DataTable
                columns={[
                  { key: "bezeichnung", label: "Zutat", subKey: "umfang" },
                  { key: "artikel", label: "Artikel", subKey: "preis" },
                  {
                    key: "aktion",
                    label: <span className="pl-sr">Aktionen</span>,
                    render: (r) => {
                      const v = r.v as Verknuepft;
                      return (
                        <Button disabled={speichert} ariaLabel={`Verknüpfung von ${v.bezeichnung} mit ${v.artikel} lösen`} onClick={() => loesen(v)}>
                          Lösen
                        </Button>
                      );
                    },
                  },
                ]}
                rows={daten.verknuepft.map((v) => ({
                  id: `${v.schluessel}-${v.artikel_id}`,
                  v,
                  bezeichnung: v.bezeichnung,
                  umfang: umfangText(v.anzahl, v.rezepte_anzahl),
                  artikel: v.artikel,
                  preis: `${v.preis_pro_einheit === null ? "[Preis]" : formatChf(v.preis_pro_einheit)} / ${v.artikel_einheit ?? "[Einheit]"}`,
                }))}
              />
            ) : (
              <EmptyState title="Noch keine Zutat verknüpft" />
            )}
            <p className="pl-small">«Lösen» nimmt den Artikel bei allen Zutaten mit dieser Bezeichnung weg, auch in Rezepten ausserhalb der Saison.</p>
          </details>
        </>
      ) : daten === undefined ? (
        fehler ? <p className="pl-muted" role="status">Keine Daten.</p> : <Skeleton variant="zeile" label="Zutaten werden geladen" />
      ) : null}

      <ArtikelWaehlen
        key={oeffnung}
        titel={ziel ? `Artikel für ${ziel.bezeichnung}` : "Artikel"}
        meta={ziel ? umfangText(ziel.anzahl, ziel.rezepteAnzahl) : undefined}
        offen={zielOffen}
        gesperrt={speichert}
        fehler={zielFehler}
        onClose={() => setZielOffen(false)}
        onWahl={async (a) => {
          if (!ziel) return;
          const f = await zuordnen(ziel, a.id, a.name);
          if (f) return setZielFehler(f);
          setZielOffen(false);
        }}
      />
    </>
  );
}
