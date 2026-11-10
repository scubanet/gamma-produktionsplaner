"use client";

import { useMemo, useState } from "react";
import { Button, Card, DataTable, Dialog, ItemList, Notice, Select, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import { anteilAus, anteilText } from "@/lib/offerte";
import { dezimal, fehlerText, gerichteNachGang, type LinieGericht, type LinieKomponente, type Menuelinie } from "@/lib/anlass";

export type LinieGaeste = { menuelinie_id: string | null; gaeste: number | null; herleitung: string | null; services: number | null };
export type KatalogGericht = { id: string; name: string; gang: string | null; kategorie: string };

type Bearbeitung =
  | { art: "linie"; id: string | null; text: string; fehler: string | null }
  | { art: "anteil"; gericht: LinieGericht; text: string; fehler: string | null }
  | { art: "menge"; komponente: LinieKomponente; text: string; einheit: string; fehler: string | null };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

export function Menuelinien({ anlassId, linien, gaeste, gerichte, komponenten, katalog, onGeaendert, onMeldung, onFehler }: {
  anlassId: string;
  linien: Menuelinie[];
  gaeste: LinieGaeste[];
  gerichte: LinieGericht[];
  komponenten: LinieKomponente[];
  katalog: KatalogGericht[];
  onGeaendert: () => Promise<void>;
  onMeldung: (text: string) => void;
  onFehler: (titel: string, text: string) => void;
}) {
  const sortiert = useMemo(() => [...linien].sort((a, b) => a.reihenfolge - b.reihenfolge), [linien]);
  const [gewaehlt, setGewaehlt] = useState<string>("");
  const linie = sortiert.find((l) => l.id === gewaehlt) ?? sortiert[0] ?? null;
  const [b, setB] = useState<Bearbeitung | null>(null);
  const [offen, setOffen] = useState(false);
  const [gangFilter, setGangFilter] = useState("");
  const [suche, setSuche] = useState("");
  const [fuegtHinzu, setFuegtHinzu] = useState<string | null>(null);

  const g = linie ? gaeste.find((x) => x.menuelinie_id === linie.id) : undefined;
  const linienGerichte = linie ? gerichte.filter((x) => x.menuelinie_id === linie.id) : [];
  const vorhanden = new Set(linienGerichte.map((x) => x.gericht_id));
  const gaenge = [...new Set(katalog.map((x) => x.gang).filter((x): x is string => !!x))];
  const s = suche.trim().toLocaleLowerCase("de-CH");
  const auswahl = katalog.filter((x) => !vorhanden.has(x.id) && (!gangFilter || x.gang === gangFilter) && (!s || x.name.toLocaleLowerCase("de-CH").includes(s)));
  const ohneMenge = komponenten.filter((k) => linienGerichte.some((x) => x.id === k.linie_gericht_id) && k.menge_pro_gast === null).length;

  const oeffnen = (x: Bearbeitung) => {
    setB(x);
    setOffen(true);
  };

  async function speichern() {
    if (!b) return;
    let r: { error: { message: string; code?: string } | null };
    if (b.art === "linie") {
      if (b.text.trim() === "") return setB({ ...b, fehler: "Bezeichnung eingeben, z.B. «Spiel 1 und 6»." });
      r = b.id
        ? await supabase.from("menuelinie").update({ name: b.text.trim() }).eq("id", b.id)
        : await supabase.from("menuelinie").insert({ anlass_id: anlassId, name: b.text.trim(), reihenfolge: Math.max(0, ...linien.map((l) => l.reihenfolge)) + 1 });
    } else if (b.art === "anteil") {
      const a = anteilAus(b.text);
      if (a === undefined || a === null) return setB({ ...b, fehler: "Anteil: Zahl über 0 bis 100." });
      r = await supabase.from("menuelinie_gericht").update({ anteil: a }).eq("id", b.gericht.id);
    } else {
      const m = dezimal(b.text, 100000);
      if (m === undefined) return setB({ ...b, fehler: "Menge: Zahl ab 0 mit höchstens 2 Stellen, oder leer." });
      r = await supabase.from("menuelinie_komponente").update({ menge_pro_gast: m, einheit: b.einheit }).eq("id", b.komponente.id);
    }
    if (r.error) return setB({ ...b, fehler: fehlerText(r.error) });
    setOffen(false);
    await onGeaendert();
    onMeldung(b.art === "linie" ? `Menülinie ${b.text.trim()} gespeichert.` : b.art === "anteil" ? `Anteil ${b.gericht.bezeichnung} gespeichert.` : `Menge ${b.komponente.bezeichnung} gespeichert.`);
  }

  async function linieLoeschen(l: Menuelinie) {
    const r = await supabase.from("menuelinie").delete().eq("id", l.id);
    if (r.error) return onFehler(`Menülinie ${l.name} nicht gelöscht`, fehlerText(r.error));
    setGewaehlt("");
    await onGeaendert();
    onMeldung(`Menülinie ${l.name} gelöscht.`);
  }

  async function gerichtEntfernen(x: LinieGericht) {
    const r = await supabase.from("menuelinie_gericht").delete().eq("id", x.id);
    if (r.error) return onFehler(`${x.bezeichnung} nicht entfernt`, fehlerText(r.error));
    await onGeaendert();
    onMeldung(`${x.bezeichnung} entfernt.`);
  }

  async function gerichtHinzufuegen(id: string) {
    if (!linie || fuegtHinzu) return;
    setFuegtHinzu(id);
    const r = await supabase.rpc("menuelinie_gericht_hinzufuegen", { p_linie: linie.id, p_gericht: id, p_anteil: 1 });
    await onGeaendert();
    setFuegtHinzu(null);
    if (r.error) return onFehler("Gericht nicht hinzugefügt", fehlerText(r.error));
    onMeldung(`${katalog.find((x) => x.id === id)?.name ?? "Gericht"} hinzugefügt; Mengen aus der Systemzuteilung, fehlende als [Menge].`);
  }

  const titel = b?.art === "linie" ? (b.id ? "Menülinie umbenennen" : "Menülinie hinzufügen") : b?.art === "anteil" ? `Anteil ${b.gericht.bezeichnung}` : b?.art === "menge" ? `Menge ${b.komponente.bezeichnung}` : "";

  return (
    <Card
      title="Menülinien"
      meta="Menge pro Gast je Komponente; Bedarf = Gäste der Linie × Anteil × Menge (Produktionsliste)"
      actions={<Button variant="dashed" onClick={() => oeffnen({ art: "linie", id: null, text: "", fehler: null })}>+ Menülinie</Button>}
    >
      {linie ? (
        <>
          <div className="pl-head">
            <Select id="linie" label="Menülinie" value={linie.id} onChange={setGewaehlt} options={sortiert.map((l) => ({ value: l.id, label: l.name }))} />
            <div className="pl-actions">
              <Button onClick={() => oeffnen({ art: "linie", id: linie.id, text: linie.name, fehler: null })}>Umbenennen</Button>
              <Button onClick={() => linieLoeschen(linie)}>Menülinie löschen</Button>
            </div>
          </div>
          <p className="pl-small">
            Gäste dieser Linie: {g?.services ? `${formatZahl(g.gaeste ?? 0)} (${g.herleitung})` : "[Gäste] – noch keinem Service zugeordnet"}
          </p>
          {ohneMenge ? <Notice title={`${ohneMenge} Komponente(n) ohne Menge`}>In der Systemzuteilung fehlt die Menge pro Portion. Bitte unten mit «Menge» eintragen; bis dahin zeigt die Produktionsliste für diese Komponente kein Total, sondern [Menge].</Notice> : null}

          {gerichteNachGang(linienGerichte).map((gr) => (
            <div key={gr.gang}>
              <div className="pl-eyebrow">{gr.gang}</div>
              {gr.gerichte.map((x) => (
                <div key={x.id}>
                  <div className="pl-head">
                    <div>
                      <strong>{x.bezeichnung}</strong>
                      <div className="pl-small">Anteil {anteilText(x.anteil)} % der Gäste{x.gericht_id ? "" : " · nicht aus dem Katalog"}</div>
                    </div>
                    <div className="pl-actions">
                      <Button ariaLabel={`Anteil ${x.bezeichnung} ändern`} onClick={() => oeffnen({ art: "anteil", gericht: x, text: anteilText(x.anteil), fehler: null })}>Anteil</Button>
                      <Button ariaLabel={`${x.bezeichnung} entfernen`} onClick={() => gerichtEntfernen(x)}>Entfernen</Button>
                    </div>
                  </div>
                  <DataTable
                    columns={[
                      { key: "bezeichnung", label: "Komponente" },
                      {
                        key: "mengeText",
                        label: "Menge pro Gast",
                        numeric: true,
                      },
                      {
                        key: "aktion",
                        label: <span className="pl-sr">Aktionen</span>,
                        render: (r) => (
                          <Button ariaLabel={`Menge ${r.bezeichnung as string} ändern`} onClick={() => {
                            const k = r.k as LinieKomponente;
                            oeffnen({ art: "menge", komponente: k, text: k.menge_pro_gast?.toString() ?? "", einheit: k.einheit, fehler: null });
                          }}>
                            Menge
                          </Button>
                        ),
                      },
                    ]}
                    rows={komponenten
                      .filter((k) => k.linie_gericht_id === x.id)
                      .sort((a, c) => a.reihenfolge - c.reihenfolge)
                      .map((k) => ({
                        id: k.id,
                        k,
                        bezeichnung: k.bezeichnung,
                        mengeText: k.menge_pro_gast === null ? "[Menge]" : `${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 2 }).format(k.menge_pro_gast)} ${k.einheit}`,
                      }))}
                  />
                </div>
              ))}
            </div>
          ))}
          {!linienGerichte.length ? <p className="pl-muted">Noch keine Gerichte in dieser Linie.</p> : null}

          <div className="pl-eyebrow">Gericht hinzufügen</div>
          <div className="pl-grid-2">
            <Select id="gang" label="Gang" value={gangFilter} onChange={setGangFilter} options={[{ value: "", label: "Alle Gänge" }, ...gaenge.map((x) => ({ value: x, label: x }))]} />
            <TextField id="suche-gericht" type="search" label="Gericht im Katalog suchen" value={suche} onChange={(e) => setSuche(wert(e))} />
          </div>
          {auswahl.length ? (
            <ItemList
              label={`Gerichte für ${linie.name}`}
              onSelect={gerichtHinzufuegen}
              groups={[{ items: auswahl.slice(0, 30).map((x) => ({ id: x.id, label: x.name, sub: `${x.gang ?? "[Gang]"} · ${x.kategorie} · ${fuegtHinzu === x.id ? "wird hinzugefügt …" : "hinzufügen"}` })) }]}
            />
          ) : (
            <p className="pl-muted">Keine passenden Gerichte.</p>
          )}
          {auswahl.length > 30 ? <p className="pl-small">{auswahl.length - 30} weitere: Suche oder Gang eingrenzen.</p> : null}
        </>
      ) : (
        <p className="pl-muted">Noch keine Menülinie. «+ Menülinie» legt eine an, z.B. «Spiel 1 und 6».</p>
      )}

      <Dialog
        open={offen}
        id="menuelinie-bearbeiten"
        title={titel}
        onClose={() => setOffen(false)}
        actions={
          <>
            <Button onClick={() => setOffen(false)}>Abbrechen</Button>
            <Button variant="primary" onClick={speichern}>Speichern</Button>
          </>
        }
      >
        {b ? (
          <>
            {b.art === "linie" ? (
              <TextField id="linie-name" label="Bezeichnung" value={b.text} onChange={(e) => setB({ ...b, text: wert(e), fehler: null })} />
            ) : b.art === "anteil" ? (
              <TextField id="linie-anteil" numeric label="Anteil der Gäste in %" value={b.text} onChange={(e) => setB({ ...b, text: wert(e), fehler: null })} hint="z.B. 60 für Rindsentrecôte, wenn 60 % der Gäste dieses Gericht wählen" />
            ) : (
              <div className="pl-grid-2">
                <TextField id="linie-menge" numeric label="Menge pro Gast" value={b.text} onChange={(e) => setB({ ...b, text: wert(e), fehler: null })} hint="leer = noch unbekannt [Menge]" />
                <Select
                  id="linie-einheit"
                  label="Einheit"
                  value={b.einheit}
                  onChange={(v) => setB({ ...b, einheit: v, fehler: null })}
                  options={[{ value: "g", label: "g (Total in kg)" }, { value: "ml", label: "ml (Total in l)" }, { value: "Stk", label: "Stk" }]}
                  hint="gleiche Einheit wie in den anderen Menülinien, sonst erscheint die Komponente doppelt"
                />
              </div>
            )}
            {b.fehler ? <Notice role="alert" title="Nicht gespeichert">{b.fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </Card>
  );
}
