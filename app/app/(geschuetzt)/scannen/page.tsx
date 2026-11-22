"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, DataTable, EmptyState, Notice, ScanFlaeche, Select, Skeleton, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { fehlerArt, fehlerText } from "@/lib/fehler";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { kistenZustand, standText, type ScanAntwort, type Zeile } from "@/lib/packliste";
import { nachschlagenPfad, scanCodeLesen } from "@/lib/scan-code";
import { kameraFehler, kameraStarten, signal, type Kamera } from "@/lib/scan-kamera";
import {
  beutelVorpruefen, istWiederholung, kisteVorpruefen, kistenOffen, nachgesendet, offeneLesen, offenLoeschen, offenSpeichern, wartetText,
  type OffenerScan, type ScanInhalt, type ScanStufe, type Vorrat,
} from "@/lib/scan-offline";

type Spiel = { id: string; name: string; datum: string | null; anlass: { name: string; status: string } };
type Gebinde = { id: string; name: string };
type Modus = ScanStufe | "nachschlagen";
type Ergebnis = ScanAntwort & { seriennummer?: string; kisten_gescannt?: number; kisten_total?: number };

const STUFEN: { modus: Modus; titel: string; text: string }[] = [
  { modus: "packen", titel: "Packen", text: "Beutel in eine Kiste scannen" },
  { modus: "verladen", titel: "Verladen", text: "Kisten beim Beladen scannen" },
  { modus: "angekommen", titel: "Angekommen", text: "Kisten am Anlassort scannen" },
  { modus: "nachschlagen", titel: "Nachschlagen", text: "Angaben zu einem Beutel oder einer Kiste" },
];
const TON: Record<string, "ok" | "warn" | "fehler"> = { gruen: "ok", gelb: "warn", rot: "fehler" };
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

/** Packliste und Lagerbestand des Spiels, wie sie die vorläufige Prüfung ohne Netz braucht. */
async function vorratLaden(service: string): Promise<{ vorrat: Vorrat; zeilen: Zeile[] }> {
  const [kisten, zeilen, beutel] = await Promise.all([
    supabase.from("etikett_kiste").select("code, laufnummer, zustand, produkt_id, produkt, beutel").eq("service_id", service).order("laufnummer"),
    supabase.from("packliste").select("*").eq("service_id", service).order("produkt").order("produkt_id").order("einheit"),
    alleSeiten<{ seriennummer: string; zustand: string; kiste: { code: string } | null; charge: { produkt_id: string; produkt: { name: string } | null } | null }>((von, bis) =>
      supabase.from("lagereinheit").select("seriennummer, zustand, kiste(code), charge(produkt_id, produkt(name))").in("zustand", ["im_lager", "in_kiste"]).order("seriennummer").range(von, bis) as never,
    ),
  ]);
  if (kisten.error || zeilen.error) throw kisten.error ?? zeilen.error;
  return {
    zeilen: zeilen.data ?? [],
    vorrat: {
      kisten: (kisten.data ?? []).map((k) => ({ code: k.code ?? "", laufnummer: k.laufnummer ?? 0, zustand: k.zustand ?? "", produkt_id: k.produkt_id, produkt: k.produkt, beutel: k.beutel ?? 0 })),
      soll: (zeilen.data ?? []).filter((z) => z.status !== "zusaetzlich" && z.produkt_id).map((z) => z.produkt_id as string),
      beutel: beutel.map((b) => ({ seriennummer: b.seriennummer, zustand: b.zustand, kiste: b.zustand === "in_kiste" ? b.kiste?.code ?? null : null, produkt_id: b.charge?.produkt_id ?? "", produkt: b.charge?.produkt?.name ?? "[Produkt]" })),
    },
  };
}

export default function Scannen() {
  const router = useRouter();
  const [spiele, setSpiele] = useState<Spiel[] | null>(null);
  const [gebinde, setGebinde] = useState<Gebinde[]>([]);
  const [spielId, setSpielId] = useState("");
  const [modus, setModus] = useState<Modus | null>(null);
  const [ansicht, setAnsicht] = useState<"scan" | "fehlt">("scan");
  const [stand, setStand] = useState<{ vorrat: Vorrat; zeilen: Zeile[] } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [offen, setOffen] = useState<OffenerScan[]>([]);
  const [aktiv, setAktiv] = useState("");
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);
  const [kamera, setKamera] = useState<Kamera | null>(null);
  const [kameraHinweis, setKameraHinweis] = useState<string | null>(null);
  const [licht, setLicht] = useState(false);
  const [vonHand, setVonHand] = useState(false);
  const [eingabe, setEingabe] = useState("");
  const [neueKiste, setNeueKiste] = useState(false);
  const [gebindeWahl, setGebindeWahl] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const letzter = useRef<{ text: string; zeit: number } | null>(null);
  const beschaeftigt = useRef(false);
  // Der Kamera-Leser ruft immer die neuste Fassung von verarbeiten auf.
  const verarbeitenRef = useRef<(text: string, bestaetigt?: boolean) => void>(() => {});

  const spiel = spiele?.find((s) => s.id === spielId) ?? null;
  const scanModus = modus && modus !== "nachschlagen" ? modus : null;

  useEffect(() => {
    Promise.all([
      supabase.from("service").select("id, name, datum, reihenfolge, anlass!inner(name, status)").order("datum").order("reihenfolge"),
      supabase.from("gebinde").select("id, name").eq("aktiv", true).order("name"),
      offeneLesen(),
    ]).then(
      ([s, g, o]) => {
        if (s.error || g.error) return setFehler(fehlerText(s.error ?? g.error));
        const liste = (s.data as unknown as Spiel[]).filter((x) => x.anlass.status !== "offerte");
        setSpiele(liste);
        setSpielId((alt) => alt || liste[0]?.id || "");
        setGebinde(g.data ?? []);
        setOffen(o);
      },
      (e: Error) => setFehler(fehlerText(e)),
    );
  }, []);

  const standLaden = useCallback(
    (service: string) =>
      vorratLaden(service).then(
        (s) => {
          setStand(s);
          setFehler(null);
        },
        // Ohne Netz bleibt der zuletzt geladene Stand stehen.
        (e: Error) => fehlerArt(e) !== "verbindung" && setFehler(fehlerText(e)),
      ),
    [],
  );

  // Offene Scans senden, in der Reihenfolge, in der sie gescannt wurden. Bricht beim ersten Verbindungsfehler ab.
  const senden = useCallback(async () => {
    const liste = await offeneLesen();
    for (const s of liste) {
      if (s.fehler) continue;
      const r =
        s.art === "einpacken"
          ? await supabase.rpc("beutel_einpacken", { p_seriennummer: s.seriennummer, p_kiste: s.kiste, p_zeitpunkt: s.zeitpunkt, p_ohne_netz: true })
          : await supabase.rpc("scan_erfassen", { p_code: s.code, p_service: s.service, p_stufe: s.stufe, p_scan_nummer: s.id, p_quelle: "web", p_zeitpunkt: s.zeitpunkt });
      if (r.error) {
        if (fehlerArt(r.error) === "verbindung") break;
        // Die Datenbank lehnt den Aufruf ab (z.B. fehlende Berechtigung): stehen lassen und zeigen, nicht endlos wiederholen.
        await offenSpeichern({ ...s, fehler: fehlerText(r.error) });
        continue;
      }
      // Die Datenbank hat geantwortet, aber nicht gebucht (z.B. Kiste inzwischen aufgelöst): mit ihrer Meldung stehen lassen.
      const abgelehnt = nachgesendet(s, r.data as unknown as ScanAntwort & { zaehlt?: boolean });
      if (abgelehnt) {
        await offenSpeichern({ ...s, fehler: abgelehnt });
        continue;
      }
      await offenLoeschen(s.id);
    }
    const rest = await offeneLesen();
    setOffen(rest);
    return rest;
  }, []);

  useEffect(() => {
    const beiNetz = () => void senden();
    window.addEventListener("online", beiNetz);
    const takt = setInterval(() => navigator.onLine && offen.some((s) => !s.fehler) && void senden(), 20000);
    return () => {
      window.removeEventListener("online", beiNetz);
      clearInterval(takt);
    };
  }, [senden, offen]);

  const zeigen = useCallback((e: Ergebnis) => {
    setErgebnis(e);
    signal(e.farbe);
  }, []);

  /** Ohne Netz: vorläufig prüfen und, wenn es passt, in die Warteschlange legen. */
  const ohneNetz = useCallback(
    async (scan: ScanInhalt) => {
      if (!stand) return zeigen({ ergebnis: "ohne_stand", farbe: "rot", meldung: "Ohne Netz und ohne geladene Packliste lässt sich nicht scannen." });
      const v = scan.art === "einpacken" ? beutelVorpruefen(stand.vorrat, offen, scan.seriennummer, scan.kiste) : kisteVorpruefen(stand.vorrat, offen, scan.code, scan.stufe);
      if (v.buchen) {
        const neu = { ...scan, id: crypto.randomUUID(), zeitpunkt: new Date().toISOString(), service: spielId } as OffenerScan;
        await offenSpeichern(neu);
        setOffen(await offeneLesen());
      }
      zeigen(v);
    },
    [stand, offen, spielId, zeigen],
  );

  const verarbeiten = useCallback(
    async (text: string, bestaetigt = false) => {
      if (beschaeftigt.current || !modus) return;
      const c = scanCodeLesen(text);
      if (c.art === "unbekannt") return zeigen({ ergebnis: "unbekannt", farbe: "rot", meldung: "Unbekannter Code." });
      if (modus === "nachschlagen") {
        const pfad = nachschlagenPfad(c);
        if (pfad) router.push(pfad);
        return;
      }
      beschaeftigt.current = true;
      try {
        if (modus === "packen") {
          if (c.art === "kiste") {
            let k = stand?.vorrat.kisten.find((x) => x.code === c.code);
            if (!k) {
              // Vielleicht eben erst angelegt: Stand neu laden (ohne Netz bleibt es beim alten).
              const neu = await vorratLaden(spielId).catch(() => null);
              if (neu) setStand(neu);
              k = neu?.vorrat.kisten.find((x) => x.code === c.code);
            }
            if (!k) return zeigen({ ergebnis: "anderes_spiel", farbe: "rot", meldung: `Kiste ${c.code} gehört nicht zu diesem Spiel.` });
            if (k.zustand !== "offen") return zeigen({ ergebnis: "kiste_nicht_offen", farbe: "rot", meldung: `Kiste ${k.laufnummer} ist ${kistenZustand(k.zustand).text}: einpacken geht nur in offene Kisten.` });
            setAktiv(k.code);
            return zeigen({ ergebnis: "kiste", farbe: "gruen", meldung: `Kiste ${k.laufnummer} gewählt. Jetzt Beutel scannen.` });
          }
          if (!aktiv) return zeigen({ ergebnis: "keine_kiste", farbe: "rot", meldung: "Zuerst das Etikett einer Kiste scannen oder eine Kiste anlegen." });
          const r = await supabase.rpc("beutel_einpacken", { p_seriennummer: c.seriennummer, p_kiste: aktiv, p_bestaetigt: bestaetigt });
          if (r.error) {
            if (fehlerArt(r.error) === "verbindung") return await ohneNetz({ art: "einpacken", seriennummer: c.seriennummer, kiste: aktiv });
            return zeigen({ ergebnis: "fehler", farbe: "rot", meldung: fehlerText(r.error) });
          }
          zeigen({ ...(r.data as unknown as ScanAntwort), seriennummer: c.seriennummer });
          void standLaden(spielId);
          return;
        }
        // Verladen und Ankunft: nur Kisten.
        if (c.art !== "kiste") return zeigen({ ergebnis: "kein_kistencode", farbe: "rot", meldung: "Das ist ein Beutel. Hier werden Kisten gescannt." });
        const nummer = crypto.randomUUID();
        const r = await supabase.rpc("scan_erfassen", { p_code: c.code, p_service: spielId, p_stufe: modus, p_scan_nummer: nummer, p_quelle: "web" });
        if (r.error) {
          if (fehlerArt(r.error) === "verbindung") return await ohneNetz({ art: "kiste", code: c.code, stufe: modus });
          return zeigen({ ergebnis: "fehler", farbe: "rot", meldung: fehlerText(r.error) });
        }
        zeigen(r.data as unknown as Ergebnis);
        void standLaden(spielId);
      } finally {
        beschaeftigt.current = false;
      }
    },
    [modus, stand, aktiv, spielId, router, zeigen, ohneNetz, standLaden],
  );
  useEffect(() => {
    verarbeitenRef.current = verarbeiten;
  }, [verarbeiten]);

  // Kamera läuft, solange gescannt wird. Der Bildschirm bleibt an, wo der Browser das kann.
  const scannt = modus !== null && ansicht === "scan";
  useEffect(() => {
    if (!scannt || !videoRef.current) return;
    let gilt = true;
    let k: Kamera | null = null;
    let wach: { release: () => Promise<void> } | null = null;
    kameraStarten(videoRef.current, (text) => {
      const jetzt = Date.now();
      if (istWiederholung(letzter.current, text, jetzt)) return;
      letzter.current = { text, zeit: jetzt };
      verarbeitenRef.current(text);
    }).then(
      (neu) => {
        if (!gilt) return neu.stoppen();
        k = neu;
        setKamera(neu);
        setKameraHinweis(null);
      },
      (e) => gilt && setKameraHinweis(kameraFehler(e)),
    );
    (navigator as unknown as { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request("screen").then(
      (w) => (gilt ? (wach = w) : void w.release()),
      () => {},
    );
    return () => {
      gilt = false;
      k?.stoppen();
      void wach?.release();
      setKamera(null);
      setLicht(false);
    };
  }, [scannt]);

  function starten(m: Modus) {
    setErgebnis(null);
    setAktiv("");
    setAnsicht("scan");
    setVonHand(false);
    letzter.current = null;
    setStand(null);
    setModus(m);
    if (m !== "nachschlagen") void standLaden(spielId);
    void senden();
  }

  async function kisteAnlegen() {
    const wahl = gebindeWahl || (gebinde.length === 1 ? gebinde[0].id : "");
    if (!wahl) return zeigen({ ergebnis: "gebinde", farbe: "rot", meldung: "Bitte das Gebinde der Kiste wählen." });
    const r = await supabase.rpc("kiste_erstellen", { p_service: spielId, p_gebinde: wahl });
    if (r.error) return zeigen({ ergebnis: "fehler", farbe: "rot", meldung: fehlerArt(r.error) === "verbindung" ? "Kisten lassen sich nur mit Netz anlegen." : fehlerText(r.error) });
    const k = r.data as unknown as { code: string; laufnummer: number };
    await standLaden(spielId);
    setAktiv(k.code);
    setNeueKiste(false);
    zeigen({ ergebnis: "kiste", farbe: "gruen", meldung: `Kiste ${k.laufnummer} angelegt (${k.code}). Etikett aufkleben, dann Beutel scannen.` });
  }

  const aktiveKiste = stand?.vorrat.kisten.find((k) => k.code === aktiv) ?? null;
  const wartend = offen.filter((s) => s.art === "einpacken" && s.kiste === aktiv).length;
  const fehlend = useMemo(() => (stand && (modus === "verladen" || modus === "angekommen") ? kistenOffen(stand.vorrat, offen, modus) : []), [stand, offen, modus]);
  const wartet = wartetText(offen);

  // 1. Spiel und Stufe wählen.
  if (!modus) {
    return (
      <main className="pl-main">
        <header className="pl-head">
          <div>
            <div className="pl-crumb"><Link href="/packliste/">Packliste</Link></div>
            <h1 className="pl-h1">Scannen</h1>
            <div className="pl-sub">Spiel und Stufe wählen. Packliste und Lagerbestand werden dann geladen.</div>
          </div>
        </header>
        {fehler ? <Notice role="alert" title="Nicht geladen">{fehler}</Notice> : null}
        {wartet ? (
          <Notice role="status" title={wartet}>
            Sie werden gesendet, sobald das Gerät Netz hat und diese Seite offen ist.{" "}
            <span className="pl-actions"><Button onClick={() => void senden()}>Jetzt senden</Button></span>
          </Notice>
        ) : null}
        {spiele === null ? (
          fehler ? null : <Skeleton variant="karte" label="Spiele werden geladen" />
        ) : spiele.length ? (
          <>
            <Select id="scannen-spiel" label="Spiel" value={spielId} onChange={setSpielId} options={spiele.map((s) => ({ value: s.id, label: `${s.anlass.name} · ${s.name}${s.datum ? ` · ${formatDatum(s.datum)}` : ""}` }))} />
            <div className="pl-stack">
              {STUFEN.map((s) => (
                <Card key={s.modus} title={s.titel} meta={s.text} actions={<Button variant={s.modus === "nachschlagen" ? "secondary" : "primary"} ariaLabel={`${s.titel} starten`} onClick={() => starten(s.modus)}>Starten</Button>} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState title="Noch kein Spiel" text="Gescannt wird für die Services bestätigter Anlässe." />
        )}
      </main>
    );
  }

  const stufenTitel = STUFEN.find((s) => s.modus === modus)?.titel ?? "";

  // 4. Fehlt noch: was in dieser Stufe offen ist, und der Abschluss der Stufe.
  if (ansicht === "fehlt") {
    const offeneProdukte = (stand?.zeilen ?? []).filter((z) => z.status === "offen" || z.status === "ohne_soll");
    const nichts = modus === "packen" ? !offeneProdukte.length : !fehlend.length;
    return (
      <main className="pl-main">
        <header className="pl-head">
          <div>
            <div className="pl-crumb">{spiel ? `${spiel.anlass.name} · ${spiel.name}` : ""} · {stufenTitel}</div>
            <h1 className="pl-h1">Fehlt noch</h1>
          </div>
          <div className="pl-actions"><Button onClick={() => setAnsicht("scan")}>Zurück zum Scannen</Button></div>
        </header>
        {wartet ? <Notice role="alert" title={wartet}>Die Stufe lässt sich erst abschliessen, wenn alles gesendet ist. <span className="pl-actions"><Button onClick={() => void senden()}>Jetzt senden</Button></span></Notice> : null}
        {offen.some((s) => s.fehler) ? (
          <Card title="Scans mit Fehler" meta="Die Datenbank hat sie nicht gebucht. Beutel aus der Kiste nehmen oder mit Netz nochmals scannen, dann den Scan hier verwerfen.">
            <DataTable
              columns={[
                { key: "was", label: "Scan", render: (r) => <span className="pl-mono">{(r.seriennummer as string | undefined) ?? (r.code as string)}</span> },
                { key: "fehler", label: "Meldung" },
                { key: "aktion", label: <span className="pl-sr">Aktionen</span>, render: (r) => <Button ariaLabel="Scan verwerfen" onClick={async () => { await offenLoeschen(r.id as string); setOffen(await offeneLesen()); }}>Verwerfen</Button> },
              ]}
              rows={offen.filter((s) => s.fehler)}
            />
          </Card>
        ) : null}
        <Card title={modus === "packen" ? "Produkte, die noch fehlen" : `Kisten, die noch nicht ${modus === "verladen" ? "verladen" : "angekommen"} sind`} meta={stand ? undefined : "Stand nicht geladen"}>
          {nichts ? (
            <p className="pl-muted">{stand ? "Nichts offen." : "Ohne Netz und ohne geladenen Stand."}</p>
          ) : modus === "packen" ? (
            <DataTable
              columns={[
                { key: "produkt", label: "Produkt", subKey: "produkt_code" },
                { key: "soll", label: "Soll", numeric: true, render: (r) => formatMenge(r.soll as number | null, r.einheit as string) },
                { key: "ist", label: "Ist", numeric: true, render: (r) => formatMenge(r.ist as number, r.einheit as string) },
                { key: "status", label: "Stand", render: (r) => (r.status === "ohne_soll" ? "[Menge]" : <StatusPill status="info">{standText(r.status as string).text}</StatusPill>) },
              ]}
              rows={offeneProdukte.map((z) => ({ ...z, id: `${z.produkt_id}-${z.einheit}` }))}
            />
          ) : (
            <DataTable
              columns={[
                { key: "laufnummer", label: "Kiste", subKey: "code", render: (r) => `Kiste ${r.laufnummer as number}` },
                { key: "produkt", label: "Inhalt", render: (r) => (r.produkt as string | null) ?? "leer" },
                { key: "beutel", label: "Beutel", numeric: true, render: (r) => formatZahl(r.beutel as number) },
                { key: "zustand", label: "Zustand", render: (r) => kistenZustand(r.zustand as string).text },
              ]}
              rows={fehlend.map((k) => ({ ...k, id: k.code }))}
            />
          )}
          <p className="pl-small">«Fehlt noch» ist kein Fehler: Die Stufe lässt sich auch so beenden. Das Spiel selbst schliesst ein Admin auf der Packliste ab.</p>
        </Card>
        <div className="pl-actions">
          <Button variant="primary" disabled={offen.length > 0} onClick={() => setModus(null)}>{`${stufenTitel} beenden`}</Button>
          <Button href={`/packliste/?service=${spielId}`}>Zur Packliste</Button>
        </div>
      </main>
    );
  }

  // 3. Scannen (und 5. Nachschlagen): Kamera offen, die Fläche trägt das letzte Ergebnis.
  const zaehler =
    modus === "packen"
      ? aktiveKiste
        ? `Kiste ${aktiveKiste.laufnummer} · ${formatZahl(aktiveKiste.beutel + wartend)} Beutel`
        : "Keine Kiste"
      : scanModus && stand
        ? `${formatZahl(stand.vorrat.kisten.filter((k) => k.zustand !== "aufgeloest").length - fehlend.length)} von ${formatZahl(stand.vorrat.kisten.filter((k) => k.zustand !== "aufgeloest").length)} Kisten`
        : "";
  const bereit = modus === "packen" ? (aktiveKiste ? "Beutel scannen" : "Etikett einer Kiste scannen") : modus === "nachschlagen" ? "Beutel oder Kiste scannen" : "Kiste scannen";

  return (
    <ScanFlaeche
      tone={ergebnis ? TON[ergebnis.farbe] : "neutral"}
      label={`${stufenTitel} scannen`}
      kopf={
        <>
          <span>{spiel?.name ?? ""} · {stufenTitel}</span>
          <span>{zaehler}</span>
        </>
      }
      titel={ergebnis ? ergebnis.meldung : bereit}
      text={
        <>
          {aktiveKiste?.produkt && modus === "packen" ? <span>In der Kiste: {aktiveKiste.produkt}. </span> : null}
          {wartet ? <strong>{wartet}. </strong> : null}
          {kameraHinweis}
        </>
      }
      hinweise={ergebnis?.hinweise?.map((h) => h.text)}
      actions={
        <>
          {ergebnis?.bestaetigung && ergebnis.seriennummer ? <Button variant="primary" onClick={() => void verarbeiten(ergebnis.seriennummer as string, true)}>Trotzdem einpacken</Button> : null}
          {kamera?.licht ? <Button onClick={() => kamera.licht?.(!licht).then(() => setLicht(!licht), () => {})}>{licht ? "Licht aus" : "Taschenlampe"}</Button> : null}
          <Button onClick={() => setVonHand((v) => !v)}>Code eingeben</Button>
          {modus === "packen" ? <Button onClick={() => setNeueKiste((v) => !v)}>Neue Kiste</Button> : null}
          {scanModus ? <Button onClick={() => { setAnsicht("fehlt"); void standLaden(spielId); }}>Fehlt noch</Button> : <Button onClick={() => setModus(null)}>Zurück</Button>}
        </>
      }
    >
      <video ref={videoRef} aria-label="Kamerabild" />
      {vonHand || neueKiste ? (
        <div className="pl-scan__eingabe">
          {neueKiste ? (
            <div className="pl-stack">
              <Select id="scannen-gebinde" label="Gebinde der neuen Kiste" value={gebindeWahl || (gebinde.length === 1 ? gebinde[0].id : "")} onChange={setGebindeWahl} options={[{ value: "", label: "Bitte wählen" }, ...gebinde.map((g) => ({ value: g.id, label: g.name }))]} />
              <div className="pl-actions">
                <Button variant="primary" onClick={() => void kisteAnlegen()}>Kiste anlegen</Button>
                <Button onClick={() => setNeueKiste(false)}>Abbrechen</Button>
              </div>
            </div>
          ) : (
            <form
              className="pl-stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (!eingabe.trim()) return;
                void verarbeiten(eingabe);
                setEingabe("");
              }}
            >
              <TextField id="scannen-code" label="Code von Hand" code value={eingabe} onChange={(e) => setEingabe(wert(e))} autoComplete="off" hint="Seriennummer unter dem QR-Code oder Code der Kiste" />
              <div className="pl-actions">
                <Button variant="primary" type="submit" disabled={!eingabe.trim()}>Prüfen</Button>
                <Button onClick={() => setVonHand(false)}>Zur Kamera</Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </ScanFlaeche>
  );
}
