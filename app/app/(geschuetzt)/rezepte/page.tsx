"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Chip, DataTable, ItemList, Notice, RecipeGroups, SegmentedControl, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatGramm, formatMinuten, formatZahl } from "@/lib/format";
import {
  basisZutat, besonderesZeilen, ergibtText, geraete, gruppenAnzeige, istGericht, listenSub, voreinstellungen, wertAusEingabe,
  type Faktor, type Gruppe, type KomponenteSkaliert, type Punkt, type Rezept, type Schritt, type Zutat,
} from "@/lib/rezepte";

type Zeit = { aktiv_min: number | null; unbeaufsichtigt_min: number | null };
type Details = { gruppen: Gruppe[]; schritte: Schritt[]; zeit: Zeit | null; offen: Punkt[] };
type Skaliert = { faktor: Faktor | null; zutaten: Zutat[]; komponenten: KomponenteSkaliert[]; zeiten: Map<string, Zeit> };
/** Ergebnis eines Ladevorgangs, gebunden an seinen Schlüssel (Rezept bzw. Rezept + Wert). */
type Geladen<T> = { schluessel: string } & ({ daten: T; fehler?: undefined } | { daten?: undefined; fehler: string });

const LEER_UUID = "00000000-0000-0000-0000-000000000000";

async function rezepteLaden(): Promise<Rezept[]> {
  const r = await supabase
    .from("rezept")
    .select("id, slug, typ, name, untertitel, kategorie, quelle, basis_portionen, portion_g, ergibt_g, status, ergibt_annahme, portionen_annahme, chargengroesse, besonderes, geaendert_am")
    .order("name");
  if (r.error) throw r.error;
  return r.data;
}

async function detailsLaden(id: string): Promise<Details> {
  const g = await supabase.from("zutatengruppe").select("id, titel, reihenfolge").eq("rezept_id", id);
  if (g.error) throw g.error;
  const ids = g.data.map((x) => x.id);
  const [s, z, o] = await Promise.all([
    supabase
      .from("schritt")
      .select("id, gruppe_id, text, reihenfolge, temperatur_c, aktiv_min, unbeaufsichtigt_min, haccp, annahme, geraet(name)")
      .in("gruppe_id", ids.length ? ids : [LEER_UUID]),
    supabase.from("rezept_zeit").select("aktiv_min, unbeaufsichtigt_min").eq("rezept_id", id).maybeSingle(),
    supabase.from("offener_punkt").select("id, text").eq("rezept_id", id).eq("erledigt", false),
  ]);
  for (const x of [s, z, o]) if (x.error) throw x.error;
  return { gruppen: g.data, schritte: (s.data ?? []) as unknown as Schritt[], zeit: z.data, offen: o.data ?? [] };
}

async function skalieren(r: Rezept, wert: number): Promise<Skaliert> {
  const [f, z, k] = await Promise.all([
    supabase.rpc("rezept_faktor", { p_rezept: r.id, p_wert: wert }),
    supabase.rpc("rezept_zutaten_skaliert", { p_rezept: r.id, p_wert: wert }),
    istGericht(r) ? supabase.rpc("rezept_komponenten_skaliert", { p_rezept: r.id, p_wert: wert }) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const x of [f, z, k]) if (x.error) throw x.error;
  const komponenten = (k.data ?? []) as KomponenteSkaliert[];
  const zeiten = new Map<string, Zeit>();
  if (komponenten.length) {
    const t = await supabase.from("rezept_zeit").select("rezept_id, aktiv_min, unbeaufsichtigt_min").in("rezept_id", komponenten.map((x) => x.komponente_id));
    if (t.error) throw t.error;
    for (const x of t.data) if (x.rezept_id) zeiten.set(x.rezept_id, x);
  }
  return { faktor: f.data?.[0] ?? null, zutaten: z.data ?? [], komponenten, zeiten };
}

function Rezeptbibliothek() {
  const router = useRouter();
  const slug = useSearchParams().get("r");
  const [rezepte, setRezepte] = useState<Rezept[] | null>(null);
  const [listenFehler, setListenFehler] = useState<string | null>(null);
  // Skalierung pro Rezept: gehört der Stand nicht zum gewählten Rezept, gilt die erste Voreinstellung.
  const [wahl, setWahl] = useState<{ rezeptId: string; wert: number | null; eingabe: string } | null>(null);
  const [details, setDetails] = useState<Geladen<Details> | null>(null);
  const [skaliert, setSkaliert] = useState<Geladen<Skaliert> | null>(null);

  useEffect(() => {
    rezepteLaden().then(setRezepte, (e: Error) => setListenFehler(e.message));
  }, []);

  const rezept = useMemo(() => rezepte?.find((r) => r.slug === slug) ?? rezepte?.[0] ?? null, [rezepte, slug]);
  const presets = useMemo(() => (rezept ? voreinstellungen(rezept) : []), [rezept]);
  const aktuell = wahl && rezept && wahl.rezeptId === rezept.id ? wahl : { rezeptId: rezept?.id ?? "", wert: presets[0]?.wert ?? null, eingabe: "" };
  const wert = aktuell.wert;
  // Schlüssel mit dem Stand des Rezepts: nach dem Speichern gelten alte Details und Mengen nicht mehr.
  const standSchluessel = rezept ? `${rezept.id}|${rezept.geaendert_am}` : null;
  const skalSchluessel = standSchluessel && wert !== null ? `${standSchluessel}|${wert}` : null;

  useEffect(() => {
    if (!rezept || !standSchluessel) return;
    let gilt = true;
    detailsLaden(rezept.id).then(
      (daten) => gilt && setDetails({ schluessel: standSchluessel, daten }),
      (e: Error) => gilt && setDetails({ schluessel: standSchluessel, fehler: e.message }),
    );
    return () => {
      gilt = false;
    };
  }, [rezept, standSchluessel]);

  useEffect(() => {
    if (!rezept || wert === null || !skalSchluessel) return;
    let gilt = true;
    skalieren(rezept, wert).then(
      (daten) => gilt && setSkaliert({ schluessel: skalSchluessel, daten }),
      (e: Error) => gilt && setSkaliert({ schluessel: skalSchluessel, fehler: e.message }),
    );
    return () => {
      gilt = false;
    };
  }, [rezept, wert, skalSchluessel]);

  // Nur was zum aktuellen Rezept und Wert gehört, wird gezeigt; alles andere gilt als «lädt».
  const d = details?.schluessel === standSchluessel ? details : null;
  const s = skaliert?.schluessel === skalSchluessel ? skaliert : null;
  const fehler = listenFehler ?? d?.fehler ?? s?.fehler ?? null;
  const laedt = (x: unknown) => (x ? null : fehler ? "Keine Daten, siehe Hinweis oben." : "…");

  const waehlen = (neu: string) => router.replace(`/rezepte/?r=${encodeURIComponent(neu)}`);
  const besonderes = besonderesZeilen(rezept?.besonderes ?? null);
  const setze = (teil: Partial<{ wert: number | null; eingabe: string }>) => rezept && setWahl({ ...aktuell, ...teil, rezeptId: rezept.id });
  const gericht = rezept ? istGericht(rezept) : false;
  const eingabeWert = aktuell.eingabe ? wertAusEingabe(aktuell.eingabe, gericht) : null;
  const eingabeUngueltig = !!aktuell.eingabe && eingabeWert === null;
  const presetWert = presets.some((p) => p.wert === wert) ? String(wert) : "";

  const gruppen = d?.daten && s?.daten ? gruppenAnzeige(d.daten.gruppen, s.daten.zutaten, d.daten.schritte, s.daten.faktor?.faktor ?? null) : [];
  const ergibt = rezept && s?.daten ? ergibtText(rezept, s.daten.faktor) : null;
  const slugVon = new Map((rezepte ?? []).map((r) => [r.id, r.slug]));

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Rezepte · {rezepte ? `${rezepte.length} Rezepte` : "…"}</div>
          <h1 className="pl-h1">{rezept?.name ?? "Rezeptbibliothek"}</h1>
          {rezept?.untertitel ? <div className="pl-sub">{rezept.untertitel}</div> : null}
        </div>
        {rezept && presets.length ? (
          <div className="pl-actions">
            <div>
              <div className="pl-label">{gericht ? "Portionen" : "Chargen"}</div>
              <SegmentedControl
                label={gericht ? "Portionen" : "Chargen"}
                value={presetWert}
                onChange={(v) => setze({ wert: Number(v), eingabe: "" })}
                options={presets.map((p) => ({ value: String(p.wert), label: p.label }))}
              />
            </div>
            <form
              className="pl-actions"
              onSubmit={(e) => {
                e.preventDefault();
                if (eingabeWert !== null) setze({ wert: eingabeWert });
              }}
            >
              <TextField
                id="skalierung"
                numeric
                label={gericht ? "andere Anzahl Portionen" : "andere Anzahl Chargen"}
                value={aktuell.eingabe}
                invalid={eingabeUngueltig}
                onChange={(e) => setze({ eingabe: (e as { target: HTMLInputElement }).target.value })}
                hint={eingabeUngueltig ? (gericht ? "Bitte eine ganze Zahl ab 1 eingeben." : "Bitte eine Zahl ab 0.01 eingeben, z.B. 1.5.") : undefined}
              />
              <Button type="submit" disabled={eingabeWert === null}>Skalieren</Button>
            </form>
          </div>
        ) : null}
      </header>

      {fehler ? <Notice role="alert" title="Rezept nicht geladen">{fehler}</Notice> : null}

      <div className="pl-row">
        <div className="pl-col-side">
          <div>
            <Button variant="dashed" href="/rezepte/bearbeiten/">+ Rezept</Button>
          </div>
          {rezepte ? (
            <ItemList
              label="Rezepte"
              value={rezept?.slug ?? undefined}
              onSelect={waehlen}
              groups={(["gericht", "komponente"] as const).map((typ) => ({
                title: typ === "gericht" ? "Gerichte" : "Komponenten",
                items: rezepte.filter((r) => r.typ === typ).map((r) => ({ id: r.slug, label: r.name, sub: listenSub(r) })),
              }))}
            />
          ) : (
            <p className="pl-muted" role="status">{listenFehler ? "Keine Daten." : "Rezepte werden geladen …"}</p>
          )}
        </div>

        <div className="pl-col-main">
          {rezept ? (
            <Card
              title={[gericht ? "Gericht" : "Komponente", rezept.kategorie].filter(Boolean).join(" · ")}
              meta={`Status ${rezept.status ?? "[Status]"}`}
              actions={<Button href={`/rezepte/bearbeiten/?r=${encodeURIComponent(rezept.slug)}`}>Bearbeiten</Button>}
            >
              <div className="pl-grid-3">
                <div>
                  <div className="pl-label">Ergibt</div>
                  <div className={ergibt?.annahme ? "pl-assumed" : undefined}>{ergibt?.text ?? laedt(ergibt)}</div>
                  <div className="pl-small">{ergibt?.sub}</div>
                  {!gericht && rezept.chargengroesse ? <div className="pl-small">Chargengrösse: {rezept.chargengroesse}</div> : null}
                </div>
                <div>
                  <div className="pl-label">Benötigte Zeit (Basismenge)</div>
                  <div>aktiv {d?.daten ? formatMinuten(d.daten.zeit?.aktiv_min ?? null) : laedt(null)}</div>
                  <div className="pl-small">
                    unbeaufsichtigt {d?.daten ? formatMinuten(d.daten.zeit?.unbeaufsichtigt_min ?? null) : "…"}; Zeiten werden nicht skaliert
                  </div>
                </div>
                <div>
                  <div className="pl-label">{gericht ? "Herstellkosten pro Portion" : "Herstellkosten"}</div>
                  <div className="pl-mono">[Preis]</div>
                  <div className="pl-small">Zutaten noch nicht mit dem Artikelstamm verknüpft, Lohnsätze fehlen</div>
                </div>
                <div>
                  <div className="pl-label">Geräte</div>
                  <div>{d?.daten ? geraete(d.daten.schritte).join(", ") || "[Geräte]" : laedt(null)}</div>
                </div>
                <div>
                  <div className="pl-label">Allergene</div>
                  <div>[Allergene]</div>
                  <div className="pl-small">kommen aus dem Artikelstamm, sobald verknüpft</div>
                </div>
                <div>
                  <div className="pl-label">Quelle</div>
                  <div>{rezept.quelle ?? "[Quelle]"}</div>
                </div>
              </div>
            </Card>
          ) : null}

          {rezept && gericht && s?.daten?.komponenten.length ? (
            <Card title="Komponenten" meta="Menge für die gewählten Portionen; Zeiten je Charge">
              <DataTable
                columns={[
                  {
                    key: "name",
                    label: "Komponente",
                    render: (r) => (
                      <Button ariaLabel={`Rezept ${r.name as string} öffnen`} onClick={() => waehlen(r.slug as string)}>
                        {r.name as string}
                      </Button>
                    ),
                  },
                  { key: "pro", label: "Menge / Portion", numeric: true, render: (r) => formatGramm(r.menge_pro_portion_g as number) },
                  { key: "gesamt", label: "Menge gesamt", numeric: true, render: (r) => formatGramm(r.menge_g as number) },
                  {
                    key: "chargen",
                    label: "Chargen",
                    numeric: true,
                    render: (r) => (
                      <span className={r.annahme ? "pl-assumed" : undefined}>
                        {r.chargen === null ? "[Chargen]" : formatZahl(r.chargen as number, 2)}
                        {r.annahme ? <span className="pl-sr"> (Annahme)</span> : null}
                      </span>
                    ),
                  },
                  { key: "aktiv", label: "aktiv", numeric: true },
                  { key: "unbeaufsichtigt", label: "unbeaufsichtigt", numeric: true },
                  { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                ]}
                rows={s.daten.komponenten.map((k) => {
                  const t = s.daten!.zeiten.get(k.komponente_id);
                  return {
                    id: k.komponente_id,
                    name: k.name,
                    slug: slugVon.get(k.komponente_id) ?? "",
                    menge_pro_portion_g: k.menge_pro_portion_g,
                    menge_g: k.menge_g,
                    chargen: k.chargen,
                    annahme: k.ergibt_annahme,
                    aktiv: formatMinuten(t?.aktiv_min ?? null),
                    unbeaufsichtigt: formatMinuten(t?.unbeaufsichtigt_min ?? null),
                    herleitung: k.herleitung + (k.ergibt_annahme ? " (Chargenmenge angenommen)" : ""),
                  };
                })}
              />
            </Card>
          ) : null}

          {rezept ? (
            <Card
              title="Zutaten und Zubereitung"
              meta={
                <>
                  Basis 100 % = {s?.daten ? basisZutat(s.daten.zutaten) : "…"} · <span className="pl-assumed">gestrichelt</span> = Annahme, bitte prüfen
                </>
              }
            >
              {d?.daten && s?.daten ? (
                <RecipeGroups
                  groups={gruppen.map((g) => ({
                    id: g.id,
                    title: g.titel ?? undefined,
                    ingredients: g.zutaten.map((z) => ({ id: z.id, name: z.name, amount: z.menge, pct: z.prozent, note: z.notiz || undefined, base: z.basis, assumed: z.annahme })),
                    steps: g.schritte.map((st) => ({
                      id: st.id,
                      text: st.text,
                      assumed: st.annahme,
                      chips: st.chips.map((c, i) => (
                        <Chip key={i} kind={c.kind}>
                          {c.text}
                        </Chip>
                      )),
                    })),
                  }))}
                />
              ) : fehler ? (
                <p className="pl-muted">Keine Daten, siehe Hinweis oben.</p>
              ) : (
                <p className="pl-muted" role="status">Rezept wird geladen …</p>
              )}
            </Card>
          ) : null}

          {besonderes.length ? <Notice title="Besonders zu beachten" items={besonderes} /> : null}

          {d?.daten?.offen.length ? <Notice title={`Offene Punkte · ${d.daten.offen.length}`} items={d.daten.offen.map((p) => p.text)} /> : null}
        </div>
      </div>
    </>
  );
}

export default function Rezepte() {
  return (
    <Suspense>
      <Rezeptbibliothek />
    </Suspense>
  );
}
