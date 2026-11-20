// Zutaten mit Artikeln verknüpfen (Funktion zutat_artikel_vorschlag, Migration 33).
// Eine Zeile pro Bezeichnung; die Datenbank schlägt nach Ähnlichkeit des Namens vor, verknüpft wird von Hand.
import type { ArtikelVorschlag } from "./artikel-vorschlag";
import { formatZahl } from "./format";
import { suchen } from "./suche";

/** Zeile der Funktion. Bezeichnungen ohne Treffer haben eine Zeile ohne Artikel. */
export type ZutatVorschlagZeile = {
  schluessel: string; bezeichnung: string; anzahl: number; rezepte_anzahl: number; rezepte: string[] | null; weitere: number;
  rang: number | null; artikel_id: string | null; artikel: string | null; artikelnummer: string | null;
  artikel_einheit: string | null; preis_pro_einheit: number | null; aehnlichkeit: number | null;
};

export type ZutatOffen = {
  schluessel: string; bezeichnung: string; anzahl: number; rezepteAnzahl: number; rezepte: string[];
  /** Zutaten mit gleicher Bezeichnung in Rezepten ausserhalb der Saison. */
  weitere: number;
  vorschlaege: ArtikelVorschlag[];
};

/** Eine Zeile pro Bezeichnung mit ihren Vorschlägen nach Rang; die häufigste Bezeichnung zuerst. */
export function gruppieren(zeilen: ZutatVorschlagZeile[]): ZutatOffen[] {
  type MitRang = ZutatOffen & { raenge: Map<string, number> };
  const m = new Map<string, MitRang>();
  for (const z of zeilen) {
    const k: MitRang = m.get(z.schluessel) ?? { schluessel: z.schluessel, bezeichnung: z.bezeichnung, anzahl: z.anzahl, rezepteAnzahl: z.rezepte_anzahl, rezepte: z.rezepte ?? [], weitere: z.weitere, vorschlaege: [], raenge: new Map() };
    if (z.artikel_id && z.artikel && !k.raenge.has(z.artikel_id)) {
      k.raenge.set(z.artikel_id, z.rang ?? 99);
      k.vorschlaege.push({ artikelId: z.artikel_id, artikel: z.artikel, artikelnummer: z.artikelnummer, einheit: z.artikel_einheit, preis: z.preis_pro_einheit, aehnlichkeit: z.aehnlichkeit ?? 0 });
    }
    m.set(z.schluessel, k);
  }
  return [...m.values()]
    .map(({ raenge, ...k }) => ({ ...k, vorschlaege: k.vorschlaege.sort((a, b) => raenge.get(a.artikelId)! - raenge.get(b.artikelId)!) }))
    .sort((a, b) => b.anzahl - a.anzahl || a.bezeichnung.localeCompare(b.bezeichnung, "de-CH"));
}

export type ZutatFilter = { suche: string; treffer: "" | "mit" | "ohne" };

export function filtern(liste: ZutatOffen[], f: ZutatFilter): ZutatOffen[] {
  return suchen(liste, f.suche, (z) => [z.bezeichnung]).filter((z) => !f.treffer || (f.treffer === "mit") === z.vorschlaege.length > 0);
}

/** «115 Zutaten in 98 Rezepten». */
export function umfangText(anzahl: number, rezepte: number): string {
  return `${formatZahl(anzahl)} ${anzahl === 1 ? "Zutat" : "Zutaten"} in ${formatZahl(rezepte)} ${rezepte === 1 ? "Rezept" : "Rezepten"}`;
}

/** Namen der Rezepte (die Datenbank liefert höchstens fünf), der Rest als Zahl. */
export function rezepteText(rezepte: string[], anzahl: number): string {
  const rest = anzahl - rezepte.length;
  return rezepte.join(", ") + (rest > 0 ? ` und ${formatZahl(rest)} weitere` : "");
}

/** Zähler im Einkauf; ohne Daten ein Platzhalter. */
export function standText(s: { zutaten: number | null; verknuepft: number | null } | null): string {
  if (!s || s.zutaten === null) return "[Zutaten] der Saison verknüpft";
  return `${formatZahl(s.verknuepft ?? 0)} von ${formatZahl(s.zutaten)} Zutaten der Saison verknüpft`;
}
