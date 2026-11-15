// Leitstand: kleine Hilfen für die Anzeige. Gezählt wird in der Datenbank (View leitstand_wellen).

export type LeitAnlass = { id: string; name: string; datum: string | null; datum_bis: string | null; saison_id: string | null };

const isoHeute = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Ganze Tage von heute bis zum Datum (ISO JJJJ-MM-TT); negativ, wenn es vorbei ist. */
export function tageBis(datum: string, heute: Date = new Date()): number {
  const [j, m, t] = datum.split("-").map(Number);
  return Math.round((Date.UTC(j, m - 1, t) - Date.UTC(heute.getFullYear(), heute.getMonth(), heute.getDate())) / 86_400_000);
}

/** Der Anlass, der läuft oder als nächster beginnt; ohne kommenden Anlass keiner. */
export function naechsterAnlass<T extends LeitAnlass>(anlaesse: T[], heute: Date = new Date()): T | null {
  const h = isoHeute(heute);
  return (
    [...anlaesse]
      .filter((a) => a.datum !== null && (a.datum_bis ?? a.datum)! >= h)
      .sort((a, b) => a.datum!.localeCompare(b.datum!))[0] ?? null
  );
}

/** «in 41 Tagen», «morgen», «heute», «läuft». */
export function wannText(a: LeitAnlass, heute: Date = new Date()): string {
  if (!a.datum) return "[Datum]";
  const tage = tageBis(a.datum, heute);
  if (tage > 1) return `in ${tage} Tagen`;
  if (tage === 1) return "morgen";
  if (tage === 0) return "heute";
  return "läuft";
}

/** welle_nr 0 sind Komponenten ohne Welle (Zukauf, offen, nur vor Ort). */
export const wellenName = (nr: number): string => (nr === 0 ? "Ohne Welle" : `Welle ${nr}`);

export function summe(z: { aufgaben: number | null; erledigt: number | null }[]): { aufgaben: number; erledigt: number } {
  return z.reduce<{ aufgaben: number; erledigt: number }>((s, x) => ({ aufgaben: s.aufgaben + (x.aufgaben ?? 0), erledigt: s.erledigt + (x.erledigt ?? 0) }), { aufgaben: 0, erledigt: 0 });
}
