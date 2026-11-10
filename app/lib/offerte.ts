// Offerte: Anlass mit Status «offerte» und Gerichten aus dem Katalog (Tabelle offerte_gericht).
// Mengen, Warenkosten, Preise, MWST und Deckungsbeitrag rechnen die Views offerte_position und
// offerte_summe. Die App zeigt an, prüft Eingaben und schreibt nur Kopf und Gerichte.
import type { Database } from "./database.types";
import { formatZahl } from "./format";

type T = Database["public"]["Tables"];
type V = Database["public"]["Views"];
export type Offerte = Pick<
  T["anlass"]["Row"],
  "id" | "nummer" | "name" | "kunde" | "datum" | "ort" | "gaeste" | "angebotsform" | "betrieb" | "bemerkung" | "status"
>;
export type Position = V["offerte_position"]["Row"];
export type Summe = V["offerte_summe"]["Row"];

export function formatChf(wert: number | null): string {
  if (wert === null) return "[Preis]";
  return `CHF ${new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(wert)}`;
}

export type Kopf = { name: string; kunde: string; datum: string; ort: string; gaeste: string; angebotsform: string; betrieb: string; bemerkung: string };

export function kopfAus(o: Offerte): Kopf {
  return {
    name: o.name,
    kunde: o.kunde ?? "",
    datum: o.datum ?? "",
    ort: o.ort ?? "",
    gaeste: o.gaeste === null ? "" : String(o.gaeste),
    angebotsform: o.angebotsform ?? "",
    betrieb: o.betrieb ?? "",
    bemerkung: o.bemerkung ?? "",
  };
}

const leerZuNull = (s: string) => (s.trim() === "" ? null : s.trim());

/** Kopf → Update für anlass. Prüft nur Formate; was fehlt, bleibt leer und erscheint als [Platzhalter]. */
export function kopfUpdate(k: Kopf): { update: T["anlass"]["Update"] } | { fehler: string } {
  if (k.name.trim() === "") return { fehler: "Anlass: bitte eine Bezeichnung eingeben." };
  let gaeste: number | null = null;
  if (k.gaeste.trim() !== "") {
    if (!/^\d+$/.test(k.gaeste.trim()) || Number(k.gaeste) < 1 || Number(k.gaeste) > 100000) return { fehler: "Gäste: ganze Zahl ab 1." };
    gaeste = Number(k.gaeste);
  }
  if (k.datum && !/^\d{4}-\d{2}-\d{2}$/.test(k.datum)) return { fehler: "Datum: bitte im Kalender wählen." };
  return {
    update: {
      name: k.name.trim(),
      kunde: leerZuNull(k.kunde),
      datum: k.datum || null,
      ort: leerZuNull(k.ort),
      gaeste,
      angebotsform: k.angebotsform || null,
      betrieb: k.betrieb || null,
      bemerkung: leerZuNull(k.bemerkung),
    },
  };
}

/** Anteil in Prozent («50», «33.3») → Bruchteil 0 < x ≤ 1; leer = gleich verteilen (null). undefined = ungültig. */
export function anteilAus(text: string): number | null | undefined {
  const t = text.trim().replace(",", ".").replace(/\s*%$/, "");
  if (t === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined;
  const p = Number(t);
  if (p <= 0 || p > 100) return undefined;
  return Math.round(p * 100) / 10000;
}

export function anteilText(anteil: number | null): string {
  return anteil === null ? "" : formatZahl(anteil * 100, Number.isInteger(anteil * 100) ? 0 : 2);
}

/** Positionen nach Gang gruppiert, Gänge in der Reihenfolge der Mengentypen. */
export function nachGang(positionen: Position[], mengentypen: string[]): { gang: string; positionen: Position[] }[] {
  const rang = (p: Position) => {
    const i = mengentypen.indexOf(p.mengentyp ?? "");
    return i < 0 ? mengentypen.length : i;
  };
  const sortiert = [...positionen].sort((a, b) => rang(a) - rang(b) || (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0));
  const gruppen: { gang: string; positionen: Position[] }[] = [];
  for (const p of sortiert) {
    const gang = p.gang ?? "[Gang]";
    const letzte = gruppen[gruppen.length - 1];
    if (letzte && letzte.gang === gang) letzte.positionen.push(p);
    else gruppen.push({ gang, positionen: [p] });
  }
  return gruppen;
}

export function heuteIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Datenbankmeldungen verständlich machen. */
export function fehlerText(e: { message: string; code?: string }): string {
  if (e.code === "23505" && /offerte_gericht/.test(e.message)) return "Dieses Gericht ist schon in der Offerte.";
  if (e.code === "23514" && /anteil/.test(e.message)) return "Anteil muss über 0 und höchstens 100 % sein.";
  return e.message;
}
