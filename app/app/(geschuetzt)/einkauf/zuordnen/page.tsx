"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, DataTable, KpiTile, Notice, SegmentedControl, Select, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import { filtern, gruppieren, vorschlagDetail, type ArtikelVorschlag, type KomponenteOffen, type VorschlagZeile } from "@/lib/artikel-vorschlag";
import { ArtikelZuordnen, type Ziel } from "@/components/einkauf/ArtikelZuordnen";

type Daten = { saison: string; liste: KomponenteOffen[] };

async function laden(): Promise<Daten | null> {
  // Pilot: eine Saison. Gibt es mehrere, die jüngste (wie in der Einkaufsliste).
  const s = await supabase.from("einkauf_summe").select("saison_id, saison").order("saison", { ascending: false }).limit(1).maybeSingle();
  if (s.error) throw s.error;
  if (!s.data?.saison_id) return null;
  const v = await supabase.rpc("komponente_artikel_vorschlag", { p_saison: s.data.saison_id });
  if (v.error) throw v.error;
  return { saison: s.data.saison ?? "[Saison]", liste: gruppieren((v.data ?? []) as VorschlagZeile[]) };
}

export default function ArtikelZuordnenSeite() {
  const [daten, setDaten] = useState<Daten | null | undefined>(undefined);
  const [fehler, setFehler] = useState<{ titel: string; text: string } | null>(null);
  const [meldung, setMeldung] = useState("");
  const [kategorie, setKategorie] = useState("");
  const [treffer, setTreffer] = useState<"" | "mit" | "ohne">("mit");
  const [zugeordnet, setZugeordnet] = useState(0);
  const [speichert, setSpeichert] = useState<string | null>(null);
  const [ziel, setZiel] = useState<Ziel | null>(null);
  const [zielOffen, setZielOffen] = useState(false);
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
          setFehler({ titel: "Vorschläge nicht geladen", text: e.message });
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

  /** Vorschlag mit einem Klick als Hauptartikel setzen; die Komponente verschwindet aus der Liste. */
  async function zuordnen(k: KomponenteOffen, v: ArtikelVorschlag) {
    if (speichert) return;
    setSpeichert(k.komponenteId);
    const r = await supabase.from("komponente").update({ hauptartikel_id: v.artikelId }).eq("id", k.komponenteId).is("hauptartikel_id", null).select("id");
    setSpeichert(null);
    if (r.error) return setFehler({ titel: "Nicht gespeichert", text: `${k.komponente}: ${r.error.message}` });
    if (!r.data?.length) return setFehler({ titel: "Nicht gespeichert", text: `${k.komponente}: hat inzwischen schon einen Hauptartikel oder ist nicht mehr vorhanden. Seite neu laden.` });
    setDaten((d) => (d ? { ...d, liste: d.liste.filter((x) => x.komponenteId !== k.komponenteId) } : d));
    setZugeordnet((n) => n + 1);
    melden(`${k.komponente}: Hauptartikel ${v.artikel} zugeordnet. Ändern unter Einkauf, «Verknüpfte Komponenten».`);
  }

  const alle = useMemo(() => daten?.liste ?? [], [daten]);
  const kategorien = useMemo(() => [...new Set(alle.map((k) => k.kategorie))].filter(Boolean).sort((a, b) => a.localeCompare(b, "de-CH")), [alle]);
  const liste = filtern(alle, { kategorie, treffer });
  const mitTreffer = alle.filter((k) => k.vorschlaege.length).length;

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            <a href="/einkauf/">Einkauf</a> · {daten?.saison ?? "…"}
          </div>
          <h1 className="pl-h1">Artikel zuordnen</h1>
        </div>
        <div className="pl-actions">
          <Button href="/einkauf/">Einkaufsliste</Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title={fehler.titel}>{fehler.text}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>
      {daten === null ? <Notice title="Keine Saison">Es gibt noch keine Saison mit Anlässen.</Notice> : null}

      {daten ? (
        <>
          <div className="pl-grid-3">
            <KpiTile label="Ohne Hauptartikel" value={formatZahl(alle.length)} detail="Komponenten in den Menülinien dieser Saison" />
            <KpiTile label="mit Vorschlag" value={formatZahl(mitTreffer)} detail={`${formatZahl(alle.length - mitTreffer)} ohne ähnlichen Artikel in der Preisliste`} />
            <KpiTile label="Jetzt zugeordnet" value={formatZahl(zugeordnet)} detail="seit dem Öffnen dieser Seite" />
          </div>

          <div className="pl-grid-3">
            <Select id="filter-kategorie" label="Kategorie" value={kategorie} onChange={setKategorie} options={[{ value: "", label: "Alle Kategorien" }, ...kategorien.map((k) => ({ value: k, label: k }))]} />
            <div>
              <div className="pl-label">Vorschlag</div>
              <SegmentedControl
                label="Vorschlag"
                value={treffer}
                onChange={(v) => setTreffer(v as "" | "mit" | "ohne")}
                options={[{ value: "mit", label: "mit Vorschlag" }, { value: "ohne", label: "ohne Vorschlag" }, { value: "", label: "Alle" }]}
              />
            </div>
          </div>

          <Card title="Komponenten ohne Hauptartikel" meta={`${formatZahl(liste.length)} von ${formatZahl(alle.length)}, nach Filter. Ein Klick auf den Vorschlag ordnet zu.`}>
            {liste.length ? (
              <DataTable
                columns={[
                  { key: "komponente", label: "Komponente", subKey: "kategorie" },
                  { key: "status", label: "Status", render: (r) => <StatusPill status={r.status === "ok" ? "ok" : r.status === "Zukauf" ? "info" : "warn"}>{r.status as string}</StatusPill> },
                  {
                    key: "vorschlaege",
                    label: <span className="pl-assumed">Vorschläge aus der Preisliste</span>,
                    render: (r) => {
                      const k = r.k as KomponenteOffen;
                      return (
                        <div className="pl-stack">
                          {k.vorschlaege.map((v) => (
                            <div key={v.artikelId} className="pl-actions">
                              <Button onClick={() => zuordnen(k, v)} disabled={speichert !== null} ariaLabel={`${v.artikel} als Hauptartikel für ${k.komponente} zuordnen`}>
                                {v.artikel}
                              </Button>
                              <span className="pl-small">{vorschlagDetail(v)}</span>
                            </div>
                          ))}
                          {k.vorschlaege.length ? null : <span className="pl-muted">kein ähnlicher Artikel</span>}
                        </div>
                      );
                    },
                  },
                  {
                    key: "aktion",
                    label: <span className="pl-sr">Aktionen</span>,
                    render: (r) => {
                      const k = r.k as KomponenteOffen;
                      return (
                        <Button
                          variant="dashed"
                          ariaLabel={`Anderen Artikel für ${k.komponente} suchen`}
                          onClick={() => {
                            setZiel({ komponenteId: k.komponenteId, komponente: k.komponente, einheit: null, artikel: null });
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
                rows={liste.map((k) => ({ id: k.komponenteId, k, komponente: k.komponente, kategorie: k.kategorie, status: k.status }))}
              />
            ) : (
              <p className="pl-muted">{alle.length ? "Keine Komponenten für diese Filter." : "Alle Komponenten dieser Saison haben einen Hauptartikel."}</p>
            )}
            <p className="pl-small">
              <span className="pl-assumed">Vorschläge</span>: die drei ähnlichsten Artikel nach dem Namen (ab 50 % Ähnlichkeit, Prozentzahl hinter dem Preis). Ein ähnlicher Name ist noch nicht der richtige
              Artikel: vor dem Klick prüfen. Hausgemachte Komponenten (Saucen, Suppen, Teige) haben oft keinen passenden Artikel; ihr Einkauf kommt später über die Rezepte. Die Menge wird nur umgerechnet, wenn Artikel und
              Komponente dieselbe Einheit haben.
            </p>
          </Card>
        </>
      ) : daten === undefined ? (
        <p className="pl-muted" role="status">{fehler ? "Keine Daten." : "Vorschläge werden gesucht …"}</p>
      ) : null}

      <ArtikelZuordnen
        key={oeffnung}
        ziel={ziel}
        offen={zielOffen}
        onClose={() => setZielOffen(false)}
        onGespeichert={async (text) => {
          setZielOffen(false);
          setZugeordnet((n) => n + 1);
          if (await neuLaden()) melden(text);
        }}
      />
    </>
  );
}
