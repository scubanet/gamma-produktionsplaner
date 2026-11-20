"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Checkbox, DetailPanel, Dialog, Fieldset, Notice, Select, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import {
  fehlertext, formularAus, lagerartSetzen, sperreAus, umschalten, updateAus,
  type Formular, type Hinweis, type Regeneration, type System, type Zuteilung,
} from "@/lib/systemzuteilung";
import { fehlerText } from "@/lib/fehler";
import { istGeaendert } from "@/lib/ungespeichert";
import { Ungespeichert } from "./Ungespeichert";

type Props = {
  zeile: Zuteilung;
  hinweise: Hinweis[];
  systeme: System[];
  regenerationen: Regeneration[];
  onClose: () => void;
  /** Neuer Stand aus der Datenbank (nach Speichern oder nach einem Konflikt). */
  onAktualisiert: (zeile: Zuteilung, hinweise: Hinweis[], gespeichert: boolean) => void;
  /** Gespeichert, aber nicht nachgeladen: die Seite lädt alles neu. */
  onNeuLaden: () => void;
  /** Als Spalte neben der Liste statt als Dialog (breite Screens). Bleibt nach dem Speichern offen. */
  alsSpalte?: boolean;
  /** Nur in der Spalte: Angaben der Seite über dem Formular, z.B. Menge und Herleitung. */
  zusatz?: ReactNode;
  /** Meldet der Seite, ob es ungespeicherte Eingaben gibt (für useEingabenSchutz). */
  onGeaendert?: (geaendert: boolean) => void;
  /** Aus useEingabenSchutz: fragt vor dem Schliessen nach, wenn Eingaben verloren gingen. Ohne: schliesst direkt. */
  mitSchutz?: (weiter: () => void) => void;
  /** Nur in der Spalte: die nächste Zeile der Liste, für «Speichern und nächste». */
  naechste?: { name: string; weiter: () => void } | null;
  /** Nur in der Spalte: Stand der Arbeit, z.B. «noch 129 offen». */
  stand?: string;
};

const checked = (e: unknown) => (e as { target: HTMLInputElement }).target.checked;
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

async function nachladen(id: string) {
  const [z, h] = await Promise.all([
    supabase.from("komponente_zuteilung").select("*").eq("id", id).maybeSingle(),
    supabase.from("komponente_pruefhinweis").select("*").eq("komponente_id", id),
  ]);
  if (z.error || h.error) return { fehler: fehlerText(z.error ?? h.error) };
  return { zeile: z.data, hinweise: h.data ?? [] };
}

export function KomponenteBearbeiten({ zeile, hinweise, systeme, regenerationen, onClose, onAktualisiert, onNeuLaden, alsSpalte, zusatz, onGeaendert, mitSchutz, naechste, stand }: Props) {
  const [offen, setOffen] = useState(true);
  const [basis, setBasis] = useState<{ zeile: Zuteilung; hinweise: Hinweis[] }>({ zeile, hinweise });
  const [f, setF] = useState<Formular>(() => formularAus(zeile));
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);

  const produktionsSysteme = systeme.filter((s) => s.code !== "TK");
  const tk = systeme.find((s) => s.code === "TK");
  const set = (teil: Partial<Formular>) => setF((alt) => ({ ...alt, ...teil }));
  const id = basis.zeile.id!;

  const geaendert = istGeaendert(f, formularAus(basis.zeile));
  useEffect(() => {
    onGeaendert?.(geaendert);
    return () => onGeaendert?.(false);
  }, [geaendert, onGeaendert]);

  // Noch eingebaut? Ein laufendes «Speichern und nächste» darf nach dem Abbau nichts mehr umschalten.
  const lebt = useRef(true);
  useEffect(() => {
    lebt.current = true;
    return () => {
      lebt.current = false;
    };
  }, []);

  // Spalte: beim Öffnen geht der Fokus hinein (sie steht im Dokument nach der ganzen Liste), beim Schliessen zurück auf den Knopf der Zeile.
  const spalteRef = useRef<HTMLDivElement>(null);
  const ausloeser = useRef<Element | null>(null);
  useEffect(() => {
    if (!alsSpalte) return;
    let zeit: number | undefined;
    // Wurde über die Rückfrage «Verwerfen» hierher gewechselt, ist deren Dialog noch einen Moment offen: solange lässt sich
    // ausserhalb nichts fokussieren, und der Fokus läge auf einem Knopf des Dialogs. Warten, bis er zu ist (höchstens rund 1 s).
    const hinein = (versuche: number) => {
      if (document.querySelector("dialog[open]") && versuche > 0) return void (zeit = window.setTimeout(() => hinein(versuche - 1), 30));
      // Der Knopf der Zeile, von dem aus geöffnet wurde (nicht die Spalte selbst, falls der Effekt ein zweites Mal läuft).
      const ae = document.activeElement;
      if (ae && ae !== document.body && !spalteRef.current?.contains(ae)) ausloeser.current = ae;
      spalteRef.current?.focus({ preventScroll: true });
    };
    hinein(30);
    const spalte = spalteRef.current?.closest(".pl-split__detail");
    if (spalte) {
      // Neue Komponente: das Formular beginnt oben, nicht dort, wo die vorige gescrollt war.
      spalte.scrollTop = 0;
      // Steht die Seite noch am Anfang, liegt die Spalte samt «Speichern» unter dem Bildschirmrand: so weit scrollen, dass sie ganz
      // im Bild ist. Die Zeilen der Liste rücken dabei nur bis unter die Kopfzeile, die gewählte Zeile bleibt sichtbar.
      const r = spalte.getBoundingClientRect();
      const oben = parseFloat(getComputedStyle(spalte).top) || 0;
      const weit = Math.min(r.top - oben, r.bottom - window.innerHeight);
      if (weit > 0) window.scrollBy(0, weit);
    }
    return () => {
      window.clearTimeout(zeit);
      const a = ausloeser.current;
      if (!(a instanceof HTMLElement)) return;
      // Die Spalte ist hier schon aus dem Dokument. Wurde über die Rückfrage geschlossen, ist deren Dialog noch einen Moment
      // offen: warten, bis er zu ist. Steht danach wieder eine Spalte da (Wechsel der Zeile), bleibt der Fokus dort.
      const zurueck = (versuche: number) => {
        if (document.querySelector("dialog[open]") && versuche > 0) return void window.setTimeout(() => zurueck(versuche - 1), 30);
        if (document.querySelector(".pl-split__detail .pl-panel")) return;
        if (a.isConnected && (document.activeElement === document.body || !document.activeElement)) a.focus();
      };
      zurueck(30);
    };
  }, [alsSpalte]);

  // Dialog (schmale Bildschirme): Escape schon beim Tastendruck abfangen. Der Browser lässt das Schliessen eines Dialogs nur
  // einmal pro Bedienung abbrechen; ein drittes Escape schlösse ihn sonst ohne Rückfrage.
  const dialogEscape = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (alsSpalte) return;
    const taste = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const dialog = document.getElementById("komponente-bearbeiten-titel")?.closest("dialog");
      // Nur wenn der Bearbeiten-Dialog der oberste ist (nicht, wenn die Rückfrage darüber liegt).
      if (!dialog || !(e.target instanceof Node) || !dialog.contains(e.target) || (e.target as Element).closest?.("dialog") !== dialog) return;
      e.preventDefault();
      dialogEscape.current();
    };
    document.addEventListener("keydown", taste, true);
    return () => document.removeEventListener("keydown", taste, true);
  }, [alsSpalte]);

  const geschuetzt = (weiter: () => void) => (mitSchutz ? mitSchutz(weiter) : weiter());

  async function speichern(danach?: () => void) {
    const r = updateAus(f);
    if ("fehler" in r) return setFehler(r.fehler);
    setSpeichert(true);
    setFehler(null);

    let q = supabase.from("komponente").update(r.update).eq("id", id);
    for (const b of sperreAus(basis.zeile)) q = b.op === "is" ? q.is(b.spalte, null) : q.filter(b.spalte, "eq", b.wert);
    const u = await q.select("id");
    if (u.error) {
      setSpeichert(false);
      return setFehler(fehlertext(u.error));
    }

    const neu = await nachladen(id);
    setSpeichert(false);
    if ("fehler" in neu) {
      if (u.data.length) onNeuLaden();
      return setFehler(`${u.data.length ? "Gespeichert, aber" : "Nicht gespeichert und"} nicht neu geladen: ${neu.fehler}`);
    }
    if (!neu.zeile) return setFehler("Nicht gespeichert: Komponente nicht gefunden oder keine Berechtigung.");

    if (!u.data.length) {
      // Jemand anderes hat die Komponente inzwischen geändert: neuen Stand zeigen, Eingaben verwerfen.
      setBasis({ zeile: neu.zeile, hinweise: neu.hinweise });
      setF(formularAus(neu.zeile));
      onAktualisiert(neu.zeile, neu.hinweise, false);
      return setFehler("Nicht gespeichert: Die Komponente wurde inzwischen von jemand anderem geändert. Der aktuelle Stand ist geladen, bitte die Änderung erneut eingeben.");
    }
    onAktualisiert(neu.zeile, neu.hinweise, true);
    if (alsSpalte) {
      // Die Spalte bleibt offen und zeigt den gespeicherten Stand, oder geht zur nächsten Zeile.
      setBasis({ zeile: neu.zeile, hinweise: neu.hinweise });
      setF(formularAus(neu.zeile));
      if (danach && lebt.current) {
        onGeaendert?.(false);
        danach();
      }
    } else setOffen(false);
  }

  const titel = basis.zeile.name ?? "[Komponente]";
  const meta = `${basis.zeile.kategorie} · Excel-Zeile ${basis.zeile.quelle_zeile}`;
  const speichernButton = (
    <Button variant="primary" onClick={() => speichern()} disabled={speichert}>
      {speichert ? "Wird gespeichert …" : "Speichern"}
    </Button>
  );

  const inhalt = (
    <>
      {basis.hinweise.length ? (
        <div>
          <div className="pl-label">Prüfhinweise (gespeicherter Stand)</div>
          {basis.hinweise.map((h) => (
            <div key={h.code}>
              <StatusPill status={h.farbe === "rot" ? "critical" : "warn"}>{h.farbe}</StatusPill> {h.text}
            </div>
          ))}
        </div>
      ) : null}

      <Fieldset
        legend="Produktion"
        hint={
          <>
            <span className="pl-assumed">Haltbarkeiten</span> sind Annahmen aus der Excel:{" "}
            {produktionsSysteme.filter((s) => s.bemerkung).map((s) => `${s.code}: ${s.bemerkung}`).join(" · ")}. Keine Produktion = Status offen.
          </>
        }
      >
        {produktionsSysteme.map((s) => (
          <Checkbox
            key={s.code}
            label={`${s.code} · ${s.name} (${s.haltbarkeit_tage ? `${s.haltbarkeit_tage} Tage` : "vor Ort"})`}
            checked={f.produktion.includes(s.code)}
            onChange={(e) => set({ produktion: umschalten(f.produktion, s.code, checked(e), produktionsSysteme.map((x) => x.code)) })}
          />
        ))}
      </Fieldset>

      <Fieldset
        legend="Lagerung"
        hint={
          tk ? (
            <>
              TK: {tk.name}, <span className="pl-assumed">{tk.haltbarkeit_tage} Tage</span> (Annahme aus der Excel); {tk.bemerkung ?? ""}.
              Lagerung Tage ab 1 übersteuern die Haltbarkeit der Produktion; leer = Haltbarkeit aus der Produktion.
            </>
          ) : undefined
        }
      >
        <Checkbox label="0–2 °C" checked={f.lager_0_2} onChange={(e) => set(lagerartSetzen(f, "lager_0_2", checked(e)))} />
        <Checkbox label="TK" checked={f.lager_tk} onChange={(e) => set(lagerartSetzen(f, "lager_tk", checked(e)))} />
        <Checkbox label="Economat (trocken, bis 18 °C)" checked={f.lager_trocken} onChange={(e) => set(lagerartSetzen(f, "lager_trocken", checked(e)))} />
        <TextField id="lager-tage" label="Lagerung Tage" numeric value={f.lager_tage} onChange={(e) => set({ lager_tage: wert(e) })} placeholder="leer = aus Produktion" />
      </Fieldset>

      <Fieldset legend="Regeneration">
        {regenerationen.map((r) => (
          <Checkbox
            key={r.code}
            label={r.code === r.name ? r.name : `${r.code} · ${r.name}`}
            checked={f.regeneration.includes(r.code)}
            onChange={(e) => set({ regeneration: umschalten(f.regeneration, r.code, checked(e), regenerationen.map((x) => x.code)) })}
          />
        ))}
      </Fieldset>

      <div className="pl-grid-2">
        <Select
          id="cf-stufe"
          label="CF-Stufe"
          value={f.cf_stufe}
          onChange={(v) => set({ cf_stufe: v })}
          hint="CF 4 und 5 = Zukauf"
          options={[{ value: "", label: "keine Angabe" }, ...[0, 1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `CF ${n}` }))]}
        />
        <TextField id="bemerkung" label="Bemerkung" value={f.bemerkung} onChange={(e) => set({ bemerkung: wert(e) })} />
      </div>

      {fehler ? <Notice role="alert" title="Nicht gespeichert">{fehler}</Notice> : null}
    </>
  );

  useEffect(() => {
    dialogEscape.current = () => {
      if (!speichert) geschuetzt(() => setOffen(false));
    };
  });

  const hinweisGeaendert = <span className="pl-small" role="status">{geaendert ? "Ungespeicherte Änderungen" : ""}</span>;

  if (alsSpalte)
    return (
      <>
        <Ungespeichert geaendert={geaendert} />
        <div
          ref={spalteRef}
          tabIndex={-1}
          onKeyDown={(e) => {
            // Escape schliesst die Spalte, nie still: mit ungespeicherten Eingaben fragt die Seite nach.
            if (e.key !== "Escape" || e.defaultPrevented || speichert) return;
            e.preventDefault();
            geschuetzt(onClose);
          }}
        >
          <DetailPanel
            title={titel}
            meta={stand ? `${meta} · ${stand}` : meta}
            label={`Zuteilung ${titel}`}
            onClose={() => {
              if (!speichert) geschuetzt(onClose);
            }}
            actions={
              <>
                {speichernButton}
                {naechste ? (
                  <Button onClick={() => speichern(naechste.weiter)} disabled={speichert} ariaLabel={`Speichern und weiter zu ${naechste.name}`}>
                    Speichern und nächste
                  </Button>
                ) : null}
                <Button onClick={() => geschuetzt(onClose)} disabled={speichert}>Schliessen</Button>
                {hinweisGeaendert}
              </>
            }
          >
            {zusatz}
            {inhalt}
          </DetailPanel>
        </div>
      </>
    );

  return (
    <>
    <Ungespeichert geaendert={geaendert} />
    <Dialog
      open={offen}
      id="komponente-bearbeiten"
      title={titel}
      meta={meta}
      onClose={onClose}
      onCancel={(e) => {
        // Escape: während des Speicherns nichts; mit ungespeicherten Eingaben zuerst nachfragen.
        if (speichert) return e.preventDefault();
        if (!geaendert || !mitSchutz) return;
        e.preventDefault();
        mitSchutz(() => setOffen(false));
      }}
      actions={
        <>
          {hinweisGeaendert}
          <Button onClick={() => geschuetzt(() => setOffen(false))} disabled={speichert}>Abbrechen</Button>
          {speichernButton}
        </>
      }
    >
      {inhalt}
    </Dialog>
    </>
  );
}
