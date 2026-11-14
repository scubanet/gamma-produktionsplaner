// Systemzuteilung: Komponenten mit Produktion, Lagerung, Regeneration und CF-Stufe.
// Status, Haltbarkeit und Prüfhinweise rechnet die Datenbank (Views komponente_zuteilung,
// komponente_pruefhinweis). Die App liest, filtert und schreibt nur die Eingabefelder.
import type { Database } from "./database.types";

export type Zuteilung = Database["public"]["Views"]["komponente_zuteilung"]["Row"];
export type Hinweis = Database["public"]["Views"]["komponente_pruefhinweis"]["Row"];
export type System = Database["public"]["Tables"]["produktionssystem"]["Row"];
export type Regeneration = Database["public"]["Tables"]["regenerationsart"]["Row"];
export type KomponenteUpdate = Pick<
  Database["public"]["Tables"]["komponente"]["Update"],
  "produktion" | "lager_0_2" | "lager_tk" | "lager_gedeckt" | "lager_trocken" | "lager_tage" | "regeneration" | "cf_stufe" | "bemerkung"
>;

export type Formular = {
  produktion: string[];
  lager_0_2: boolean;
  lager_tk: boolean;
  lager_gedeckt: boolean;
  lager_trocken: boolean;
  lager_tage: string;
  regeneration: string[];
  cf_stufe: string;
  bemerkung: string;
};

export function formularAus(z: Zuteilung): Formular {
  return {
    produktion: z.produktion ?? [],
    lager_0_2: !!z.lager_0_2,
    lager_tk: !!z.lager_tk,
    lager_gedeckt: !!z.lager_gedeckt,
    lager_trocken: !!z.lager_trocken,
    lager_tage: z.lager_tage === null ? "" : String(z.lager_tage),
    regeneration: z.regeneration ?? [],
    cf_stufe: z.cf_stufe === null ? "" : String(z.cf_stufe),
    bemerkung: z.bemerkung ?? "",
  };
}

/** Code in einer Liste ein- oder ausschalten, Reihenfolge nach der Stammtabelle. */
export function umschalten(liste: string[], code: string, an: boolean, reihenfolge: string[]): string[] {
  const neu = an ? [...new Set([...liste, code])] : liste.filter((c) => c !== code);
  return neu.sort((a, b) => reihenfolge.indexOf(a) - reihenfolge.indexOf(b));
}

/** Trocken (bis 18 °C) schliesst 0–2 °C und TK aus: Wer das eine ankreuzt, nimmt das andere weg. */
export function lagerartSetzen(f: Formular, feld: "lager_0_2" | "lager_tk" | "lager_trocken", an: boolean): Formular {
  if (!an) return { ...f, [feld]: false };
  return feld === "lager_trocken" ? { ...f, lager_trocken: true, lager_0_2: false, lager_tk: false } : { ...f, [feld]: true, lager_trocken: false };
}

/** Formular → Update für die Tabelle komponente. Prüft nur Eingabeformate; die Fachregeln prüft die Datenbank. */
export function updateAus(f: Formular): { update: KomponenteUpdate } | { fehler: string } {
  const tageText = f.lager_tage.trim();
  let lager_tage: number | null = null;
  if (tageText !== "") {
    lager_tage = /^\d+$/.test(tageText) ? Number(tageText) : NaN;
    // 0 hätte keine Wirkung auf die Haltbarkeit (View übersteuert erst ab 1 Tag); Obergrenze = Postgres integer.
    if (!(lager_tage >= 1 && lager_tage <= 2147483647)) return { fehler: "Lagerung Tage: ganze Zahl ab 1 eingeben, oder leer lassen (Haltbarkeit aus der Produktion)." };
  }
  let cf_stufe: number | null = null;
  if (f.cf_stufe !== "") {
    cf_stufe = Number(f.cf_stufe);
    if (!Number.isInteger(cf_stufe) || cf_stufe < 0 || cf_stufe > 5) return { fehler: "CF-Stufe: 0 bis 5 oder leer." };
  }
  return {
    update: {
      produktion: f.produktion,
      lager_0_2: f.lager_0_2,
      lager_tk: f.lager_tk,
      lager_gedeckt: f.lager_gedeckt,
      lager_trocken: f.lager_trocken,
      lager_tage,
      regeneration: f.regeneration,
      cf_stufe,
      bemerkung: f.bemerkung.trim() === "" ? null : f.bemerkung.trim(),
    },
  };
}

/** Lagerung als Text wie in der Excel: «0–2 °C, gedeckt, 5 Tage». */
export function lagerungText(z: Pick<Zuteilung, "lager_0_2" | "lager_tk" | "lager_gedeckt" | "lager_tage"> & Partial<Pick<Zuteilung, "lager_trocken">>): string {
  const teile = [
    z.lager_0_2 ? "0–2 °C" : null,
    z.lager_tk ? "TK" : null,
    z.lager_trocken ? "trocken, bis 18 °C" : null,
    z.lager_gedeckt ? "gedeckt" : null,
    z.lager_tage !== null && z.lager_tage !== undefined ? `${z.lager_tage} Tage` : null,
  ].filter(Boolean);
  return teile.length ? teile.join(", ") : "–";
}

export type Filter = { kategorie: string; status: string; hinweis: "" | "rot" | "gelb" | "ohne"; suche: string };

export function filtern(zeilen: Zuteilung[], hinweise: Map<string, Hinweis[]>, f: Filter): Zuteilung[] {
  const suche = f.suche.trim().toLocaleLowerCase("de-CH");
  return zeilen.filter((z) => {
    const h = hinweise.get(z.id ?? "") ?? [];
    if (f.kategorie && z.kategorie !== f.kategorie) return false;
    if (f.status && z.status !== f.status) return false;
    if (f.hinweis === "ohne" && h.length) return false;
    if ((f.hinweis === "rot" || f.hinweis === "gelb") && !h.some((x) => x.farbe === f.hinweis)) return false;
    if (suche && !(z.name ?? "").toLocaleLowerCase("de-CH").includes(suche)) return false;
    return true;
  });
}

export function hinweiseNachKomponente(hinweise: Hinweis[]): Map<string, Hinweis[]> {
  const m = new Map<string, Hinweis[]>();
  for (const h of hinweise) if (h.komponente_id) m.set(h.komponente_id, [...(m.get(h.komponente_id) ?? []), h]);
  return m;
}

/** Reihenfolge wie die Kategorienblätter der Excel: Kategorie nach Stammtabelle, dann Excel-Zeile. */
export function sortieren(zeilen: Zuteilung[], kategorien: string[]): Zuteilung[] {
  const rang = (k: string | null) => {
    const i = kategorien.indexOf(k ?? "");
    return i < 0 ? kategorien.length : i;
  };
  return [...zeilen].sort((a, b) => rang(a.kategorie) - rang(b.kategorie) || (a.quelle_zeile ?? 0) - (b.quelle_zeile ?? 0));
}

/** Postgres-Fehler der Prüfungen verständlich machen. */
export function fehlertext(e: { message: string; code?: string }): string {
  if (e.code === "23514" && /lager_tage_check/.test(e.message)) return "Lagerung Tage: ab 1 Tag, oder leer lassen.";
  if (e.code === "23514" && /lager_trocken_check/.test(e.message)) return "Trocken (bis 18 °C) geht nicht zusammen mit 0–2 °C oder TK.";
  if (e.code === "22003") return "Zahl zu gross.";
  if (e.code === "23514" && /cf_stufe_check/.test(e.message)) return "CF-Stufe muss zwischen 0 und 5 liegen.";
  return e.message;
}

type Anzeige = Pick<Zuteilung, "status" | "nur_vor_ort">;

/** Leeres Feld: «–» wenn es nicht zutrifft (nur vor Ort, bzw. Zukauf ohne eigene Produktion), sonst [Platzhalter] (noch nicht erfasst). */
export function leerAnzeige(z: Anzeige, feld: "Produktion" | "Lagerung" | "Regeneration" | "CF"): string {
  if (z.nur_vor_ort) return "–";
  if (feld === "Produktion" && z.status === "Zukauf") return "–";
  return `[${feld}]`;
}

/** Haltbarkeit wie in der Tabelle: Tage, «vor Ort», «–» bei Zukauf oder [Haltbarkeit] wenn noch offen. */
export function haltbarkeitText(z: Anzeige & Pick<Zuteilung, "haltbarkeit_tage">): string {
  if (z.haltbarkeit_tage !== null) return `${z.haltbarkeit_tage} Tage`;
  if (z.nur_vor_ort) return "vor Ort";
  return z.status === "offen" ? "[Haltbarkeit]" : "–";
}

export type Bedingung = { spalte: keyof KomponenteUpdate; op: "eq" | "is"; wert: string | number | boolean | null };

const arrayLiteral = (a: string[]) => `{${a.map((x) => `"${x.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;

/**
 * Optimistische Sperre: gespeichert wird nur, wenn die bearbeitbaren Felder in der Datenbank noch
 * dem Stand beim Öffnen entsprechen. Sonst liefert das Update 0 Zeilen und die App lädt neu.
 */
export function sperreAus(z: Zuteilung): Bedingung[] {
  const b: Bedingung[] = [
    { spalte: "produktion", op: "eq", wert: arrayLiteral(z.produktion ?? []) },
    { spalte: "regeneration", op: "eq", wert: arrayLiteral(z.regeneration ?? []) },
    { spalte: "lager_0_2", op: "eq", wert: !!z.lager_0_2 },
    { spalte: "lager_tk", op: "eq", wert: !!z.lager_tk },
    { spalte: "lager_gedeckt", op: "eq", wert: !!z.lager_gedeckt },
    { spalte: "lager_trocken", op: "eq", wert: !!z.lager_trocken },
  ];
  for (const spalte of ["lager_tage", "cf_stufe", "bemerkung"] as const) {
    const w = z[spalte];
    b.push(w === null ? { spalte, op: "is", wert: null } : { spalte, op: "eq", wert: w });
  }
  return b;
}
