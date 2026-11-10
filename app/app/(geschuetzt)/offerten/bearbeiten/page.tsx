"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, DataTable, Dialog, ItemList, KpiTile, Notice, Select, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import {
  anteilAus, anteilText, fehlerText, formatChf, kopfAus, kopfUpdate, nachGang,
  type Kopf, type Offerte, type Position, type Summe,
} from "@/lib/offerte";

type Stamm = {
  angebotsformen: { code: string; name: string }[];
  betriebe: { code: string; name: string; faktor_vk: number }[];
  mengentypen: string[];
  gerichte: { id: string; name: string; gang: string | null; kategorie: string }[];
};
type Rechnung = { positionen: Position[]; summe: Summe | null };
type Hinweis = { titel: string; text: string };
type AnteilBearbeitung = { position: Position; text: string; fehler: string | null };

const SPALTEN_OFFERTE = "id, nummer, name, kunde, datum, ort, gaeste, angebotsform, betrieb, bemerkung, status";
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

async function stammLaden(): Promise<Stamm> {
  const [a, b, m, g] = await Promise.all([
    supabase.from("angebotsform").select("code, name").order("reihenfolge"),
    supabase.from("betrieb").select("code, name, faktor_vk").order("name"),
    supabase.from("mengentyp").select("code").order("reihenfolge"),
    supabase.from("gericht_katalog").select("id, name, gang, kategorie").order("name"),
  ]);
  for (const x of [a, b, m, g]) if (x.error) throw x.error;
  return { angebotsformen: a.data ?? [], betriebe: b.data ?? [], mengentypen: (m.data ?? []).map((x) => x.code), gerichte: g.data ?? [] };
}

async function offerteLaden(id: string): Promise<Offerte | null> {
  const r = await supabase.from("anlass").select(SPALTEN_OFFERTE).eq("id", id).maybeSingle();
  if (r.error) throw r.error;
  return r.data;
}

async function rechnungLaden(id: string): Promise<Rechnung> {
  const [p, s] = await Promise.all([
    supabase.from("offerte_position").select("*").eq("anlass_id", id),
    supabase.from("offerte_summe").select("*").eq("anlass_id", id).maybeSingle(),
  ]);
  if (p.error) throw p.error;
  if (s.error) throw s.error;
  return { positionen: p.data ?? [], summe: s.data };
}

function Bearbeiten() {
  const id = useSearchParams().get("id") ?? "";
  const [stamm, setStamm] = useState<Stamm | null>(null);
  const [offerte, setOfferte] = useState<Offerte | null | undefined>(undefined);
  const [kopf, setKopf] = useState<Kopf | null>(null);
  const [rechnung, setRechnung] = useState<Rechnung | null>(null);
  const [hinweis, setHinweis] = useState<Hinweis | null>(null);
  const [meldung, setMeldung] = useState("");
  const [speichert, setSpeichert] = useState(false);
  const [inArbeit, setInArbeit] = useState<Set<string>>(new Set());
  const [gangFilter, setGangFilter] = useState("");
  const [suche, setSuche] = useState("");
  const [anteil, setAnteil] = useState<AnteilBearbeitung | null>(null);
  const [anteilOffen, setAnteilOffen] = useState(false);
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const anfrage = useRef(0);

  // Nur die jüngste Neuberechnung zählt; ältere Antworten kommen zu spät und werden verworfen.
  const neuRechnen = useCallback(() => {
    const nr = ++anfrage.current;
    return rechnungLaden(id).then(
      (r) => {
        if (nr === anfrage.current) setRechnung(r);
      },
      (e: Error) => {
        if (nr === anfrage.current) setHinweis({ titel: "Preise nicht neu gerechnet", text: e.message });
      },
    );
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const ladeFehler = (e: Error) => setHinweis({ titel: "Offerte nicht geladen", text: e.message });
    stammLaden().then(setStamm, ladeFehler);
    offerteLaden(id).then((o) => {
      setOfferte(o);
      if (o) setKopf(kopfAus(o));
    }, ladeFehler);
    neuRechnen();
  }, [id, neuRechnen]);

  const gaenge = useMemo(() => [...new Set((stamm?.gerichte ?? []).map((g) => g.gang).filter((g): g is string => !!g))], [stamm]);
  const vorhanden = useMemo(() => new Set((rechnung?.positionen ?? []).map((p) => p.gericht_id)), [rechnung]);
  const auswahl = useMemo(() => {
    const s = suche.trim().toLocaleLowerCase("de-CH");
    return (stamm?.gerichte ?? []).filter(
      (g) => !vorhanden.has(g.id) && !inArbeit.has(g.id) && (!gangFilter || g.gang === gangFilter) && (!s || g.name.toLocaleLowerCase("de-CH").includes(s)),
    );
  }, [stamm, vorhanden, inArbeit, gangFilter, suche]);
  const gruppen = useMemo(() => nachGang(rechnung?.positionen ?? [], stamm?.mengentypen ?? []), [rechnung, stamm]);

  if (!id) return <Notice title="Keine Offerte gewählt">Bitte eine Offerte aus der Liste öffnen.</Notice>;
  if (offerte === null) return <Notice title="Offerte nicht gefunden">Die Offerte gibt es nicht oder sie wurde gelöscht.</Notice>;

  // Nach Hinzufügen oder Entfernen verschwindet der geklickte Button; Fokus auf die Meldung.
  const melden = (text: string) => {
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };

  async function kopfSpeichern() {
    if (!kopf) return;
    const r = kopfUpdate(kopf);
    if ("fehler" in r) return setHinweis({ titel: "Nicht gespeichert", text: r.fehler });
    setSpeichert(true);
    setHinweis(null);
    const u = await supabase.from("anlass").update(r.update).eq("id", id).select(SPALTEN_OFFERTE).single();
    setSpeichert(false);
    if (u.error) return setHinweis({ titel: "Nicht gespeichert", text: fehlerText(u.error) });
    setOfferte(u.data);
    setKopf(kopfAus(u.data));
    setMeldung("Kopfdaten gespeichert, Preise neu gerechnet.");
    neuRechnen();
  }

  async function hinzufuegen(gerichtId: string) {
    if (inArbeit.has(gerichtId) || vorhanden.has(gerichtId)) return;
    setInArbeit((s) => new Set(s).add(gerichtId));
    setHinweis(null);
    const reihenfolge = Math.max(0, ...(rechnung?.positionen ?? []).map((p) => p.reihenfolge ?? 0)) + inArbeit.size + 1;
    const r = await supabase.from("offerte_gericht").insert({ anlass_id: id, gericht_id: gerichtId, reihenfolge });
    await neuRechnen();
    setInArbeit((s) => {
      const n = new Set(s);
      n.delete(gerichtId);
      return n;
    });
    if (r.error) return setHinweis({ titel: "Gericht nicht hinzugefügt", text: fehlerText(r.error) });
    melden(`${stamm?.gerichte.find((g) => g.id === gerichtId)?.name ?? "Gericht"} hinzugefügt.`);
  }

  async function entfernen(p: Position) {
    setHinweis(null);
    const r = await supabase.from("offerte_gericht").delete().eq("anlass_id", id).eq("gericht_id", p.gericht_id!);
    if (r.error) return setHinweis({ titel: "Gericht nicht entfernt", text: fehlerText(r.error) });
    await neuRechnen();
    melden(`${p.bezeichnung} entfernt.`);
  }

  async function anteilSpeichern() {
    if (!anteil) return;
    const a = anteilAus(anteil.text);
    if (a === undefined) return;
    const r = await supabase.from("offerte_gericht").update({ anteil: a }).eq("anlass_id", id).eq("gericht_id", anteil.position.gericht_id!);
    // Fehler im Dialog zeigen: die Seite dahinter ist während des Dialogs nicht erreichbar.
    if (r.error) return setAnteil({ ...anteil, fehler: fehlerText(r.error) });
    setMeldung(`Anteil ${anteil.position.bezeichnung}: ${a === null ? "Rest gleich verteilt" : `${anteilText(a)} %`}.`);
    setAnteilOffen(false);
    neuRechnen();
  }

  const s = rechnung?.summe ?? null;
  const setK = (teil: Partial<Kopf>) => setKopf((k) => (k ? { ...k, ...teil } : k));
  const anteilEingabe = anteil ? anteilAus(anteil.text) : null;
  const rundung = s?.rundung != null ? formatZahl(s.rundung, 2) : "[Rundung]";

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            <a href="/offerten/">Offerten</a> · {offerte?.nummer ?? "…"}
          </div>
          <h1 className="pl-h1">{offerte?.name ?? "Offerte"}</h1>
        </div>
        <div className="pl-actions">
          <Button href={`/offerten/druck/?id=${id}`}>Offerte als PDF</Button>
        </div>
      </header>

      {hinweis ? <Notice role="alert" title={hinweis.titel}>{hinweis.text}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      <div className="pl-grid-3">
        <KpiTile
          tone="panel"
          label="Preis pro Gast exkl. MWST"
          value={s?.preis_pro_gast_chf == null ? "[Preis]" : <span className="pl-assumed">{formatChf(s.preis_pro_gast_chf)}</span>}
          detail={s?.vk_pro_gast_chf != null ? `${formatChf(s.vk_pro_gast_chf)} gerundet auf ${rundung} (Annahme)` : undefined}
        />
        <KpiTile label="Total inkl. MWST" value={formatChf(s?.total_brutto_chf ?? null)} detail={s?.gaeste != null ? `${formatZahl(s.gaeste)} Gäste` : "[Gäste]"} />
        <KpiTile
          label="Deckungsbeitrag"
          value={s?.deckungsbeitrag_pct == null ? "[Preis]" : `${formatZahl(s.deckungsbeitrag_pct, 1)} %`}
          detail={s?.deckungsbeitrag_chf == null ? "Total exkl. MWST − Warenkosten" : `${formatChf(s.deckungsbeitrag_chf)} = Total exkl. MWST − Warenkosten`}
        />
      </div>

      <div className="pl-row">
        <div className="pl-col-main">
          <Card title="Anlass und Kunde">
            {kopf && stamm ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  kopfSpeichern();
                }}
              >
                <div className="pl-grid-3">
                  <TextField id="kunde" label="Kunde" value={kopf.kunde} onChange={(e) => setK({ kunde: wert(e) })} placeholder="[Kunde]" />
                  <TextField id="name" label="Anlass" value={kopf.name} onChange={(e) => setK({ name: wert(e) })} required />
                  <TextField id="datum" type="date" label="Datum" value={kopf.datum} onChange={(e) => setK({ datum: wert(e) })} />
                  <TextField id="ort" label="Ort" value={kopf.ort} onChange={(e) => setK({ ort: wert(e) })} placeholder="[Ort]" />
                  <TextField id="gaeste" label="Gäste" numeric value={kopf.gaeste} onChange={(e) => setK({ gaeste: wert(e) })} placeholder="[Gäste]" />
                  <Select
                    id="angebotsform"
                    label="Angebotsform"
                    value={kopf.angebotsform}
                    onChange={(v) => setK({ angebotsform: v })}
                    options={[{ value: "", label: "[Angebotsform wählen]" }, ...stamm.angebotsformen.map((a) => ({ value: a.code, label: a.name }))]}
                  />
                  <Select
                    id="betrieb"
                    label="Betrieb (Faktor)"
                    value={kopf.betrieb}
                    onChange={(v) => setK({ betrieb: v })}
                    options={[{ value: "", label: "[Betrieb wählen]" }, ...stamm.betriebe.map((b) => ({ value: b.code, label: `${b.name} (Faktor ${formatZahl(b.faktor_vk, 1)})` }))]}
                  />
                  <TextField id="bemerkung" label="Interne Bemerkung" value={kopf.bemerkung} onChange={(e) => setK({ bemerkung: wert(e) })} hint="erscheint nicht in der Offerte für den Kunden" />
                </div>
                <div className="pl-actions">
                  <Button type="submit" variant="primary" disabled={speichert}>
                    {speichert ? "Wird gespeichert …" : "Kopfdaten speichern"}
                  </Button>
                </div>
              </form>
            ) : (
              <p className="pl-muted" role="status">{hinweis ? "Keine Daten." : "Offerte wird geladen …"}</p>
            )}
          </Card>

          <Card title="Gerichte pro Gang" meta="Menge aus dem Quantum der Angebotsform; Gerichte ohne eigenen Anteil teilen sich den Rest des Mengentyps">
            {rechnung ? (
              gruppen.length ? (
                gruppen.map((g) => (
                  <div key={g.gang}>
                    <div className="pl-eyebrow">{g.gang}</div>
                    <DataTable
                      columns={[
                        { key: "bezeichnung", label: "Gericht", subKey: "herleitung" },
                        { key: "menge", label: "Menge pro Gast", numeric: true },
                        { key: "anteilText", label: "Anteil", numeric: true },
                        {
                          key: "wk",
                          label: "Warenkosten pro Gast",
                          numeric: true,
                          render: (r) => (
                            <span className={r.annahme ? "pl-assumed" : undefined}>
                              {r.wk as string}
                              {r.annahme ? <span className="pl-sr"> (Schätzung)</span> : null}
                            </span>
                          ),
                        },
                        { key: "vk", label: "Preis pro Gast", numeric: true },
                        {
                          key: "aktion",
                          label: <span className="pl-sr">Aktionen</span>,
                          render: (r) => (
                            <span className="pl-actions">
                              <Button
                                ariaLabel={`Anteil ${r.bezeichnung as string} ändern`}
                                onClick={() => {
                                  const p = r.position as Position;
                                  setAnteil({ position: p, text: anteilText(p.anteil), fehler: null });
                                  setAnteilOffen(true);
                                }}
                              >
                                Anteil
                              </Button>
                              <Button ariaLabel={`${r.bezeichnung as string} entfernen`} onClick={() => entfernen(r.position as Position)}>
                                Entfernen
                              </Button>
                            </span>
                          ),
                        },
                      ]}
                      rows={g.positionen.map((p) => ({
                        id: p.gericht_id,
                        position: p,
                        bezeichnung: p.bezeichnung ?? "[Gericht]",
                        herleitung: p.herleitung,
                        menge: p.menge_pro_gast === null ? "[Menge]" : `${formatZahl(p.menge_pro_gast, Number.isInteger(p.menge_pro_gast) ? 0 : 1)} ${p.einheit ?? ""}`,
                        anteilText:
                          p.anteil_wirksam === null
                            ? "[Anteil]"
                            : `${formatZahl(p.anteil_wirksam * 100, Number.isInteger(p.anteil_wirksam * 100) ? 0 : 2)} %${p.anteil === null ? " (Rest)" : ""}`,
                        wk: formatChf(p.wk_pro_gast_chf),
                        annahme: p.wk_annahme,
                        vk: formatChf(p.vk_pro_gast_chf),
                      }))}
                    />
                  </div>
                ))
              ) : (
                <p className="pl-muted">Noch keine Gerichte. Unten aus dem Katalog hinzufügen.</p>
              )
            ) : (
              <p className="pl-muted" role="status">{hinweis ? "Keine Daten." : "Gerichte werden geladen …"}</p>
            )}
            <p className="pl-small">
              <span className="pl-assumed">gestrichelt</span> = Annahme, bitte prüfen: Warenkosten geschätzt mit CHF/kg der Kategorie aus dem Verkaufstool,
              Preis pro Gast auf {rundung} gerundet. Herleitung unter jedem Gericht.
            </p>
          </Card>

          <Card title="Gericht hinzufügen" meta="aus dem Katalog">
            <div className="pl-grid-2">
              <Select id="gang" label="Gang" value={gangFilter} onChange={setGangFilter} options={[{ value: "", label: "Alle Gänge" }, ...gaenge.map((g) => ({ value: g, label: g }))]} />
              <TextField id="suche" type="search" label="Gericht suchen" value={suche} onChange={(e) => setSuche(wert(e))} />
            </div>
            {stamm ? (
              auswahl.length ? (
                <ItemList
                  label="Gerichte zum Hinzufügen"
                  onSelect={hinzufuegen}
                  groups={[{ items: auswahl.slice(0, 50).map((g) => ({ id: g.id, label: g.name, sub: `${g.gang ?? "[Gang]"} · ${g.kategorie} · hinzufügen` })) }]}
                />
              ) : (
                <p className="pl-muted">Keine passenden Gerichte.</p>
              )
            ) : null}
            {auswahl.length > 50 ? <p className="pl-small">{auswahl.length - 50} weitere: Suche oder Gang eingrenzen.</p> : null}
          </Card>
        </div>

        <aside className="pl-col-side">
          <Card title="Herleitung" meta="exkl. MWST">
            <DataTable
              columns={[
                { key: "label", label: "Position" },
                { key: "wert", label: "Betrag", numeric: true },
              ]}
              rows={[
                { id: "p", label: "Preis pro Gast", wert: formatChf(s?.preis_pro_gast_chf ?? null) },
                { id: "g", label: "Gäste", wert: s?.gaeste == null ? "[Gäste]" : formatZahl(s.gaeste) },
                { id: "u", label: "Total exkl. MWST", wert: formatChf(s?.umsatz_netto_chf ?? null) },
                { id: "m", label: `MWST ${s?.mwst_satz != null ? formatZahl(s.mwst_satz * 100, 1) : "[Satz]"} %`, wert: formatChf(s?.mwst_chf ?? null) },
                { id: "t", label: "Total inkl. MWST", wert: formatChf(s?.total_brutto_chf ?? null) },
                { id: "w", label: "Warenkosten", wert: formatChf(s?.warenkosten_chf ?? null) },
                { id: "d", label: "Deckungsbeitrag", wert: formatChf(s?.deckungsbeitrag_chf ?? null) },
              ]}
            />
            <p className="pl-small">{s?.herleitung ?? "…"}</p>
          </Card>
          {(s?.mengentypen_anteil_pruefen ?? 0) > 0 ? (
            <Notice title="Anteile prüfen">
              Bei {s?.mengentypen_anteil_pruefen} Mengentyp(en) ergeben die Anteile zusammen nicht 100 % des Quantums. Die Herleitung der Gerichte zeigt die Summe.
            </Notice>
          ) : null}
          {s && (s.positionen_geschaetzt ?? 0) > 0 ? (
            <Notice title="Warenkosten geschätzt">
              {s.positionen_geschaetzt} von {s.positionen} Gerichten mit Schätzung CHF/kg der Kategorie. Deckungsbeitrag vorerst nur Total exkl. MWST minus Warenkosten.
            </Notice>
          ) : null}
          {(s?.positionen_ohne_preis ?? 0) > 0 ? (
            <Notice title={`${s?.positionen_ohne_preis} Gericht(e) ohne Preis`}>Angebotsform und Betrieb wählen; fehlt danach noch ein Preis, hat die Kategorie keine Schätzung.</Notice>
          ) : null}
        </aside>
      </div>

      <Dialog
        open={anteilOffen}
        id="anteil"
        title={anteil ? `Anteil ${anteil.position.bezeichnung}` : "Anteil"}
        meta={anteil ? `${anteil.position.mengentyp} · ${anteil.position.gerichte_gleicher_typ} Gericht(e) dieses Typs` : undefined}
        onClose={() => setAnteilOffen(false)}
        actions={
          <>
            <Button onClick={() => setAnteilOffen(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={anteilSpeichern} disabled={anteilEingabe === undefined}>
              Anteil speichern
            </Button>
          </>
        }
      >
        {anteil ? (
          <>
            <TextField
              id="anteil-prozent"
              numeric
              label="Anteil in %"
              value={anteil.text}
              invalid={anteilEingabe === undefined}
              onChange={(e) => setAnteil({ ...anteil, text: wert(e), fehler: null })}
              hint={anteilEingabe === undefined ? "Zahl über 0 bis 100 eingeben, oder leer lassen." : "Leer = teilt sich den Rest des Mengentyps mit den anderen Gerichten ohne eigenen Anteil."}
            />
            {anteil.fehler ? <Notice role="alert" title="Anteil nicht gespeichert">{anteil.fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </>
  );
}

export default function OfferteBearbeiten() {
  return (
    <Suspense>
      <Bearbeiten />
    </Suspense>
  );
}
