"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Checkbox, Notice, Select, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import type { Gruppe, Punkt, Rezept, ZutatRoh } from "@/lib/rezepte";
import {
  basisOptionen, neueGruppe, neueZutat, neuerSchritt, rezeptDaten, rezeptFormular,
  type GruppeForm, type RezeptFormular, type SchrittForm, type SchrittRoh, type ZutatForm,
} from "@/lib/rezept-pflege";

type Geraet = { id: string; name: string };
/** Geladener Stand, gebunden an den Slug aus der Adresse ("" = neues Rezept). */
type Geladen = { slug: string } & ({ rezept: Rezept | null; offen: Punkt[]; geraete: Geraet[]; fehler?: undefined } | { fehler: string });

const LEER_UUID = "00000000-0000-0000-0000-000000000000";
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;
const checked = (e: unknown) => (e as { target: HTMLInputElement }).target.checked;
const sr = (text: string) => <span className="pl-sr">{text}</span>;

async function laden(slug: string): Promise<{ rezept: Rezept | null; offen: Punkt[]; geraete: Geraet[]; formular: RezeptFormular }> {
  const ge = await supabase.from("geraet").select("id, name").order("name");
  if (ge.error) throw ge.error;
  if (!slug) return { rezept: null, offen: [], geraete: ge.data, formular: rezeptFormular(null, [], [], []) };

  const r = await supabase
    .from("rezept")
    .select("id, slug, typ, name, untertitel, kategorie, quelle, basis_portionen, portion_g, ergibt_g, status, ergibt_annahme, portionen_annahme, chargengroesse, besonderes, geaendert_am")
    .eq("slug", slug)
    .maybeSingle();
  if (r.error) throw r.error;
  if (!r.data) throw new Error(`Rezept «${slug}» nicht gefunden.`);
  const g = await supabase.from("zutatengruppe").select("id, titel, reihenfolge").eq("rezept_id", r.data.id);
  if (g.error) throw g.error;
  const ids = g.data.length ? g.data.map((x) => x.id) : [LEER_UUID];
  const [z, s, o] = await Promise.all([
    supabase.from("zutat").select("id, gruppe_id, bezeichnung, menge_g, annahme, notiz, ist_basis, reihenfolge").in("gruppe_id", ids),
    supabase.from("schritt").select("id, gruppe_id, text, reihenfolge, geraet_id, temperatur_c, aktiv_min, unbeaufsichtigt_min, haccp, annahme").in("gruppe_id", ids),
    supabase.from("offener_punkt").select("id, text").eq("rezept_id", r.data.id).eq("erledigt", false),
  ]);
  for (const x of [z, s, o]) if (x.error) throw x.error;
  const formular = rezeptFormular(r.data, g.data as Gruppe[], (z.data ?? []) as ZutatRoh[], (s.data ?? []) as SchrittRoh[]);
  return { rezept: r.data, offen: o.data ?? [], geraete: ge.data, formular };
}

function RezeptBearbeiten() {
  const router = useRouter();
  const slug = useSearchParams().get("r") ?? "";
  const [geladen, setGeladen] = useState<Geladen | null>(null);
  const [f, setF] = useState<RezeptFormular | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const zaehler = useRef(0);
  const neuKey = (art: string) => `neu-${art}${++zaehler.current}`;

  useEffect(() => {
    let gilt = true;
    laden(slug).then(
      (d) => {
        if (!gilt) return;
        setGeladen({ slug, rezept: d.rezept, offen: d.offen, geraete: d.geraete });
        setF(d.formular);
        setFehler(null);
      },
      (e: Error) => gilt && setGeladen({ slug, fehler: e.message }),
    );
    return () => {
      gilt = false;
    };
  }, [slug]);

  const stand = geladen?.slug === slug ? geladen : null;
  const zurueck = `/rezepte/${slug ? `?r=${encodeURIComponent(slug)}` : ""}`;
  const titel = slug ? "Rezept bearbeiten" : "Neues Rezept";

  if (!stand || stand.fehler !== undefined || !f) {
    return (
      <>
        <header className="pl-head">
          <div>
            <div className="pl-crumb">Rezepte</div>
            <h1 className="pl-h1">{titel}</h1>
          </div>
          <div className="pl-actions">
            <Button href={zurueck}>Zurück</Button>
          </div>
        </header>
        {stand?.fehler !== undefined ? (
          <Notice role="alert" title="Rezept nicht geladen">{stand.fehler}</Notice>
        ) : (
          <p className="pl-muted" role="status">Rezept wird geladen …</p>
        )}
      </>
    );
  }

  const { rezept, offen, geraete } = stand;
  const gericht = f.typ === "gericht";
  const basis = basisOptionen(f);
  const basisWert = basis.some((b) => b.value === f.basis_zutat) ? f.basis_zutat : "";

  const set = (teil: Partial<RezeptFormular>) => {
    setFehler(null);
    setF((alt) => (alt ? { ...alt, ...teil } : alt));
  };
  const setGruppe = (key: string, fn: (g: GruppeForm) => GruppeForm) => set({ gruppen: f.gruppen.map((g) => (g.key === key ? fn(g) : g)) });
  const setZutat = (gk: string, zk: string, teil: Partial<ZutatForm>) =>
    setGruppe(gk, (g) => ({ ...g, zutaten: g.zutaten.map((z) => (z.key === zk ? { ...z, ...teil } : z)) }));
  const setSchritt = (gk: string, sk: string, teil: Partial<SchrittForm>) =>
    setGruppe(gk, (g) => ({ ...g, schritte: g.schritte.map((s) => (s.key === sk ? { ...s, ...teil } : s)) }));

  async function speichern() {
    if (!f) return;
    const r = rezeptDaten(rezept, { ...f, basis_zutat: basisWert });
    if ("fehler" in r) return setFehler(r.fehler);
    setSpeichert(true);
    setFehler(null);
    const q = await supabase.rpc("rezept_speichern", {
      // Die erzeugten Typen kennen bei Funktionsargumenten kein null; die Datenbank nimmt es an (null = neues Rezept).
      p_rezept: (rezept?.id ?? null) as string,
      p_geaendert_am: (rezept?.geaendert_am ?? null) as string,
      p_daten: r.daten,
    });
    if (q.error) {
      setSpeichert(false);
      return setFehler(q.error.message);
    }
    const neu = (q.data as { slug?: string } | null)?.slug ?? slug;
    router.replace(`/rezepte/?r=${encodeURIComponent(neu)}`);
  }

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Rezepte · {titel}</div>
          <h1 className="pl-h1">{f.name.trim() || "[Name]"}</h1>
          <div className="pl-sub">Mengen gelten für die Basis des Rezepts: Basisportionen beim Gericht, eine Charge bei der Komponente.</div>
        </div>
        <div className="pl-actions">
          <Button href={zurueck}>Abbrechen</Button>
          <Button variant="primary" onClick={speichern} disabled={speichert}>
            {speichert ? "Wird gespeichert …" : "Speichern"}
          </Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Nicht gespeichert">{fehler}</Notice> : null}

      <Card title="Rezept" meta={rezept ? `Status ${rezept.status}` : "wird als Entwurf angelegt"}>
        <div className="pl-stack">
          <div className="pl-grid-2">
            <TextField id="rezept-name" label="Name" required value={f.name} onChange={(e) => set({ name: wert(e) })} hint={rezept ? "Die Adresse des Rezepts (Link) bleibt gleich" : undefined} />
            <TextField id="rezept-untertitel" label="Untertitel" value={f.untertitel} onChange={(e) => set({ untertitel: wert(e) })} placeholder="z.B. Kalbsfleisch, Mascarpone, Peterli" />
          </div>
          <div className="pl-grid-3">
            <Select
              id="rezept-typ"
              label="Typ"
              value={f.typ}
              onChange={(v) => set({ typ: v as RezeptFormular["typ"] })}
              hint="Gericht skaliert nach Portionen, Komponente nach Chargen"
              options={[{ value: "gericht", label: "Gericht" }, { value: "komponente", label: "Komponente" }]}
            />
            <TextField id="rezept-kategorie" label="Kategorie" value={f.kategorie} onChange={(e) => set({ kategorie: wert(e) })} placeholder="z.B. Sauce, Brot, Hauptgang" />
            <TextField id="rezept-quelle" label="Quelle" value={f.quelle} onChange={(e) => set({ quelle: wert(e) })} placeholder="z.B. Eigenes Rezept, Name, Buch oder Link" />
          </div>
          {gericht ? (
            <div className="pl-grid-3">
              <TextField id="rezept-portionen" label="Basisportionen" numeric required value={f.basis_portionen} onChange={(e) => set({ basis_portionen: wert(e) })} hint="Für so viele Portionen gelten die Mengen" />
              <TextField id="rezept-portion" label="Portion in Gramm" numeric value={f.portion_g} onChange={(e) => set({ portion_g: wert(e) })} placeholder="leer = [Portion]" />
              <Checkbox label="Portionen sind eine Annahme" checked={f.portionen_annahme} onChange={(e) => set({ portionen_annahme: checked(e) })} />
            </div>
          ) : (
            <div className="pl-grid-3">
              <TextField id="rezept-ergibt" label="Ergibt pro Charge in Gramm" numeric value={f.ergibt_g} onChange={(e) => set({ ergibt_g: wert(e) })} placeholder="leer = [Menge]" />
              <TextField id="rezept-charge" label="Chargengrösse (Text)" value={f.chargengroesse} onChange={(e) => set({ chargengroesse: wert(e) })} placeholder="z.B. 5 Liter, GN 1/1 × 65 mm" />
              <Checkbox label="Ergibt-Menge ist eine Annahme" checked={f.ergibt_annahme} onChange={(e) => set({ ergibt_annahme: checked(e) })} />
            </div>
          )}
          <Select
            id="rezept-basiszutat"
            label="Basiszutat (100 % für die Skalierung)"
            value={basisWert}
            onChange={(v) => set({ basis_zutat: v })}
            hint="Zur Auswahl stehen Zutaten mit Bezeichnung und Menge in Gramm"
            options={[{ value: "", label: "keine Basiszutat" }, ...basis]}
          />
          <TextField id="rezept-besonderes" label="Besonders zu beachten" multiline rows={4} value={f.besonderes} onChange={(e) => set({ besonderes: wert(e) })} hint="Notizen zum Rezept; eine Zeile pro Hinweis" />
        </div>
      </Card>

      {f.gruppen.map((g, gi) => {
        const name = g.titel.trim() || `Gruppe ${gi + 1}`;
        return (
          <Card
            key={g.key}
            title={`Zutaten und Zubereitung · ${name}`}
            meta="Menge in Gramm; leer = Menge fehlt"
            actions={
              <Button ariaLabel={`Gruppe ${name} entfernen`} onClick={() => set({ gruppen: f.gruppen.filter((x) => x.key !== g.key) })}>
                Gruppe entfernen
              </Button>
            }
          >
            <div className="pl-stack">
              <TextField id={`g-${g.key}`} label="Titel der Gruppe" value={g.titel} onChange={(e) => setGruppe(g.key, (x) => ({ ...x, titel: wert(e) }))} placeholder="z.B. Vorteig, Füllung; leer = ohne Titel" />

              {g.zutaten.length ? (
                g.zutaten.map((z, zi) => {
                  const wer = z.bezeichnung.trim() || `Zutat ${zi + 1}`;
                  return (
                    <div className="pl-grid-4" key={z.key} role="group" aria-label={`Zutat ${zi + 1}`}>
                      <TextField id={`z-${z.key}-b`} label={`Zutat ${zi + 1}`} value={z.bezeichnung} onChange={(e) => setZutat(g.key, z.key, { bezeichnung: wert(e) })} />
                      <TextField id={`z-${z.key}-m`} label="Menge g" numeric value={z.menge} onChange={(e) => setZutat(g.key, z.key, { menge: wert(e) })} />
                      <TextField id={`z-${z.key}-n`} label="Notiz (Originalangabe)" value={z.notiz} onChange={(e) => setZutat(g.key, z.key, { notiz: wert(e) })} />
                      <div className="pl-actions">
                        <Checkbox label={<>Annahme{sr(`, Menge von ${wer}`)}</>} checked={z.annahme} onChange={(e) => setZutat(g.key, z.key, { annahme: checked(e) })} />
                        <Button ariaLabel={`${wer} entfernen`} onClick={() => setGruppe(g.key, (x) => ({ ...x, zutaten: x.zutaten.filter((y) => y.key !== z.key) }))}>
                          Entfernen
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="pl-muted">Noch keine Zutaten in dieser Gruppe.</p>
              )}
              <div>
                <Button variant="dashed" onClick={() => setGruppe(g.key, (x) => ({ ...x, zutaten: [...x.zutaten, neueZutat(neuKey("z"))] }))}>+ Zutat</Button>
              </div>

              {g.schritte.map((s, si) => (
                <div className="pl-stack" key={s.key} role="group" aria-label={`Schritt ${si + 1}`}>
                    <TextField id={`s-${s.key}-t`} label={`Schritt ${si + 1}`} multiline rows={3} value={s.text} onChange={(e) => setSchritt(g.key, s.key, { text: wert(e) })} />
                    <div className="pl-grid-4">
                      <Select
                        id={`s-${s.key}-g`}
                        label="Gerät"
                        value={s.geraet_id}
                        onChange={(v) => setSchritt(g.key, s.key, { geraet_id: v })}
                        options={[{ value: "", label: "kein Gerät" }, ...geraete.map((x) => ({ value: x.id, label: x.name }))]}
                      />
                      <TextField id={`s-${s.key}-c`} label="Temperatur °C" numeric value={s.temperatur} onChange={(e) => setSchritt(g.key, s.key, { temperatur: wert(e) })} />
                      <TextField id={`s-${s.key}-a`} label="aktiv min" numeric value={s.aktiv} onChange={(e) => setSchritt(g.key, s.key, { aktiv: wert(e) })} />
                      <TextField id={`s-${s.key}-u`} label="unbeaufsichtigt min" numeric value={s.unbeaufsichtigt} onChange={(e) => setSchritt(g.key, s.key, { unbeaufsichtigt: wert(e) })} />
                    </div>
                    <div className="pl-grid-3">
                      <TextField id={`s-${s.key}-h`} label="HACCP" value={s.haccp} onChange={(e) => setSchritt(g.key, s.key, { haccp: wert(e) })} placeholder="z.B. Kern 72 °C" />
                      <Checkbox label="Schritt ist eine Annahme" checked={s.annahme} onChange={(e) => setSchritt(g.key, s.key, { annahme: checked(e) })} />
                      <div>
                        <Button ariaLabel={`Schritt ${si + 1} entfernen`} onClick={() => setGruppe(g.key, (x) => ({ ...x, schritte: x.schritte.filter((y) => y.key !== s.key) }))}>
                          Schritt entfernen
                        </Button>
                      </div>
                    </div>
                </div>
              ))}
              <div>
                <Button variant="dashed" onClick={() => setGruppe(g.key, (x) => ({ ...x, schritte: [...x.schritte, neuerSchritt(neuKey("s"))] }))}>+ Schritt</Button>
              </div>
            </div>
          </Card>
        );
      })}

      <div>
        <Button variant="dashed" onClick={() => set({ gruppen: [...f.gruppen, neueGruppe(neuKey("g"))] })}>+ Gruppe</Button>
      </div>

      {offen.length ? (
        <Card title={`Offene Punkte · ${offen.length}`} meta="Angekreuzte Punkte gelten nach dem Speichern als erledigt">
          <div className="pl-stack">
            {offen.map((p) => (
              <Checkbox
                key={p.id}
                label={p.text}
                checked={f.erledigt.includes(p.id)}
                onChange={(e) => set({ erledigt: checked(e) ? [...f.erledigt, p.id] : f.erledigt.filter((x) => x !== p.id) })}
              />
            ))}
          </div>
        </Card>
      ) : null}

      {/* Dieselbe Meldung nochmals beim unteren Knopf; ohne role, damit sie nicht doppelt vorgelesen wird. */}
      {fehler ? <Notice title="Nicht gespeichert">{fehler}</Notice> : null}

      <div className="pl-actions">
        <Button href={zurueck}>Abbrechen</Button>
        <Button variant="primary" onClick={speichern} disabled={speichert}>
          {speichert ? "Wird gespeichert …" : "Speichern"}
        </Button>
      </div>
    </>
  );
}

export default function Seite() {
  return (
    <Suspense>
      <RezeptBearbeiten />
    </Suspense>
  );
}
