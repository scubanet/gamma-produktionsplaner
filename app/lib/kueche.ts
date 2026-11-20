// Küchenpass: die Checkliste einer Welle zum Abhaken am Posten. Mengen und Termine kommen aus der Datenbank
// (View wellen_vorschlag), der Stand aus der Checkliste; hier wird nur gruppiert und gefiltert.
import { schluessel, type Aufgabe, type ChecklisteZeile } from "./checkliste";
import type { Vorschlag } from "./wellen";
import { formatDatum } from "./format";
import { konservierungText, lagerart, type ZuteilungKurz } from "./produktionsliste";

export type PassZeile = { komponenteId: string; komponente: string; kategorie: string; menge: number | null; einheit: string | null; nr: number; haltbarBis: string | null };
export type PassWelle = { nr: number; datum: string | null; zeilen: PassZeile[] };
export type PassFilter = "offen" | "erledigt" | "alle";

/** Wellen des Vorschlags, aufsteigend; Datum = frühester Produktionstag der Welle. Zeilen ohne Komponente oder Welle fallen weg. */
export function passWellen(vorschlag: Vorschlag[]): PassWelle[] {
  const m = new Map<number, PassWelle>();
  for (const v of vorschlag) {
    if (!v.komponente_id || v.nr === null) continue;
    const w = m.get(v.nr) ?? { nr: v.nr, datum: null, zeilen: [] };
    if (v.produktion_am && (w.datum === null || v.produktion_am < w.datum)) w.datum = v.produktion_am;
    w.zeilen.push({ komponenteId: v.komponente_id, komponente: v.komponente ?? "[Komponente]", kategorie: v.kategorie ?? "[Kategorie]", menge: v.menge, einheit: v.einheit_total, nr: v.nr, haltbarBis: v.haltbar_bis });
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

/**
 * Haltbarkeit fürs Etikett, ab Produktionsdatum (Entscheid Dominik, 20.11.2026). Die Datenbank rechnet (Checkliste, Migration 40):
 * abgehakt = produziert an diesem Tag; sonst das Datum des Wellenplans; sonst der späteste Termin des Vorschlags.
 * Kennt die Checkliste die Spalten noch nicht (Migration fehlt), gilt wie zuvor «spätestens» aus dem Wellen-Vorschlag.
 */
export function passHaltbar(
  c: Partial<Pick<ChecklisteZeile, "haltbar_bis" | "haltbar_grundlage" | "haltbarkeit_tage" | "produktion_am" | "produziert_am">> | undefined,
  vorschlagBis: string | null,
): string {
  if (!c || c.haltbar_grundlage === undefined) return `haltbar bis spätestens ${vorschlagBis ? formatDatum(vorschlagBis) : "[Datum]"}`;
  if (c.haltbarkeit_tage == null) return "haltbar bis [Haltbarkeit]";
  if (!c.haltbar_bis) return "haltbar bis [Datum]";
  const bis = `haltbar bis ${formatDatum(c.haltbar_bis)}`;
  if (c.haltbar_grundlage === "produziert") return `produziert ${formatDatum(c.produziert_am ?? null)} · ${bis}`;
  if (c.haltbar_grundlage === "geplant") return `Produktion ${formatDatum(c.produktion_am ?? null)} geplant · ${bis}`;
  return `Produktion spätestens ${formatDatum(c.produktion_am ?? null)} · ${bis}`;
}

/** Konservierung und Lagerart aus der Systemzuteilung: «SF · SV · 0–2 °C»; ohne Zuteilung Platzhalter. */
export function passKonservierung(zuteilung: ZuteilungKurz | undefined): string {
  const text = zuteilung ? konservierungText({ produktion: zuteilung.produktion ?? [], lagerung: lagerart(zuteilung) }) : null;
  return text ?? "[Lagerung]";
}

/** Sprung zur Rezeptkarte im selben Fenster, mit Rückweg zur Welle (die Home-Bildschirm-App hat keine Tabs). */
export function passRezeptHref(slug: string, welle: number): string {
  return `/rezepte/?r=${encodeURIComponent(slug)}&von=kueche&welle=${welle}`;
}

/** «Stand 14:32»: wann der Pass zuletzt aus der Datenbank geladen wurde. */
export function standText(wann: Date | null): string {
  if (!wann) return "Stand [Zeit]";
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `Stand ${zwei(wann.getHours())}:${zwei(wann.getMinutes())}`;
}

/**
 * Frisch geladene Häkchen übernehmen, ausser für Zeilen, die gerade gespeichert werden:
 * dort gilt der Stand auf dem Gerät, bis die Antwort da ist.
 */
export function standUebernehmen<A>(geladen: Map<string, A>, jetzt: Map<string, A>, laufend: Iterable<string>): Map<string, A> {
  const neu = new Map(geladen);
  for (const k of laufend) {
    const a = jetzt.get(k);
    if (a === undefined) neu.delete(k);
    else neu.set(k, a);
  }
  return neu;
}
