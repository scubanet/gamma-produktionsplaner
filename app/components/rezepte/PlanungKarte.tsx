"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, DataTable, Dialog, ItemList, Notice, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatGramm } from "@/lib/format";
import { haltbarkeitText, lagerungText, type Zuteilung } from "@/lib/systemzuteilung";
import { durchgangText, fehlendeAngaben, kurzText, minutenText, ortText, serviceText, type PlanungSchritt } from "@/lib/rezept-planung";

type Rezept = { id: string; name: string; typ: string; geaendert_am: string };
type Kopf = { gebinde: string | null; verpackung: string | null; fuellmenge_g: number | null; service_min_pro_100: number | null; service_rolle: string | null; ergibt_g: number | null };
type Daten = { kopf: Kopf; schritte: PlanungSchritt[]; komponenten: Zuteilung[] };
type Treffer = { id: string; name: string; kategorie: string | null; rezept_id: string | null };

const LEER_UUID = "00000000-0000-0000-0000-000000000000";
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

async function laden(id: string): Promise<Daten> {
  const [r, g, k] = await Promise.all([
    supabase.from("rezept").select("gebinde_id, verpackung, fuellmenge_g, service_min_pro_100, service_rolle, ergibt_g").eq("id", id).single(),
    supabase.from("zutatengruppe").select("id, reihenfolge").eq("rezept_id", id),
    supabase.from("komponente_zuteilung").select("*").eq("rezept_id", id).order("name"),
  ]);
  for (const x of [r, g, k]) if (x.error) throw x.error;
  const gruppen = g.data ?? [];
  const [s, ge] = await Promise.all([
    supabase
      .from("schritt")
      .select("id, gruppe_id, text, reihenfolge, ort, rolle, ruest_min, aktiv_min, unbeaufsichtigt_min, menge_pro_durchgang_g, geraet(name)")
      .in("gruppe_id", gruppen.length ? gruppen.map((x) => x.id) : [LEER_UUID]),
    r.data?.gebinde_id ? supabase.from("gebinde").select("name").eq("id", r.data.gebinde_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (s.error) throw s.error;
  if (ge.error) throw ge.error;
  const rang = new Map(gruppen.map((x) => [x.id, x.reihenfolge]));
  const schritte = ((s.data ?? []) as unknown as (Omit<PlanungSchritt, "geraet"> & { gruppe_id: string; reihenfolge: number; geraet: { name: string } | null })[])
    .sort((a, b) => (rang.get(a.gruppe_id) ?? 0) - (rang.get(b.gruppe_id) ?? 0) || a.reihenfolge - b.reihenfolge)
    .map((x) => ({ ...x, geraet: x.geraet?.name ?? null }));
  const d = r.data!;
  return {
    kopf: { gebinde: ge.data?.name ?? null, verpackung: d.verpackung, fuellmenge_g: d.fuellmenge_g, service_min_pro_100: d.service_min_pro_100, service_rolle: d.service_rolle, ergibt_g: d.ergibt_g },
    schritte,
    komponenten: (k.data ?? []) as Zuteilung[],
  };
}

/** Planung auf der Rezeptkarte: Aufwand, Gebinde, Service und die Systemzuteilung der verknüpften Komponenten. */
export function PlanungKarte({ rezept, bearbeitenHref }: { rezept: Rezept; bearbeitenHref: string }) {
  const [stand, setStand] = useState<{ schluessel: string; daten?: Daten; fehler?: string } | null>(null);
  const [dialog, setDialog] = useState(false);
  const [suche, setSuche] = useState("");
  const [treffer, setTreffer] = useState<Treffer[] | null>(null);
  const [aktion, setAktion] = useState<{ laeuft: boolean; fehler: string | null }>({ laeuft: false, fehler: null });
  const schluessel = `${rezept.id}|${rezept.geaendert_am}`;
  const begriff = suche.trim();

  const neuLaden = useCallback(
    () =>
      laden(rezept.id).then(
        (daten) => setStand({ schluessel, daten }),
        (e: Error) => setStand({ schluessel, fehler: e.message }),
      ),
    [rezept.id, schluessel],
  );

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  useEffect(() => {
    if (!dialog || begriff.length < 2) return;
    let gilt = true;
    supabase
      .from("komponente")
      .select("id, name, kategorie, rezept_id")
      .ilike("name", `%${begriff.replace(/[%_\\]/g, "\\$&")}%`)
      .order("name")
      .limit(30)
      .then((r) => {
        if (!gilt) return;
        if (r.error) return setAktion({ laeuft: false, fehler: r.error.message });
        setTreffer(r.data);
      });
    return () => {
      gilt = false;
    };
  }, [dialog, begriff]);

  /** Komponente im Katalog mit diesem Rezept verknüpfen (rezeptId) oder die Verknüpfung lösen (null). */
  async function verknuepfen(komponenteId: string, rezeptId: string | null) {
    if (aktion.laeuft) return;
    setAktion({ laeuft: true, fehler: null });
    const r = await supabase.from("komponente").update({ rezept_id: rezeptId }).eq("id", komponenteId).select("id");
    if (r.error || !r.data?.length) return setAktion({ laeuft: false, fehler: r.error?.message ?? "Komponente nicht gefunden oder keine Berechtigung." });
    setAktion({ laeuft: false, fehler: null });
    setDialog(false);
    await neuLaden();
  }

  const d = stand?.schluessel === schluessel ? stand : null;
  if (!d?.daten) {
    return (
      <Card title="Planung" meta="Produktion, Gebinde und Service">
        {d?.fehler ? <Notice role="alert" title="Planung nicht geladen">{d.fehler}</Notice> : <p className="pl-muted" role="status">Planung wird geladen …</p>}
      </Card>
    );
  }
  const { kopf, schritte, komponenten } = d.daten;
  const fehlt = fehlendeAngaben({ ...kopf, typ: rezept.typ }, schritte, komponenten.length);
  const liste = begriff.length >= 2 ? treffer : null;

  return (
    <Card
      title="Planung"
      meta="Grundlage für Produktion, Logistik und Service pro Anlass"
      actions={<span className="pl-print-hide"><Button href={bearbeitenHref}>Angaben erfassen</Button></span>}
    >
      <div className="pl-stack">
        {fehlt.length ? (
          <Notice title={`Für die Berechnung fehlt noch: ${fehlt.length} Angabe(n)`} items={fehlt} />
        ) : (
          <p className="pl-small"><StatusPill status="ok">vollständig</StatusPill> Alle Angaben für die Berechnung pro Anlass sind erfasst.</p>
        )}

        <div className="pl-grid-3">
          <div>
            <div className="pl-label">Gebinde</div>
            <div>{kopf.gebinde ?? "[Gebinde]"}</div>
            <div className="pl-small">{kopf.verpackung ?? "[Verpackung]"}</div>
          </div>
          <div>
            <div className="pl-label">Füllmenge pro Gebinde</div>
            <div className="pl-mono">{kopf.fuellmenge_g === null ? "[Füllmenge]" : formatGramm(kopf.fuellmenge_g)}</div>
          </div>
          <div>
            <div className="pl-label">Aufwand Ausgabe im Service</div>
            <div>{serviceText(kopf.service_min_pro_100, kopf.service_rolle)}</div>
          </div>
        </div>

        {schritte.length ? (
          <DataTable
            columns={[
              { key: "text", label: "Schritt" },
              { key: "ort", label: "Ort" },
              { key: "geraet", label: "Gerät" },
              { key: "durchgang", label: "pro Durchgang", numeric: true },
              { key: "ruest", label: "Rüstzeit", numeric: true },
              { key: "aktiv", label: "aktiv", numeric: true },
              { key: "unbeaufsichtigt", label: "unbeaufsichtigt", numeric: true },
              { key: "rolle", label: "Rolle" },
            ]}
            rows={schritte.map((s, i) => ({
              id: s.id,
              text: `${i + 1}. ${kurzText(s.text)}`,
              ort: ortText(s.ort),
              geraet: s.geraet ?? "–",
              durchgang: durchgangText(s.menge_pro_durchgang_g),
              ruest: minutenText(s.ruest_min),
              aktiv: minutenText(s.aktiv_min),
              unbeaufsichtigt: minutenText(s.unbeaufsichtigt_min),
              rolle: s.rolle ?? "[Rolle]",
            }))}
          />
        ) : null}
        <p className="pl-small">Rüstzeit fällt einmal an. «aktiv» und «unbeaufsichtigt» gelten pro Durchgang; ohne Menge pro Durchgang ist ein Durchgang eine Basis-Charge.</p>

        {rezept.typ === "komponente" ? (
          <>
            <div className="pl-card__head" style={{ marginBottom: 0 }}>
              <h3 className="pl-card__title">Im Katalog verknüpft</h3>
              <span className="pl-print-hide">
                <Button variant="dashed" onClick={() => { setSuche(rezept.name); setTreffer(null); setAktion({ laeuft: false, fehler: null }); setDialog(true); }}>+ Komponente verknüpfen</Button>
              </span>
            </div>
            {komponenten.length ? (
              <DataTable
                columns={[
                  { key: "name", label: "Komponente", subKey: "kategorie" },
                  { key: "system", label: "Produktionssystem" },
                  { key: "lagerung", label: "Lagerung" },
                  { key: "haltbarkeit", label: <span className="pl-assumed">Haltbarkeit</span>, numeric: true },
                  { key: "regeneration", label: "Regeneration" },
                  {
                    key: "aktion",
                    label: <span className="pl-sr">Aktionen</span>,
                    printHidden: true,
                    render: (r) => (
                      <Button ariaLabel={`Verknüpfung mit ${r.name as string} lösen`} onClick={() => verknuepfen(r.id as string, null)} disabled={aktion.laeuft}>Lösen</Button>
                    ),
                  },
                ]}
                rows={komponenten.map((k) => ({
                  id: k.id,
                  name: k.name,
                  kategorie: k.kategorie,
                  system: k.produktion?.length ? k.produktion.join(" · ") : "[Produktion]",
                  lagerung: lagerungText(k) || "[Lagerung]",
                  haltbarkeit: haltbarkeitText(k),
                  regeneration: k.regeneration?.length ? k.regeneration.join(" · ") : "[Regeneration]",
                }))}
              />
            ) : (
              <p className="pl-muted">Noch mit keiner Komponente verknüpft. Ohne Verknüpfung rechnet die Planung eines Anlasses nicht mit diesem Rezept.</p>
            )}
            <p className="pl-small">Lagerung, Haltbarkeit und Regeneration kommen aus der Systemzuteilung der Komponente und werden dort gepflegt.</p>
            {aktion.fehler && !dialog ? <Notice role="alert" title="Nicht gespeichert">{aktion.fehler}</Notice> : null}
          </>
        ) : null}
      </div>

      <Dialog
        open={dialog}
        id="komponente-verknuepfen"
        title={`Komponente für «${rezept.name}»`}
        meta="Komponente aus dem Katalog, die nach diesem Rezept produziert wird"
        onClose={() => setDialog(false)}
        onCancel={(e) => aktion.laeuft && e.preventDefault()}
        actions={<Button onClick={() => setDialog(false)} disabled={aktion.laeuft}>Schliessen</Button>}
      >
        <TextField id="komponente-suche" type="search" label="Komponente suchen" value={suche} onChange={(e) => setSuche(wert(e))} hint="Mindestens 2 Zeichen" />
        {liste ? (
          liste.length ? (
            <ItemList
              label="Komponenten"
              onSelect={(id) => verknuepfen(id, rezept.id)}
              groups={[{ items: liste.map((k) => ({ id: k.id, label: k.name, sub: `${k.kategorie ?? ""}${k.rezept_id && k.rezept_id !== rezept.id ? " · heute mit einem anderen Rezept verknüpft, wird ersetzt" : k.rezept_id ? " · schon verknüpft" : ""}` })) }]}
            />
          ) : (
            <p className="pl-muted">Keine Komponente gefunden.</p>
          )
        ) : null}
        {aktion.fehler ? <Notice role="alert" title="Nicht gespeichert">{aktion.fehler}</Notice> : null}
      </Dialog>
    </Card>
  );
}
