"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, Checkbox, DataTable, Dialog, Fieldset, Notice, Select, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import { WOCHENTAGE, fehlerText, formAus, lieferantDaten, liefertageText, type Lieferant, type LieferantForm } from "@/lib/einkauf";

type Daten = { lieferanten: Lieferant[]; artikelProLieferant: Map<string, number>; preisquellen: string[] };
type Auswahl = { preisquelle: string; suche: string; nurOhne: boolean; lieferant: string };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;
const checked = (e: unknown) => (e as { target: HTMLInputElement }).target.checked;
const muster = (s: string) => `%${s.trim().replace(/[%_\\]/g, "\\$&")}%`;

async function laden(): Promise<Daten> {
  const l = await supabase.from("lieferant").select("*").order("name");
  if (l.error) throw l.error;
  // Anzahl Artikel pro Lieferant: je eine Zählabfrage (wenige Lieferanten).
  const zahlen = await Promise.all(
    (l.data ?? []).map((x) => supabase.from("artikel").select("id", { count: "exact", head: true }).eq("lieferant_id", x.id)),
  );
  const fehler = zahlen.find((z) => z.error)?.error;
  if (fehler) throw fehler;
  const q = await Promise.all(
    ["Durchschnittspreis", "Spezialpreis Fleisch"].map((p) => supabase.from("artikel").select("id", { count: "exact", head: true }).eq("preisquelle", p)),
  );
  return {
    lieferanten: l.data ?? [],
    artikelProLieferant: new Map((l.data ?? []).map((x, i) => [x.id, zahlen[i].count ?? 0])),
    preisquellen: ["Durchschnittspreis", "Spezialpreis Fleisch"].filter((_, i) => (q[i].count ?? 0) > 0),
  };
}

/** Artikel, auf die die Auswahl passt (Abfrage wird für Zählen und Zuordnen gleich aufgebaut). */
function artikelAbfrage<Q extends { eq: (s: string, v: string) => Q; ilike: (s: string, v: string) => Q; is: (s: string, v: null) => Q }>(q: Q, a: Auswahl): Q {
  let x = q;
  if (a.preisquelle) x = x.eq("preisquelle", a.preisquelle);
  if (a.suche.trim()) x = x.ilike("name", muster(a.suche));
  if (a.nurOhne) x = x.is("lieferant_id", null);
  return x;
}

export default function Lieferanten() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState("");
  const [form, setForm] = useState<LieferantForm | null>(null);
  const [formFehler, setFormFehler] = useState<string | null>(null);
  const [offen, setOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [auswahl, setAuswahl] = useState<Auswahl>({ preisquelle: "", suche: "", nurOhne: true, lieferant: "" });
  const [treffer, setTreffer] = useState<{ schluessel: string; anzahl: number | null } | null>(null);
  const [ordnetZu, setOrdnetZu] = useState(false);
  const [version, setVersion] = useState(0);
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const anfrage = useRef(0);

  const neuLaden = useCallback(() => {
    const nr = ++anfrage.current;
    return laden().then(
      (d) => {
        if (nr === anfrage.current) setDaten(d);
      },
      (e: Error) => {
        if (nr === anfrage.current) setFehler(`Lieferanten nicht geladen: ${e.message}`);
      },
    );
  }, []);

  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  // Wie viele Artikel passen auf die Auswahl? Zählt die Datenbank.
  const schluessel = JSON.stringify([auswahl.preisquelle, auswahl.suche.trim(), auswahl.nurOhne, version]);
  useEffect(() => {
    let gilt = true;
    artikelAbfrage(supabase.from("artikel").select("id", { count: "exact", head: true }), auswahl).then((r) => {
      if (gilt) setTreffer({ schluessel, anzahl: r.error ? null : r.count });
    });
    return () => {
      gilt = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schluessel]);
  const anzahl = treffer?.schluessel === schluessel ? treffer.anzahl : null;

  const melden = (text: string) => {
    setFehler(null);
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };

  function oeffnen(l: Lieferant | null) {
    setForm(formAus(l));
    setFormFehler(null);
    setOffen(true);
  }

  async function speichern() {
    if (!form) return;
    const r = lieferantDaten(form);
    if ("fehler" in r) return setFormFehler(r.fehler);
    setSpeichert(true);
    const q = form.id ? await supabase.from("lieferant").update(r.daten).eq("id", form.id) : await supabase.from("lieferant").insert(r.daten);
    setSpeichert(false);
    if (q.error) return setFormFehler(fehlerText(q.error));
    setOffen(false);
    await neuLaden();
    melden(`Lieferant ${r.daten.name} gespeichert.`);
  }

  async function zuordnen() {
    if (!auswahl.lieferant || !anzahl) return;
    setOrdnetZu(true);
    // .neq("name", "") trifft jeden Artikel: ein Update ohne Bedingung lehnt die Datenbank ab («ganze Preisliste zuordnen»).
    const r = await artikelAbfrage(supabase.from("artikel").update({ lieferant_id: auswahl.lieferant }).neq("name", ""), auswahl).select("id");
    setOrdnetZu(false);
    if (r.error) return setFehler(`Artikel nicht zugeordnet: ${r.error.message}`);
    const name = daten?.lieferanten.find((l) => l.id === auswahl.lieferant)?.name ?? "";
    setVersion((n) => n + 1); // Trefferzahl neu zählen
    await neuLaden();
    melden(`${r.data.length} Artikel ${name} zugeordnet.`);
  }

  const set = (teil: Partial<LieferantForm>) => {
    setFormFehler(null);
    setForm((f) => (f ? { ...f, ...teil } : f));
  };

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            <a href="/einkauf/">Einkauf</a>
          </div>
          <h1 className="pl-h1">Lieferanten</h1>
        </div>
        <div className="pl-actions">
          <Button variant="primary" onClick={() => oeffnen(null)}>Lieferant erfassen</Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Fehler">{fehler}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      <Card title="Lieferanten" meta="Liefertage, Bestellschluss und Vorlauf bestimmen «bestellen bis» in der Einkaufsliste">
        {daten ? (
          daten.lieferanten.length ? (
            <DataTable
              columns={[
                { key: "name", label: "Lieferant", subKey: "kontakt" },
                { key: "liefertage", label: "Liefertage" },
                { key: "bestellschluss", label: "Bestellschluss", numeric: true },
                { key: "vorlauf", label: "Vorlauf", numeric: true },
                { key: "artikel", label: "Artikel", numeric: true },
                { key: "aktiv", label: "Status", render: (r) => <StatusPill status={r.aktiv ? "ok" : "neutral"}>{r.aktiv ? "aktiv" : "inaktiv"}</StatusPill> },
                {
                  key: "aktion",
                  label: <span className="pl-sr">Aktionen</span>,
                  render: (r) => (
                    <Button ariaLabel={`Lieferant ${r.name as string} bearbeiten`} onClick={() => oeffnen(r.l as Lieferant)}>
                      Bearbeiten
                    </Button>
                  ),
                },
              ]}
              rows={daten.lieferanten.map((l) => ({
                id: l.id,
                l,
                name: l.name,
                kontakt: [l.telefon, l.email, l.bemerkung].filter(Boolean).join(" · ") || undefined,
                liefertage: liefertageText(l.liefertage),
                bestellschluss: `${l.bestellschluss_stunde} Uhr`,
                vorlauf: `${l.vorlauf_tage} Tag(e)`,
                artikel: formatZahl(daten.artikelProLieferant.get(l.id) ?? 0),
                aktiv: l.aktiv,
              }))}
            />
          ) : (
            <p className="pl-muted">Noch keine Lieferanten. «Lieferant erfassen» legt den ersten an.</p>
          )
        ) : (
          <p className="pl-muted" role="status">{fehler ? "Keine Daten." : "Lieferanten werden geladen …"}</p>
        )}
      </Card>

      <Card title="Artikel einem Lieferanten zuordnen" meta="mehrere Artikel auf einmal, z.B. die ganze Preisliste">
        <div className="pl-grid-3">
          <Select
            id="preisquelle"
            label="Preisliste"
            value={auswahl.preisquelle}
            onChange={(v) => setAuswahl({ ...auswahl, preisquelle: v })}
            options={[{ value: "", label: "Alle Preislisten" }, ...(daten?.preisquellen ?? []).map((p) => ({ value: p, label: p }))]}
          />
          <TextField id="artikel-suche" type="search" label="Artikelname enthält" value={auswahl.suche} onChange={(e) => setAuswahl({ ...auswahl, suche: wert(e) })} />
          <Select
            id="ziel-lieferant"
            label="Lieferant"
            value={auswahl.lieferant}
            onChange={(v) => setAuswahl({ ...auswahl, lieferant: v })}
            options={[{ value: "", label: "[Lieferant wählen]" }, ...(daten?.lieferanten ?? []).map((l) => ({ value: l.id, label: l.name }))]}
          />
        </div>
        <Checkbox label="nur Artikel ohne Lieferant" checked={auswahl.nurOhne} onChange={(e) => setAuswahl({ ...auswahl, nurOhne: checked(e) })} />
        <div className="pl-actions">
          <Button variant="primary" onClick={zuordnen} disabled={ordnetZu || !auswahl.lieferant || !anzahl}>
            {ordnetZu ? "Wird zugeordnet …" : `${anzahl === null ? "…" : formatZahl(anzahl)} Artikel zuordnen`}
          </Button>
          <span className="pl-small">{anzahl === 0 ? "Kein Artikel passt auf diese Auswahl." : "Die Zahl zeigt, wie viele Artikel auf die Auswahl passen."}</span>
        </div>
      </Card>

      <Dialog
        open={offen}
        id="lieferant"
        title={form?.id ? `Lieferant ${form.name}` : "Lieferant erfassen"}
        onClose={() => setOffen(false)}
        onCancel={(e) => speichert && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
            <Button variant="primary" onClick={speichern} disabled={speichert}>{speichert ? "Wird gespeichert …" : "Lieferant speichern"}</Button>
          </>
        }
      >
        {form ? (
          <>
            <div className="pl-grid-2">
              <TextField id="l-name" label="Name" value={form.name} onChange={(e) => set({ name: wert(e) })} />
              <TextField id="l-telefon" type="tel" label="Telefon" value={form.telefon} onChange={(e) => set({ telefon: wert(e) })} />
              <TextField id="l-email" type="email" label="E-Mail" value={form.email} onChange={(e) => set({ email: wert(e) })} />
              <TextField id="l-bemerkung" label="Bemerkung" value={form.bemerkung} onChange={(e) => set({ bemerkung: wert(e) })} />
            </div>
            <Fieldset legend="Liefertage" hint="Ohne Liefertage lässt sich kein Bestelltermin rechnen: [Bestelltermin].">
              {WOCHENTAGE.map((tag, i) => (
                <Checkbox
                  key={tag}
                  label={tag}
                  checked={form.liefertage.includes(i + 1)}
                  onChange={(e) => set({ liefertage: checked(e) ? [...form.liefertage, i + 1] : form.liefertage.filter((x) => x !== i + 1) })}
                />
              ))}
            </Fieldset>
            <div className="pl-grid-2">
              <TextField id="l-schluss" numeric label="Bestellschluss (Stunde)" value={form.bestellschluss} onChange={(e) => set({ bestellschluss: wert(e) })} hint="z.B. 14 für 14 Uhr" />
              <TextField id="l-vorlauf" numeric label="Vorlauf (Tage)" value={form.vorlauf} onChange={(e) => set({ vorlauf: wert(e) })} hint="Tage zwischen Bestellschluss und Lieferung" />
            </div>
            <Checkbox label="aktiv" checked={form.aktiv} onChange={(e) => set({ aktiv: checked(e) })} />
            {formFehler ? <Notice role="alert" title="Nicht gespeichert">{formFehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </>
  );
}
