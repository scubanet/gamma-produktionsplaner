"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, DataTable, KpiTile, Notice, SegmentedControl, Select, StatusPill, TextField, type DataTableColumn } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatZahl } from "@/lib/format";
import {
  filtern, haltbarkeitText, hinweiseNachKomponente, lagerungText, leerAnzeige, sortieren,
  type Filter, type Hinweis, type Regeneration, type System, type Zuteilung,
} from "@/lib/systemzuteilung";
import { KomponenteBearbeiten } from "@/components/KomponenteBearbeiten";

type Daten = { zeilen: Zuteilung[]; hinweise: Hinweis[]; systeme: System[]; regenerationen: Regeneration[]; kategorien: string[]; kollektion: string };

const STATUS_PILL: Record<string, "ok" | "warn" | "info"> = { ok: "ok", offen: "warn", Zukauf: "info" };
const HALTBARKEIT_HINWEIS = "Annahme aus der Excel, noch mit Philipp und dem Küchenchef zu bestätigen.";

async function laden(): Promise<Daten> {
  const [z, h, s, r, k, ko] = await Promise.all([
    supabase.from("komponente_zuteilung").select("*"),
    supabase.from("komponente_pruefhinweis").select("*"),
    supabase.from("produktionssystem").select("*").order("reihenfolge"),
    supabase.from("regenerationsart").select("*").order("reihenfolge"),
    supabase.from("kategorie").select("code").order("reihenfolge"),
    supabase.from("kollektion").select("name").order("stand", { ascending: false }).limit(1),
  ]);
  for (const x of [z, h, s, r, k, ko]) if (x.error) throw x.error;
  return {
    zeilen: z.data ?? [],
    hinweise: h.data ?? [],
    systeme: s.data ?? [],
    regenerationen: r.data ?? [],
    kategorien: (k.data ?? []).map((x) => x.code),
    kollektion: ko.data?.[0]?.name ?? "[Kollektion]",
  };
}

export default function Systemzuteilung() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>({ kategorie: "", status: "", hinweis: "", suche: "" });
  const [bearbeiten, setBearbeiten] = useState<Zuteilung | null>(null);
  const [meldung, setMeldung] = useState("");
  const meldungRef = useRef<HTMLParagraphElement>(null);

  const neuLaden = () => laden().then(setDaten, (e: Error) => setFehler(e.message));
  useEffect(() => {
    neuLaden();
  }, []);

  const hinweise = useMemo(() => hinweiseNachKomponente(daten?.hinweise ?? []), [daten]);
  const alle = useMemo(() => (daten ? sortieren(daten.zeilen, daten.kategorien) : []), [daten]);
  const zeilen = useMemo(() => filtern(alle, hinweise, filter), [alle, hinweise, filter]);
  const anzahl = (pred: (z: Zuteilung) => boolean) => (daten ? formatZahl(alle.filter(pred).length) : fehler ? "–" : "…");
  const hinweisAnzahl = (farbe: string) => (daten ? daten.hinweise.filter((h) => h.farbe === farbe).length : 0);
  const set = (teil: Partial<Filter>) => setFilter((f) => ({ ...f, ...teil }));

  function aktualisiert(neu: Zuteilung, neueHinweise: Hinweis[], gespeichert: boolean) {
    setDaten((d) =>
      d && {
        ...d,
        zeilen: d.zeilen.map((z) => (z.id === neu.id ? neu : z)),
        hinweise: [...d.hinweise.filter((h) => h.komponente_id !== neu.id), ...neueHinweise],
      },
    );
    if (!gespeichert) return;
    const h = neueHinweise.length ? `${neueHinweise.length} Prüfhinweis(e): ${neueHinweise.map((x) => x.farbe).join(", ")}` : "keine Prüfhinweise";
    setMeldung(`${neu.name} gespeichert: Status ${neu.status}, Haltbarkeit ${haltbarkeitText(neu)}, ${h}.`);
  }

  // Nach dem Schliessen: fällt die Zeile aus dem Filter, gibt es ihren Button nicht mehr; Fokus auf die Meldung.
  function geschlossen() {
    const id = bearbeiten?.id;
    setBearbeiten(null);
    if (id && !zeilen.some((z) => z.id === id)) meldungRef.current?.focus();
  }

  const spalten: DataTableColumn[] = [
    { key: "name", label: "Komponente", subKey: "unterzeile" },
    { key: "status", label: "Status", render: (r) => <StatusPill status={STATUS_PILL[r.status as string] ?? "neutral"}>{r.status as string}</StatusPill> },
    { key: "produktion", label: "Produktion", render: (r) => (r.produktion as string[]).join(", ") || leerAnzeige(r.zeile as Zuteilung, "Produktion") },
    { key: "lagerung", label: "Lagerung" },
    { key: "regeneration", label: "Regeneration", render: (r) => (r.regeneration as string[]).join(", ") || leerAnzeige(r.zeile as Zuteilung, "Regeneration") },
    { key: "cf_stufe", label: "CF", numeric: true, render: (r) => (r.cf_stufe === null ? leerAnzeige(r.zeile as Zuteilung, "CF") : String(r.cf_stufe)) },
    {
      key: "haltbarkeit_tage",
      label: <span className="pl-assumed">Haltbarkeit</span>,
      numeric: true,
      render: (r) => haltbarkeitText(r.zeile as Zuteilung),
    },
    {
      key: "hinweise",
      label: "Prüfhinweise",
      render: (r) =>
        (r.hinweise as Hinweis[]).map((h) => (
          <span key={h.code} className="pl-sub">
            <StatusPill status={h.farbe === "rot" ? "critical" : "warn"}>{h.farbe}</StatusPill> {h.text}
          </span>
        )),
    },
    {
      key: "aktion",
      label: "",
      render: (r) => (
        <Button ariaLabel={`${r.name as string} bearbeiten`} onClick={() => setBearbeiten(r.zeile as Zuteilung)}>
          Bearbeiten
        </Button>
      ),
    },
  ];
  const tabelle = zeilen.map((z) => ({
    ...z,
    zeile: z,
    unterzeile: `${z.kategorie} · Zeile ${z.quelle_zeile}${z.bemerkung ? ` · ${z.bemerkung}` : ""}`,
    lagerung: lagerungText(z) === "–" ? leerAnzeige(z, "Lagerung") : lagerungText(z),
    hinweise: hinweise.get(z.id ?? "") ?? [],
  })) as unknown as Record<string, unknown>[];

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">{daten ? daten.kollektion : "Katalog"}</div>
          <h1 className="pl-h1">Systemzuteilung</h1>
        </div>
      </header>

      {fehler ? <Notice title="Systemzuteilung nicht geladen">{fehler}</Notice> : null}

      <div className="pl-grid-4">
        <KpiTile label="Komponenten ok" value={anzahl((z) => z.status === "ok")} detail="mit Produktionssystem" />
        <KpiTile label="offen" value={anzahl((z) => z.status === "offen")} detail="noch kein Produktionssystem" />
        <KpiTile label="Zukauf" value={anzahl((z) => z.status === "Zukauf")} detail="CF-Stufe 4 oder 5" />
        <KpiTile
          label="Prüfhinweise rot / gelb"
          value={daten ? `${formatZahl(hinweisAnzahl("rot"))} / ${formatZahl(hinweisAnzahl("gelb"))}` : fehler ? "–" : "…"}
          detail="zeigen an, sperren nichts"
        />
      </div>

      <div className="pl-grid-3">
        <TextField id="suche" type="search" label="Komponente suchen" value={filter.suche} onChange={(e) => set({ suche: (e as { target: HTMLInputElement }).target.value })} />
        <Select
          id="filter-kategorie"
          label="Kategorie"
          value={filter.kategorie}
          onChange={(v) => set({ kategorie: v })}
          options={[{ value: "", label: "Alle Kategorien" }, ...(daten?.kategorien ?? []).map((k) => ({ value: k, label: k }))]}
        />
        <Select
          id="filter-hinweis"
          label="Prüfhinweise"
          value={filter.hinweis}
          onChange={(v) => set({ hinweis: v as Filter["hinweis"] })}
          options={[
            { value: "", label: "Alle Komponenten" },
            { value: "rot", label: "mit rotem Hinweis" },
            { value: "gelb", label: "mit gelbem Hinweis" },
            { value: "ohne", label: "ohne Hinweis" },
          ]}
        />
      </div>
      <div>
        <div className="pl-label">Status</div>
        <SegmentedControl
          label="Status"
          value={filter.status}
          onChange={(v) => set({ status: v })}
          options={[{ value: "", label: "Alle" }, { value: "ok", label: "ok" }, { value: "offen", label: "offen" }, { value: "Zukauf", label: "Zukauf" }]}
        />
      </div>

      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      <section className="pl-card">
        <div className="pl-card__head">
          <h2 className="pl-card__title">Komponenten</h2>
          <span className="pl-card__meta">{daten ? `${formatZahl(zeilen.length)} von ${formatZahl(alle.length)}` : ""}</span>
        </div>
        {daten ? (
          zeilen.length ? <DataTable columns={spalten} rows={tabelle} /> : <p className="pl-muted">Keine Komponenten für diese Filter.</p>
        ) : fehler ? (
          <p className="pl-muted">Keine Daten, siehe Hinweis oben.</p>
        ) : (
          <p className="pl-muted" role="status">Systemzuteilung wird geladen …</p>
        )}
        <p className="pl-small">
          <span className="pl-assumed">Haltbarkeit</span>: {HALTBARKEIT_HINWEIS} Status, Haltbarkeit und Prüfhinweise rechnet die Datenbank aus Produktion, Lagerung und CF-Stufe.
          [Feld] = noch nicht erfasst; – = trifft nicht zu (nur vor Ort, bzw. keine eigene Produktion bei Zukauf).
        </p>
      </section>

      {bearbeiten && daten ? (
        <KomponenteBearbeiten
          key={bearbeiten.id}
          zeile={bearbeiten}
          hinweise={hinweise.get(bearbeiten.id ?? "") ?? []}
          systeme={daten.systeme}
          regenerationen={daten.regenerationen}
          onClose={geschlossen}
          onAktualisiert={aktualisiert}
          onNeuLaden={neuLaden}
        />
      ) : null}
    </>
  );
}
