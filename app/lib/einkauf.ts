// Einkauf: Positionen und Artikel-Liste aus den Views einkauf_position / einkauf_artikel,
// Lieferanten mit Liefertagen, Bestellschluss und Vorlauf (Vorbild BestellApp).
import type { Database } from "./database.types";
import { formatDatum } from "./format";

type T = Database["public"]["Tables"];
type V = Database["public"]["Views"];
export type Lieferant = T["lieferant"]["Row"];
export type Position = V["einkauf_position"]["Row"];
export type ArtikelZeile = V["einkauf_artikel"]["Row"];
export type Summe = V["einkauf_summe"]["Row"];

export const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

/** Liefertage 1 = Montag … 7 = Sonntag als «Mo, Di, Fr»; leer = [Liefertage]. */
export function liefertageText(tage: number[] | null): string {
  const t = [...new Set(tage ?? [])].filter((x) => x >= 1 && x <= 7).sort((a, b) => a - b);
  return t.length ? t.map((x) => WOCHENTAGE[x - 1]).join(", ") : "[Liefertage]";
}

/** Zeitstempel ohne Zeitzone aus der Datenbank («2026-12-22T14:00:00») als «22.12.2026, 14 Uhr». */
export function bestellschlussText(ts: string | null): string {
  if (!ts) return "[Bestelltermin]";
  const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2})/.exec(ts);
  return m ? `${formatDatum(m[1])}, ${Number(m[2])} Uhr` : "[Bestelltermin]";
}

export type LieferantForm = {
  id: string | null; name: string; liefertage: number[]; bestellschluss: string; vorlauf: string;
  telefon: string; email: string; bemerkung: string; aktiv: boolean;
};

export function formAus(l: Lieferant | null): LieferantForm {
  return {
    id: l?.id ?? null, name: l?.name ?? "", liefertage: l?.liefertage ?? [], bestellschluss: String(l?.bestellschluss_stunde ?? 12),
    vorlauf: String(l?.vorlauf_tage ?? 1), telefon: l?.telefon ?? "", email: l?.email ?? "", bemerkung: l?.bemerkung ?? "", aktiv: l?.aktiv ?? true,
  };
}

const ganz = (t: string, min: number, max: number) => (/^\d+$/.test(t.trim()) && Number(t) >= min && Number(t) <= max ? Number(t) : null);
const leer = (s: string) => (s.trim() === "" ? null : s.trim());

export function lieferantDaten(f: LieferantForm): { daten: T["lieferant"]["Insert"] } | { fehler: string } {
  if (f.name.trim() === "") return { fehler: "Name des Lieferanten eingeben." };
  const stunde = ganz(f.bestellschluss, 0, 23);
  if (stunde === null) return { fehler: "Bestellschluss: volle Stunde von 0 bis 23." };
  const vorlauf = ganz(f.vorlauf, 0, 30);
  if (vorlauf === null) return { fehler: "Vorlauf: ganze Zahl Tage von 0 bis 30." };
  return {
    daten: {
      name: f.name.trim(), liefertage: [...f.liefertage].sort((a, b) => a - b), bestellschluss_stunde: stunde, vorlauf_tage: vorlauf,
      telefon: leer(f.telefon), email: leer(f.email), bemerkung: leer(f.bemerkung), aktiv: f.aktiv,
    },
  };
}

export type Gruppe<Z> = { titel: string; zeilen: Z[] };

/** Artikel-Zeilen nach Lieferant; ohne Lieferant unter [Lieferant] am Schluss. Darin nach Bestellschluss. */
export function nachLieferant(zeilen: ArtikelZeile[]): Gruppe<ArtikelZeile>[] {
  const g = new Map<string, ArtikelZeile[]>();
  for (const z of zeilen) g.set(z.lieferant ?? "", [...(g.get(z.lieferant ?? "") ?? []), z]);
  return [...g.entries()]
    .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "de-CH")))
    .map(([titel, z]) => ({
      titel: titel || "[Lieferant]",
      zeilen: z.sort((a, b) => (a.bestellen_bis ?? "9").localeCompare(b.bestellen_bis ?? "9") || (a.sortierung ?? 0) - (b.sortierung ?? 0) || (a.artikel ?? "").localeCompare(b.artikel ?? "", "de-CH")),
    }));
}

export function fehlerText(e: { message: string; code?: string }): string {
  if (e.code === "23505" && /lieferant_name_key/.test(e.message)) return "Einen Lieferanten mit diesem Namen gibt es schon.";
  if (e.code === "23503" && /artikel_lieferant_id_fkey/.test(e.message)) return "Dem Lieferanten sind noch Artikel zugeordnet.";
  return e.message;
}
