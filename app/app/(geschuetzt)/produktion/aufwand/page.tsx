"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, DataTable, KpiTile, Notice, Select, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { nichtFreigegeben, statusText } from "@/lib/rezepte";
import {
  abdeckung, anzahl, ausEntwurf, fehlend, gewichtText, minuten, nachBezug, nachKategorie, services, statusPill, summe, volumenText,
  type GeraetZeile, type ProduktionZeile, type RolleZeile, type ServiceZeile,
} from "@/lib/planung";

type Daten = { saison: string; produktion: ProduktionZeile[]; rollen: RolleZeile[]; geraete: GeraetZeile[]; service: ServiceZeile[] };

async function laden(): Promise<Daten | null> {
  // Pilot: eine Saison. Gibt es mehrere, die jüngste (wie im Wellenplan).
  const u = await supabase.from("wellen_uebersicht").select("saison_id, saison").order("saison", { ascending: false }).limit(1).maybeSingle();
  if (u.error) throw u.error;
  if (!u.data?.saison_id) return null;
  const s = u.data.saison_id;
  const [produktion, rollen, geraete, service] = await Promise.all([
    alleSeiten<ProduktionZeile>((von, bis) => supabase.from("planung_produktion_komponente").select("*").eq("saison_id", s).order("sortierung").order("komponente_id").order("einheit").range(von, bis)),
    alleSeiten<RolleZeile>((von, bis) => supabase.from("planung_produktion_rolle").select("*").eq("saison_id", s).order("sortierung").order("rolle").range(von, bis)),
    alleSeiten<GeraetZeile>((von, bis) => supabase.from("planung_produktion_geraet").select("*").eq("saison_id", s).order("sortierung").order("geraet").range(von, bis)),
    alleSeiten<ServiceZeile>((von, bis) => supabase.from("planung_service_komponente").select("*").eq("saison_id", s).order("reihenfolge").order("komponente_id").order("einheit").range(von, bis)),
  ]);
  return { saison: u.data.saison ?? "[Saison]", produktion, rollen, geraete, service };
}

const mengeText = (menge: number | null, einheit: string | null, annahme: boolean | null) => {
  const t = formatMenge(menge, einheit);
  return annahme && menge !== null ? <span className="pl-assumed">{t}</span> : t;
};
const rezeptZelle = (r: Record<string, unknown>) =>
  r.rezept ? (
    <>
      <a href={`/rezepte/?r=${encodeURIComponent(r.rezeptSlug as string)}`}>{r.rezept as string}</a>
      {r.entwurf ? <span className="pl-small"> · {statusText(r.rezeptStatus as string)}</span> : null}
    </>
  ) : (
    <span className="pl-mono">[Rezept]</span>
  );
/** Wert aus einem nicht freigegebenen Rezept: gestrichelt wie eine Annahme. Platzhalter und «–» bleiben, wie sie sind. */
const gestrichelt = (text: string, entwurf: boolean) =>
  entwurf && !/^[–[]/.test(text) ? <span className="pl-assumed">{text}<span className="pl-sr"> (Rezept nicht freigegeben)</span></span> : text;
const ausRezept = (key: string) => (r: Record<string, unknown>) => gestrichelt(r[key] as string, r.entwurf as boolean);
const statusZelle = (r: Record<string, unknown>) => <StatusPill status={statusPill(r.status as string)}>{r.status as string}</StatusPill>;

export default function Aufwand() {
  const [daten, setDaten] = useState<Daten | null | undefined>(undefined);
  const [fehler, setFehler] = useState<string | null>(null);
  const [bezug, setBezug] = useState("");
  const [serviceId, setServiceId] = useState("");

  useEffect(() => {
    laden().then(setDaten, (e: Error) => setFehler(e.message));
  }, []);

  const gruppen = useMemo(() => nachBezug(daten?.produktion ?? [], nachKategorie), [daten]);
  const gewaehlt = gruppen.find((g) => g.bezug === bezug) ?? gruppen[0] ?? null;
  const serviceListe = useMemo(() => services(daten?.service ?? []), [daten]);
  const sId = serviceListe.some((s) => s.value === serviceId) ? serviceId : (serviceListe[0]?.value ?? "");
  const serviceZeilen = useMemo(() => (daten?.service ?? []).filter((z) => z.service_id === sId).sort(nachKategorie), [daten, sId]);

  const prod = abdeckung(daten?.produktion ?? []);
  const proBezug = abdeckung(gewaehlt?.zeilen ?? []);
  const proService = abdeckung(serviceZeilen);
  const entwurfBezug = ausEntwurf(gewaehlt?.zeilen ?? []);
  const entwurfService = ausEntwurf(serviceZeilen);
  const mitEntwurf = entwurfBezug.anzahl + entwurfService.anzahl > 0;
  const rollen = (daten?.rollen ?? []).filter((r) => r.bezug === gewaehlt?.bezug);
  const geraete = (daten?.geraete ?? []).filter((r) => r.bezug === gewaehlt?.bezug);
  const serviceDatum = serviceZeilen[0]?.datum ?? null;
  const literAnnahme = [...(gewaehlt?.zeilen ?? []), ...serviceZeilen].some((z) => z.liter_annahme && z.menge !== null);

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            <a href="/produktion/">Produktionsplan</a> · {daten?.saison ?? "…"}
          </div>
          <h1 className="pl-h1">Aufwand aus den Rezepten</h1>
          <div className="pl-sub">Produktion pro Welle, Logistik und Service pro Spiel</div>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button onClick={() => window.print()} disabled={!daten}>Drucken / PDF</Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Aufwand nicht geladen">{fehler}</Notice> : null}
      {daten === null ? <Notice title="Keine Saison">Es gibt noch keine Saison mit Anlässen.</Notice> : null}
      {daten === undefined && !fehler ? <p className="pl-muted" role="status">Aufwand wird gerechnet …</p> : null}

      {daten ? (
        <>
          <div className="pl-grid-4">
            <KpiTile label="Komponenten mit Berechnung" value={`${formatZahl(prod.gerechnet)} von ${formatZahl(prod.alle)}`} detail="Zeilen über alle Wellen und Anlässe der Saison" />
            <KpiTile label={`Aktive Zeit · ${gewaehlt?.bezug ?? "–"}`} value={gestrichelt(minuten(summe(gewaehlt?.zeilen ?? [], (z) => (z.status === "gerechnet" ? z.aktiv_min : null))), entwurfBezug.anzahl > 0)} detail={proBezug.text + entwurfBezug.text} />
            <KpiTile label={`Gebinde · ${serviceListe.find((s) => s.value === sId)?.label ?? "–"}`} value={gestrichelt(anzahl(summe(serviceZeilen, (z) => z.gebinde_anzahl), "[Gebinde]"), entwurfService.anzahl > 0)} detail={proService.text + entwurfService.text} />
            <KpiTile label="Ausgabe im Service" value={gestrichelt(minuten(summe(serviceZeilen, (z) => z.ausgabe_min)), entwurfService.anzahl > 0)} detail={`Portionen ÷ 100 × Minuten pro 100 Portionen${entwurfService.text}`} />
          </div>

          {prod.gerechnet < prod.alle ? (
            <div className="pl-print-hide">
              <Notice title="Die Zahlen sind unvollständig" items={fehlend(daten.produktion)}>
                Summen gelten nur für die gerechneten Komponenten. Rezept erfassen und mit der Komponente verknüpfen: auf der Rezeptkarte unter «Planung».
              </Notice>
            </div>
          ) : null}

          <div className="pl-grid-3 pl-print-hide">
            <Select id="bezug" label="Welle oder Anlass (Produktion)" value={gewaehlt?.bezug ?? ""} onChange={setBezug} options={gruppen.map((g) => ({ value: g.bezug, label: `${g.bezug}${g.bedarfAm ? ` · ${formatDatum(g.bedarfAm)}` : ""}` }))} />
            <Select id="service" label="Service (Logistik und Service)" value={sId} onChange={setServiceId} options={serviceListe} />
          </div>

          <Card title={`Produktion in Hünenberg · ${gewaehlt?.bezug ?? "–"}`} meta={`${gewaehlt?.bedarfAm ? `${formatDatum(gewaehlt.bedarfAm)} · ` : ""}${proBezug.text}${entwurfBezug.text}`}>
            {gewaehlt?.zeilen.length ? (
              <DataTable
                columns={[
                  { key: "komponente", label: "Komponente", subKey: "kategorie" },
                  { key: "menge", label: "Menge", numeric: true, render: (r) => mengeText(r.mengeZahl as number | null, r.einheit as string | null, r.annahme as boolean | null) },
                  { key: "rezept", label: "Rezept", render: rezeptZelle },
                  { key: "durchgaenge", label: "Durchgänge", numeric: true, render: ausRezept("durchgaenge") },
                  { key: "aktiv", label: "aktiv", numeric: true, render: ausRezept("aktiv") },
                  { key: "geraet", label: "Gerät belegt", numeric: true, render: ausRezept("geraet") },
                  { key: "status", label: "Status", render: statusZelle },
                  { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                ]}
                rows={gewaehlt.zeilen.map((z) => ({
                  id: `${z.komponente_id}-${z.einheit}`,
                  komponente: z.komponente,
                  kategorie: z.kategorie,
                  mengeZahl: z.menge,
                  einheit: z.einheit,
                  annahme: z.liter_annahme,
                  rezept: z.rezept,
                  rezeptSlug: z.rezept_slug,
                  rezeptStatus: z.rezept_status,
                  entwurf: nichtFreigegeben(z.rezept_status),
                  durchgaenge: anzahl(z.durchgaenge, "–"),
                  aktiv: z.status === "gerechnet" ? minuten(z.aktiv_min) : "–",
                  geraet: z.status === "gerechnet" ? minuten(z.geraet_min, "–") : "–",
                  status: z.status,
                  herleitung: z.herleitung ?? "",
                }))}
              />
            ) : (
              <p className="pl-muted">Keine Komponenten.</p>
            )}
          </Card>

          <div className="pl-grid-2">
            <Card title="Stunden pro Rolle" meta={`${gewaehlt?.bezug ?? "–"} · nur gerechnete Schritte`}>
              {rollen.length ? (
                <DataTable
                  columns={[{ key: "rolle", label: "Rolle" }, { key: "aktiv", label: "aktive Zeit", numeric: true, render: ausRezept("aktiv") }, { key: "komponenten", label: "Komponenten", numeric: true }, { key: "offen", label: "nicht freigegeben", numeric: true }]}
                  rows={rollen.map((r) => ({ id: r.rolle, rolle: r.rolle, aktiv: minuten(r.aktiv_min), komponenten: formatZahl(r.komponenten ?? 0), offen: formatZahl(r.komponenten_nicht_freigegeben ?? 0), entwurf: (r.komponenten_nicht_freigegeben ?? 0) > 0 }))}
                />
              ) : (
                <p className="pl-muted">Noch keine gerechneten Schritte.</p>
              )}
            </Card>
            <Card title="Belegung der Geräte" meta={`${gewaehlt?.bezug ?? "–"} · Durchgänge × Zeit pro Durchgang`}>
              {geraete.length ? (
                <DataTable
                  columns={[{ key: "geraet", label: "Gerät" }, { key: "zeit", label: "belegt", numeric: true, render: ausRezept("zeit") }, { key: "durchgaenge", label: "Durchgänge", numeric: true, render: ausRezept("durchgaenge") }, { key: "offen", label: "nicht freigegeben", numeric: true }]}
                  rows={geraete.map((g) => ({ id: g.geraet_id, geraet: g.geraet, zeit: minuten(g.geraet_min), durchgaenge: formatZahl(g.durchgaenge ?? 0), offen: formatZahl(g.komponenten_nicht_freigegeben ?? 0), entwurf: (g.komponenten_nicht_freigegeben ?? 0) > 0 }))}
                />
              ) : (
                <p className="pl-muted">Noch keine gerechneten Schritte mit Gerät.</p>
              )}
            </Card>
          </div>

          <Card title={`Logistik und Service · ${serviceListe.find((s) => s.value === sId)?.label ?? "–"}`} meta={`${serviceDatum ? `${formatDatum(serviceDatum)} · ` : ""}${proService.text}${entwurfService.text}`}>
            {serviceZeilen.length ? (
              <DataTable
                columns={[
                  { key: "komponente", label: "Komponente", subKey: "kategorie" },
                  { key: "menge", label: "Menge", numeric: true, render: (r) => mengeText(r.mengeZahl as number | null, r.einheit as string | null, r.annahme as boolean | null) },
                  { key: "rezept", label: "Rezept", render: rezeptZelle },
                  { key: "gebinde", label: "Gebinde", numeric: true, render: ausRezept("gebinde") },
                  { key: "gewicht", label: "Gewicht brutto", numeric: true, render: ausRezept("gewicht") },
                  { key: "volumen", label: "Volumen", numeric: true, render: ausRezept("volumen") },
                  { key: "vorort", label: "vor Ort aktiv", numeric: true, render: ausRezept("vorort") },
                  { key: "ausgabe", label: "Ausgabe", numeric: true, render: ausRezept("ausgabe") },
                  { key: "status", label: "Status", render: statusZelle },
                ]}
                rows={serviceZeilen.map((z) => ({
                  id: `${z.komponente_id}-${z.einheit}`,
                  komponente: z.komponente,
                  kategorie: z.herleitung ? `${z.kategorie} · ${z.herleitung}` : z.kategorie,
                  mengeZahl: z.menge,
                  einheit: z.einheit,
                  annahme: z.liter_annahme,
                  rezept: z.rezept,
                  rezeptSlug: z.rezept_slug,
                  rezeptStatus: z.rezept_status,
                  entwurf: nichtFreigegeben(z.rezept_status),
                  gebinde: anzahl(z.gebinde_anzahl, z.rezept ? "[Gebinde]" : "–"),
                  gewicht: z.rezept ? gewichtText(z) : "–",
                  volumen: z.rezept ? volumenText(z) : "–",
                  vorort: z.rezept ? (z.vorort_schritte ? minuten(z.vorort_aktiv_min) : "–") : "–",
                  ausgabe: z.rezept ? minuten(z.ausgabe_min, "[Aufwand]") : "–",
                  status: z.status,
                }))}
              />
            ) : (
              <p className="pl-muted">Keine Komponenten für diesen Service.</p>
            )}
          </Card>

          <p className="pl-small">
            Durchgänge = Menge ÷ Menge pro Durchgang, aufgerundet; ohne Menge pro Durchgang gilt die Ergibt-Menge des Rezepts. Aktiv = Rüstzeit + Durchgänge × aktiv pro Durchgang.
            Gebinde = Menge ÷ Füllmenge, aufgerundet. Ein Schritt ohne Ort zählt zur Zentralküche; «vor Ort» gehört zum Service.
            {literAnnahme ? <> <span className="pl-assumed">Gestrichelte Mengen</span>: Liter als Kilogramm gerechnet (1 l = 1 kg, Annahme).</> : null}
            {mitEntwurf ? <> <span className="pl-assumed">Gestrichelte Zeiten, Durchgänge und Gebinde</span>: aus einem Rezept, das noch nicht freigegeben ist (Entwurf oder geprüft); Summen mit solchen Werten sind ebenfalls gestrichelt.</> : null}
            {" "}[Tara] und [Volumen]: Mass des Gebindes in den Stammdaten erfassen.
          </p>
        </>
      ) : null}
    </>
  );
}
