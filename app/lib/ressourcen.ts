// Ressourcen und Kalkulation pro Anlass. Stunden, Kosten, Zusatzbedarf, Deckungsbeitrag und Fixkosten-Anteil
// rechnen die Views anlass_personal_kosten, anlass_geraet_bedarf, anlass_kostenart und anlass_kalkulation.
import type { Database } from "./database.types";
import { formatZahl } from "./format";

type V = Database["public"]["Views"];
export type Kalkulation = V["anlass_kalkulation"]["Row"];
export type PersonalZeile = V["anlass_personal_kosten"]["Row"];
export type GeraetZeile = V["anlass_geraet_bedarf"]["Row"];
export type Kostenart = V["anlass_kostenart"]["Row"];
export type Monat = V["monat_ergebnis"]["Row"];

export const KOSTENART_LABEL: Record<string, string> = {
  waren: "Waren", personal: "Personal", energie: "Energie", geraetemiete: "Gerätemiete", transport: "Transport", material: "Mietgeschirr und Material",
};

/** Betrag in CHF; unbekannt als Platzhalter mit dem Namen des fehlenden Werts. */
export function chf(wert: number | null | undefined, platzhalter = "[Preis]"): string {
  if (wert === null || wert === undefined) return platzhalter;
  const s = new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(wert));
  return `${wert < 0 ? "− " : ""}CHF ${s}`;
}

/** Prozentwert; unbekannt als Platzhalter mit dem Namen des fehlenden Werts, z.B. [DB]. */
export function prozent(wert: number | null | undefined, platzhalter = "[%]"): string {
  return wert === null || wert === undefined ? platzhalter : `${formatZahl(wert, 1)} %`;
}

/** Monat «2026-12-01» als «Dezember 2026». */
export function monatText(iso: string | null): string {
  if (!iso) return "[Monat]";
  const [j, m] = iso.split("-").map(Number);
  const namen = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  return `${namen[m - 1] ?? "[Monat]"} ${j}`;
}

const ganz = (t: string, min: number, max: number) => (/^\d+$/.test(t.trim()) && Number(t) >= min && Number(t) <= max ? Number(t) : null);
const leer = (s: string) => (s.trim() === "" ? null : s.trim());

export type PersonalForm = { id: string | null; rolle: string; eigen: string; freelancer: string; stunden: string; einsatz: string; bemerkung: string };

export function personalDaten(f: PersonalForm): { daten: { rolle: string; anzahl_eigen: number; anzahl_freelancer: number; stunden_pro_person: number; einsatz: string | null; bemerkung: string | null } } | { fehler: string } {
  if (f.rolle.trim() === "") return { fehler: "Rolle eingeben, z.B. Service." };
  const eigen = ganz(f.eigen || "0", 0, 999);
  const frei = ganz(f.freelancer || "0", 0, 999);
  if (eigen === null || frei === null) return { fehler: "Anzahl: ganze Zahlen ab 0." };
  if (eigen + frei === 0) return { fehler: "Mindestens eine Person eintragen (eigen oder Freelancer)." };
  const s = f.stunden.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s) || Number(s) <= 0 || Number(s) > 24) return { fehler: "Stunden pro Person: Zahl über 0 bis 24, z.B. 6.5." };
  return { daten: { rolle: f.rolle.trim(), anzahl_eigen: eigen, anzahl_freelancer: frei, stunden_pro_person: Number(s), einsatz: leer(f.einsatz), bemerkung: leer(f.bemerkung) } };
}

export type GeraetForm = { id: string | null; geraetId: string; anzahl: string; bemerkung: string };

export function geraetDaten(f: GeraetForm): { daten: { geraet_id: string; anzahl: number; bemerkung: string | null } } | { fehler: string } {
  if (!f.geraetId) return { fehler: "Gerät wählen." };
  const n = ganz(f.anzahl, 1, 9999);
  if (n === null) return { fehler: "Anzahl: ganze Zahl ab 1." };
  return { daten: { geraet_id: f.geraetId, anzahl: n, bemerkung: leer(f.bemerkung) } };
}

/** Betrag aus einem Feld: leer = null (nicht erfasst), ungültig = undefined. */
export function betrag(t: string): number | null | undefined {
  const s = t.trim().replace(",", ".").replace(/[’']/g, "");
  if (s === "") return null;
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : undefined;
}

/** Deckungsbeitrag gegen den Zielwert: erreicht = ok, darunter = warn, unbekannt = neutral. */
export function dbStatus(dbPct: number | null, ziel: number | null): { pill: "ok" | "warn" | "neutral"; text: string } {
  if (dbPct === null) return { pill: "neutral", text: "unvollständig" };
  if (ziel === null) return { pill: "neutral", text: "kein Zielwert" };
  return dbPct >= ziel ? { pill: "ok", text: "Ziel erreicht" } : { pill: "warn", text: "unter Ziel" };
}

export function fehlerText(e: { message: string; code?: string }): string {
  if (e.code === "23505" && /anlass_geraet/.test(e.message)) return "Dieses Gerät ist für den Anlass schon erfasst. Bitte die bestehende Zeile ändern.";
  return e.message;
}
