"use client";

import { useEffect, useMemo, useState } from "react";
import { Notice, SegmentedControl, Skeleton } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { aufgabenAus, schluessel, type Aufgabe, type ChecklisteZeile } from "@/lib/checkliste";
import { checklisteSpeichern } from "@/lib/checkliste-speichern";
import { ersteOffeneWelle, istErledigt, nachKategorie, passFiltern, passStand, passWellen, type PassFilter, type PassZeile } from "@/lib/kueche";
import type { Vorschlag } from "@/lib/wellen";
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

export default function Kuechenpass() {
  const [daten, setDaten] = useState<Daten | null | undefined>(undefined);
  const [fehler, setFehler] = useState<string | null>(null);
  const [aufgaben, setAufgaben] = useState<Map<string, Aufgabe>>(new Map());
  const [wahl, setWahl] = useState<number | null>(null);
  const [filter, setFilter] = useState<PassFilter>("offen");
  const [meldung, setMeldung] = useState("");
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null);

  useEffect(() => {
    laden().then(
      (d) => {
        setDaten(d);
        setAufgaben(aufgabenAus(d?.checkliste ?? []));
      },
      (e: Error) => setFehler(fehlerText(e)),
    );
  }, []);

  const wellen = useMemo(() => passWellen(daten?.vorschlag ?? []), [daten]);
  // Beim Öffnen die erste Welle mit offenen Zeilen; danach bleibt die gewählte Welle, auch wenn sie fertig wird.
  const [startWelle, setStartWelle] = useState<number | null>(null);
  if (startWelle === null && wellen.length) setStartWelle(ersteOffeneWelle(wellen, aufgaben));
  const nr = wahl ?? startWelle;
  const welle = wellen.find((w) => w.nr === nr) ?? null;
  const stand = welle ? passStand(welle, aufgaben) : { erledigt: 0, total: 0 };
  const gruppen = welle ? nachKategorie(passFiltern(welle.zeilen, aufgaben, filter)) : [];

  /** Abhaken für genau diese Welle; die Datenbank setzt Zeitpunkt und Person. Bei einem Fehler geht das Häkchen zurück. */
  async function abhaken(z: PassZeile, an: boolean) {
    if (!daten) return;
    setSpeicherFehler(null);
    const k = schluessel(z.komponenteId, z.nr);
    const vorher = new Map(aufgaben);
    setAufgaben((m) => new Map(m).set(k, { komponente_id: z.komponenteId, welle_nr: z.nr, zustaendig: m.get(k)?.zustaendig ?? null, erledigt_am: an ? new Date().toISOString() : null }));
    const r = await checklisteSpeichern(daten.saisonId, z.komponenteId, [z.nr], { erledigt_am: an ? new Date().toISOString() : null });
    if ("fehler" in r) {
      setAufgaben(vorher);
      setMeldung("");
      return setSpeicherFehler(`${z.komponente}: ${r.fehler}. Bitte nochmals abhaken.`);
    }
    setAufgaben((m) => {
      const neu = new Map(m);
      for (const a of r.zeilen) neu.set(schluessel(a.komponente_id, a.welle_nr), a);
      return neu;
    });
    setMeldung(an ? `${z.komponente} erledigt.` : `${z.komponente} wieder offen.`);
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
      {speicherFehler ? <Notice role="alert" title="Nicht gespeichert">{speicherFehler}</Notice> : null}
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
              onChange={(v) => setWahl(Number(v))}
              options={wellen.map((w) => ({ value: String(w.nr), label: `Welle ${w.nr} · ${w.datum ? formatDatum(w.datum).slice(0, 6) : "[Datum]"}` }))}
            />
          ) : null}

          <div className="pl-list-row">
            <span className="pl-lead pl-mono">{formatZahl(stand.erledigt)} / {formatZahl(stand.total)}</span>
            <span className="pl-progress" role="progressbar" aria-label={`Welle ${welle.nr} erledigt`} aria-valuemin={0} aria-valuemax={stand.total} aria-valuenow={stand.erledigt}>
              <span className="pl-progress__bar" style={{ width: `${stand.total ? (stand.erledigt / stand.total) * 100 : 0}%` }} />
            </span>
          </div>

          <SegmentedControl
            label="Anzeigen"
            value={filter}
            onChange={(v) => setFilter(v as PassFilter)}
            options={[{ value: "offen", label: "Noch offen" }, { value: "erledigt", label: "Erledigt" }, { value: "alle", label: "Alle" }]}
          />

          <p className="pl-small" role="status">{meldung}</p>

          {gruppen.length ? (
            gruppen.map((g) => (
              <section key={g.kategorie}>
                <h2 className="pl-section-title">{g.kategorie}</h2>
                {g.zeilen.map((z) => {
                  const fertig = istErledigt(z, aufgaben);
                  const zustaendig = aufgaben.get(schluessel(z.komponenteId, z.nr))?.zustaendig;
                  return (
                    <label key={z.komponenteId} className={fertig ? "pl-pass pl-pass--erledigt" : "pl-pass"}>
                      <input type="checkbox" checked={fertig} onChange={(e) => abhaken(z, e.target.checked)} />
                      <span className="pl-pass__text">
                        <span className="pl-pass__name">{z.komponente}</span>
                        {zustaendig ? <span className="pl-small">{zustaendig}</span> : null}
                      </span>
                      <span className="pl-pass__menge">{formatMenge(z.menge, z.einheit)}</span>
                    </label>
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
            Menge aus dem Wellen-Vorschlag. Zuständig und Termine ändern im <a href="/produktion/wellen/">Wellenplan</a>.
          </p>
        </>
      ) : null}
    </>
  );
}
