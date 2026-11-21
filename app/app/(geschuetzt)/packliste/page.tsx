"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, DataTable, Dialog, EmptyState, KpiTile, Notice, SegmentedControl, Select, Skeleton, StatusPill, TextField, type DataTableColumn } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { fehlerText } from "@/lib/fehler";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { darf } from "@/lib/stufe";
import { useStufe } from "@/components/Anmeldung";
import { useBestaetigen } from "@/components/Bestaetigen";
import { nachschlagenPfad, scanCodeLesen } from "@/lib/scan-code";
import {
  entscheidOptionen, farbePill, gewichtText, kennzahlen, kisteGewichtText, kisteTitel, kistenOhneAnkunft, kistenZustand, logistikLuecken, logistikText, standText, transportartText,
  type Entscheid, type Kiste, type KisteGewicht, type Logistik, type OhneEtikett, type ScanAntwort, type Zeile,
} from "@/lib/packliste";

type Spiel = { id: string; name: string; datum: string | null; reihenfolge: number; anlass: { name: string; status: string } };
type Gebinde = { id: string; name: string };
type Beutel = { id: string; seriennummer: string; menge: number; einheit: string; klaeren: string | null; kiste_id: string | null; charge: { verbrauchen_bis: string } | null };
type Daten = { zeilen: Zeile[]; ohne: OhneEtikett[]; kisten: Kiste[]; gewicht: KisteGewicht[]; logistik: Logistik[]; beutel: Beutel[] };
type Ergebnis = ScanAntwort & { seriennummer?: string };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;
const pruefen = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw r.error;
  return r.data as T;
};

async function ladeSpiel(id: string): Promise<Daten> {
  const [zeilen, ohne, kisten, gewicht, logistik, beutel] = await Promise.all([
    supabase.from("packliste").select("*").eq("service_id", id).order("produkt").order("produkt_id").order("einheit"),
    supabase.from("packliste_ohne_etikett").select("*").eq("service_id", id).order("komponente").order("komponente_id"),
    supabase.from("etikett_kiste").select("*").eq("service_id", id).order("laufnummer"),
    supabase.from("kiste_gewicht").select("*").eq("service_id", id),
    supabase.from("logistik_gewicht").select("*").eq("service_id", id).order("sortierung"),
    supabase.from("lagereinheit").select("id, seriennummer, menge, einheit, klaeren, kiste_id, charge(verbrauchen_bis), kiste!inner(service_id)").eq("kiste.service_id", id).eq("zustand", "in_kiste").order("seriennummer"),
  ]);
  return { zeilen: pruefen(zeilen), ohne: pruefen(ohne), kisten: pruefen(kisten), gewicht: pruefen(gewicht), logistik: pruefen(logistik), beutel: pruefen(beutel) as unknown as Beutel[] };
}

function Seite() {
  const router = useRouter();
  const stufe = useStufe();
  const gewaehlt = useSearchParams().get("service") ?? "";
  const [spiele, setSpiele] = useState<Spiel[] | null>(null);
  const [gebinde, setGebinde] = useState<Gebinde[]>([]);
  const [daten, setDaten] = useState<{ fuer: string; d: Daten } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [meldung, setMeldung] = useState("");
  const meldungRef = useRef<HTMLParagraphElement>(null);
  // Kiste, in die gescannt wird (Code).
  const [aktiv, setAktiv] = useState("");
  const [modus, setModus] = useState<"ein" | "aus">("ein");
  const [eingabe, setEingabe] = useState("");
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [arbeitet, setArbeitet] = useState(false);
  const [anlegen, setAnlegen] = useState(false);
  const [abschluss, setAbschluss] = useState(false);
  const [nurGewicht, setNurGewicht] = useState(false);
  const [fragen, rueckfrage] = useBestaetigen();

  useEffect(() => {
    Promise.all([
      supabase.from("service").select("id, name, datum, reihenfolge, anlass!inner(name, status)").order("datum").order("reihenfolge"),
      supabase.from("gebinde").select("id, name").eq("aktiv", true).order("name"),
    ]).then(
      ([s, g]) => {
        if (s.error || g.error) return setFehler(fehlerText(s.error ?? g.error));
        // Offerten sind noch keine Anlässe: gepackt wird erst für bestätigte.
        setSpiele((s.data as unknown as Spiel[]).filter((x) => x.anlass.status !== "offerte"));
        setGebinde(g.data ?? []);
      },
      (e: Error) => setFehler(fehlerText(e)),
    );
  }, []);

  const spielId = gewaehlt || spiele?.[0]?.id || "";
  const spiel = spiele?.find((s) => s.id === spielId) ?? null;

  const neuLaden = useCallback(
    () =>
      spielId
        ? ladeSpiel(spielId).then(
            (d) => {
              setDaten({ fuer: spielId, d });
              setFehler(null);
            },
            (e: Error) => setFehler(fehlerText(e)),
          )
        : Promise.resolve(),
    [spielId],
  );
  useEffect(() => {
    neuLaden();
  }, [neuLaden]);

  const d = daten && daten.fuer === spielId ? daten.d : null;
  const kpi = kennzahlen(d?.zeilen ?? [], d?.kisten ?? []);
  const gewichtVon = useMemo(() => new Map((d?.gewicht ?? []).map((g) => [g.kiste_id, g])), [d]);
  const aktiveKiste = d?.kisten.find((k) => k.code === aktiv && k.zustand === "offen") ?? null;
  const beutelAktiv = aktiveKiste ? (d?.beutel ?? []).filter((b) => b.kiste_id === aktiveKiste.kiste_id) : [];
  const offeneKisten = (d?.kisten ?? []).filter((k) => k.zustand === "offen");
  const warten = fehler ? "–" : <Skeleton variant="zahl" />;
  const packen = stufe === "admin";

  const melden = (text: string) => {
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };
  const zumFeld = () => requestAnimationFrame(() => document.getElementById("packliste-code")?.focus());

  async function rufen(name: "beutel_einpacken" | "beutel_auspacken", args: Record<string, unknown>, seriennummer: string) {
    setArbeitet(true);
    const r = await supabase.rpc(name, args as never);
    setArbeitet(false);
    if (r.error) return setErgebnis({ ergebnis: "fehler", farbe: "rot", meldung: fehlerText(r.error) });
    setErgebnis({ ...(r.data as unknown as ScanAntwort), seriennummer });
    await neuLaden();
  }

  async function scannen(bestaetigt = false, seriennummer?: string) {
    const text = seriennummer ?? eingabe;
    const c = scanCodeLesen(text);
    setEingabe("");
    zumFeld();
    if (c.art === "unbekannt") return setErgebnis({ ergebnis: "unbekannt", farbe: "rot", meldung: "Unbekannter Code. Erwartet wird die Seriennummer eines Beutels oder der Code einer Kiste." });
    if (c.art === "kiste") {
      const k = d?.kisten.find((x) => x.code === c.code);
      if (!k) return setErgebnis({ ergebnis: "anderes_spiel", farbe: "rot", meldung: `Kiste ${c.code} gehört nicht zu diesem Spiel.` });
      if (k.zustand !== "offen") return setErgebnis({ ergebnis: "kiste_nicht_offen", farbe: "rot", meldung: `${kisteTitel(k)} ist ${kistenZustand(k.zustand).text}: einpacken geht nur in offene Kisten.` });
      setAktiv(c.code);
      return setErgebnis({ ergebnis: "kiste", farbe: "gruen", meldung: `${kisteTitel(k)} gewählt. Jetzt Beutel scannen.` });
    }
    if (modus === "aus") return rufen("beutel_auspacken", { p_seriennummer: c.seriennummer }, c.seriennummer);
    if (!aktiveKiste) return setErgebnis({ ergebnis: "keine_kiste", farbe: "rot", meldung: "Zuerst eine Kiste wählen, anlegen oder ihr Etikett scannen." });
    return rufen("beutel_einpacken", { p_seriennummer: c.seriennummer, p_kiste: aktiveKiste.code, p_bestaetigt: bestaetigt }, c.seriennummer);
  }

  const zeilenSpalten: DataTableColumn[] = [
    { key: "produkt", label: "Produkt", subKey: "produkt_code" },
    { key: "soll", label: "Soll", numeric: true, render: (r) => (r.status === "zusaetzlich" ? "–" : formatMenge(r.soll as number | null, r.einheit as string)) },
    { key: "ist", label: "Ist", numeric: true, render: (r) => formatMenge(r.ist as number, r.einheit as string) },
    { key: "beutel", label: "Beutel", numeric: true, render: (r) => formatZahl(r.beutel as number) },
    { key: "kisten", label: "Kisten", numeric: true, render: (r) => formatZahl(r.kisten as number) },
    {
      key: "status",
      label: "Stand",
      render: (r) => {
        const s = standText(r.status as string);
        return (
          <>
            {r.status === "ohne_soll" ? s.text : <StatusPill status={s.pill}>{s.text}</StatusPill>}
            {(r.zu_klaeren as number) > 0 ? <> <StatusPill status="warn">{`${formatZahl(r.zu_klaeren as number)} zu klären`}</StatusPill></> : null}
          </>
        );
      },
    },
    { key: "herleitung", label: "Herleitung", detail: true, render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
  ];

  const kistenSpalten: DataTableColumn[] = [
    { key: "laufnummer", label: "Kiste", subKey: "code", render: (r) => kisteTitel(r as unknown as Kiste) },
    { key: "produkt", label: "Inhalt", render: (r) => (r.produkt ? `${r.produkt as string} · ${r.produkt_code as string}` : "leer") },
    { key: "beutel", label: "Beutel", numeric: true, render: (r) => formatZahl(r.beutel as number) },
    { key: "menge_text", label: "Menge", numeric: true, render: (r) => (r.menge_text as string | null) ?? "–" },
    { key: "fruehestes_datum", label: "Frühestes Verbrauchsdatum", numeric: true, render: (r) => formatDatum(r.fruehestes_datum as string | null) },
    {
      key: "gewicht",
      label: "Gewicht",
      numeric: true,
      render: (r) => {
        const g = gewichtVon.get(r.kiste_id as string);
        return <span className={g?.liter_annahme ? "pl-assumed" : undefined} title={g?.herleitung ?? undefined}>{kisteGewichtText(g)}</span>;
      },
    },
    {
      key: "zustand",
      label: "Zustand",
      render: (r) => {
        const s = kistenZustand(r.zustand as string);
        return (
          <>
            <StatusPill status={s.pill}>{s.text}</StatusPill>
            {(r.zu_klaeren as number) > 0 ? <> <StatusPill status="warn">{`${formatZahl(r.zu_klaeren as number)} zu klären`}</StatusPill></> : null}
          </>
        );
      },
    },
    {
      key: "aktion",
      label: <span className="pl-sr">Aktionen</span>,
      printHidden: true,
      render: (r) => {
        const k = r as unknown as Kiste;
        const pfad = nachschlagenPfad({ art: "kiste", code: k.code ?? "" });
        return (
          <div className="pl-actions">
            {k.zustand === "offen" ? <Button ariaLabel={`${kisteTitel(k)} zum Einpacken wählen`} onClick={() => { setAktiv(k.code ?? ""); setModus("ein"); zumFeld(); }}>Wählen</Button> : null}
            {pfad ? <Button href={pfad} ariaLabel={`${kisteTitel(k)} nachschlagen`}>Ansehen</Button> : null}
            {k.zustand === "offen" || k.zustand === "angekommen" ? (
              <Button
                ariaLabel={`${kisteTitel(k)} auflösen`}
                onClick={() =>
                  fragen({
                    titel: `${kisteTitel(k)} auflösen?`,
                    text: `${formatZahl(k.beutel ?? 0)} Beutel gehen zurück ins Lager. Die Kiste zählt danach nicht mehr und lässt sich nicht wieder öffnen.`,
                    bestaetigen: "Auflösen",
                    aktion: async () => {
                      const a = await supabase.rpc("kiste_aufloesen", { p_kiste: k.code ?? "" });
                      if (a.error) return setFehler(fehlerText(a.error));
                      if (aktiv === k.code) setAktiv("");
                      melden(`${kisteTitel(k)} aufgelöst.`);
                      await neuLaden();
                    },
                  })
                }
              >
                Auflösen
              </Button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const logistikSpalten: DataTableColumn[] = [
    { key: "transportart", label: "Transport", render: (r) => transportartText(r.transportart as string | null) },
    { key: "soll_kisten", label: "Plan Kisten", numeric: true, render: (r) => (r.soll_kisten === null ? "[Kisten]" : `rund ${formatZahl(r.soll_kisten as number)}`) },
    { key: "soll_netto_kg", label: "Plan ohne Tara", numeric: true, render: (r) => <span className={r.liter_annahme ? "pl-assumed" : undefined}>{gewichtText(r.soll_netto_kg as number | null)}</span> },
    { key: "soll_brutto_kg", label: "Plan mit Tara", numeric: true, render: (r) => gewichtText(r.soll_brutto_kg as number | null) },
    { key: "ist_kisten", label: "Gepackt Kisten", numeric: true, render: (r) => formatZahl(r.ist_kisten as number) },
    { key: "ist_netto_kg", label: "Gepackt ohne Tara", numeric: true, render: (r) => gewichtText(r.ist_netto_kg as number | null) },
    { key: "ist_brutto_kg", label: "Gepackt mit Tara", numeric: true, render: (r) => gewichtText(r.ist_brutto_kg as number | null) },
    { key: "luecken", label: "Hinweise", render: (r) => <span className="pl-small">{logistikLuecken(r as unknown as Logistik).join("; ") || "–"}</span> },
    { key: "herleitung", label: "Herleitung", detail: true, render: (r) => <span className="pl-small">{r.herleitung as string}</span> },
  ];

  const rest = nurGewicht ? "pl-print-hide" : undefined;

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Produktion Hünenberg</div>
          <h1 className="pl-h1">Packliste</h1>
          <div className="pl-sub">{spiel ? `${spiel.anlass.name} · ${spiel.name}${spiel.datum ? ` · ${formatDatum(spiel.datum)}` : ""}` : "Beutel in sortenreine IFCO-Kisten scannen, pro Spiel."}</div>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button icon="print" onClick={() => window.print()}>Drucken</Button>
          {packen && d ? <Button onClick={() => setAbschluss(true)}>Spiel abschliessen</Button> : null}
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Packliste nicht geladen">{fehler}</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      {spiele && !spiele.length ? (
        <EmptyState title="Noch kein Spiel" text="Gepackt wird für die Services bestätigter Anlässe." {...(darf(stufe, "planen") ? { href: "/anlaesse/", actionLabel: "Anlässe" } : {})} />
      ) : (
        <>
          <div className="pl-print-hide">
            {spiele ? (
              <Select
                id="packliste-spiel"
                label="Spiel"
                value={spielId}
                onChange={(v) => {
                  setAktiv("");
                  setErgebnis(null);
                  router.replace(`/packliste/?service=${v}`);
                }}
                options={spiele.map((s) => ({ value: s.id, label: `${s.anlass.name} · ${s.name}${s.datum ? ` · ${formatDatum(s.datum)}` : ""}` }))}
              />
            ) : fehler ? null : (
              <Skeleton variant="zeile" label="Spiele werden geladen" />
            )}
          </div>

          <div className={`pl-grid-4${nurGewicht ? " pl-print-hide" : ""}`}>
            <KpiTile label="Produkte gepackt" value={d ? `${formatZahl(kpi.gepackt)} von ${formatZahl(kpi.imSoll)}` : warten} detail="Soll erreicht, nach Menge" />
            <KpiTile label="Kisten" value={d ? formatZahl(kpi.kisten) : warten} detail={d ? `${formatZahl(kpi.verladen)} verladen · ${formatZahl(kpi.angekommen)} angekommen` : undefined} />
            <KpiTile label="Zusätzlich gepackt" value={d ? formatZahl(kpi.zusaetzlich) : warten} detail="Produkte ausserhalb des Bedarfs, nach Bestätigung" />
            <KpiTile label="Zu klären" value={d ? formatZahl(kpi.zuKlaeren) : warten} detail="Beutel, ohne Netz gescannt, mit Abweichung" />
          </div>

          <div className="pl-print-hide">
            <Card
              title="Scannen oder eintippen"
              meta={aktiveKiste ? `In ${kisteTitel(aktiveKiste)} · ${aktiveKiste.code}${aktiveKiste.produkt ? ` · ${aktiveKiste.produkt}` : " · leer"}` : "Keine Kiste gewählt"}
              actions={<Button variant="primary" icon="plus" onClick={() => setAnlegen(true)} disabled={!d}>Kiste anlegen</Button>}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!arbeitet && eingabe.trim()) scannen();
                }}
              >
                <div className="pl-grid-3">
                  <div>
                    <div className="pl-label">Was tun</div>
                    <SegmentedControl label="Was tun" value={modus} onChange={(v) => setModus(v as "ein" | "aus")} options={[{ value: "ein", label: "Einpacken" }, { value: "aus", label: "Auspacken" }]} />
                  </div>
                  <Select
                    id="packliste-kiste"
                    label="Kiste"
                    value={aktiveKiste?.code ?? ""}
                    onChange={setAktiv}
                    hint="oder das Etikett der Kiste scannen"
                    options={[{ value: "", label: offeneKisten.length ? "Bitte wählen" : "Keine offene Kiste" }, ...offeneKisten.map((k) => ({ value: k.code ?? "", label: `${kisteTitel(k)} · ${k.code}${k.produkt ? ` · ${k.produkt}` : " · leer"}` }))]}
                  />
                  <TextField id="packliste-code" label="Code" code value={eingabe} onChange={(e) => setEingabe(wert(e))} autoComplete="off" hint="Handscanner oder Seriennummer unter dem QR-Code, dann Enter" />
                </div>
                <div className="pl-actions">
                  <Button variant="primary" type="submit" disabled={arbeitet || !eingabe.trim()}>{arbeitet ? "Wird geprüft …" : modus === "ein" ? "Einpacken" : "Auspacken"}</Button>
                </div>
              </form>
              {ergebnis ? (
                <Notice
                  role={ergebnis.farbe === "rot" ? "alert" : "status"}
                  title={<><StatusPill status={farbePill(ergebnis.farbe)}>{ergebnis.farbe === "gruen" ? "ok" : ergebnis.farbe === "gelb" ? "Achtung" : "nicht gebucht"}</StatusPill> {ergebnis.meldung}</>}
                  items={ergebnis.hinweise?.map((h) => h.text)}
                >
                  {ergebnis.bestaetigung && ergebnis.seriennummer ? (
                    <span className="pl-actions">
                      <Button onClick={() => scannen(true, ergebnis.seriennummer)} disabled={arbeitet}>Trotzdem einpacken</Button>
                    </span>
                  ) : null}
                </Notice>
              ) : null}
            </Card>
          </div>

          {aktiveKiste ? (
            <div className="pl-print-hide">
              <Card title={`Beutel in ${kisteTitel(aktiveKiste)}`} meta={`${aktiveKiste.code} · ${formatZahl(beutelAktiv.length)} Beutel`} actions={<Button onClick={() => setAktiv("")}>Schliessen</Button>}>
                {beutelAktiv.length ? (
                  <DataTable
                    columns={[
                      { key: "seriennummer", label: "Seriennummer", render: (r) => <span className="pl-mono">{r.seriennummer as string}</span> },
                      { key: "menge", label: "Menge", numeric: true, render: (r) => formatMenge(r.menge as number, r.einheit as string) },
                      { key: "bis", label: "Verbrauchen bis", numeric: true, render: (r) => formatDatum((r.charge as Beutel["charge"])?.verbrauchen_bis ?? null) },
                      { key: "klaeren", label: "Stand", render: (r) => (r.klaeren ? <StatusPill status="warn">zu klären</StatusPill> : "–") },
                      {
                        key: "aktion",
                        label: <span className="pl-sr">Aktionen</span>,
                        render: (r) => (
                          <div className="pl-actions">
                            {r.klaeren ? <Button ariaLabel={`Beutel ${r.seriennummer as string} in der Kiste lassen`} disabled={arbeitet} onClick={() => rufen("beutel_einpacken", { p_seriennummer: r.seriennummer, p_kiste: aktiveKiste.code, p_bestaetigt: true }, r.seriennummer as string)}>Bleibt drin</Button> : null}
                            <Button ariaLabel={`Beutel ${r.seriennummer as string} auspacken`} disabled={arbeitet} onClick={() => rufen("beutel_auspacken", { p_seriennummer: r.seriennummer }, r.seriennummer as string)}>Auspacken</Button>
                          </div>
                        ),
                      },
                    ]}
                    rows={beutelAktiv}
                  />
                ) : (
                  <p className="pl-muted">Die Kiste ist leer. Der erste Beutel legt das Produkt fest.</p>
                )}
              </Card>
            </div>
          ) : null}

          <div className={rest}>
            <Card title="Soll und Ist" meta="Mengen in der Einheit des Bedarfs. Das Soll ist erreicht, sobald die gescannte Menge reicht.">
              {d ? (
                d.zeilen.length ? (
                  <DataTable columns={zeilenSpalten} rows={d.zeilen.map((x) => ({ ...x, id: `${x.produkt_id}-${x.einheit}` }))} />
                ) : (
                  <EmptyState title="Nichts zu packen" text="Für dieses Spiel steht kein Produkt mit Etikett im Bedarf. Was ohne Etikett mitgeht, steht unten." />
                )
              ) : fehler ? (
                <p className="pl-muted">Keine Daten, siehe Hinweis oben.</p>
              ) : (
                <Skeleton variant="zeile" label="Packliste wird geladen" />
              )}
            </Card>

            <Card title="Kisten" meta="Jede Kiste gehört zu diesem Spiel und enthält ein Produkt.">
              {d ? (
                d.kisten.length ? (
                  <DataTable columns={kistenSpalten} rows={d.kisten.map((x) => ({ ...x, id: x.kiste_id }))} isSelected={(r) => !!aktiveKiste && r.code === aktiveKiste.code} />
                ) : (
                  <EmptyState title="Noch keine Kiste" text="«Kiste anlegen» erzeugt die Kiste mit Code und den Druckauftrag für ihr Etikett." actionLabel="Kiste anlegen" onAction={() => setAnlegen(true)} />
                )
              ) : fehler ? null : (
                <Skeleton variant="zeile" />
              )}
              <p className="pl-small"><span className="pl-assumed">Gewicht</span> gestrichelt: enthält Liter, gerechnet als 1 l = 1 kg (Annahme).</p>
            </Card>
          </div>

          <Card
            title="Gewicht für die Logistik"
            meta="Nur Speisen in IFCO-Kisten. Plan aus dem Bedarf, gepackt aus den gescannten Beuteln. Die Nutzlast prüft die App nicht."
            actions={
              d?.logistik.length && spiel ? (
                <span className="pl-print-hide pl-actions">
                  <Button
                    onClick={() =>
                      navigator.clipboard.writeText(logistikText({ anlass: spiel.anlass.name, service: spiel.name, datum: spiel.datum }, d.logistik)).then(
                        () => melden("Gewicht für die Logistik kopiert."),
                        () => setFehler("Kopieren hat nicht geklappt. Bitte «Gewicht drucken» verwenden."),
                      )
                    }
                  >
                    Text kopieren
                  </Button>
                  <Button
                    icon="print"
                    onClick={() => {
                      setNurGewicht(true);
                      // Erst drucken, wenn der Rest ausgeblendet ist.
                      setTimeout(() => {
                        window.print();
                        setNurGewicht(false);
                      }, 100);
                    }}
                  >
                    Gewicht drucken
                  </Button>
                </span>
              ) : undefined
            }
          >
            {d ? (
              d.logistik.length ? (
                <>
                  <DataTable columns={logistikSpalten} rows={d.logistik.map((x) => ({ ...x, id: x.transportart ?? "ohne" }))} />
                  <p className="pl-small">
                    «Ohne Lagerart»: Bei diesen Produkten fehlt die Lagerung in der Systemzuteilung. Ungekühlte Ware (Economat) kann mit dem gekühlten Transport mitfahren.
                    Ein Platzhalter steht, wo eine Angabe fehlt; siehe Hinweise.
                  </p>
                </>
              ) : (
                <p className="pl-muted">Kein Gewicht: nichts im Bedarf und nichts gepackt.</p>
              )
            ) : fehler ? null : (
              <Skeleton variant="zeile" />
            )}
          </Card>

          <div className={rest}>
            <Card title="Ohne Etikett" meta="Im Bedarf des Spiels, aber nicht gescannt: Zukauf, offene Zuteilung oder nur vor Ort.">
              {d ? (
                d.ohne.length ? (
                  <DataTable
                    columns={[
                      { key: "komponente", label: "Komponente", subKey: "kategorie" },
                      { key: "menge", label: "Bedarf", numeric: true, render: (r) => formatMenge(r.menge as number | null, r.einheit as string) },
                      { key: "grund", label: "Grund" },
                    ]}
                    rows={d.ohne.map((x) => ({ ...x, id: `${x.komponente_id}-${x.einheit}` }))}
                  />
                ) : (
                  <p className="pl-muted">Alle Komponenten des Spiels bekommen ein Etikett.</p>
                )
              ) : fehler ? null : (
                <Skeleton variant="zeile" />
              )}
            </Card>
          </div>
        </>
      )}

      {anlegen && spiel ? (
        <KisteAnlegen
          spiel={spiel}
          gebinde={gebinde}
          onClose={() => setAnlegen(false)}
          onAngelegt={async (code, text) => {
            await neuLaden();
            setAktiv(code);
            setModus("ein");
            melden(text);
          }}
        />
      ) : null}
      {abschluss && spiel && d ? (
        <Abschluss
          spiel={spiel}
          kisten={d.kisten}
          zuKlaeren={kpi.zuKlaeren}
          onClose={() => setAbschluss(false)}
          onFertig={async (text) => {
            setAktiv("");
            await neuLaden();
            melden(text);
          }}
        />
      ) : null}
      {rueckfrage}
    </>
  );
}

/** Kiste für das Spiel anlegen; die Höhe der IFCO (Gebinde) wird hier gewählt und liefert die Tara. */
function KisteAnlegen({ spiel, gebinde, onClose, onAngelegt }: { spiel: Spiel; gebinde: Gebinde[]; onClose: () => void; onAngelegt: (code: string, text: string) => void }) {
  const [offen, setOffen] = useState(true);
  const [wahl, setWahl] = useState(gebinde.length === 1 ? gebinde[0].id : "");
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  async function anlegen() {
    if (!wahl) return setFehler("Bitte das Gebinde der Kiste wählen.");
    setSpeichert(true);
    setFehler(null);
    const r = await supabase.rpc("kiste_erstellen", { p_service: spiel.id, p_gebinde: wahl });
    setSpeichert(false);
    if (r.error) return setFehler(fehlerText(r.error));
    const k = r.data as unknown as { code: string; laufnummer: number; gebinde: string };
    onAngelegt(k.code, `Kiste ${k.laufnummer} angelegt (${k.code}, ${k.gebinde}). Das Etikett steht in den Druckaufträgen.`);
    setOffen(false);
  }

  return (
    <Dialog
      open={offen}
      id="kiste-anlegen"
      title="Kiste anlegen"
      meta={`${spiel.anlass.name} · ${spiel.name}`}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
          <Button variant="primary" onClick={anlegen} disabled={speichert}>{speichert ? "Wird angelegt …" : "Anlegen"}</Button>
        </>
      }
    >
      {fehler ? <Notice role="alert" title="Nicht angelegt">{fehler}</Notice> : null}
      <Select
        id="kiste-gebinde"
        label="Gebinde"
        value={wahl}
        onChange={setWahl}
        hint="Höhe der IFCO-Kiste. Sie liefert die Tara und die Höchstbeladung."
        options={[{ value: "", label: "Bitte wählen" }, ...gebinde.map((g) => ({ value: g.id, label: g.name }))]}
      />
    </Dialog>
  );
}

/** Spiel abschliessen: Beutel angekommener Kisten sind verbraucht; Kisten ohne Ankunfts-Scan brauchen einen Entscheid. */
function Abschluss({ spiel, kisten, zuKlaeren, onClose, onFertig }: { spiel: Spiel; kisten: Kiste[]; zuKlaeren: number; onClose: () => void; onFertig: (text: string) => void }) {
  const [offen, setOffen] = useState(true);
  const ohne = kistenOhneAnkunft(kisten);
  const [entscheide, setEntscheide] = useState<Record<string, Entscheid | "">>({});
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const fehlt = ohne.some((k) => !entscheide[k.code ?? ""]);

  async function abschliessen() {
    setSpeichert(true);
    setFehler(null);
    const r = await supabase.rpc("service_abschliessen", { p_service: spiel.id, p_entscheide: entscheide });
    setSpeichert(false);
    if (r.error) return setFehler(fehlerText(r.error));
    const e = r.data as unknown as { kisten: number; verbraucht: number; zurueck_im_lager: number; entsorgt: number };
    onFertig(`${spiel.name} abgeschlossen: ${formatZahl(e.kisten)} Kisten, ${formatZahl(e.verbraucht)} Beutel verbraucht, ${formatZahl(e.zurueck_im_lager)} zurück im Lager, ${formatZahl(e.entsorgt)} entsorgt.`);
    setOffen(false);
  }

  return (
    <Dialog
      open={offen}
      id="spiel-abschliessen"
      title={`${spiel.name} abschliessen?`}
      meta={spiel.anlass.name}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          <Button variant="primary" onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
          <Button onClick={abschliessen} disabled={speichert || fehlt || zuKlaeren > 0}>{speichert ? "Wird abgeschlossen …" : "Abschliessen"}</Button>
        </>
      }
    >
      {fehler ? <Notice role="alert" title="Nicht abgeschlossen">{fehler}</Notice> : null}
      {zuKlaeren > 0 ? <Notice title={`${formatZahl(zuKlaeren)} Beutel sind noch zu klären`}>Zuerst auspacken oder in der Kiste bestätigen.</Notice> : null}
      <p>Die Beutel aller angekommenen Kisten gelten danach als verbraucht. Das lässt sich in der App nicht rückgängig machen.</p>
      {ohne.length ? (
        <>
          <p className="pl-small">Diese Kisten haben keinen Ankunfts-Scan. Bitte pro Kiste entscheiden. «Zurück ins Lager» gibt es nur für Kisten, die nie verladen wurden.</p>
          {ohne.map((k) => (
            <Select
              key={k.kiste_id}
              id={`entscheid-${k.code}`}
              label={`${kisteTitel(k)} · ${k.code} · ${k.produkt ?? "[Produkt]"} · ${formatZahl(k.beutel ?? 0)} Beutel · ${kistenZustand(k.zustand).text}`}
              value={entscheide[k.code ?? ""] ?? ""}
              onChange={(v) => setEntscheide((alt) => ({ ...alt, [k.code ?? ""]: v as Entscheid }))}
              options={[{ value: "", label: "Bitte wählen" }, ...entscheidOptionen(k.zustand)]}
            />
          ))}
        </>
      ) : null}
    </Dialog>
  );
}

export default function Packliste() {
  return (
    <Suspense>
      <Seite />
    </Suspense>
  );
}
