// Vorschläge für den Hauptartikel einer Komponente (Funktion komponente_artikel_vorschlag).
// Die Datenbank schlägt nach Ähnlichkeit des Namens vor; zugeordnet wird von Hand.
import { formatChf } from "./offerte";

/** Zeile der Funktion. Komponenten ohne Treffer haben eine Zeile ohne Artikel. */
export type VorschlagZeile = {
  komponente_id: string; komponente: string; kategorie: string | null; status: string | null;
  rang: number | null; artikel_id: string | null; artikel: string | null; artikelnummer: string | null;
  artikel_einheit: string | null; preis_pro_einheit: number | null; aehnlichkeit: number | null;
};

export type ArtikelVorschlag = { artikelId: string; artikel: string; artikelnummer: string | null; einheit: string | null; preis: number | null; aehnlichkeit: number };
export type KomponenteOffen = { komponenteId: string; komponente: string; kategorie: string; status: string; vorschlaege: ArtikelVorschlag[] };

/** Eine Zeile pro Komponente mit ihren Vorschlägen nach Rang; sortiert nach Kategorie und Name. */
export function gruppieren(zeilen: VorschlagZeile[]): KomponenteOffen[] {
  type MitRang = KomponenteOffen & { raenge: Map<string, number> };
  const m = new Map<string, MitRang>();
  for (const z of zeilen) {
    const k: MitRang = m.get(z.komponente_id) ?? { komponenteId: z.komponente_id, komponente: z.komponente, kategorie: z.kategorie ?? "", status: z.status ?? "offen", vorschlaege: [], raenge: new Map() };
    if (z.artikel_id && z.artikel && !k.raenge.has(z.artikel_id)) {
      k.raenge.set(z.artikel_id, z.rang ?? 99);
      k.vorschlaege.push({ artikelId: z.artikel_id, artikel: z.artikel, artikelnummer: z.artikelnummer, einheit: z.artikel_einheit, preis: z.preis_pro_einheit, aehnlichkeit: z.aehnlichkeit ?? 0 });
    }
    m.set(z.komponente_id, k);
  }
  return [...m.values()]
    .map(({ raenge, ...k }) => ({ ...k, vorschlaege: k.vorschlaege.sort((a, b) => raenge.get(a.artikelId)! - raenge.get(b.artikelId)!) }))
    .sort((a, b) => a.kategorie.localeCompare(b.kategorie, "de-CH") || a.komponente.localeCompare(b.komponente, "de-CH"));
}

/** «CHF 12.50 / kg · 83 %»; fehlender Preis als [Preis]. */
export function vorschlagDetail(v: ArtikelVorschlag): string {
  return `${v.preis === null ? "[Preis]" : formatChf(v.preis)} / ${v.einheit ?? "[Einheit]"} · ${Math.round(v.aehnlichkeit * 100)} %`;
}

export type VorschlagFilter = { kategorie: string; treffer: "" | "mit" | "ohne" };

export function filtern(liste: KomponenteOffen[], f: VorschlagFilter): KomponenteOffen[] {
  return liste.filter((k) => (!f.kategorie || k.kategorie === f.kategorie) && (!f.treffer || (f.treffer === "mit") === k.vorschlaege.length > 0));
}
