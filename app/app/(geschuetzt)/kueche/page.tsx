"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Meldezeile, Notice, SegmentedControl, Skeleton } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { aufgabenAus, schluessel, type Aufgabe, type ChecklisteZeile } from "@/lib/checkliste";
import { checklisteSpeichern } from "@/lib/checkliste-speichern";
import { ersteOffeneWelle, istErledigt, nachKategorie, passFiltern, passLager, passRezeptHref, passStand, passWellen, standText, standUebernehmen, type PassFilter, type PassZeile } from "@/lib/kueche";
import type { Vorschlag } from "@/lib/wellen";
import type { ZuteilungKurz } from "@/lib/produktionsliste";
import { fehlerText } from "@/lib/fehler";

type Daten = { saisonId: string; saison: string; vorschlag: Vorschlag[]; checkliste: ChecklisteZeile[] };

async function laden(): Promise<Daten | null> {
  // Pilot: eine Saison. Gibt es mehrere, die jüngste (wie im Wellenplan).
  const u = await supabase.from("wellen_uebersicht").select("saison_id, saison").order("saison", { ascending: false }).limit(1).maybeSingle();
  if (u.error) throw u.error;
  if (!u.data?.saison_id) return null;
  const s = u.data.saison_id;
  const [vorschlag, checkliste] = await Promise.all([
    alleSeiten<Vorschlag>((von, bis) => supabase.from("wellen_vorschlag").select("*").eq("saison_id", s).order("produktion_am").order("komponente_id").range(von, bis)),
    alleSeiten<ChecklisteZeile>((von, bis) => supabase.from("produktion_checkliste").select("*").eq("saison_id", s).gt("welle_nr", 0).order("komponente_id").order("welle_nr").range(von, bis)),
  ]);
  return { saisonId: s, saison: u.data.saison ?? "[Saison]", vorschlag, checkliste };
}

type Stamm = { zuteilung: Map<string, ZuteilungKurz>; slug: Map<string, string> };

/** Konservierung, Lagerart und Rezept je Komponente: ändert sich selten, darum nur einmal geladen (nicht jede Minute). */
async function stammLaden(): Promise<Stamm> {
  const [zuteilung, rezepte] = await Promise.all([
    alleSeiten<ZuteilungKurz>((von, bis) => supabase.from("komponente_zuteilung").select("id, produktion, lager_0_2, lager_tk, lager_trocken, rezept_id").order("id").range(von, bis)),
    alleSeiten<{ id: string; slug: string }>((von, bis) => supabase.from("rezept").select("id, slug").order("id").range(von, bis)),
  ]);
  return { zuteilung: new Map(zuteilung.flatMap((z) => (z.id ? [[z.id, z] as const] : []))), slug: new Map(rezepte.map((r) => [r.id, r.slug])) };
}

/** Meldung am unteren Rand: nach dem Abhaken mit «Rückgängig», nach einem Fehler mit «Nochmals versuchen». */
type Melde = { art: "ok" | "fehler"; text: string; z: PassZeile; an: boolean };
const MELDE_DAUER = 6000;

export default function Kuechenpass() {
  const [daten, setDaten] = useState<Daten | null | undefined>(undefined);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aufgaben, setAufgaben] = useState<Map<string, Aufgabe>>(new Map());
  // Rückweg von der Rezeptkarte: /kueche/?welle=2 öffnet wieder dieselbe Welle.
  const [wahl, setWahl] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const welle = Number(new URLSearchParams(window.location.search).get("welle"));
    return Number.isInteger(welle) && welle > 0 ? welle : null;
  });
  const [filter, setFilter] = useState<PassFilter>("offen");
  const [melde, setMelde] = useState<Melde | null>(null);
  const meldeZeit = useRef<number | undefined>(undefined);
  const meldeJetzt = useRef<Melde | null>(null);
  const stammDa = useRef(false);
  const [stamm, setStamm] = useState<Stamm | null>(null);
  const [stand0, setStand0] = useState<Date | null>(null);
  const [laedtNach, setLaedtNach] = useState(false);
  // Zeilen, die gerade gespeichert werden (mit Laufnummer des jüngsten Speicherns): ihr Häkchen darf ein Nachladen nicht überschreiben.
  const lauf = useRef(new Map<string, number>());
  // Zeilen, die seit dem Start des laufenden Nachladens angefasst wurden: das Nachladen hat sie womöglich vor dem Speichern gelesen.
  const beruehrt = useRef(new Set<string>());
  const laedt = useRef(false);

  /** Stand aus der Datenbank holen: Häkchen von anderen Geräten und geänderte Mengen. Scrollposition und Wahl bleiben. */
  const nachladen = useCallback((melden: boolean) => {
    if (laedt.current) return;
    laedt.current = true;
    setLaedtNach(true);
    // Zuteilung und Rezepte einmal holen; scheitert das, beim nächsten Nachladen nochmals. Der Pass selbst läuft auch ohne.
    if (!stammDa.current)
      stammLaden().then(
        (s) => {
          stammDa.current = true;
          setStamm(s);
        },
        () => undefined,
      );
    beruehrt.current = new Set(lauf.current.keys());
    laden()
      .then(
        (d) => {
          setDaten(d);
          setAufgaben((jetzt) => standUebernehmen(aufgabenAus(d?.checkliste ?? []), jetzt, new Set([...lauf.current.keys(), ...beruehrt.current])));
          setStand0(new Date());
          setFehler(null);
        },
        // Scheitert das stille Nachladen (z.B. kurz kein Netz), bleibt der letzte Stand mit seiner Uhrzeit stehen.
        (e: Error) => melden && setFehler(fehlerText(e)),
      )
      .finally(() => {
        laedt.current = false;
        setLaedtNach(false);
      });
  }, []);

  /** Eine Bestätigung verschwindet nach einigen Sekunden von selbst; ein Fehler bleibt, bis er geschlossen oder wiederholt wird. */
  const melden = useCallback((m: Melde | null) => {
    // Eine Bestätigung (auch die einer anderen Zeile) ersetzt keinen stehenden Fehler: sonst ginge «Nochmals versuchen» verloren.
    if (m?.art === "ok" && meldeJetzt.current?.art === "fehler") return;
    window.clearTimeout(meldeZeit.current);
    meldeJetzt.current = m;
    setMelde(m);
    if (m?.art === "ok")
      meldeZeit.current = window.setTimeout(() => {
        if (meldeJetzt.current !== m) return;
        meldeJetzt.current = null;
        setMelde(null);
      }, MELDE_DAUER);
  }, []);
  useEffect(() => () => window.clearTimeout(meldeZeit.current), []);

  useEffect(() => {
    nachladen(true);
    // Der Pass bleibt als App auf dem Home-Bildschirm über Stunden offen: nachladen, wenn er wieder sichtbar wird, und jede Minute.
    const sichtbar = () => document.visibilityState === "visible" && nachladen(false);
    document.addEventListener("visibilitychange", sichtbar);
    window.addEventListener("focus", sichtbar);
    const takt = window.setInterval(sichtbar, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", sichtbar);
      window.removeEventListener("focus", sichtbar);
      window.clearInterval(takt);
    };
  }, [nachladen]);

  const wellen = useMemo(() => passWellen(daten?.vorschlag ?? []), [daten]);
  // Beim Öffnen die erste Welle mit offenen Zeilen; danach bleibt die gewählte Welle, auch wenn sie fertig wird.
  const [startWelle, setStartWelle] = useState<number | null>(null);
  if (startWelle === null && wellen.length) setStartWelle(ersteOffeneWelle(wellen, aufgaben));
  const nr = wahl ?? startWelle;
  // Gibt es die gewählte Welle nach einem Nachladen nicht mehr (umgeplant), zeigt der Pass die erste offene.
  const welle = wellen.find((w) => w.nr === nr) ?? wellen.find((w) => w.nr === ersteOffeneWelle(wellen, aufgaben)) ?? null;
  const stand = welle ? passStand(welle, aufgaben) : { erledigt: 0, total: 0 };
  const gruppen = welle ? nachKategorie(passFiltern(welle.zeilen, aufgaben, filter)) : [];

  /** Abhaken für genau diese Welle; die Datenbank setzt Zeitpunkt und Person. Bei einem Fehler geht das Häkchen zurück. */
  async function abhaken(z: PassZeile, an: boolean) {
    if (!daten) return;
    // Nur die Meldung dieser Zeile räumen (z.B. beim Wiederholen); der Fehler einer anderen Zeile bleibt stehen.
    if (meldeJetzt.current?.art !== "fehler" || meldeJetzt.current.z === z) melden(null);
    const k = schluessel(z.komponenteId, z.nr);
    const vorher = aufgaben.get(k);
    const n = (lauf.current.get(k) ?? 0) + 1;
    lauf.current.set(k, n);
    beruehrt.current.add(k);
    setAufgaben((m) => new Map(m).set(k, { komponente_id: z.komponenteId, welle_nr: z.nr, zustaendig: m.get(k)?.zustaendig ?? null, erledigt_am: an ? new Date().toISOString() : null }));
    const r = await checklisteSpeichern(daten.saisonId, z.komponenteId, [z.nr], { erledigt_am: an ? new Date().toISOString() : null });
    // Wurde dieselbe Zeile inzwischen nochmals angetippt, zählt nur die jüngste Antwort.
    if (lauf.current.get(k) !== n) return;
    lauf.current.delete(k);
    if ("fehler" in r) {
      // Nur diese Zeile zurücksetzen: Häkchen anderer Zeilen, die inzwischen gespeichert sind, bleiben.
      setAufgaben((m) => {
        const neu = new Map(m);
        if (vorher) neu.set(k, vorher);
        else neu.delete(k);
        return neu;
      });
      return melden({ art: "fehler", text: `${z.komponente} nicht gespeichert: ${r.fehler}`, z, an });
    }
    setAufgaben((m) => {
      const neu = new Map(m);
      for (const a of r.zeilen) neu.set(schluessel(a.komponente_id, a.welle_nr), a);
      return neu;
    });
    melden({ art: "ok", text: an ? `${z.komponente} erledigt.` : `${z.komponente} wieder offen.`, z, an });
  }

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Produktion Hünenberg · {daten?.saison ?? <Skeleton variant="zahl" />}</div>
          <h1 className="pl-h1">{welle ? `Welle ${welle.nr}` : "Küchenpass"}</h1>
          {welle ? <div className="pl-sub">Produktion ab {welle.datum ? formatDatum(welle.datum) : "[Datum]"}</div> : null}
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Küchenpass nicht geladen">{fehler}</Notice> : null}
      {daten === null ? <Notice title="Keine Saison">Es gibt noch keine Saison mit Anlässen.</Notice> : null}
      {daten && !wellen.length ? (
        <Notice title="Noch keine Wellen">
          Wellen entstehen, sobald Komponenten eine Systemzuteilung mit Haltbarkeit haben. <a href="/systemzuteilung/">Zur Systemzuteilung</a>
        </Notice>
      ) : null}
      {daten === undefined && !fehler ? <Skeleton variant="zeile" label="Küchenpass wird geladen" /> : null}

      {welle ? (
        <>
          {wellen.length > 1 ? (
            <SegmentedControl
              label="Welle"
              value={String(welle.nr)}
              onChange={(v) => {
                setWahl(Number(v));
                // Die Adresse folgt der Wahl, damit ein Neuladen bei derselben Welle bleibt.
                window.history.replaceState(null, "", `/kueche/?welle=${v}`);
              }}
              options={wellen.map((w) => ({ value: String(w.nr), label: `Welle ${w.nr} · ${w.datum ? formatDatum(w.datum).slice(0, 6) : "[Datum]"}` }))}
            />
          ) : null}

          <div className="pl-list-row">
            <span className="pl-lead pl-mono">{formatZahl(stand.erledigt)} / {formatZahl(stand.total)}</span>
            <span className="pl-progress" role="progressbar" aria-label={`Welle ${welle.nr} erledigt`} aria-valuemin={0} aria-valuemax={stand.total} aria-valuenow={stand.erledigt}>
              <span className="pl-progress__bar" style={{ width: `${stand.total ? (stand.erledigt / stand.total) * 100 : 0}%` }} />
            </span>
          </div>
          <div className="pl-actions">
            <span className="pl-small">{standText(stand0)}; lädt jede Minute nach</span>
            <Button onClick={() => nachladen(true)}>{laedtNach ? "Wird geladen …" : "Aktualisieren"}</Button>
          </div>

          <SegmentedControl
            label="Anzeigen"
            value={filter}
            onChange={(v) => setFilter(v as PassFilter)}
            options={[{ value: "offen", label: "Noch offen" }, { value: "erledigt", label: "Erledigt" }, { value: "alle", label: "Alle" }]}
          />

          {gruppen.length ? (
            gruppen.map((g) => (
              <section key={g.kategorie}>
                <h2 className="pl-section-title">{g.kategorie}</h2>
                {g.zeilen.map((z) => {
                  const fertig = istErledigt(z, aufgaben);
                  const zustaendig = aufgaben.get(schluessel(z.komponenteId, z.nr))?.zustaendig;
                  const zuteilung = stamm?.zuteilung.get(z.komponenteId);
                  const lager = passLager(zuteilung, z.haltbarBis);
                  const slug = zuteilung?.rezept_id ? stamm?.slug.get(zuteilung.rezept_id) : undefined;
                  return (
                    <div key={z.komponenteId} className={fertig ? "pl-pass pl-pass--erledigt" : "pl-pass"}>
                      <label className="pl-pass__haken">
                        <input type="checkbox" checked={fertig} onChange={(e) => abhaken(z, e.target.checked)} />
                        <span className="pl-pass__text">
                          <span className="pl-pass__name">{z.komponente}</span>
                          <span className="pl-pass__lager">
                            {stamm ? (
                              <>
                                <span>{lager.konservierung}</span>
                                <span>{lager.haltbar}</span>
                              </>
                            ) : (
                              <Skeleton variant="zahl" />
                            )}
                          </span>
                          {zustaendig ? <span className="pl-small">{zustaendig}</span> : null}
                        </span>
                        <span className="pl-pass__menge">{formatMenge(z.menge, z.einheit)}</span>
                      </label>
                      {slug ? (
                        <a className="pl-pass__rezept" href={passRezeptHref(slug, z.nr)} aria-label={`Rezept ${z.komponente}`}>Rezept</a>
                      ) : null}
                    </div>
                  );
                })}
              </section>
            ))
          ) : (
            <p className="pl-muted" role="status">
              {filter === "offen" ? `Welle ${welle.nr} ist fertig: alle ${formatZahl(stand.total)} Komponenten sind abgehakt.` : filter === "erledigt" ? "Noch nichts abgehakt." : "Keine Komponenten in dieser Welle."}
            </p>
          )}

          <p className="pl-small">
            Menge aus dem Wellen-Vorschlag. «Haltbar bis spätestens» rechnet ab dem spätesten Produktionstag der Welle; wird früher produziert, endet die Haltbarkeit früher. Zuständig und Termine ändern im <a href="/produktion/wellen/">Wellenplan</a>.
          </p>
        </>
      ) : null}

      <Meldezeile
        tone={melde?.art === "fehler" ? "fehler" : "status"}
        actionLabel={melde ? (melde.art === "fehler" ? "Nochmals versuchen" : "Rückgängig") : undefined}
        onAction={() => melde && abhaken(melde.z, melde.art === "fehler" ? melde.an : !melde.an)}
        onClose={() => melden(null)}
      >
        {melde?.text}
      </Meldezeile>
    </>
  );
}
