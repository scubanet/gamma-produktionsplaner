// Rezept bearbeiten und neu anlegen: Formular und Prüfung der Eingaben.
// Gespeichert wird als ein Dokument mit rezept_speichern in der Datenbank (alles oder nichts).
import type { Database, Json } from "./database.types";
import { formatGramm } from "./format";
import type { Gruppe, Rezept, ZutatRoh } from "./rezepte";

export type SchrittRoh = Pick<
  Database["public"]["Tables"]["schritt"]["Row"],
  "id" | "gruppe_id" | "text" | "reihenfolge" | "geraet_id" | "temperatur_c" | "aktiv_min" | "unbeaufsichtigt_min" | "haccp" | "annahme"
>;

/** key = id aus der Datenbank oder ein vorläufiger Schlüssel für neue Zeilen; id null = neu. */
export type ZutatForm = { key: string; id: string | null; bezeichnung: string; menge: string; notiz: string; annahme: boolean };
export type SchrittForm = {
  key: string; id: string | null; text: string; geraet_id: string; temperatur: string; aktiv: string; unbeaufsichtigt: string; haccp: string; annahme: boolean;
};
export type GruppeForm = { key: string; id: string | null; titel: string; zutaten: ZutatForm[]; schritte: SchrittForm[] };
export type RezeptFormular = {
  name: string;
  untertitel: string;
  quelle: string;
  typ: Rezept["typ"];
  kategorie: string;
  basis_portionen: string;
  portion_g: string;
  ergibt_g: string;
  chargengroesse: string;
  besonderes: string;
  portionen_annahme: boolean;
  ergibt_annahme: boolean;
  /** key der Basiszutat oder "" = keine */
  basis_zutat: string;
  gruppen: GruppeForm[];
  /** IDs der offenen Punkte, die als erledigt markiert werden */
  erledigt: string[];
};

const alsText = (n: number | null) => (n === null ? "" : String(n));
const nach = <T extends { reihenfolge: number }>(a: T[]) => [...a].sort((x, y) => x.reihenfolge - y.reihenfolge);

export const neueZutat = (key: string): ZutatForm => ({ key, id: null, bezeichnung: "", menge: "", notiz: "", annahme: false });
export const neuerSchritt = (key: string): SchrittForm => ({
  key, id: null, text: "", geraet_id: "", temperatur: "", aktiv: "", unbeaufsichtigt: "", haccp: "", annahme: false,
});
export const neueGruppe = (key: string): GruppeForm => ({ key, id: null, titel: "", zutaten: [], schritte: [] });

/** Formular aus dem geladenen Stand; ohne Rezept ein leeres Formular für ein neues Rezept. */
export function rezeptFormular(r: Rezept | null, gruppen: Gruppe[], zutaten: ZutatRoh[], schritte: SchrittRoh[]): RezeptFormular {
  if (!r) {
    return {
      name: "", untertitel: "", quelle: "", typ: "komponente", kategorie: "", basis_portionen: "", portion_g: "", ergibt_g: "",
      chargengroesse: "", besonderes: "", portionen_annahme: false, ergibt_annahme: false, basis_zutat: "",
      gruppen: [{ ...neueGruppe("neu-g0"), zutaten: [neueZutat("neu-z0")], schritte: [neuerSchritt("neu-s0")] }],
      erledigt: [],
    };
  }
  return {
    name: r.name,
    untertitel: r.untertitel ?? "",
    quelle: r.quelle ?? "",
    typ: r.typ,
    kategorie: r.kategorie ?? "",
    basis_portionen: alsText(r.basis_portionen),
    portion_g: alsText(r.portion_g),
    ergibt_g: alsText(r.ergibt_g),
    chargengroesse: r.chargengroesse ?? "",
    besonderes: r.besonderes ?? "",
    portionen_annahme: r.portionen_annahme,
    ergibt_annahme: r.ergibt_annahme,
    basis_zutat: zutaten.find((z) => z.ist_basis)?.id ?? "",
    gruppen: nach(gruppen).map((g) => ({
      key: g.id,
      id: g.id,
      titel: g.titel ?? "",
      zutaten: nach(zutaten.filter((z) => z.gruppe_id === g.id)).map((z) => ({
        key: z.id, id: z.id, bezeichnung: z.bezeichnung, menge: alsText(z.menge_g), notiz: z.notiz ?? "", annahme: z.annahme,
      })),
      schritte: nach(schritte.filter((s) => s.gruppe_id === g.id)).map((s) => ({
        key: s.id, id: s.id, text: s.text, geraet_id: s.geraet_id ?? "", temperatur: alsText(s.temperatur_c),
        // 0 Minuten ist der Vorgabewert der Tabelle und heisst «keine Angabe».
        aktiv: s.aktiv_min ? String(s.aktiv_min) : "", unbeaufsichtigt: s.unbeaufsichtigt_min ? String(s.unbeaufsichtigt_min) : "",
        haccp: s.haccp ?? "", annahme: s.annahme,
      })),
    })),
    erledigt: [],
  };
}

/** Zahl mit höchstens `stellen` Nachkommastellen im Bereich; leer = null, ungültig = undefined. */
function zahl(text: string, stellen: number, min: number, max: number, negativ = false): number | null | undefined {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  const muster = new RegExp(`^${negativ ? "-?" : ""}\\d+${stellen ? `(\\.\\d{1,${stellen}})?` : ""}$`);
  if (!muster.test(t)) return undefined;
  const n = Number(t);
  return n >= min && n <= max ? n : undefined;
}

/** Menge in Gramm: leer = null, sonst Zahl über 0 mit höchstens 2 Stellen; undefined = ungültig. */
export const grammAusEingabe = (text: string) => zahl(text, 2, 0.01, 9_999_999);
/** Minuten: leer = null, sonst Zahl ab 0 mit höchstens 2 Stellen. */
export const minutenAusEingabe = (text: string) => zahl(text, 2, 0, 100_000);
/** Temperatur in °C: leer = null, sonst −273 bis 1000 mit höchstens 1 Stelle. */
export const temperaturAusEingabe = (text: string) => zahl(text.replace("−", "-"), 1, -273, 1000, true);

const zutatLeer = (z: ZutatForm) => !z.bezeichnung.trim() && !z.menge.trim() && !z.notiz.trim();
const schrittLeer = (s: SchrittForm) => !s.text.trim() && !s.geraet_id && !s.temperatur.trim() && !s.aktiv.trim() && !s.unbeaufsichtigt.trim() && !s.haccp.trim();

/** Zutaten, die als Basiszutat in Frage kommen: alle mit Bezeichnung und gültiger Menge. */
export function basisOptionen(f: RezeptFormular): { value: string; label: string }[] {
  return f.gruppen.flatMap((g) =>
    g.zutaten.flatMap((z) => {
      const m = grammAusEingabe(z.menge);
      return typeof m === "number" && z.bezeichnung.trim() ? [{ value: z.key, label: `${z.bezeichnung.trim()} · ${formatGramm(m)}` }] : [];
    }),
  );
}

/**
 * Eingaben prüfen und das Dokument für rezept_speichern bilden.
 * Neue, ganz leere Zeilen und Gruppen fallen weg. Felder des nicht gewählten Typs bleiben, wie sie geladen wurden.
 */
export function rezeptDaten(r: Rezept | null, f: RezeptFormular): { daten: Json } | { fehler: string } {
  const name = f.name.trim();
  if (!name) return { fehler: "Das Rezept braucht einen Namen." };
  const gericht = f.typ === "gericht";

  const p = gericht ? f.basis_portionen.trim() : alsText(r?.basis_portionen ?? null);
  if (p && (!/^\d+$/.test(p) || Number(p) < 1 || Number(p) > 100000)) return { fehler: "Basisportionen: ganze Zahl ab 1, oder leer." };
  if (gericht && !p) return { fehler: "Ein Gericht braucht Basisportionen, sonst lässt es sich nicht skalieren." };
  const portion = gericht ? grammAusEingabe(f.portion_g) : (r?.portion_g ?? null);
  if (portion === undefined) return { fehler: "Portion in Gramm: Zahl über 0 mit höchstens 2 Stellen, oder leer." };
  const ergibt = gericht ? (r?.ergibt_g ?? null) : grammAusEingabe(f.ergibt_g);
  if (ergibt === undefined) return { fehler: "Ergibt-Menge in Gramm: Zahl über 0 mit höchstens 2 Stellen, oder leer." };

  const gruppen = [];
  for (const [gi, g] of f.gruppen.entries()) {
    const wo = g.titel.trim() ? `«${g.titel.trim()}»` : `Gruppe ${gi + 1}`;
    const zutaten = [];
    for (const z of g.zutaten) {
      if (zutatLeer(z) && z.id === null) continue;
      const bezeichnung = z.bezeichnung.trim();
      if (!bezeichnung) return { fehler: `${wo}: Eine Zutat hat keine Bezeichnung. Zum Löschen «Entfernen» wählen.` };
      const menge = grammAusEingabe(z.menge);
      if (menge === undefined) return { fehler: `${bezeichnung}: Menge in Gramm als Zahl über 0 mit höchstens 2 Stellen, oder leer.` };
      zutaten.push({
        id: z.id, bezeichnung, menge_g: menge, annahme: z.annahme && menge !== null, notiz: z.notiz.trim(),
        // Wie in der Auswahl angezeigt: ohne Menge in Gramm gilt die Zutat nicht als Basiszutat.
        ist_basis: z.key === f.basis_zutat && menge !== null,
      });
    }
    const schritte = [];
    for (const [si, s] of g.schritte.entries()) {
      if (schrittLeer(s) && s.id === null) continue;
      const text = s.text.trim();
      const nr = `${wo}, Schritt ${si + 1}`;
      if (!text) return { fehler: `${nr}: Der Text fehlt. Zum Löschen «Entfernen» wählen.` };
      const temperatur = temperaturAusEingabe(s.temperatur);
      if (temperatur === undefined) return { fehler: `${nr}: Temperatur in °C als Zahl mit höchstens 1 Stelle, oder leer.` };
      const aktiv = minutenAusEingabe(s.aktiv);
      const unbeaufsichtigt = minutenAusEingabe(s.unbeaufsichtigt);
      if (aktiv === undefined || unbeaufsichtigt === undefined) return { fehler: `${nr}: Minuten als Zahl ab 0 mit höchstens 2 Stellen, oder leer.` };
      schritte.push({
        id: s.id, text, geraet_id: s.geraet_id || null, temperatur_c: temperatur, aktiv_min: aktiv, unbeaufsichtigt_min: unbeaufsichtigt,
        haccp: s.haccp.trim(), annahme: s.annahme,
      });
    }
    if (g.id === null && !g.titel.trim() && !zutaten.length && !schritte.length) continue;
    gruppen.push({ id: g.id, titel: g.titel.trim(), zutaten, schritte });
  }

  return {
    daten: {
      name,
      untertitel: f.untertitel,
      quelle: f.quelle,
      typ: f.typ,
      kategorie: f.kategorie,
      basis_portionen: p ? Number(p) : null,
      portion_g: portion,
      ergibt_g: ergibt,
      chargengroesse: gericht ? (r?.chargengroesse ?? "") : f.chargengroesse,
      besonderes: f.besonderes,
      portionen_annahme: gericht ? f.portionen_annahme : (r?.portionen_annahme ?? false),
      ergibt_annahme: gericht ? (r?.ergibt_annahme ?? false) : f.ergibt_annahme,
      gruppen,
      erledigt: f.erledigt,
    },
  };
}
