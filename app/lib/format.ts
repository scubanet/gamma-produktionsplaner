// Anzeigeformate nach README des Design Systems: 2.40 kg, 14.11.2026, Tausender mit Apostroph.
// Nur Formatierung, keine Berechnung: Mengen kommen fertig aus der Datenbank.

const zahl = (stellen: number) =>
  new Intl.NumberFormat("de-CH", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

export function formatZahl(wert: number, stellen = 0): string {
  return zahl(stellen).format(wert);
}

/** Menge mit Einheit: kg und l mit 2 Stellen, Stk ganzzahlig. */
export function formatMenge(wert: number | null, einheit: string | null): string {
  if (wert === null || einheit === null) return "–";
  return `${formatZahl(wert, einheit === "Stk" ? 0 : 2)} ${einheit}`;
}

/** ISO-Datum (JJJJ-MM-TT) als TT.MM.JJJJ. */
export function formatDatum(iso: string | null): string {
  if (!iso) return "–";
  const [j, m, t] = iso.split("-");
  return `${t}.${m}.${j}`;
}

/** Anteil 0.6 → «60 %». */
export function formatAnteil(anteil: number): string {
  return `${formatZahl(anteil * 100, Number.isInteger(anteil * 100) ? 0 : 1)} %`;
}

/** Menge pro Gast ohne überflüssige Nullen: 120.000 → «120 g», 7.5 → «7.5 g». */
export function formatProGast(menge: number, einheit: string): string {
  return `${new Intl.NumberFormat("de-CH", { maximumFractionDigits: 3 }).format(menge)} ${einheit}`;
}

/**
 * Gramm wie in der Rezeptkarte: ab 1000 g in kg (2 Stellen), unter 10 g mit 1 Stelle, unter 1 g mit 2 Stellen,
 * sonst ganze Gramm. Eine Menge über 0 wird nie als «0 g» gezeigt.
 */
export function formatGramm(g: number | null): string {
  if (g === null) return "[Menge]";
  if (g >= 1000) return `${formatZahl(g / 1000, 2)} kg`;
  if (g > 0 && g < 0.01) return "< 0.01 g";
  if (g < 10) return `${new Intl.NumberFormat("de-CH", { maximumFractionDigits: g < 1 ? 2 : 1 }).format(g)} g`;
  return `${formatZahl(Math.round(g))} g`;
}

/** Minuten als «1 h 30 min» oder «45 min». */
export function formatMinuten(min: number | null): string {
  if (min === null) return "–";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Skalierungs-Prozent: ab 10 ganz, ab 1 mit 1 Stelle, darunter 2 Stellen. */
export function formatProzent(p: number | null): string {
  if (p === null) return "";
  const stellen = p >= 10 ? 0 : p >= 1 ? 1 : 2;
  return `${new Intl.NumberFormat("de-CH", { maximumFractionDigits: stellen }).format(p)} %`;
}
