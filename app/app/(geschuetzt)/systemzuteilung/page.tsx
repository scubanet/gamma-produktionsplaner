"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Checkbox, DataTable, KpiTile, Notice, SegmentedControl, Select, StatusPill, TextField, type DataTableColumn, Skeleton, EmptyState } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { useSchmal } from "@/lib/schmal";
import { formatZahl } from "@/lib/format";
import {
  filterAusAdresse, filtern, haltbarkeitText, hinweiseNachKomponente, lagerungText, leerAnzeige, sortieren,
  type Filter, type Hinweis, type Regeneration, type System, type Zuteilung,
} from "@/lib/systemzuteilung";
import { KomponenteBearbeiten } from "@/components/KomponenteBearbeiten";
import { useEingabenSchutz } from "@/components/EingabenSchutz";
import { fehlerText } from "@/lib/fehler";

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

/** Komponenten in der Produktionsliste der jüngsten Saison, für den Filter «im Bedarf». */
async function bedarfLaden(): Promise<{ saison: string; ids: Set<string> } | null> {
  const s = await supabase.from("saison").select("id, name").order("name", { ascending: false }).limit(1).maybeSingle();
  if (s.error) throw s.error;
  if (!s.data) return null;
  const saisonId = s.data.id;
  const p = await alleSeiten<{ komponente_id: string | null }>((von, bis) => supabase.from("produktionsliste").select("komponente_id").eq("saison_id", saisonId).order("komponente_id").range(von, bis));
  return { saison: s.data.name, ids: new Set(p.flatMap((x) => (x.komponente_id ? [x.komponente_id] : []))) };
}

export default function Systemzuteilung() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  // Der Leitstand verlinkt mit Filter in der Adresse (?status=offen, ?hinweis=mit, ?bedarf=1).
  const [filter, setFilter] = useState<Filter>(() => ({ kategorie: "", status: "", hinweis: "", suche: "", ...(typeof window === "undefined" ? {} : filterAusAdresse(window.location.search)) }));
  // Komponenten im Bedarf der jüngsten Saison (Produktionsliste); null = nicht geladen, dann filtert «im Bedarf» nicht.
  const [imBedarf, setImBedarf] = useState<{ saison: string; ids: Set<string> } | null>(null);
  const [bearbeiten, setBearbeiten] = useState<Zuteilung | null>(null);
  const [meldung, setMeldung] = useState("");
  const schmal = useSchmal();
  const meldungRef = useRef<HTMLParagraphElement>(null);
  // Ungespeicherte Eingaben in der Bearbeiten-Spalte: vor dem Wechsel der Zeile nachfragen.
  const schutz = useEingabenSchutz();
  // Spalte oder Dialog wird beim Öffnen festgelegt und bleibt, bis geschlossen ist: wechselte die Darstellung beim Drehen
  // des Tablets, würde das Formular neu aufgebaut und die Eingaben wären weg.
  const [modus, setModus] = useState<boolean | null>(null);
  if (!bearbeiten && modus !== null) setModus(null);
  if (bearbeiten && modus === null) setModus(schmal);
  const alsDialog = modus ?? schmal;

  const neuLaden = () => laden().then(setDaten, (e: Error) => setFehler(fehlerText(e)));
  useEffect(() => {
    neuLaden();
    bedarfLaden().then(setImBedarf, () => undefined);
  }, []);

  const hinweise = useMemo(() => hinweiseNachKomponente(daten?.hinweise ?? []), [daten]);
  const alle = useMemo(() => (daten ? sortieren(daten.zeilen, daten.kategorien) : []), [daten]);
  const zeilen = useMemo(() => filtern(alle, hinweise, filter, imBedarf?.ids), [alle, hinweise, filter, imBedarf]);
  const anzahl = (pred: (z: Zuteilung) => boolean) => (daten ? formatZahl(alle.filter(pred).length) : fehler ? "–" : <Skeleton variant="zahl" />);
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
    // Die offene Zeile nachführen: wird die Darstellung neu aufgebaut, steht dort der gespeicherte Stand.
    setBearbeiten((b) => (b && b.id === neu.id ? neu : b));
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

  // «Speichern und nächste»: die Zeile nach der bearbeiteten in der gefilterten Liste (Stand vor dem Speichern).
  const stelle = bearbeiten ? zeilen.findIndex((z) => z.id === bearbeiten.id) : -1;
  const naechste = stelle >= 0 ? zeilen[stelle + 1] ?? null : null;

  const spalten: DataTableColumn[] = [
    { key: "name", label: "Komponente", subKey: "unterzeile" },
    // Gleich neben dem Namen: so bleibt der Knopf sichtbar, auch wenn die Detailspalte die Tabelle schmal macht.
    {
      key: "aktion",
      label: <span className="pl-sr">Bearbeiten</span>,
      printHidden: true,
      render: (r) => (
        <Button ariaLabel={`${r.name as string} bearbeiten`} onClick={() => {
            // Die schon offene Zeile nochmals: nichts zu tun, auch keine Rückfrage.
            if (bearbeiten?.id === r.id) return;
            schutz.mitSchutz(() => setBearbeiten(r.zeile as Zuteilung));
          }}>
          Bearbeiten
        </Button>
      ),
    },
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

      {fehler ? <Notice role="alert" title="Systemzuteilung nicht geladen">{fehler}</Notice> : null}

      <div className="pl-grid-4">
        <KpiTile label="Komponenten ok" value={anzahl((z) => z.status === "ok")} detail="mit Produktionssystem" />
        <KpiTile label="offen" value={anzahl((z) => z.status === "offen")} detail="noch kein Produktionssystem" />
        <KpiTile label="Zukauf" value={anzahl((z) => z.status === "Zukauf")} detail="CF-Stufe 4 oder 5" />
        <KpiTile
          label="Prüfhinweise rot / gelb"
          value={daten ? `${formatZahl(hinweisAnzahl("rot"))} / ${formatZahl(hinweisAnzahl("gelb"))}` : fehler ? "–" : <Skeleton variant="zahl" />}
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
            { value: "mit", label: "mit Hinweis (rot oder gelb)" },
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

      {imBedarf ? (
        <Checkbox
          label={`nur Komponenten im Bedarf der Saison ${imBedarf.saison} (${formatZahl(imBedarf.ids.size)})`}
          checked={!!filter.bedarf}
          onChange={(e) => set({ bedarf: (e as { target: HTMLInputElement }).target.checked })}
        />
      ) : null}

      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      <div className="pl-split">
      <section className="pl-card pl-split__liste">
        <div className="pl-card__head">
          <h2 className="pl-card__title">Komponenten</h2>
          <span className="pl-card__meta">{daten ? `${formatZahl(zeilen.length)} von ${formatZahl(alle.length)}` : ""}</span>
        </div>
        {daten ? (
          zeilen.length ? <DataTable columns={spalten} rows={tabelle} isSelected={(r) => !!bearbeiten && r.id === bearbeiten.id} /> : <EmptyState title="Keine Komponenten für diese Filter" />
        ) : fehler ? (
          <p className="pl-muted">Keine Daten, siehe Hinweis oben.</p>
        ) : (
          <Skeleton variant="zeile" label="Systemzuteilung wird geladen" />
        )}
        <p className="pl-small">
          <span className="pl-assumed">Haltbarkeit</span>: {HALTBARKEIT_HINWEIS} Status, Haltbarkeit und Prüfhinweise rechnet die Datenbank aus Produktion, Lagerung und CF-Stufe.
          [Feld] = noch nicht erfasst; – = trifft nicht zu (nur vor Ort, bzw. keine eigene Produktion bei Zukauf).
        </p>
      </section>

      {bearbeiten && daten && !alsDialog ? (
        <aside className="pl-split__detail pl-print-hide">
          <KomponenteBearbeiten
            alsSpalte
            key={bearbeiten.id}
            zeile={bearbeiten}
            hinweise={hinweise.get(bearbeiten.id ?? "") ?? []}
            systeme={daten.systeme}
            regenerationen={daten.regenerationen}
            onClose={geschlossen}
            onGeaendert={schutz.melden}
            mitSchutz={schutz.mitSchutz}
            naechste={naechste ? { name: naechste.name ?? "[Komponente]", weiter: () => setBearbeiten(naechste) } : null}
            stand={`noch ${formatZahl(alle.filter((z) => z.status === "offen").length)} offen`}
            onAktualisiert={aktualisiert}
            onNeuLaden={neuLaden}
          />
        </aside>
      ) : null}
      </div>

      {bearbeiten && daten && alsDialog ? (
        <KomponenteBearbeiten
          key={bearbeiten.id}
          zeile={bearbeiten}
          hinweise={hinweise.get(bearbeiten.id ?? "") ?? []}
          systeme={daten.systeme}
          regenerationen={daten.regenerationen}
          onClose={geschlossen}
          onGeaendert={schutz.melden}
          mitSchutz={schutz.mitSchutz}
          onAktualisiert={aktualisiert}
          onNeuLaden={neuLaden}
        />
      ) : null}
      {schutz.dialog}
    </>
  );
}
