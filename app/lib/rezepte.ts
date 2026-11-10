// Rezeptbibliothek: Daten aus rezept, zutatengruppe, schritt und den Skalierungsfunktionen
// rezept_faktor / rezept_zutaten_skaliert / rezept_komponenten_skaliert. Die App rechnet nicht.
import type { Database } from "./database.types";
import { formatGramm, formatMinuten, formatProzent, formatZahl } from "./format";

type Fn = Database["public"]["Functions"];
export type Rezept = Pick<
  Database["public"]["Tables"]["rezept"]["Row"],
  | "id" | "slug" | "typ" | "name" | "untertitel" | "kategorie" | "quelle" | "basis_portionen" | "portion_g" | "ergibt_g" | "status"
  | "ergibt_annahme" | "portionen_annahme" | "chargengroesse" | "besonderes" | "geaendert_am"
>;
export type ZutatRoh = Pick<
  Database["public"]["Tables"]["zutat"]["Row"],
  "id" | "gruppe_id" | "bezeichnung" | "menge_g" | "annahme" | "notiz" | "ist_basis" | "reihenfolge"
>;
export type Punkt = { id: string; text: string };
export type Gruppe = Pick<Database["public"]["Tables"]["zutatengruppe"]["Row"], "id" | "titel" | "reihenfolge">;
export type Schritt = Pick<
  Database["public"]["Tables"]["schritt"]["Row"],
  "id" | "gruppe_id" | "text" | "reihenfolge" | "temperatur_c" | "aktiv_min" | "unbeaufsichtigt_min" | "haccp" | "annahme"
> & { geraet: { name: string } | null };
export type Zutat = Fn["rezept_zutaten_skaliert"]["Returns"][number];
export type Faktor = Fn["rezept_faktor"]["Returns"][number];
export type KomponenteSkaliert = Fn["rezept_komponenten_skaliert"]["Returns"][number];

export const istGericht = (r: Pick<Rezept, "typ">) => r.typ === "gericht";

/** Voreinstellungen wie im Mockup: Gericht ×1, ×5, ×12, ×30 der Basisportionen; Komponente 1, 2, 5, 10 Chargen. */
export function voreinstellungen(r: Rezept): { wert: number; label: string }[] {
  if (istGericht(r)) {
    const basis = r.basis_portionen ?? 0;
    if (basis <= 0) return [];
    return [1, 5, 12, 30].map((f) => ({ wert: f * basis, label: `${formatZahl(f * basis)} P` }));
  }
  return [1, 2, 5, 10].map((c) => ({ wert: c, label: `× ${c}` }));
}

/** Eingabe für Portionen (ganz) bzw. Chargen (bis 2 Stellen) prüfen; null = ungültig. */
export function wertAusEingabe(text: string, gericht: boolean): number | null {
  const t = text.trim().replace(",", ".");
  const ok = gericht ? /^\d+$/.test(t) : /^\d+(\.\d{1,2})?$/.test(t);
  if (!ok) return null;
  const w = Number(t);
  return w > 0 && w <= 100000 ? w : null;
}

/** Annahme bei der Basis des Rezepts: Portionen (Gericht) bzw. Ergibt-Menge einer Charge (Komponente). */
export function basisAnnahme(r: Rezept): boolean {
  return istGericht(r) ? r.portionen_annahme : r.ergibt_annahme;
}

export function ergibtText(r: Rezept, f: Faktor | null): { text: string; sub: string; annahme: boolean } {
  const annahme = basisAnnahme(r);
  const hinweis = annahme ? (istGericht(r) ? " · Portionen angenommen, siehe offene Punkte" : " · Ergibt-Menge angenommen, siehe offene Punkte") : "";
  if (!f) return { text: "[Menge]", sub: istGericht(r) ? "Basisportionen fehlen im Rezept" : "Ergibt-Menge fehlt im Rezept", annahme };
  if (istGericht(r)) {
    const portion = r.portion_g === null ? "[Portion]" : formatGramm(r.portion_g);
    return { text: `${formatZahl(f.portionen)} Portionen à ${portion}`, sub: `gesamt ${formatGramm(f.ergibt_g)} · ${f.herleitung}${hinweis}`, annahme };
  }
  return { text: formatGramm(f.ergibt_g), sub: `${f.herleitung}${hinweis}`, annahme };
}

export type Chip = { kind: "neutral" | "temp" | "aktiv" | "unbeaufsichtigt" | "haccp"; text: string };

export function schrittChips(s: Schritt): Chip[] {
  const c: Chip[] = [];
  if (s.geraet) c.push({ kind: "neutral", text: s.geraet.name });
  if (s.temperatur_c !== null) c.push({ kind: "temp", text: `${formatZahl(s.temperatur_c)} °C` });
  if (s.aktiv_min) c.push({ kind: "aktiv", text: `${formatMinuten(s.aktiv_min)} aktiv` });
  if (s.unbeaufsichtigt_min) c.push({ kind: "unbeaufsichtigt", text: `${formatMinuten(s.unbeaufsichtigt_min)} unbeaufsichtigt` });
  if (s.haccp) c.push({ kind: "haccp", text: `HACCP ${s.haccp}` });
  return c;
}

export type GruppeAnzeige = {
  id: string;
  titel: string | null;
  zutaten: { id: string; name: string; menge: string; prozent: string; notiz: string; basis: boolean; annahme: boolean }[];
  schritte: { id: string; text: string; annahme: boolean; chips: Chip[] }[];
};

/** Gruppen mit skalierten Zutaten und Schritten, in der Reihenfolge des Rezepts. */
export function gruppenAnzeige(gruppen: Gruppe[], zutaten: Zutat[], schritte: Schritt[], faktor: number | null): GruppeAnzeige[] {
  const nach = <T,>(a: T[], key: (x: T) => number | null) => [...a].sort((x, y) => (key(x) ?? 0) - (key(y) ?? 0));
  return nach(gruppen, (g) => g.reihenfolge).map((g) => ({
    id: g.id,
    titel: g.titel,
    zutaten: nach(zutaten.filter((z) => z.gruppe_id === g.id), (z) => z.reihenfolge).map((z) => ({
      id: z.id,
      name: z.bezeichnung,
      menge: formatGramm(z.menge_g),
      prozent: formatProzent(z.skal_pct),
      // Herleitung der skalierten Menge: Basismenge aus dem Rezept, sobald skaliert wird.
      notiz: [z.notiz, faktor !== null && faktor !== 1 ? `Basis ${formatGramm(z.menge_basis_g)}` : null].filter(Boolean).join(" · "),
      basis: !!z.ist_basis,
      annahme: !!z.annahme,
    })),
    schritte: nach(schritte.filter((s) => s.gruppe_id === g.id), (s) => s.reihenfolge).map((s) => ({
      id: s.id,
      text: s.text,
      annahme: !!s.annahme,
      chips: schrittChips(s),
    })),
  }));
}

export function geraete(schritte: Schritt[]): string[] {
  return [...new Set(schritte.map((s) => s.geraet?.name).filter((x): x is string => !!x))];
}

export function basisZutat(zutaten: Zutat[]): string {
  return zutaten.find((z) => z.ist_basis)?.bezeichnung ?? "[Basiszutat]";
}

export function listenSub(r: Rezept): string {
  const art = r.kategorie ?? (istGericht(r) ? "Gericht" : "Komponente");
  if (istGericht(r)) return `${art} · ${r.basis_portionen ?? "[Portionen]"} Portionen`;
  return `${art} · Charge ${r.ergibt_g === null ? "[Menge]" : formatGramm(r.ergibt_g)}`;
}

/** «Besonders zu beachten» (Notizen aus dem Import): eine Zeile pro Absatz. */
export function besonderesZeilen(text: string | null): string[] {
  return (text ?? "").split("\n").map((z) => z.trim()).filter(Boolean);
}

// --- Rezept bearbeiten: Formular und Prüfung der Eingaben. Gespeichert wird mit rezept_speichern in der Datenbank. ---

export type RezeptFormular = {
  typ: Rezept["typ"];
  kategorie: string;
  basis_portionen: string;
  portion_g: string;
  ergibt_g: string;
  chargengroesse: string;
  portionen_annahme: boolean;
  ergibt_annahme: boolean;
  /** Zutat-ID oder "" = keine Basiszutat */
  basis_zutat: string;
  zutaten: Record<string, { menge: string; annahme: boolean }>;
  /** IDs der offenen Punkte, die als erledigt markiert werden */
  erledigt: string[];
};
export type RezeptArgs = Fn["rezept_speichern"]["Args"];

const alsText = (n: number | null) => (n === null ? "" : String(n));

export function rezeptFormular(r: Rezept, zutaten: ZutatRoh[]): RezeptFormular {
  return {
    typ: r.typ,
    kategorie: r.kategorie ?? "",
    basis_portionen: alsText(r.basis_portionen),
    portion_g: alsText(r.portion_g),
    ergibt_g: alsText(r.ergibt_g),
    chargengroesse: r.chargengroesse ?? "",
    portionen_annahme: r.portionen_annahme,
    ergibt_annahme: r.ergibt_annahme,
    basis_zutat: zutaten.find((z) => z.ist_basis)?.id ?? "",
    zutaten: Object.fromEntries(zutaten.map((z) => [z.id, { menge: alsText(z.menge_g), annahme: z.annahme }])),
    erledigt: [],
  };
}

/** Menge in Gramm: leer = null, sonst Zahl über 0 mit höchstens 2 Stellen; undefined = ungültig. */
export function grammAusEingabe(text: string): number | null | undefined {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined;
  const n = Number(t);
  return n > 0 && n < 10_000_000 ? n : undefined;
}

/** Eingaben prüfen und die Argumente für rezept_speichern bilden. Es gehen nur geänderte Zutaten mit. */
export function rezeptArgs(r: Rezept, zutaten: ZutatRoh[], f: RezeptFormular): { args: RezeptArgs } | { fehler: string } {
  // Der Dialog zeigt nur die Felder des gewählten Typs; die anderen bleiben, wie sie geladen wurden.
  const gericht = f.typ === "gericht";
  const p = gericht ? f.basis_portionen.trim() : alsText(r.basis_portionen);
  if (p && (!/^\d+$/.test(p) || Number(p) < 1 || Number(p) > 100000)) return { fehler: "Basisportionen: ganze Zahl ab 1, oder leer." };
  if (gericht && !p) return { fehler: "Ein Gericht braucht Basisportionen, sonst lässt es sich nicht skalieren." };
  const portion = gericht ? grammAusEingabe(f.portion_g) : r.portion_g;
  if (portion === undefined) return { fehler: "Portion in Gramm: Zahl über 0 mit höchstens 2 Stellen, oder leer." };
  const ergibt = gericht ? r.ergibt_g : grammAusEingabe(f.ergibt_g);
  if (ergibt === undefined) return { fehler: "Ergibt-Menge in Gramm: Zahl über 0 mit höchstens 2 Stellen, oder leer." };

  const geaendert: { id: string; menge_g: number | null; annahme: boolean }[] = [];
  const menge = new Map<string, number | null>();
  for (const z of zutaten) {
    const e = f.zutaten[z.id];
    if (!e) continue;
    const g = grammAusEingabe(e.menge);
    if (g === undefined) return { fehler: `${z.bezeichnung}: Menge in Gramm als Zahl über 0 mit höchstens 2 Stellen, oder leer.` };
    const annahme = e.annahme && g !== null;
    menge.set(z.id, g);
    if (g !== z.menge_g || annahme !== z.annahme) geaendert.push({ id: z.id, menge_g: g, annahme });
  }
  // Wie im Dialog angezeigt: ohne Menge in Gramm gilt die Zutat nicht als Basiszutat.
  const basis = f.basis_zutat && (menge.get(f.basis_zutat) ?? null) !== null ? f.basis_zutat : null;

  return {
    args: {
      p_rezept: r.id,
      p_geaendert_am: r.geaendert_am,
      p_typ: f.typ,
      p_kategorie: f.kategorie,
      // Die erzeugten Typen kennen bei Funktionsargumenten kein null; die Datenbank nimmt es an.
      p_basis_portionen: (p ? Number(p) : null) as number,
      p_portion_g: portion as number,
      p_ergibt_g: ergibt as number,
      p_chargengroesse: gericht ? (r.chargengroesse ?? "") : f.chargengroesse,
      p_portionen_annahme: gericht ? f.portionen_annahme : r.portionen_annahme,
      p_ergibt_annahme: gericht ? r.ergibt_annahme : f.ergibt_annahme,
      p_zutaten: geaendert,
      p_basis_zutat: basis as string,
      p_erledigt: f.erledigt,
    },
  };
}

/** Zutaten, die als Basiszutat in Frage kommen: alle mit einer gültigen Menge im Formular. */
export function basisOptionen(zutaten: ZutatRoh[], f: RezeptFormular): { value: string; label: string }[] {
  return zutaten
    .filter((z) => typeof grammAusEingabe(f.zutaten[z.id]?.menge ?? "") === "number")
    .map((z) => ({ value: z.id, label: `${z.bezeichnung} · ${formatGramm(grammAusEingabe(f.zutaten[z.id].menge) as number)}` }));
}
