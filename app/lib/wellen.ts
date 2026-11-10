// Produktionswellen: Vorschlag (View wellen_vorschlag) und gespeicherter Plan (View wellenplan).
// Termine, Mengen und Prüfhinweise rechnet die Datenbank; die App gruppiert und zeigt an.
import type { Database } from "./database.types";

type V = Database["public"]["Views"];
export type Vorschlag = V["wellen_vorschlag"]["Row"];
export type PlanZeile = V["wellenplan"]["Row"];
export type Uebersicht = V["wellen_uebersicht"]["Row"];

export type VorschlagWelle = { nr: number; datum: string; zeilen: Vorschlag[] };

/** Vorschlag nach Produktionstag: ein Tag = eine Welle, nummeriert nach Datum. */
export function vorschlagNachTag(zeilen: Vorschlag[]): VorschlagWelle[] {
  const tage = [...new Set(zeilen.map((z) => z.produktion_am).filter((d): d is string => !!d))].sort();
  return tage.map((datum, i) => ({
    nr: i + 1,
    datum,
    zeilen: zeilen.filter((z) => z.produktion_am === datum).sort(nachKategorie),
  }));
}

export type PlanWelle = {
  welleId: string; nummer: number; datum: string | null; spaetestens: string | null; bemerkung: string | null;
  zeilen: PlanZeile[]; rot: number; gelb: number;
};

export function planNachWelle(zeilen: PlanZeile[]): PlanWelle[] {
  const wellen = new Map<string, PlanWelle>();
  for (const z of zeilen) {
    if (!z.welle_id) continue;
    const w = wellen.get(z.welle_id) ?? {
      welleId: z.welle_id, nummer: z.nummer ?? 0, datum: z.datum, spaetestens: z.spaetestens_am, bemerkung: z.bemerkung,
      zeilen: [], rot: 0, gelb: 0,
    };
    w.zeilen.push(z);
    if (z.hinweis_farbe === "rot") w.rot += 1;
    if (z.hinweis_farbe === "gelb") w.gelb += 1;
    wellen.set(z.welle_id, w);
  }
  return [...wellen.values()].sort((a, b) => a.nummer - b.nummer).map((w) => ({ ...w, zeilen: w.zeilen.sort(nachKategorie) }));
}

function nachKategorie(a: { kategorie: string | null; komponente: string | null }, b: { kategorie: string | null; komponente: string | null }) {
  return (a.kategorie ?? "").localeCompare(b.kategorie ?? "", "de-CH") || (a.komponente ?? "").localeCompare(b.komponente ?? "", "de-CH");
}

/** Prüfhinweis rot → critical, gelb → warn (wie in der Systemzuteilung). */
export function hinweisPill(farbe: string | null): "critical" | "warn" | null {
  return farbe === "rot" ? "critical" : farbe === "gelb" ? "warn" : null;
}

/** Neues Datum einer Welle prüfen (nur Format; ob es fachlich passt, sagen die Prüfhinweise). */
export function datumGueltig(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(Date.parse(iso));
}
