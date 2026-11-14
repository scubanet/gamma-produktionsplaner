// Checkliste der Produktion pro Komponente und Welle (View produktion_checkliste, Tabelle produktion_aufgabe).
// Welle 0 = Komponente ohne Welle (Zukauf, offen, nur vor Ort). Die Wellen und ihre Termine kommen aus der Datenbank.
import type { Database } from "./database.types";

export type ChecklisteZeile = Database["public"]["Views"]["produktion_checkliste"]["Row"];
export type Aufgabe = { komponente_id: string; welle_nr: number; zustaendig: string | null; erledigt_am: string | null };

export const schluessel = (komponenteId: string, welleNr: number) => `${komponenteId}|${welleNr}`;

/** Zeilen der Checkliste als Nachschlagetabelle Komponente|Welle. */
export function aufgabenAus(zeilen: ChecklisteZeile[]): Map<string, Aufgabe> {
  const m = new Map<string, Aufgabe>();
  for (const z of zeilen) {
    if (!z.komponente_id || z.welle_nr === null) continue;
    m.set(schluessel(z.komponente_id, z.welle_nr), { komponente_id: z.komponente_id, welle_nr: z.welle_nr, zustaendig: z.zustaendig, erledigt_am: z.erledigt_am });
  }
  return m;
}

export type Fortschritt = {
  /** Wellen der Komponente, aufsteigend. */
  wellen: number[];
  /** Anzahl abgehakter Wellen. */
  erledigt: number;
  /** Eingetragene Personen über alle Wellen, ohne Doppelte. */
  zustaendige: string[];
  /** Zeitpunkt des letzten Häkchens, wenn alle Wellen erledigt sind; sonst null. */
  erledigtAm: string | null;
};

/** Stand pro Komponente über alle ihre Wellen. */
export function fortschritt(aufgaben: Iterable<Aufgabe>): Map<string, Fortschritt> {
  const gruppen = new Map<string, Aufgabe[]>();
  for (const a of aufgaben) gruppen.set(a.komponente_id, [...(gruppen.get(a.komponente_id) ?? []), a]);
  const m = new Map<string, Fortschritt>();
  for (const [id, liste] of gruppen) {
    const fertig = liste.filter((a) => a.erledigt_am);
    m.set(id, {
      wellen: liste.map((a) => a.welle_nr).sort((a, b) => a - b),
      erledigt: fertig.length,
      zustaendige: [...new Set(liste.map((a) => a.zustaendig).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b, "de-CH")),
      erledigtAm: fertig.length === liste.length && liste.length > 0 ? fertig.map((a) => a.erledigt_am!).sort().at(-1)! : null,
    });
  }
  return m;
}

/** «2 von 3 Wellen» für Komponenten mit mehreren Wellen. */
export function fortschrittText(f: Pick<Fortschritt, "wellen" | "erledigt">): string {
  return `${f.erledigt} von ${f.wellen.length} Wellen`;
}

/** Alle eingetragenen Personen, für Filter und Auswahlliste. */
export function personen(aufgaben: Iterable<Aufgabe>): string[] {
  return [...new Set([...aufgaben].map((a) => a.zustaendig).filter((n): n is string => !!n))].sort((a, b) => a.localeCompare(b, "de-CH"));
}
