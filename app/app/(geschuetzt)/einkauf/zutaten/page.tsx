"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, DataTable, EmptyState, KpiTile, Notice, SegmentedControl, Skeleton, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import { formatChf } from "@/lib/offerte";
import { vorschlagDetail } from "@/lib/artikel-vorschlag";
import { filtern, gruppieren, rezepteText, umfangText, type ZutatOffen, type ZutatVorschlagZeile } from "@/lib/zutat-vorschlag";
import { ArtikelWaehlen } from "@/components/einkauf/ArtikelWaehlen";
import { useBestaetigen } from "@/components/Bestaetigen";
import { fehlerText } from "@/lib/fehler";

type Verknuepft = { schluessel: string; bezeichnung: string; artikel_id: string; artikel: string; artikel_einheit: string | null; preis_pro_einheit: number | null; anzahl: number; rezepte_anzahl: number };
/** Ab so vielen Zutaten fragt ein Vorschlag-Knopf nach, bevor er verknüpft. */
const RUECKFRAGE_AB = 10;

/** Anker einer Zeile, damit der Fokus nach dem Verknüpfen auf die nächste Bezeichnung gehen kann. */
const zeilenId = (schluessel: string) => `zutat-${encodeURIComponent(schluessel)}`;

type Daten = { saisonId: string; saison: string; offen: ZutatOffen[]; verknuepft: Verknuepft[]; zutaten: number; mitArtikel: number };

/** Verknüpfte Zutaten und Zähler: zwei schnelle Abfragen, die nach jedem Verknüpfen oder Lösen neu geholt werden. */
async function standLaden(saisonId: string): Promise<Pick<Daten, "verknuepft" | "zutaten" | "mitArtikel">> {
  const [k, st] = await Promise.all([
    supabase.rpc("zutat_artikel_verknuepft", { p_saison: saisonId }),
    supabase.from("einkauf_zutaten_stand").select("zutaten, verknuepft").eq("saison_id", saisonId).maybeSingle(),
  ]);
  for (const x of [k, st]) if (x.error) throw x.error;
  return {
    verknuepft: ((k.data ?? []) as Verknuepft[]).sort((a, b) => a.bezeichnung.localeCompare(b.bezeichnung, "de-CH") || a.artikel.localeCompare(b.artikel, "de-CH")),
    zutaten: st.data?.zutaten ?? 0,
    mitArtikel: st.data?.verknuepft ?? 0,
  };
}

async function laden(): Promise<Daten | null> {
  // Pilot: eine Saison. Gibt es mehrere, die jüngste (wie in der Einkaufsliste). Direkt aus der Tabelle:
  // die View einkauf_summe rechnet dafür den ganzen Einkauf.
  // Der Leitstand verlinkt mit ?saison=<id>, damit hier dieselbe Saison steht wie dort gezählt.
  const gewuenscht = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("saison");
  const abfrage = supabase.from("saison").select("id, name");
  const s = await (gewuenscht && /^[0-9a-f-]{36}$/i.test(gewuenscht) ? abfrage.eq("id", gewuenscht) : abfrage.order("name", { ascending: false })).limit(1).maybeSingle();
  if (s.error) throw s.error;
  if (!s.data?.id) return null;
  const saisonId = s.data.id;
  const [v, stand] = await Promise.all([supabase.rpc("zutat_artikel_vorschlag", { p_saison: saisonId }), standLaden(saisonId)]);
  if (v.error) throw v.error;
  return { saisonId, saison: s.data.name ?? "[Saison]", offen: gruppieren((v.data ?? []) as ZutatVorschlagZeile[]), ...stand };
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
  const [fragen, rueckfrage] = useBestaetigen();
  // Die zuletzt verknüpfte Bezeichnung, für «Rückgängig» neben der Meldung.
  const [letzte, setLetzte] = useState<Verknuepft | null>(null);

  const neuLaden = useCallback(
    () =>
      laden().then(
        (d) => {
          setDaten(d);
          setFehler(null);
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
    setLetzte(null);
    setMeldung(text);
  };

  // Fokus nach dem Verknüpfen im Dialog: undefined = nichts vorgemerkt, null = auf die Meldung.
  const fokusNach = useRef<string | null | undefined>(undefined);
  const fokusSetzen = (id: string | null) => (id ? document.getElementById(id) : meldungRef.current)?.focus();

  const fokusNachholen = () => {
    const id = fokusNach.current;
    fokusNach.current = undefined;
    if (id !== undefined) fokusSetzen(id);
  };

  /** Zähler und Liste der verknüpften Zutaten neu holen; die offene Liste bleibt, wie sie auf dem Bildschirm steht. */
  async function standNeu(saisonId: string) {
    try {
      const stand = await standLaden(saisonId);
      setDaten((d) => (d ? { ...d, ...stand } : d));
    } catch {
      // Gespeichert ist es; nur die Zahlen oben sind dann nicht aktuell.
      setMeldung((m) => `${m} Der Zähler wurde nicht aktualisiert, bitte die Seite neu laden.`);
    }
  }

  /** Alle offenen Zutaten mit dieser Bezeichnung verknüpfen; gibt den Fehlertext zurück oder null. */
  async function zuordnen(z: ZutatOffen, artikelId: string, artikel: string, imDialog = false): Promise<string | null> {
    if (!daten || speichert) return null;
    setSpeichert(true);
    const r = await supabase.rpc("zutat_artikel_zuordnen", { p_saison: daten.saisonId, p_schluessel: z.schluessel, p_artikel: artikelId, p_weitere: weitere });
    setSpeichert(false);
    if (r.error) return fehlerText(r.error);
    if (!r.data) return "Keine offene Zutat mit dieser Bezeichnung gefunden. Seite neu laden.";
    // Die Zeile verschwindet sofort; die teure Abfrage der Vorschläge läuft nicht neu. Der Fokus geht auf die nächste Zeile.
    // Im Dialog erst nach dessen Schliessen (vorher ist die Seite gesperrt); ohne Nachbarzeile auf die Meldung.
    const i = liste.findIndex((x) => x.schluessel === z.schluessel);
    const nachbar = (liste[i + 1] ?? liste[i - 1])?.schluessel;
    const zielId = nachbar ? zeilenId(nachbar) : null;
    setDaten((d) => (d ? { ...d, offen: d.offen.filter((x) => x.schluessel !== z.schluessel) } : d));
    melden(`${z.bezeichnung}: ${formatZahl(r.data)} ${r.data === 1 ? "Zutat" : "Zutaten"} mit ${artikel} verknüpft. Lösen unten unter «Verknüpfte Zutaten».`);
    setLetzte({ schluessel: z.schluessel, bezeichnung: z.bezeichnung, artikel_id: artikelId, artikel, artikel_einheit: null, preis_pro_einheit: null, anzahl: r.data, rezepte_anzahl: z.rezepteAnzahl });
    if (imDialog) fokusNach.current = zielId;
    else requestAnimationFrame(() => fokusSetzen(zielId));
    await standNeu(daten.saisonId);
    return null;
  }

  async function loesen(v: Verknuepft) {
    if (speichert) return;
    setSpeichert(true);
    const r = await supabase.rpc("zutat_artikel_loesen", { p_schluessel: v.schluessel, p_artikel: v.artikel_id });
    setSpeichert(false);
    if (r.error) return setFehler({ titel: "Nicht gelöst", text: `${v.bezeichnung}: ${fehlerText(r.error)}` });
    // Nach dem Lösen erscheint die Bezeichnung wieder unter den offenen, samt Vorschlägen: dafür ganz neu laden.
    const n = r.data ?? 0;
    melden(`${v.bezeichnung}: Verknüpfung mit ${v.artikel} bei ${formatZahl(n)} ${n === 1 ? "Zutat" : "Zutaten"} gelöst.`);
    await neuLaden();
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
      {letzte ? (
        <div className="pl-actions">
          <Button
            disabled={speichert}
            ariaLabel={`Verknüpfung von ${letzte.bezeichnung} mit ${letzte.artikel} rückgängig machen`}
            onClick={() =>
              fragen({
                titel: `${letzte.bezeichnung} von ${letzte.artikel} wieder lösen?`,
                text: "Rückgängig löst den Artikel bei allen Zutaten mit dieser Bezeichnung, auch bei solchen, die schon vorher mit diesem Artikel verknüpft waren.",
                bestaetigen: "Lösen",
                aktion: () => loesen(letzte),
              })
            }
          >
            Rückgängig
          </Button>
        </div>
      ) : null}
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
                          <strong id={zeilenId(z.schluessel)} tabIndex={-1}>{z.bezeichnung}</strong>
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
                                onClick={() => {
                                  const los = async (imDialog: boolean) => {
                                    const f = await zuordnen(z, v.artikelId, v.artikel, imDialog);
                                    if (f) setFehler({ titel: "Nicht gespeichert", text: `${z.bezeichnung}: ${f}` });
                                  };
                                  // Ein Klick verknüpft alle Zutaten dieser Bezeichnung: bei vielen zuerst nachfragen.
                                  if (z.anzahl + (weitere ? z.weitere : 0) < RUECKFRAGE_AB) return los(false);
                                  fragen({
                                    titel: `${z.bezeichnung} mit ${v.artikel} verknüpfen?`,
                                    text: `Der Artikel wird bei ${umfangText(z.anzahl, z.rezepteAnzahl)} der Saison eingetragen${weitere && z.weitere ? `, dazu bei ${formatZahl(z.weitere)} ausserhalb der Saison` : ""}. Der Vorschlag vergleicht nur die Namen (${Math.round(v.aehnlichkeit * 100)} % ähnlich).`,
                                    bestaetigen: "Verknüpfen",
                                    aktion: () => los(true),
                                    danach: fokusNachholen,
                                  });
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
                        <Button
                          disabled={speichert}
                          ariaLabel={`Verknüpfung von ${v.bezeichnung} mit ${v.artikel} lösen`}
                          onClick={() =>
                            fragen({
                              titel: `${v.bezeichnung} von ${v.artikel} lösen?`,
                              text: `Der Artikel wird bei allen Zutaten mit dieser Bezeichnung weggenommen (${umfangText(v.anzahl, v.rezepte_anzahl)} in der Saison), auch in Rezepten ausserhalb der Saison. Die Bezeichnung steht danach wieder unter den offenen.`,
                              bestaetigen: "Lösen",
                              aktion: () => loesen(v),
                            })
                          }
                        >
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

      {rueckfrage}

      <ArtikelWaehlen
        key={oeffnung}
        vorgabe={ziel?.bezeichnung}
        titel={ziel ? `Artikel für ${ziel.bezeichnung}` : "Artikel"}
        meta={ziel ? umfangText(ziel.anzahl, ziel.rezepteAnzahl) : undefined}
        offen={zielOffen}
        gesperrt={speichert}
        fehler={zielFehler}
        onClose={() => {
          setZielOffen(false);
          requestAnimationFrame(fokusNachholen);
        }}
        onWahl={async (a) => {
          if (!ziel) return;
          const f = await zuordnen(ziel, a.id, a.name, true);
          if (f) return setZielFehler(f);
          setZielOffen(false);
        }}
      />
    </>
  );
}
