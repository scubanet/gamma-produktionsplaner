"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, DataTable, KpiTile, Notice, SegmentedControl, Select, StatusPill, type DataTableColumn } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import {
  filtern, leerwert, linienZeilen, mitAufgaben, OHNE_ZUSTAENDIG, saisonZeilen, sortieren, SORTIERUNGEN,
  type Aufgabe, type BedarfZeile, type ListeZeile, type Richtung, type SortFeld, type Zeile,
} from "@/lib/produktionsliste";
import { ZustaendigDialog } from "@/components/produktion/ZustaendigDialog";
import { KomponenteBearbeiten } from "@/components/KomponenteBearbeiten";
import type { Hinweis, Regeneration, System, Zuteilung } from "@/lib/systemzuteilung";

type Bearbeiten = { zeile: Zuteilung; hinweise: Hinweis[]; systeme: System[]; regenerationen: Regeneration[] };
import { mengenKontrollen, statusKontrolle, STATUS_ERWARTET, wellenKontrolle, WELLEN_ERWARTET, type Kontrolle } from "@/lib/kontrollwerte";
import { excelExport } from "@/lib/export";

type Anlass = { id: string; name: string; datum: string | null; datum_bis: string | null; saison_id: string | null; saison: { name: string } | null; menuelinie: { id: string; name: string }[] };
type StatusZahl = Record<keyof typeof STATUS_ERWARTET, number | null>;
type Daten = { anlass: Anlass; liste: ListeZeile[]; bedarf: BedarfZeile[]; wellen: (number | null)[]; status: StatusZahl; aufgaben: Aufgabe[] };

const STATUS_PILL: Record<string, "ok" | "warn" | "info"> = { ok: "ok", offen: "warn", Zukauf: "info" };
const HALTBARKEIT_HINWEIS = "Annahme aus der Excel (rot markiert), noch mit Philipp und dem Küchenchef zu bestätigen. Wellen und Start hängen davon ab.";

async function laden(): Promise<Daten> {
  // Anlass mit Menülinien: im Pilot der Spengler Cup.
  const a = await supabase
    .from("anlass")
    .select("id, name, datum, datum_bis, saison_id, saison(name), menuelinie(id, name)")
    .order("datum");
  if (a.error) throw a.error;
  const anlass = (a.data as unknown as Anlass[]).find((x) => x.menuelinie.length > 0);
  if (!anlass?.saison_id) throw new Error("Kein Anlass mit Menülinien gefunden.");

  const statusWerte = Object.keys(STATUS_ERWARTET) as (keyof typeof STATUS_ERWARTET)[];
  const [liste, bedarf, aufgaben, ...rest] = await Promise.all([
    supabase.from("produktionsliste").select("*").eq("saison_id", anlass.saison_id),
    supabase.from("anlass_komponente_bedarf").select("*").in("anlass_id", (a.data as unknown as Anlass[]).filter((x) => x.saison_id === anlass.saison_id).map((x) => x.id)),
    supabase.from("produktion_aufgabe").select("komponente_id, zustaendig, erledigt_am").eq("saison_id", anlass.saison_id),
    ...WELLEN_ERWARTET.map(([tage]) => supabase.rpc("wellen_anzahl", { p_saison: anlass.saison_id!, p_haltbarkeit: tage })),
    ...statusWerte.map((st) => supabase.from("komponente_zuteilung").select("id", { count: "exact", head: true }).eq("status", st)),
  ]);
  for (const r of [liste, bedarf, aufgaben, ...rest]) if (r.error) throw r.error;
  const wellen = rest.slice(0, WELLEN_ERWARTET.length).map((w) => ((w as { data: unknown }).data as number | null) ?? null);
  const zaehlung = rest.slice(WELLEN_ERWARTET.length) as { count: number | null }[];
  const status = Object.fromEntries(statusWerte.map((st, i) => [st, zaehlung[i].count])) as StatusZahl;
  return { anlass, liste: liste.data ?? [], bedarf: bedarf.data ?? [], wellen, status, aufgaben: aufgaben.data ?? [] };
}

export default function Produktionsliste() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [exportFehler, setExportFehler] = useState<string | null>(null);
  const [kategorie, setKategorie] = useState("");
  const [status, setStatus] = useState("");
  const [linie, setLinie] = useState("");
  const [exportLaeuft, setExportLaeuft] = useState(false);
  const [aufgaben, setAufgaben] = useState<Map<string, Aufgabe>>(new Map());
  const [sortFeld, setSortFeld] = useState<SortFeld>("kategorie");
  const [richtung, setRichtung] = useState<Richtung>("auf");
  const [erledigt, setErledigt] = useState<"" | "offen" | "erledigt">("");
  const [zustaendig, setZustaendig] = useState("");
  const [dialog, setDialog] = useState<Zeile | null>(null);
  const [aktionsFehler, setAktionsFehler] = useState<string | null>(null);
  const [bearbeiten, setBearbeiten] = useState<Bearbeiten | null>(null);
  const [oeffnet, setOeffnet] = useState<string | null>(null);
  const [stamm, setStamm] = useState<{ systeme: System[]; regenerationen: Regeneration[] } | null>(null);

  /** Liste neu rechnen lassen: Status, Haltbarkeit, Wellen und Start hängen an der Zuteilung. */
  function neuLaden() {
    laden().then((d) => {
      setDaten(d);
      setAufgaben(new Map(d.aufgaben.map((a) => [a.komponente_id, a])));
    }, (e: Error) => setFehler(e.message));
  }

  /** Komponente mit Zuteilung, Prüfhinweisen und Stammdaten laden und den Dialog der Systemzuteilung öffnen. */
  async function komponenteOeffnen(z: Zeile) {
    if (!z.komponenteId || oeffnet) return;
    setOeffnet(z.komponenteId);
    setAktionsFehler(null);
    const [zu, hi, sy, re] = await Promise.all([
      supabase.from("komponente_zuteilung").select("*").eq("id", z.komponenteId).maybeSingle(),
      supabase.from("komponente_pruefhinweis").select("*").eq("komponente_id", z.komponenteId),
      stamm ? Promise.resolve({ data: stamm.systeme, error: null }) : supabase.from("produktionssystem").select("*").order("reihenfolge"),
      stamm ? Promise.resolve({ data: stamm.regenerationen, error: null }) : supabase.from("regenerationsart").select("*").order("reihenfolge"),
    ]);
    setOeffnet(null);
    const f = zu.error ?? hi.error ?? sy.error ?? re.error;
    if (f) return setAktionsFehler(`${z.komponente}: ${f.message}`);
    if (!zu.data) return setAktionsFehler(`${z.komponente}: Komponente nicht gefunden.`);
    const s = { systeme: sy.data ?? [], regenerationen: re.data ?? [] };
    setStamm(s);
    setBearbeiten({ zeile: zu.data, hinweise: hi.data ?? [], ...s });
  }

  useEffect(() => {
    laden().then((d) => {
      setDaten(d);
      setAufgaben(new Map(d.aufgaben.map((a) => [a.komponente_id, a])));
    }, (e: Error) => setFehler(e.message));
  }, []);

  const alle = useMemo(() => {
    if (!daten) return [];
    const roh = linie ? linienZeilen(daten.bedarf, daten.liste, linie) : saisonZeilen(daten.liste, daten.bedarf);
    return sortieren(mitAufgaben(roh, aufgaben), sortFeld, richtung);
  }, [daten, linie, aufgaben, sortFeld, richtung]);
  const zeilen = useMemo(() => filtern(alle, { kategorie, status, erledigt, zustaendig }), [alle, kategorie, status, erledigt, zustaendig]);
  const personen = useMemo(
    () => [...new Set([...aufgaben.values()].map((a) => a.zustaendig).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b, "de-CH")),
    [aufgaben],
  );
  const erledigtZahl = alle.filter((z) => z.erledigtAm).length;

  /** Eine Zeile der Checkliste speichern; die Datenbank setzt Zeitpunkt und Person. */
  async function aufgabeSpeichern(komponenteId: string, teil: Partial<Pick<Aufgabe, "zustaendig" | "erledigt_am">>): Promise<string | null> {
    if (!daten?.anlass.saison_id) return "Keine Saison geladen.";
    const vorher = aufgaben.get(komponenteId);
    const neu: Aufgabe = { komponente_id: komponenteId, zustaendig: vorher?.zustaendig ?? null, erledigt_am: vorher?.erledigt_am ?? null, ...teil };
    setAufgaben((m) => new Map(m).set(komponenteId, neu));
    const r = await supabase
      .from("produktion_aufgabe")
      .upsert({ saison_id: daten.anlass.saison_id, komponente_id: komponenteId, zustaendig: neu.zustaendig, erledigt_am: neu.erledigt_am })
      .select("komponente_id, zustaendig, erledigt_am")
      .single();
    if (r.error) {
      setAufgaben((m) => {
        const k = new Map(m);
        if (vorher) k.set(komponenteId, vorher); else k.delete(komponenteId);
        return k;
      });
      return r.error.message;
    }
    setAufgaben((m) => new Map(m).set(komponenteId, r.data));
    return null;
  }

  async function abhaken(z: Zeile, an: boolean) {
    if (!z.komponenteId) return;
    setAktionsFehler(null);
    const f = await aufgabeSpeichern(z.komponenteId, { erledigt_am: an ? new Date().toISOString() : null });
    if (f) setAktionsFehler(`${z.komponente}: ${f}`);
  }
  const kategorien = useMemo(() => [...new Set((daten?.liste ?? []).map((l) => l.kategorie ?? ""))].filter(Boolean).sort((a, b) => a.localeCompare(b, "de-CH")), [daten]);

  const kontrollen: Kontrolle[] = daten
    ? [...mengenKontrollen(daten.liste, daten.bedarf), ...WELLEN_ERWARTET.map(([t, e], i) => wellenKontrolle(t, e, daten.wellen[i])), statusKontrolle(daten.status)]
    : [];
  const abweichungen = kontrollen.filter((k) => k.ok === false).length;

  const warten = fehler ? "–" : "…";
  const linienName = daten?.anlass.menuelinie.find((l) => l.id === linie)?.name;
  const fruehesterStart = zeilen.map((z) => z.startAb).filter((d): d is string => !!d).sort()[0] ?? null;

  const spalten: DataTableColumn[] = [
    {
      key: "erledigt",
      label: "Erledigt",
      render: (r) => (
        <Checkbox
          label={<span className="pl-sr">{`${r.komponente as string} erledigt`}</span>}
          checked={!!r.erledigtAm}
          onChange={(e) => abhaken(r as unknown as Zeile, (e as { target: HTMLInputElement }).target.checked)}
        />
      ),
    },
    {
      key: "komponente",
      label: "Komponente",
      subKey: "unterzeile",
      render: (r) => (r.erledigtAm ? <s className="pl-muted">{r.komponente as string}</s> : (r.komponente as string)),
    },
    {
      key: "zustaendig",
      label: "Zuständig",
      render: (r) => (
        <span className="pl-print-hide">
          <Button variant={r.zustaendig ? "secondary" : "dashed"} onClick={() => setDialog(r as unknown as Zeile)} ariaLabel={`Zuständig für ${r.komponente as string}`}>
            {(r.zustaendig as string | null) ?? "+ Zuständig"}
          </Button>
        </span>
      ),
    },
    { key: "status", label: "Status", render: (r) => <StatusPill status={STATUS_PILL[r.status as string] ?? "neutral"}>{r.status as string}</StatusPill> },
    { key: "menge", label: linie ? "Menge Linie" : "Menge Saison", numeric: true, render: (r) => formatMenge(r.menge as number | null, r.einheit as string | null) },
    { key: "haltbarkeitTage", label: <span className="pl-assumed" title={HALTBARKEIT_HINWEIS}>Haltbarkeit</span>, numeric: true, render: (r) => (r.haltbarkeitTage === null ? leerwert(r.status as string, "Haltbarkeit") : `${r.haltbarkeitTage} Tage`) },
    { key: "wellen", label: "Wellen", numeric: true, render: (r) => (r.wellen === null ? leerwert(r.status as string, "Wellen") : String(r.wellen)) },
    { key: "startAb", label: "Start ab", numeric: true, render: (r) => (r.startAb === null ? leerwert(r.status as string, "Start") : formatDatum(r.startAb as string)) },
    { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
    {
      key: "bearbeiten",
      label: <span className="pl-sr">Bearbeiten</span>,
      printHidden: true,
      render: (r) => (
        <Button ariaLabel={`${r.komponente as string} bearbeiten`} onClick={() => komponenteOeffnen(r as unknown as Zeile)} disabled={!r.komponenteId || oeffnet !== null}>
          {oeffnet === r.komponenteId ? "Lädt …" : "Bearbeiten"}
        </Button>
      ),
    },
  ];
  const tabelle = zeilen.map((z) => ({
    ...z,
    unterzeile: [z.gericht ? `${z.kategorie} · ${z.gang} · ${z.gericht}` : z.kategorie, z.erledigtAm ? `erledigt ${formatDatum(z.erledigtAm.slice(0, 10))}` : ""].filter(Boolean).join(" · "),
  })) as unknown as Record<string, unknown>[];

  async function exportieren() {
    if (!daten) return;
    setExportLaeuft(true);
    setExportFehler(null);
    try {
      const teil = linienName ? ` ${linienName}` : "";
      await excelExport(zeilen, `Produktionsliste ${daten.anlass.name}${teil}.xlsx`, !!linie);
    } catch (e) {
      setExportFehler((e as Error).message);
    } finally {
      setExportLaeuft(false);
    }
  }

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            {daten ? `${daten.anlass.saison?.name ?? "[Saison]"} · ${daten.anlass.name} ${formatDatum(daten.anlass.datum)}–${formatDatum(daten.anlass.datum_bis)}` : "Produktionsplan"}
          </div>
          <h1 className="pl-h1">Produktionsliste{linienName ? ` – ${linienName}` : ""}</h1>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button href="/produktion/wellen/">Produktionswellen</Button>
          <Button onClick={() => window.print()} disabled={!daten}>Drucken / PDF</Button>
          <Button variant="primary" onClick={exportieren} disabled={!daten || exportLaeuft}>
            {exportLaeuft ? "Excel wird erstellt …" : "Excel exportieren"}
          </Button>
        </div>
      </header>

      {fehler ? <Notice title="Produktionsliste nicht geladen">{fehler}</Notice> : null}
      {exportFehler ? <Notice title="Excel-Export fehlgeschlagen">{exportFehler}</Notice> : null}
      {aktionsFehler ? <Notice title="Nicht gespeichert">{aktionsFehler}</Notice> : null}

      <div className="pl-grid-3 pl-print-hide">
        <Select
          id="filter-linie"
          label="Menülinie"
          value={linie}
          onChange={setLinie}
          options={[{ value: "", label: "Alle Menülinien (Saison)" }, ...(daten?.anlass.menuelinie ?? []).map((l) => ({ value: l.id, label: l.name })).sort((a, b) => a.label.localeCompare(b.label, "de-CH"))]}
        />
        <Select
          id="filter-kategorie"
          label="Kategorie"
          value={kategorie}
          onChange={setKategorie}
          options={[{ value: "", label: "Alle Kategorien" }, ...kategorien.map((k) => ({ value: k, label: k }))]}
        />
        <div>
          <div className="pl-label">Status</div>
          <SegmentedControl
            label="Status"
            value={status}
            onChange={setStatus}
            options={[{ value: "", label: "Alle" }, { value: "ok", label: "ok" }, { value: "offen", label: "offen" }, { value: "Zukauf", label: "Zukauf" }]}
          />
        </div>
      </div>

      <div className="pl-grid-4 pl-print-hide">
        <Select
          id="sortierung"
          label="Sortieren nach"
          value={sortFeld}
          onChange={(v) => setSortFeld(v as SortFeld)}
          options={SORTIERUNGEN}
        />
        <div>
          <div className="pl-label">Reihenfolge</div>
          <SegmentedControl
            label="Reihenfolge"
            value={richtung}
            onChange={(v) => setRichtung(v as Richtung)}
            options={[{ value: "auf", label: "aufsteigend" }, { value: "ab", label: "absteigend" }]}
          />
        </div>
        <div>
          <div className="pl-label">Erledigt</div>
          <SegmentedControl
            label="Erledigt"
            value={erledigt}
            onChange={(v) => setErledigt(v as "" | "offen" | "erledigt")}
            options={[{ value: "", label: "Alle" }, { value: "offen", label: "noch offen" }, { value: "erledigt", label: "erledigt" }]}
          />
        </div>
        <Select
          id="filter-zustaendig"
          label="Zuständig"
          value={zustaendig}
          onChange={setZustaendig}
          options={[{ value: "", label: "Alle" }, { value: OHNE_ZUSTAENDIG, label: "niemand eingetragen" }, ...personen.map((p) => ({ value: p, label: p }))]}
        />
      </div>

      <div className="pl-row">
        <div className="pl-col-main">
          <div className="pl-grid-4">
            <KpiTile label="Zeilen in der Liste" value={daten ? formatZahl(zeilen.length) : warten} detail={daten ? `von ${formatZahl(alle.length)}, nach Filter` : undefined} />
            <KpiTile label="Erledigt" value={daten ? `${formatZahl(erledigtZahl)} von ${formatZahl(alle.length)}` : warten} detail="abgehakt, ganze Saison" />
            <KpiTile label="davon Zukauf" value={daten ? formatZahl(zeilen.filter((z) => z.status === "Zukauf").length) : warten} detail="CF-Stufe 4 oder 5" />
            <KpiTile label="Frühester Start" value={daten ? formatDatum(fruehesterStart) : warten} detail="Start ab aus Haltbarkeit und Anlassdaten" />
          </div>

          <Card title="Komponenten" meta={`${linie ? "Menge dieser Menülinie; Haltbarkeit, Wellen und Start gelten für die Saison" : "Menge über alle Menülinien der Saison"}. Abhaken und Zuständig gelten pro Komponente für die ganze Saison.`}>
            {daten ? (
              zeilen.length ? <DataTable columns={spalten} rows={tabelle} /> : <p className="pl-muted">Keine Komponenten für diese Filter.</p>
            ) : fehler ? (
              <p className="pl-muted">Keine Daten, siehe Hinweis oben.</p>
            ) : (
              <p className="pl-muted" role="status">Produktionsliste wird geladen …</p>
            )}
            <p className="pl-small">
              <span className="pl-assumed">Haltbarkeit</span>: {HALTBARKEIT_HINWEIS} [Haltbarkeit] = noch nicht zugeteilt (Status offen); – = trifft nicht zu (Zukauf oder nur vor Ort).
            </p>
          </Card>
        </div>

        <aside className="pl-col-side pl-print-hide">
          <Card title="Abgleich mit der Excel" meta={daten ? (abweichungen ? `${abweichungen} Abweichung(en)` : "alle Kontrollwerte gleich") : undefined}>
            <DataTable
              columns={[
                { key: "label", label: "Kontrollwert" },
                { key: "excel", label: "Excel", numeric: true },
                { key: "app", label: "App", numeric: true, render: (r) => (r.app as string | null) ?? "[fehlt]" },
                { key: "ok", label: "Abgleich", render: (r) => (r.ok === null ? <StatusPill status="warn">fehlt</StatusPill> : r.ok ? <StatusPill status="ok">gleich</StatusPill> : <StatusPill status="critical">abweichend</StatusPill>) },
              ]}
              rows={kontrollen.map((k, i) => ({ id: i, ...k }))}
            />
          </Card>
        </aside>
      </div>
      {dialog?.komponenteId ? (
        <ZustaendigDialog
          key={dialog.komponenteId}
          komponente={dialog.komponente}
          meta={dialog.kategorie}
          wert={aufgaben.get(dialog.komponenteId)?.zustaendig ?? null}
          bekannte={personen}
          onClose={() => setDialog(null)}
          onSpeichern={(n) => aufgabeSpeichern(dialog.komponenteId!, { zustaendig: n })}
        />
      ) : null}
      {bearbeiten ? (
        <KomponenteBearbeiten
          key={bearbeiten.zeile.id}
          zeile={bearbeiten.zeile}
          hinweise={bearbeiten.hinweise}
          systeme={bearbeiten.systeme}
          regenerationen={bearbeiten.regenerationen}
          onClose={() => setBearbeiten(null)}
          onAktualisiert={(_z, _h, gespeichert) => { if (gespeichert) neuLaden(); }}
          onNeuLaden={neuLaden}
        />
      ) : null}
    </>
  );
}
