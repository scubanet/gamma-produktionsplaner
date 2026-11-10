"use client";

import { useEffect, useState } from "react";
import { Button, Card, DataTable, KpiTile, Notice, Select, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatZahl } from "@/lib/format";
import { statusLabel } from "@/lib/anlass";
import { FIXKOSTEN_KATEGORIEN } from "@/lib/stammdaten";
import { chf, dbStatus, monatText, prozent, type Kalkulation, type Monat } from "@/lib/ressourcen";

type Fixkosten = { id: string; kategorie: string; bezeichnung: string; chf_pro_monat: number; gueltig_ab: string; gueltig_bis: string | null };
type Lohnsatz = { rolle: string; chf_pro_h: number; chf_pro_h_freelancer: number | null; gueltig_ab: string };
type Daten = { monate: Monat[]; anlaesse: Kalkulation[]; fixkosten: Fixkosten[]; lohnsaetze: Lohnsatz[] };

async function laden(): Promise<Daten> {
  const [m, a, f, l] = await Promise.all([
    supabase.from("monat_ergebnis").select("*").order("monat"),
    supabase.from("anlass_kalkulation").select("*").order("datum", { nullsFirst: false }),
    supabase.from("fixkosten").select("id, kategorie, bezeichnung, chf_pro_monat, gueltig_ab, gueltig_bis").order("chf_pro_monat", { ascending: false }),
    supabase.from("lohnsatz").select("rolle, chf_pro_h, chf_pro_h_freelancer, gueltig_ab").order("rolle").order("gueltig_ab", { ascending: false }),
  ]);
  for (const x of [m, a, f, l]) if (x.error) throw x.error;
  return { monate: m.data ?? [], anlaesse: a.data ?? [], fixkosten: f.data ?? [], lohnsaetze: l.data ?? [] };
}

export default function Rentabilitaet() {
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gewaehlt, setGewaehlt] = useState("");

  useEffect(() => {
    laden().then(setDaten, (e: Error) => setFehler(e.message));
  }, []);

  const monat = daten?.monate.find((m) => m.monat === gewaehlt) ?? daten?.monate[0] ?? null;
  const anlaesse = (daten?.anlaesse ?? []).filter((a) => a.zaehlt && a.monat === monat?.monat);
  // Anzeige: Fixkosten, die im gewählten Monat gelten (die Summe rechnet die Datenbank in monat_ergebnis).
  // Gleiche Regel wie in der Datenbank: der Zeitraum berührt den Monat.
  const naechsterMonat = monat?.monat ? new Date(Date.UTC(Number(monat.monat.slice(0, 4)), Number(monat.monat.slice(5, 7)), 1)).toISOString().slice(0, 10) : "";
  const fix = (daten?.fixkosten ?? []).filter((f) => monat?.monat && f.gueltig_ab < naechsterMonat && (!f.gueltig_bis || f.gueltig_bis >= monat.monat));
  const offen = (daten?.anlaesse ?? []).filter((a) => !a.zaehlt);
  const ohneDatum = (daten?.anlaesse ?? []).filter((a) => a.zaehlt && !a.monat);
  const mark = (text: string, annahme: boolean | null) => (annahme ? <span className="pl-assumed">{text}</span> : text);

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Rentabilität · bestätigte, durchgeführte und abgerechnete Anlässe</div>
          <h1 className="pl-h1">{monat ? monatText(monat.monat) : "Rentabilität"}</h1>
        </div>
        <div className="pl-actions pl-print-hide">
          <Select id="monat" label="Monat" value={monat?.monat ?? ""} onChange={setGewaehlt} options={(daten?.monate ?? []).map((m) => ({ value: m.monat ?? "", label: monatText(m.monat) }))} />
          <Button href="/stammdaten/">Kostensätze pflegen</Button>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Rentabilität nicht geladen">{fehler}</Notice> : null}
      {daten && !daten.monate.length ? <Notice title="Noch keine Monate">Es gibt noch keinen bestätigten Anlass mit Datum.</Notice> : null}
      {ohneDatum.length ? (
        <Notice title={`${ohneDatum.length} bestätigte(r) Anlass/Anlässe ohne Datum`}>
          {ohneDatum.map((a) => a.name).join(", ")}: keinem Monat zugeordnet und darum in keinem Monatsergebnis. Datum im Anlass eintragen.
        </Notice>
      ) : null}

      {monat ? (
        <>
          <div className="pl-grid-4">
            <KpiTile label="Umsatz exkl. MWST" value={chf(monat.umsatz_chf, "[Umsatz]")} detail={`${monat.anlaesse} Anlass/Anlässe · ${monat.gaeste === null ? "[Gäste]" : `${formatZahl(monat.gaeste)} Gäste`}`} />
            <KpiTile label="Deckungsbeitrag" value={monat.db_chf === null ? "[DB]" : mark(chf(monat.db_chf), monat.annahme)} detail={monat.db_pct === null ? "unvollständig" : `${prozent(monat.db_pct)} vom Umsatz`} />
            <KpiTile
              tone="panel"
              label="Betriebsergebnis"
              value={monat.ergebnis_chf === null ? "[Ergebnis]" : mark(chf(monat.ergebnis_chf), monat.annahme)}
              detail={monat.rentabel === null ? "Fixkosten oder Deckungsbeitrag fehlen" : monat.rentabel ? "Monat ist rentabel" : "unter Break-even"}
            />
            <KpiTile
              label="Break-even-Umsatz"
              value={monat.breakeven_umsatz_chf === null ? "[Break-even]" : mark(chf(monat.breakeven_umsatz_chf), monat.annahme)}
              detail={`Fixkosten ${monat.fixkosten_zeilen ? chf(monat.fix_chf) : "[Fixkosten]"} pro Monat${monat.db_chf !== null && monat.db_chf <= 0 ? "; mit negativem Deckungsbeitrag nicht erreichbar" : ""}`}
            />
          </div>
          <p className="pl-small">{monat.herleitung}</p>

          {(monat.anlaesse_unvollstaendig ?? 0) > 0 ? (
            <Notice title={`${monat.anlaesse_unvollstaendig} von ${monat.anlaesse} Anlässen unvollständig`}>
              Solange bei einem Anlass Umsatz, Waren oder Personal fehlen, zeigt die App kein Monatstotal. Bekannter Umsatz bisher: {chf(monat.umsatz_bekannt_chf, "[Umsatz]")}. Ergänzen unter Ressourcen.
            </Notice>
          ) : null}

          <Card title={`Anlässe im ${monatText(monat.monat)}`} meta={<span className="pl-assumed">Zielwert DB ≥ {anlaesse[0]?.db_ziel_pct ?? "[Ziel]"} % (Annahme, festzulegen)</span>}>
            {anlaesse.length ? (
              <DataTable
                columns={[
                  { key: "name", label: "Anlass", subKey: "sub" },
                  { key: "gaeste", label: "Gäste", numeric: true },
                  { key: "umsatz", label: "Umsatz", numeric: true },
                  { key: "waren", label: "Waren", numeric: true },
                  { key: "personal", label: "Personal", numeric: true },
                  { key: "uebrige", label: "Übrige var.", numeric: true },
                  { key: "db", label: "DB", numeric: true, render: (r) => mark(r.db as string, r.annahme as boolean) },
                  { key: "dbp", label: "DB %", numeric: true, render: (r) => mark(r.dbp as string, r.annahme as boolean) },
                  { key: "fix", label: "Fixkosten-Anteil", numeric: true },
                  { key: "erg", label: "Ergebnis", numeric: true, render: (r) => mark(r.erg as string, r.annahme as boolean) },
                  { key: "status", label: "Status", render: (r) => <StatusPill status={r.pill as "ok" | "warn" | "neutral"}>{r.statusText as string}</StatusPill> },
                  { key: "aktion", label: <span className="pl-sr">Aktionen</span>, printHidden: true, render: (r) => <Button href={`/ressourcen/?id=${r.id as string}`} ariaLabel={`Kalkulation ${r.name as string} öffnen`}>Kalkulation</Button> },
                ]}
                rows={anlaesse.map((a) => {
                  const st = dbStatus(a.db_pct, a.db_ziel_pct);
                  return {
                    id: a.anlass_id,
                    name: a.name,
                    sub: `${a.datum ? formatDatum(a.datum) : "[Datum]"} · ${statusLabel(a.status ?? "")}${a.fehlend ? ` · fehlt: ${a.fehlend}` : ""}`,
                    gaeste: a.gaeste === null ? "[Gäste]" : formatZahl(a.gaeste),
                    umsatz: chf(a.umsatz_chf, "[Umsatz]"),
                    waren: chf(a.waren_chf),
                    personal: chf(a.personal_chf),
                    uebrige: chf(a.uebrige_chf),
                    db: chf(a.db_chf, "[DB]"),
                    dbp: prozent(a.db_pct, "[DB]"),
                    fix: chf(a.fix_anteil_chf, "[Fixkosten]"),
                    erg: chf(a.ergebnis_chf, "[Ergebnis]"),
                    annahme: a.annahme && a.db_chf !== null,
                    pill: st.pill,
                    statusText: st.text,
                  };
                })}
              />
            ) : (
              <p className="pl-muted">Keine Anlässe in diesem Monat.</p>
            )}
            <p className="pl-small">
              <span className="pl-assumed">gestrichelt</span> = Annahme, bitte prüfen: Warenkosten aus der Offerte geschätzt oder Freelancer zum Satz des eigenen Personals gerechnet.
              Personal = Stunden × Lohnsatz inkl. Sozialleistungen, Freelancer eingeschlossen. Übrige var. = Energie, Gerätemiete, Transport, Mietgeschirr und Material.
              Fixkosten-Anteil = variable Kosten × (Fixkosten des Monats ÷ variable Kosten des Monats).
            </p>
          </Card>

          <div className="pl-row">
            <div className="pl-col-main">
              <Card title="Monate" meta="Umsatz gegen Break-even">
                <DataTable
                  columns={[
                    { key: "monat", label: "Monat", subKey: "herleitung" },
                    { key: "anlaesse", label: "Anlässe", numeric: true },
                    { key: "umsatz", label: "Umsatz", numeric: true },
                    { key: "db", label: "Deckungsbeitrag", numeric: true },
                    { key: "fix", label: "Fixkosten", numeric: true },
                    { key: "erg", label: "Ergebnis", numeric: true },
                    { key: "be", label: "Break-even", numeric: true },
                    {
                      key: "status",
                      label: "Status",
                      render: (r) => <StatusPill status={r.rentabel === null ? "neutral" : r.rentabel ? "ok" : "warn"}>{r.rentabel === null ? "unvollständig" : r.rentabel ? "über Break-even" : "darunter"}</StatusPill>,
                    },
                  ]}
                  rows={(daten?.monate ?? []).map((m) => ({
                    id: m.monat,
                    monat: monatText(m.monat),
                    herleitung: m.herleitung,
                    anlaesse: m.anlaesse,
                    umsatz: chf(m.umsatz_chf, "[Umsatz]"),
                    db: chf(m.db_chf, "[DB]"),
                    fix: m.fixkosten_zeilen ? chf(m.fix_chf) : "[Fixkosten]",
                    erg: chf(m.ergebnis_chf, "[Ergebnis]"),
                    be: chf(m.breakeven_umsatz_chf, "[Break-even]"),
                    rentabel: m.rentabel,
                  }))}
                />
              </Card>
            </div>
            <aside className="pl-col-side">
              <Card title="Fixkosten pro Monat" meta={monat.fixkosten_zeilen ? chf(monat.fix_chf) : "[Fixkosten]"}>
                {fix.length ? (
                  <DataTable
                    columns={[
                      { key: "name", label: "Position", subKey: "kategorie" },
                      { key: "betrag", label: "CHF", numeric: true },
                    ]}
                    rows={fix.map((f) => ({ id: f.id, name: f.bezeichnung, kategorie: FIXKOSTEN_KATEGORIEN.find((k) => k.value === f.kategorie)?.label ?? f.kategorie, betrag: chf(f.chf_pro_monat) }))}
                  />
                ) : (
                  <p className="pl-muted">Für diesen Monat sind keine Fixkosten erfasst. Ohne sie gibt es weder Ergebnis noch Break-even.</p>
                )}
              </Card>
              <Card title="Lohnsätze" meta="inkl. Sozialleistungen">
                {daten?.lohnsaetze.length ? (
                  <DataTable
                    columns={[
                      { key: "rolle", label: "Rolle", subKey: "ab" },
                      { key: "satz", label: "CHF pro h", numeric: true },
                    ]}
                    rows={daten.lohnsaetze.map((l) => ({ id: `${l.rolle}-${l.gueltig_ab}`, rolle: l.rolle, ab: `gültig ab ${formatDatum(l.gueltig_ab)}`, satz: chf(l.chf_pro_h) }))}
                  />
                ) : (
                  <p className="pl-muted">Noch keine Lohnsätze erfasst: Personalkosten stehen als [Preis].</p>
                )}
              </Card>
            </aside>
          </div>

          {offen.length ? (
            <Card title="Optionen" meta="zählen nicht im Monatsergebnis">
              <DataTable
                columns={[
                  { key: "name", label: "Anlass", subKey: "sub" },
                  { key: "umsatz", label: "Umsatz", numeric: true },
                  { key: "db", label: "DB", numeric: true },
                ]}
                rows={offen.map((a) => ({ id: a.anlass_id, name: a.name, sub: `${a.datum ? formatDatum(a.datum) : "[Datum]"} · ${statusLabel(a.status ?? "")}`, umsatz: chf(a.umsatz_chf, "[Umsatz]"), db: chf(a.db_chf) }))}
              />
            </Card>
          ) : null}

          <Notice title="Noch nicht enthalten">
            Vollkosten pro Gericht (Waren, Arbeit, Energie, Fixkosten pro Portion) folgen, sobald die Zutaten der Rezepte mit Artikeln verknüpft sind. Die Diagramme aus dem Mockup (Wasserfall, Umsatz gegen Break-even) sind noch nicht gebaut.
          </Notice>
        </>
      ) : daten ? null : (
        <p className="pl-muted" role="status">{fehler ? "Keine Daten." : "Rentabilität wird geladen …"}</p>
      )}
    </>
  );
}
