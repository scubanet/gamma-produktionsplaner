// Küchenpass: die Checkliste einer Welle zum Abhaken am Posten. Mengen und Termine kommen aus der Datenbank
// (View wellen_vorschlag), der Stand aus der Checkliste; hier wird nur gruppiert und gefiltert.
import { schluessel, type Aufgabe } from "./checkliste";
import type { Vorschlag } from "./wellen";

export type PassZeile = { komponenteId: string; komponente: string; kategorie: string; menge: number | null; einheit: string | null; nr: number };
export type PassWelle = { nr: number; datum: string | null; zeilen: PassZeile[] };
export type PassFilter = "offen" | "erledigt" | "alle";

/** Wellen des Vorschlags, aufsteigend; Datum = frühester Produktionstag der Welle. Zeilen ohne Komponente oder Welle fallen weg. */
export function passWellen(vorschlag: Vorschlag[]): PassWelle[] {
  const m = new Map<number, PassWelle>();
  for (const v of vorschlag) {
    if (!v.komponente_id || v.nr === null) continue;
    const w = m.get(v.nr) ?? { nr: v.nr, datum: null, zeilen: [] };
    if (v.produktion_am && (w.datum === null || v.produktion_am < w.datum)) w.datum = v.produktion_am;
    w.zeilen.push({ komponenteId: v.komponente_id, komponente: v.komponente ?? "[Komponente]", kategorie: v.kategorie ?? "[Kategorie]", menge: v.menge, einheit: v.einheit_total, nr: v.nr });
    m.set(v.nr, w);
  }
  return [...m.values()]
    .sort((a, b) => a.nr - b.nr)
    .map((w) => ({ ...w, zeilen: w.zeilen.sort((a, b) => a.kategorie.localeCompare(b.kategorie, "de-CH") || a.komponente.localeCompare(b.komponente, "de-CH")) }));
}

export const istErledigt = (z: PassZeile, aufgaben: Map<string, Aufgabe>): boolean => !!aufgaben.get(schluessel(z.komponenteId, z.nr))?.erledigt_am;

/** Stand einer Welle: wie viele Zeilen abgehakt sind. */
export function passStand(w: PassWelle, aufgaben: Map<string, Aufgabe>): { erledigt: number; total: number } {
  return { erledigt: w.zeilen.filter((z) => istErledigt(z, aufgaben)).length, total: w.zeilen.length };
}

/** Die Welle, die beim Öffnen gezeigt wird: die erste mit offenen Zeilen, sonst die letzte. */
export function ersteOffeneWelle(wellen: PassWelle[], aufgaben: Map<string, Aufgabe>): number | null {
  if (!wellen.length) return null;
  return (wellen.find((w) => w.zeilen.some((z) => !istErledigt(z, aufgaben))) ?? wellen[wellen.length - 1]).nr;
}

export function passFiltern(zeilen: PassZeile[], aufgaben: Map<string, Aufgabe>, filter: PassFilter): PassZeile[] {
  if (filter === "alle") return zeilen;
  return zeilen.filter((z) => istErledigt(z, aufgaben) === (filter === "erledigt"));
}

/** Zeilen nach Kategorie, in der Reihenfolge der Zeilen. */
export function nachKategorie(zeilen: PassZeile[]): { kategorie: string; zeilen: PassZeile[] }[] {
  const m = new Map<string, PassZeile[]>();
  for (const z of zeilen) m.set(z.kategorie, [...(m.get(z.kategorie) ?? []), z]);
  return [...m.entries()].map(([kategorie, zeilen]) => ({ kategorie, zeilen }));
}
