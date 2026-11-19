"use client";

import { useEffect, useState } from "react";
import { Notice, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatDatum, formatZahl } from "@/lib/format";
import { naechsterAnlass, rezepteStand, summe, wannText, wellenName, type LeitAnlass } from "@/lib/leitstand";

type Anlass = LeitAnlass & { saison: { name: string } | null };
type Welle = { saison_id: string | null; welle_nr: number | null; aufgaben: number | null; erledigt: number | null };
type Rezepte = { saison_id: string | null; rezepte: number | null; freigegeben: number | null };
type Daten = { ok: number; offen: number; zukauf: number; hinweise: number; anlaesse: Anlass[]; wellen: Welle[]; rezepte: Rezepte[] };

async function laden(): Promise<Daten> {
  const zaehlen = (status: string) => supabase.from("komponente_zuteilung").select("id", { count: "exact", head: true }).eq("status", status);
  const [ok, offen, zukauf, hinweise, anlaesse, wellen, rezepte] = await Promise.all([
    zaehlen("ok"),
    zaehlen("offen"),
    zaehlen("Zukauf"),
    supabase.from("komponente_pruefhinweis").select("komponente_id", { count: "exact", head: true }),
    supabase.from("anlass").select("id, name, datum, datum_bis, saison_id, saison(name)").order("datum"),
    supabase.from("leitstand_wellen").select("*").order("welle_nr"),
    supabase.from("leitstand_rezepte").select("*"),
  ]);
  for (const r of [ok, offen, zukauf, hinweise, anlaesse, wellen, rezepte]) if (r.error) throw r.error;
  return {
    ok: ok.count ?? 0,
    offen: offen.count ?? 0,
    zukauf: zukauf.count ?? 0,
    hinweise: hinweise.count ?? 0,
    anlaesse: (anlaesse.data ?? []) as unknown as Anlass[],
    wellen: wellen.data ?? [],
    rezepte: rezepte.data ?? [],
  };
}

const zeitraum = (a: LeitAnlass) => (a.datum_bis && a.datum_bis !== a.datum ? `${formatDatum(a.datum)}–${formatDatum(a.datum_bis)}` : formatDatum(a.datum));

export default function Leitstand() {
  const [d, setD] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    laden().then(setD, (e: Error) => setFehler(e.message));
  }, []);

  const naechster = d ? naechsterAnlass(d.anlaesse) : null;
  const saisonId = naechster?.saison_id ?? null;
  const wellen = d ? d.wellen.filter((w) => saisonId !== null && w.saison_id === saisonId) : [];
  const stand = summe(wellen);
  const rez = rezepteStand(d?.rezepte ?? [], saisonId);
  const saisonAnlaesse = d ? d.anlaesse.filter((a) => (saisonId ? a.saison_id === saisonId : true)) : [];
  const zahl = (n: number | undefined) => (d ? formatZahl(n ?? 0) : fehler ? "–" : "…");
  const zuteilung = d ? d.ok + d.offen + d.zukauf : 0;

  const aufgaben = [
    { zahl: zahl(d?.offen), titel: "Komponenten ohne Systemzuteilung", text: "Ohne Zuteilung keine Haltbarkeit, keine Welle, kein Startdatum", href: "/systemzuteilung/", ziel: "Zuteilen", herleitung: "Komponenten mit Status offen" },
    { zahl: zahl(d?.hinweise), titel: "Prüfhinweise", text: "Plausibilitätsregeln rot oder gelb, sperren nichts", href: "/systemzuteilung/", ziel: "Prüfen", herleitung: "Alle Prüfhinweise der Systemzuteilung" },
    { zahl: d ? `${formatZahl(stand.erledigt)} / ${formatZahl(stand.aufgaben)}` : zahl(undefined), titel: "Aufgaben in der Checkliste erledigt", text: "Eine Aufgabe pro Komponente und Welle", href: "/produktion/", ziel: "Produktion", herleitung: "Checkliste der Saison des nächsten Anlasses" },
    { zahl: d ? `${formatZahl(rez.freigegeben)} / ${formatZahl(rez.rezepte)}` : zahl(undefined), titel: "Rezepte der Saison freigegeben", text: "Werte aus nicht freigegebenen Rezepten sind gestrichelt wie Annahmen", href: "/rezepte/", ziel: "Rezepte", herleitung: "Rezepte der Komponenten im Bedarf der Saison des nächsten Anlasses" },
    { zahl: zahl(d?.zukauf), titel: "Komponenten im Zukauf", text: "CF-Stufe 4 oder 5, gehen in den Einkauf", href: "/einkauf/", ziel: "Einkauf", herleitung: "Komponenten mit Status Zukauf" },
  ];

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">GAMMA Catering{naechster?.saison ? ` · ${naechster.saison.name}` : ""}</div>
          <h1 className="pl-h1">Leitstand</h1>
        </div>
        {d ? (
          <div>
            <div className="pl-crumb">Nächster Anlass</div>
            <div className="pl-lead">{naechster ? `${naechster.name} · ${wannText(naechster)}` : "kein kommender Anlass erfasst"}</div>
          </div>
        ) : null}
      </header>

      {fehler ? <Notice role="alert" title="Daten nicht geladen">{fehler}</Notice> : null}

      <div className="pl-row">
        <div className="pl-col-main">
          <section>
            <h2 className="pl-section-title">Zu erledigen</h2>
            {aufgaben.map((a) => (
              <a key={a.titel} className="pl-todo" href={a.href}>
                <span className="pl-todo__zahl" title={`Herleitung: ${a.herleitung}`}>{a.zahl}</span>
                <span className="pl-todo__text">
                  <span className="pl-todo__titel">{a.titel}</span>
                  <span className="pl-small">{a.text}</span>
                </span>
                <span className="pl-todo__ziel">{a.ziel} →</span>
              </a>
            ))}
          </section>

          <section>
            <h2 className="pl-section-title">Produktionswellen{naechster ? ` ${naechster.name}` : ""}</h2>
            {wellen.length ? (
              wellen.map((w) => (
                <div key={w.welle_nr} className="pl-list-row">
                  <span className="pl-list-row__titel">{wellenName(w.welle_nr ?? 0)}</span>
                  <span
                    className="pl-progress"
                    role="progressbar"
                    aria-label={`${wellenName(w.welle_nr ?? 0)} erledigt`}
                    aria-valuemin={0}
                    aria-valuemax={w.aufgaben ?? 0}
                    aria-valuenow={w.erledigt ?? 0}
                  >
                    <span className="pl-progress__bar" style={{ width: `${w.aufgaben ? ((w.erledigt ?? 0) / w.aufgaben) * 100 : 0}%` }} />
                  </span>
                  <span className="pl-mono">{formatZahl(w.erledigt ?? 0)} / {formatZahl(w.aufgaben ?? 0)}</span>
                </div>
              ))
            ) : (
              <p className="pl-muted" role="status">{d ? "Noch keine Checkliste für diese Saison." : fehler ? "Keine Daten." : "Wird geladen …"}</p>
            )}
            <p className="pl-small">«Ohne Welle» sind Komponenten im Zukauf, ohne Zuteilung oder nur vor Ort.</p>
          </section>
        </div>

        <aside className="pl-col-side">
          <section>
            <h2 className="pl-section-title">Anlässe der Saison</h2>
            {saisonAnlaesse.length ? (
              saisonAnlaesse.map((a) => (
                <a key={a.id} className="pl-list-row" href={`/anlaesse/bearbeiten/?id=${a.id}`} aria-current={a.id === naechster?.id ? "true" : undefined}>
                  <span className="pl-list-row__titel">{a.name}</span>
                  <span className="pl-mono">{zeitraum(a)}</span>
                </a>
              ))
            ) : (
              <p className="pl-muted" role="status">{d ? "Noch keine Anlässe erfasst." : fehler ? "Keine Daten." : "Wird geladen …"}</p>
            )}
          </section>

          <section>
            <h2 className="pl-section-title">Zuteilung der Komponenten</h2>
            {d && zuteilung ? (
              <>
                <div className="pl-anteil" role="img" aria-label={`${d.ok} ok, ${d.offen} offen, ${d.zukauf} Zukauf`}>
                  <span className="pl-anteil__teil pl-pill--ok" style={{ flexGrow: d.ok }} />
                  <span className="pl-anteil__teil pl-pill--warn" style={{ flexGrow: d.offen }} />
                  <span className="pl-anteil__teil pl-pill--info" style={{ flexGrow: d.zukauf }} />
                </div>
                <div className="pl-actions">
                  <span><StatusPill status="ok">ok</StatusPill> <span className="pl-mono">{formatZahl(d.ok)}</span></span>
                  <span><StatusPill status="warn">offen</StatusPill> <span className="pl-mono">{formatZahl(d.offen)}</span></span>
                  <span><StatusPill status="info">Zukauf</StatusPill> <span className="pl-mono">{formatZahl(d.zukauf)}</span></span>
                </div>
              </>
            ) : (
              <p className="pl-muted" role="status">{d ? "Noch keine Komponenten." : fehler ? "Keine Daten." : "Wird geladen …"}</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
