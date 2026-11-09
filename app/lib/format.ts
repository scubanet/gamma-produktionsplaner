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
