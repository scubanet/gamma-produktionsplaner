// Katalog: Gerichte der Kollektion mit ihren Komponenten (gericht_katalog, gericht_komponente),
// Status aus komponente_zuteilung, Warenkosten aus gericht_warenkosten, Quantum je Angebotsform.
import type { Database } from "./database.types";

type T = Database["public"]["Tables"];
type V = Database["public"]["Views"];
export type Gericht = Pick<T["gericht_katalog"]["Row"], "id" | "code" | "name" | "kategorie" | "gang" | "mengentyp" | "quelle_zeile">;
export type GerichtKomponente = Pick<
  T["gericht_komponente"]["Row"],
  "gericht_id" | "reihenfolge" | "komponente_id" | "bezeichnung" | "verweis_kategorie" | "menge_pro_portion"
>;
export type Warenkosten = V["gericht_warenkosten"]["Row"];
export type Quantum = T["quantum"]["Row"];

export function suchen(gerichte: Gericht[], text: string, kategorie: string): Gericht[] {
  const s = text.trim().toLocaleLowerCase("de-CH");
  return gerichte.filter(
    (g) => (!kategorie || g.kategorie === kategorie) && (!s || g.name.toLocaleLowerCase("de-CH").includes(s)),
  );
}

/** Gruppen für die Auswahlliste: Kategorien in der Reihenfolge der Stammtabelle, darin nach Excel-Zeile. */
export function gruppieren(gerichte: Gericht[], kategorien: string[]): { titel: string; gerichte: Gericht[] }[] {
  const rang = (k: string) => {
    const i = kategorien.indexOf(k);
    return i < 0 ? kategorien.length : i;
  };
  const nachKat = new Map<string, Gericht[]>();
  for (const g of gerichte) nachKat.set(g.kategorie, [...(nachKat.get(g.kategorie) ?? []), g]);
  return [...nachKat.entries()]
    .sort(([a], [b]) => rang(a) - rang(b) || a.localeCompare(b, "de-CH"))
    .map(([titel, liste]) => ({ titel, gerichte: liste.sort((a, b) => (a.quelle_zeile ?? 0) - (b.quelle_zeile ?? 0)) }));
}

/** Menge pro Portion steht in der Excel in kg (z.B. 0.17); fehlt sie, kommt die Menge aus dem Quantum. */
export function mengeText(kg: number | null): string {
  if (kg === null) return "[Menge]";
  return `${new Intl.NumberFormat("de-CH", { minimumFractionDigits: 3, maximumFractionDigits: 4 }).format(kg)} kg`;
}

export function warenkostenText(w: Warenkosten | undefined): { text: string; sub: string; annahme: boolean } {
  if (!w || w.wk_inkl_zuschlag_chf === null) {
    const n = w?.komponenten_ohne_preis ?? 0;
    return { text: "[Preis]", sub: n ? `${n} Komponente(n) ohne Preis im Artikelstamm` : "kein Preis im Artikelstamm", annahme: false };
  }
  const sub = w.komponenten_ohne_preis
    ? `Annahme, unvollständig: ${w.komponenten_ohne_preis} Komponente(n) ohne Preis`
    : "Annahme, bitte prüfen: Hauptartikel × Menge pro Portion + Zuschlag";
  return { text: `CHF ${new Intl.NumberFormat("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(w.wk_inkl_zuschlag_chf)}`, sub, annahme: true };
}
