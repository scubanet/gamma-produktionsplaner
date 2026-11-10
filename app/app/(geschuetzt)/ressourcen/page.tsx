"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, DataTable, Dialog, KpiTile, Notice, Select, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatZahl } from "@/lib/format";
import { zeitraum } from "@/lib/anlass";
import {
  KOSTENART_LABEL, betrag, chf, dbStatus, fehlerText, geraetDaten, personalDaten, prozent,
  type GeraetForm, type GeraetZeile, type Kalkulation, type Kostenart, type PersonalForm, type PersonalZeile,
} from "@/lib/ressourcen";

type Daten = { personal: PersonalZeile[]; geraete: GeraetZeile[]; kostenarten: Kostenart[] };
type Stamm = { anlaesse: Kalkulation[]; geraete: { id: string; name: string; anzahl_eigen: number }[]; rollen: string[] };
type KostenForm = { art: string; plan: string; ist: string; berechnet: number | null; fehler: string | null };
type Bearbeitung =
  | { art: "personal"; form: PersonalForm; fehler: string | null }
  | { art: "geraet"; form: GeraetForm; fehler: string | null }
  | { art: "kosten"; form: KostenForm }
  | { art: "umsatz"; text: string; fehler: string | null };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;
const zahlText = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

async function stammLaden(): Promise<Stamm> {
  const [a, g, l] = await Promise.all([
    supabase.from("anlass_kalkulation").select("*").order("datum", { nullsFirst: false }),
    supabase.from("geraet").select("id, name, anzahl_eigen").order("name"),
    supabase.from("lohnsatz").select("rolle"),
  ]);
  for (const x of [a, g, l]) if (x.error) throw x.error;
  return { anlaesse: a.data ?? [], geraete: g.data ?? [], rollen: [...new Set((l.data ?? []).map((x) => x.rolle))].sort((x, y) => x.localeCompare(y, "de-CH")) };
}

async function laden(anlassId: string): Promise<Daten> {
  const [p, g, k] = await Promise.all([
    supabase.from("anlass_personal_kosten").select("*").eq("anlass_id", anlassId).order("reihenfolge"),
    supabase.from("anlass_geraet_bedarf").select("*").eq("anlass_id", anlassId).order("geraet"),
    supabase.from("anlass_kostenart").select("*").eq("anlass_id", anlassId).order("ordnung"),
  ]);
  for (const x of [p, g, k]) if (x.error) throw x.error;
  return { personal: p.data ?? [], geraete: g.data ?? [], kostenarten: k.data ?? [] };
}

function Ressourcen() {
  const router = useRouter();
  const gewaehlt = useSearchParams().get("id");
  const [stamm, setStamm] = useState<Stamm | null>(null);
  const [daten, setDaten] = useState<{ anlassId: string; d: Daten } | null>(null);
  const [hinweis, setHinweis] = useState<{ titel: string; text: string } | null>(null);
  const [meldung, setMeldung] = useState("");
  const [b, setB] = useState<Bearbeitung | null>(null);
  const [offen, setOffen] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const anfrage = useRef(0);

  const anlass = stamm?.anlaesse.find((a) => a.anlass_id === gewaehlt) ?? stamm?.anlaesse[0] ?? null;
  const anlassId = anlass?.anlass_id ?? null;

  // Kalkulation aller Anlässe (Fixkosten-Anteil hängt am ganzen Monat) und Details des gewählten Anlasses.
  const neuLaden = useCallback(
    (id: string | null) => {
      const nr = ++anfrage.current;
      return Promise.all([stammLaden(), id ? laden(id) : Promise.resolve(null)]).then(
        ([s, d]) => {
          if (nr !== anfrage.current) return true;
          setHinweis(null);
          setStamm(s);
          if (id && d) setDaten({ anlassId: id, d });
          return true;
        },
        (e: Error) => {
          if (nr === anfrage.current) setHinweis({ titel: "Ressourcen nicht geladen", text: e.message });
          return false;
        },
      );
    },
    [],
  );

  useEffect(() => {
    neuLaden(anlassId);
  }, [neuLaden, anlassId]);

  const d = daten && daten.anlassId === anlassId ? daten.d : null;
  const melden = (text: string) => {
    setHinweis(null);
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };
  const oeffnen = (x: Bearbeitung) => {
    setB(x);
    setOffen(true);
  };
  const fertig = async (text: string) => {
    setOffen(false);
    if (await neuLaden(anlassId)) melden(text);
  };

  async function speichern() {
    if (!b || !anlassId) return;
    if (b.art === "personal") {
      const r = personalDaten(b.form);
      if ("fehler" in r) return setB({ ...b, fehler: r.fehler });
      setSpeichert(true);
      const q = b.form.id
        ? await supabase.from("anlass_personal").update(r.daten).eq("id", b.form.id)
        : await supabase.from("anlass_personal").insert({ ...r.daten, anlass_id: anlassId, reihenfolge: Math.max(0, ...(d?.personal ?? []).map((p) => p.reihenfolge ?? 0)) + 1 });
      setSpeichert(false);
      if (q.error) return setB({ ...b, fehler: fehlerText(q.error) });
      return fertig(`Personal ${r.daten.rolle} gespeichert.`);
    }
    if (b.art === "geraet") {
      const r = geraetDaten(b.form);
      if ("fehler" in r) return setB({ ...b, fehler: r.fehler });
      setSpeichert(true);
      const q = b.form.id ? await supabase.from("anlass_geraet").update(r.daten).eq("id", b.form.id) : await supabase.from("anlass_geraet").insert({ ...r.daten, anlass_id: anlassId });
      setSpeichert(false);
      if (q.error) return setB({ ...b, fehler: fehlerText(q.error) });
      return fertig("Gerät gespeichert.");
    }
    if (b.art === "kosten") {
      const plan = betrag(b.form.plan);
      const ist = betrag(b.form.ist);
      if (plan === undefined || ist === undefined) return setB({ art: "kosten", form: { ...b.form, fehler: "Beträge: Zahl ab 0 mit höchstens 2 Stellen, oder leer." } });
      setSpeichert(true);
      const q = await supabase.rpc("anlass_kosten_setzen", { p_anlass: anlassId, p_art: b.form.art as Kostenart["art"] & string, p_plan: plan as number, p_ist: ist as number });
      setSpeichert(false);
      if (q.error) return setB({ art: "kosten", form: { ...b.form, fehler: q.error.message } });
      return fertig(`${KOSTENART_LABEL[b.form.art]} gespeichert.`);
    }
    const u = betrag(b.text);
    if (u === undefined) return setB({ ...b, fehler: "Umsatz: Zahl ab 0 mit höchstens 2 Stellen, oder leer." });
    setSpeichert(true);
    const q = await supabase.from("anlass").update({ umsatz_netto_chf: u }).eq("id", anlassId);
    setSpeichert(false);
    if (q.error) return setB({ ...b, fehler: q.error.message });
    return fertig("Umsatz gespeichert.");
  }

  async function entfernen(tabelle: "anlass_personal" | "anlass_geraet", id: string, name: string) {
    const q = await supabase.from(tabelle).delete().eq("id", id);
    if (q.error) return setHinweis({ titel: `${name} nicht entfernt`, text: q.error.message });
    if (await neuLaden(anlassId)) melden(`${name} entfernt.`);
  }

  const status = dbStatus(anlass?.db_pct ?? null, anlass?.db_ziel_pct ?? null);
  const titel = b?.art === "personal" ? (b.form.id ? `Personal ${b.form.rolle}` : "Personal hinzufügen") : b?.art === "geraet" ? (b.form.id ? "Gerät ändern" : "Gerät hinzufügen") : b?.art === "kosten" ? KOSTENART_LABEL[b.form.art] : "Umsatz exkl. MWST";

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            {anlass ? `${anlass.nummer ?? "[Nummer]"} ${anlass.name} · ${zeitraum(anlass.datum, anlass.datum_bis, formatDatum)} · ${anlass.gaeste === null ? "[Gäste]" : `${formatZahl(anlass.gaeste)} Gäste`}` : "Ressourcen"}
          </div>
          <h1 className="pl-h1">Ressourcen und Kalkulation</h1>
        </div>
        <div className="pl-actions pl-print-hide">
          <Select
            id="anlass"
            label="Anlass"
            value={anlassId ?? ""}
            onChange={(v) => {
              setMeldung("");
              router.replace(`/ressourcen/?id=${v}`);
            }}
            options={(stamm?.anlaesse ?? []).map((a) => ({ value: a.anlass_id ?? "", label: `${a.name}${a.datum ? ` · ${formatDatum(a.datum)}` : ""}` }))}
          />
          <Button onClick={() => window.print()} disabled={!d}>Drucken / PDF</Button>
        </div>
      </header>

      {hinweis ? <Notice role="alert" title={hinweis.titel}>{hinweis.text}</Notice> : null}
      <p className="pl-small pl-print-hide" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>
      {stamm && !stamm.anlaesse.length ? <Notice title="Kein Anlass">Es gibt noch keinen Anlass. Offerten erscheinen hier, sobald sie bestätigt sind.</Notice> : null}

      {anlass ? (
        <>
          <div className="pl-grid-4">
            <KpiTile
              label="Personal am Anlass"
              value={(anlass.personal_anzahl ?? 0) > 0 ? formatZahl(anlass.personal_anzahl ?? 0) : "[Personal]"}
              detail={(anlass.personal_anzahl ?? 0) > 0 ? `${formatZahl(anlass.personal_stunden ?? 0, 1)} h${(anlass.personal_freelancer ?? 0) > 0 ? ` · davon ${anlass.personal_freelancer} Freelancer` : ""}` : "noch nicht erfasst"}
            />
            <KpiTile
              label="Geräte"
              value={(anlass.geraete_anzahl ?? 0) > 0 ? formatZahl(anlass.geraete_anzahl ?? 0) : "[Geräte]"}
              detail={(anlass.geraete_anzahl ?? 0) === 0 ? "noch nicht erfasst" : (anlass.geraete_miete ?? 0) > 0 ? `davon ${anlass.geraete_miete} Miete` : "alle aus eigenem Bestand"}
            />
            <KpiTile
              tone="panel"
              label="Deckungsbeitrag"
              value={anlass.db_chf === null ? "[DB]" : <span className={anlass.annahme ? "pl-assumed" : undefined}>{chf(anlass.db_chf)}</span>}
              detail={anlass.db_chf === null ? `fehlt: ${anlass.fehlend ?? "Angaben"}` : <>{prozent(anlass.db_pct, "[DB]")} · <span className="pl-assumed">Ziel {anlass.db_ziel_pct ?? "[Ziel]"} %</span> (Annahme)</>}
            />
            <KpiTile
              label="Ergebnis nach Fixkosten"
              value={anlass.ergebnis_chf === null ? "[Ergebnis]" : <span className={anlass.annahme ? "pl-assumed" : undefined}>{chf(anlass.ergebnis_chf)}</span>}
              detail={anlass.ergebnis_chf === null ? "Fixkosten-Anteil fehlt" : `${prozent(anlass.ergebnis_pct, "[Ergebnis]")} vom Umsatz`}
            />
          </div>

          {(anlass.personal_freelancer ?? 0) > 0 || (anlass.geraete_miete ?? 0) > 0 ? (
            <Notice
              title="Zusatzbedarf"
              items={[
                (anlass.personal_freelancer ?? 0) > 0 ? `+${anlass.personal_freelancer} Freelancer über den Pool anfragen` : null,
                (anlass.geraete_miete ?? 0) > 0 ? `+${anlass.geraete_miete} Mietgerät(e) beim Partner bestellen` : null,
              ].filter(Boolean)}
            />
          ) : null}

          <Card title="Personal" meta="Stunden × Lohnsatz der Rolle am Anlassdatum" actions={<span className="pl-print-hide"><Button variant="dashed" onClick={() => oeffnen({ art: "personal", form: { id: null, rolle: "", eigen: "", freelancer: "", stunden: "", einsatz: "", bemerkung: "" }, fehler: null })}>+ Personal</Button></span>}>
            {d ? (
              d.personal.length ? (
                <DataTable
                  columns={[
                    { key: "rolle", label: "Rolle", subKey: "bemerkung" },
                    { key: "anzahl", label: "Anzahl", numeric: true },
                    { key: "einsatz", label: "Einsatz" },
                    { key: "stunden", label: "Stunden", numeric: true },
                    { key: "kosten", label: "Kosten", numeric: true, render: (r) => <span className={r.annahme ? "pl-assumed" : undefined}>{r.kosten as string}</span> },
                    { key: "quelle", label: "Quelle", render: (r) => (r.zusatz ? <StatusPill status="info">{r.zusatz as string}</StatusPill> : <StatusPill status="neutral">Eigen</StatusPill>) },
                    { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                    {
                      key: "aktion",
                      label: <span className="pl-sr">Aktionen</span>,
                      printHidden: true,
                      render: (r) => {
                        const p = r.p as PersonalZeile;
                        return (
                          <span className="pl-actions">
                            <Button ariaLabel={`Personal ${p.rolle} bearbeiten`} onClick={() => oeffnen({ art: "personal", form: { id: p.id, rolle: p.rolle ?? "", eigen: zahlText(p.anzahl_eigen), freelancer: zahlText(p.anzahl_freelancer), stunden: zahlText(p.stunden_pro_person), einsatz: p.einsatz ?? "", bemerkung: p.bemerkung ?? "" }, fehler: null })}>Bearbeiten</Button>
                            <Button ariaLabel={`Personal ${p.rolle} entfernen`} onClick={() => entfernen("anlass_personal", p.id!, `Personal ${p.rolle}`)}>Entfernen</Button>
                          </span>
                        );
                      },
                    },
                  ]}
                  rows={d.personal.map((p) => ({
                    id: p.id,
                    p,
                    rolle: p.rolle,
                    bemerkung: p.bemerkung,
                    anzahl: formatZahl(p.anzahl ?? 0),
                    einsatz: p.einsatz ?? "[Einsatz]",
                    stunden: `${formatZahl(p.stunden ?? 0, 1)} h`,
                    kosten: chf(p.kosten_chf),
                    annahme: p.freelancer_satz_annahme,
                    zusatz: p.zusatzbedarf,
                    herleitung: `${p.herleitung}${p.freelancer_satz_annahme ? " (Freelancer-Satz angenommen: gleicher Satz)" : ""}`,
                  }))}
                />
              ) : (
                <p className="pl-muted">Noch kein Personal erfasst.</p>
              )
            ) : (
              <p className="pl-muted" role="status">{hinweis ? "Keine Daten." : "Wird geladen …"}</p>
            )}
          </Card>

          <Card title="Geräte" meta="Bedarf gegen eigenen Bestand; gleichzeitige Anlässe berücksichtigt" actions={<span className="pl-print-hide"><Button variant="dashed" onClick={() => oeffnen({ art: "geraet", form: { id: null, geraetId: "", anzahl: "", bemerkung: "" }, fehler: null })}>+ Gerät</Button></span>}>
            {d ? (
              d.geraete.length ? (
                <DataTable
                  columns={[
                    { key: "geraet", label: "Gerät", subKey: "bemerkung" },
                    { key: "anzahl", label: "Menge", numeric: true },
                    { key: "quelle", label: "Quelle", render: (r) => (r.zusatz ? <StatusPill status="info">{r.zusatz as string}</StatusPill> : <StatusPill status="neutral">Eigen</StatusPill>) },
                    { key: "kosten", label: "Mietkosten", numeric: true },
                    { key: "herleitung", label: "Herleitung", render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
                    {
                      key: "aktion",
                      label: <span className="pl-sr">Aktionen</span>,
                      printHidden: true,
                      render: (r) => {
                        const g = r.g as GeraetZeile;
                        return (
                          <span className="pl-actions">
                            <Button ariaLabel={`Gerät ${g.geraet} bearbeiten`} onClick={() => oeffnen({ art: "geraet", form: { id: g.id, geraetId: g.geraet_id ?? "", anzahl: zahlText(g.anzahl), bemerkung: g.bemerkung ?? "" }, fehler: null })}>Bearbeiten</Button>
                            <Button ariaLabel={`Gerät ${g.geraet} entfernen`} onClick={() => entfernen("anlass_geraet", g.id!, `Gerät ${g.geraet}`)}>Entfernen</Button>
                          </span>
                        );
                      },
                    },
                  ]}
                  rows={d.geraete.map((g) => ({ id: g.id, g, geraet: g.geraet, bemerkung: g.bemerkung, anzahl: formatZahl(g.anzahl ?? 0), zusatz: g.zusatzbedarf, kosten: (g.miete_anzahl ?? 0) > 0 ? chf(g.mietkosten_chf) : "–", herleitung: g.herleitung }))}
                />
              ) : (
                <p className="pl-muted">Noch keine Geräte erfasst.</p>
              )
            ) : null}
            <p className="pl-small">Annahme: Überschneiden sich Anlässe, bekommt der frühere Anlass den eigenen Bestand zuerst. Zusatzbedarf ist kein Fehler, sondern eine Miete.</p>
          </Card>

          <Card title="Kalkulation" meta={`${anlass.gaeste === null ? "[Gäste]" : formatZahl(anlass.gaeste)} Gäste · exkl. MWST · es gilt Ist, sonst Plan`}>
            <DataTable
              columns={[
                { key: "name", label: "Position", subKey: "herleitung" },
                { key: "plan", label: "Plan", numeric: true },
                { key: "ist", label: "Ist", numeric: true },
                { key: "gilt", label: "Es gilt", numeric: true, render: (r) => <span className={r.annahme ? "pl-assumed" : undefined}>{r.gilt as string}</span> },
                {
                  key: "aktion",
                  label: <span className="pl-sr">Aktionen</span>,
                  printHidden: true,
                  render: (r) => (r.aendern ? <Button ariaLabel={`${r.label as string} erfassen`} onClick={r.aendern as () => void}>Erfassen</Button> : null),
                },
              ]}
              rows={[
                {
                  id: "umsatz",
                  label: "Umsatz",
                  name: "Umsatz",
                  herleitung: anlass.umsatz_quelle === "offerte" ? "aus der bestätigten Offerte" : anlass.umsatz_quelle === "hand" ? "von Hand erfasst" : "Offerte oder Betrag von Hand fehlt",
                  plan: "",
                  ist: "",
                  gilt: chf(anlass.umsatz_chf, "[Umsatz]"),
                  aendern: anlass.umsatz_quelle === "offerte" ? null : () => oeffnen({ art: "umsatz", text: zahlText(anlass.umsatz_chf), fehler: null }),
                },
                ...(d?.kostenarten ?? []).map((k) => ({
                  id: k.art,
                  label: KOSTENART_LABEL[k.art ?? ""] ?? k.art,
                  name: `− ${KOSTENART_LABEL[k.art ?? ""] ?? k.art}`,
                  herleitung: k.herleitung ?? (k.art === "waren" || k.art === "personal" ? "noch nicht erfasst: ohne diesen Betrag gibt es keinen Deckungsbeitrag" : "nicht erfasst, zählt als 0"),
                  plan: k.plan_chf === null ? "" : chf(k.plan_chf),
                  ist: k.ist_chf === null ? "" : chf(k.ist_chf),
                  // Erfasst, aber unbekannt (Lohnsatz, Mietpreis oder Preis fehlt): [Preis]. Nicht erfasst bei den übrigen Kostenarten: zählt als 0.
                  gilt: k.gilt_chf === null ? (k.unvollstaendig || k.art === "waren" || k.art === "personal" ? "[Preis]" : "–") : chf(k.gilt_chf),
                  annahme: k.annahme,
                  aendern: () => oeffnen({ art: "kosten", form: { art: k.art ?? "", plan: zahlText(k.hand_plan_chf), ist: zahlText(k.ist_chf), berechnet: k.berechnet_chf, fehler: null } }),
                })),
                { id: "db", name: "Deckungsbeitrag", herleitung: anlass.db_chf === null ? `fehlt: ${anlass.fehlend ?? "Angaben"}` : `${prozent(anlass.db_pct, "[DB]")} · Ziel ${anlass.db_ziel_pct ?? "[Ziel]"} % (Annahme) · ${status.text}`, plan: "", ist: "", gilt: chf(anlass.db_chf, "[DB]"), annahme: anlass.annahme },
                { id: "fix", name: "− Fixkosten-Anteil", herleitung: anlass.fix_zuschlag_pct === null ? "Fixkosten oder variable Kosten des Monats unvollständig" : `Zuschlag rund ${prozent(anlass.fix_zuschlag_pct)} auf die variablen Kosten`, plan: "", ist: "", gilt: chf(anlass.fix_anteil_chf, "[Fixkosten]"), annahme: anlass.annahme },
                { id: "erg", name: "Ergebnis", herleitung: anlass.ergebnis_chf === null ? "" : `${prozent(anlass.ergebnis_pct, "[Ergebnis]")} vom Umsatz`, plan: "", ist: "", gilt: chf(anlass.ergebnis_chf, "[Ergebnis]"), annahme: anlass.annahme },
              ]}
            />
            <p className="pl-small">{anlass.herleitung}</p>
            <p className="pl-small">
              <span className="pl-assumed">gestrichelt</span> = Annahme, bitte prüfen: Warenkosten aus der Offerte geschätzt, oder Freelancer zum gleichen Satz wie eigenes Personal gerechnet.
              Zielwert Deckungsbeitrag ist eine Annahme und noch festzulegen. Energie am Anlass wird nicht gerechnet, sondern von Hand erfasst.
            </p>
          </Card>
        </>
      ) : (
        <p className="pl-muted" role="status">{hinweis || stamm ? "" : "Ressourcen werden geladen …"}</p>
      )}

      <Dialog
        open={offen}
        id="ressource"
        title={titel}
        onClose={() => setOffen(false)}
        onCancel={(e) => speichert && e.preventDefault()}
        actions={
          <>
            <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
            <Button variant="primary" onClick={speichern} disabled={speichert}>{speichert ? "Wird gespeichert …" : "Speichern"}</Button>
          </>
        }
      >
        {b?.art === "personal" ? (
          <>
            <div className="pl-grid-2">
              <TextField id="p-rolle" label="Rolle" value={b.form.rolle} onChange={(e) => setB({ ...b, form: { ...b.form, rolle: wert(e) }, fehler: null })} hint={stamm?.rollen.length ? `mit Lohnsatz: ${stamm.rollen.join(", ")}` : "Noch keine Lohnsätze erfasst (Stammdaten): Kosten stehen als [Preis]."} />
              <TextField id="p-stunden" numeric label="Stunden pro Person" value={b.form.stunden} onChange={(e) => setB({ ...b, form: { ...b.form, stunden: wert(e) }, fehler: null })} />
              <TextField id="p-eigen" numeric label="Anzahl eigen" value={b.form.eigen} onChange={(e) => setB({ ...b, form: { ...b.form, eigen: wert(e) }, fehler: null })} />
              <TextField id="p-frei" numeric label="Anzahl Freelancer" value={b.form.freelancer} onChange={(e) => setB({ ...b, form: { ...b.form, freelancer: wert(e) }, fehler: null })} hint="Zusatzbedarf aus dem Pool" />
              <TextField id="p-einsatz" label="Einsatz" value={b.form.einsatz} onChange={(e) => setB({ ...b, form: { ...b.form, einsatz: wert(e) }, fehler: null })} placeholder="17:30–23:30" />
              <TextField id="p-bemerkung" label="Bemerkung" value={b.form.bemerkung} onChange={(e) => setB({ ...b, form: { ...b.form, bemerkung: wert(e) }, fehler: null })} />
            </div>
            {b.fehler ? <Notice role="alert" title="Nicht gespeichert">{b.fehler}</Notice> : null}
          </>
        ) : b?.art === "geraet" ? (
          <>
            <div className="pl-grid-2">
              <Select
                id="g-geraet"
                label="Gerät"
                value={b.form.geraetId}
                onChange={(v) => setB({ ...b, form: { ...b.form, geraetId: v }, fehler: null })}
                options={[{ value: "", label: "[Gerät wählen]" }, ...(stamm?.geraete ?? []).map((g) => ({ value: g.id, label: `${g.name} (eigen ${g.anzahl_eigen})` }))]}
              />
              <TextField id="g-anzahl" numeric label="Anzahl" value={b.form.anzahl} onChange={(e) => setB({ ...b, form: { ...b.form, anzahl: wert(e) }, fehler: null })} />
              <TextField id="g-bemerkung" label="Bemerkung" value={b.form.bemerkung} onChange={(e) => setB({ ...b, form: { ...b.form, bemerkung: wert(e) }, fehler: null })} />
            </div>
            {b.fehler ? <Notice role="alert" title="Nicht gespeichert">{b.fehler}</Notice> : null}
          </>
        ) : b?.art === "kosten" ? (
          <>
            <p className="pl-small">
              {b.form.berechnet === null ? "Für diese Kostenart rechnet die Datenbank nichts." : `Berechnet: ${chf(b.form.berechnet)}. Ein Planbetrag von Hand kommt dazu.`} Ein Ist-Betrag ersetzt den ganzen Plan.
            </p>
            <div className="pl-grid-2">
              <TextField id="k-plan" numeric label="Plan von Hand CHF" value={b.form.plan} onChange={(e) => setB({ art: "kosten", form: { ...b.form, plan: wert(e), fehler: null } })} hint="leer = nichts von Hand geplant" />
              <TextField id="k-ist" numeric label="Ist CHF" value={b.form.ist} onChange={(e) => setB({ art: "kosten", form: { ...b.form, ist: wert(e), fehler: null } })} hint="nach dem Anlass, aus der Abrechnung" />
            </div>
            {b.form.fehler ? <Notice role="alert" title="Nicht gespeichert">{b.form.fehler}</Notice> : null}
          </>
        ) : b?.art === "umsatz" ? (
          <>
            <TextField id="u-umsatz" numeric label="Umsatz exkl. MWST CHF" value={b.text} onChange={(e) => setB({ ...b, text: wert(e), fehler: null })} hint="Für Anlässe ohne Offerte. Leer = [Umsatz]." />
            {b.fehler ? <Notice role="alert" title="Nicht gespeichert">{b.fehler}</Notice> : null}
          </>
        ) : null}
      </Dialog>
    </>
  );
}

export default function RessourcenSeite() {
  return (
    <Suspense>
      <Ressourcen />
    </Suspense>
  );
}
