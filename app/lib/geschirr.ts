// Geschirr und Besteck pro Anlass: Positionen aus dem Standard oder von Hand, Bedarf aus der View anlass_geschirr_bedarf.
// Die App prüft nur die Eingaben; Stückzahl, Miete, Körbe und Gewicht rechnet die Datenbank.
import type { Database } from "./database.types";
import { formatMenge, formatZahl } from "./format";

export type Bedarf = Database["public"]["Views"]["anlass_geschirr_bedarf"]["Row"];
export type ServiceArtikel = Pick<Database["public"]["Tables"]["service_artikel"]["Row"], "id" | "name" | "art">;

export const ARTEN: { value: string; label: string }[] = [
  { value: "teller", label: "Teller und Schalen" },
  { value: "besteck", label: "Besteck" },
  { value: "glas", label: "Gläser" },
  { value: "serviette", label: "Servietten" },
  { value: "ausgabe", label: "Material für die Ausgabe" },
  { value: "sonstiges", label: "Sonstiges" },
];
export const artText = (art: string | null) => ARTEN.find((a) => a.value === art)?.label ?? art ?? "";

/** Positionen ohne Gang gelten für den ganzen Anlass (Ausgabe, Buffet-Material). */
export const OHNE_GANG = "Ausgabe und ganzer Anlass";

export type PositionForm = {
  id: string | null; artikel_id: string; gang: string; art: "gast" | "fix";
  stueck_pro_gast: string; wechselfaktor: string; reserve_pct: string; stueck_fix: string; bemerkung: string;
};

const text = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

export function formAus(b: Bedarf | null, gang = ""): PositionForm {
  if (!b) return { id: null, artikel_id: "", gang, art: "gast", stueck_pro_gast: "1", wechselfaktor: "1", reserve_pct: "0", stueck_fix: "", bemerkung: "" };
  return {
    id: b.id, artikel_id: b.artikel_id ?? "", gang: b.gang ?? "", art: b.stueck_fix !== null ? "fix" : "gast",
    stueck_pro_gast: text(b.stueck_pro_gast) || "1", wechselfaktor: text(b.wechselfaktor) || "1", reserve_pct: text(b.reserve_pct) || "0",
    stueck_fix: text(b.stueck_fix), bemerkung: b.bemerkung ?? "",
  };
}

const zahl = (t: string, min: number, max: number, ohneMin = false): number | null => {
  const z = t.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(z)) return null;
  const n = Number(z);
  return (ohneMin ? n > min : n >= min) && n <= max ? n : null;
};

/** Eingaben prüfen. Pro Gast: Stück, Wechselfaktor, Reserve. Fest: ganze Stückzahl. */
export function positionDaten(f: PositionForm): { daten: Database["public"]["Tables"]["anlass_geschirr"]["Update"] } | { fehler: string } {
  if (!f.artikel_id) return { fehler: "Artikel wählen." };
  const basis = { artikel_id: f.artikel_id, gang: f.gang.trim() || null, bemerkung: f.bemerkung.trim() || null };
  if (f.art === "fix") {
    if (!/^\d+$/.test(f.stueck_fix.trim()) || Number(f.stueck_fix) > 1_000_000) return { fehler: "Feste Stückzahl: ganze Zahl ab 0." };
    return { daten: { ...basis, stueck_fix: Number(f.stueck_fix), stueck_pro_gast: null, wechselfaktor: 1, reserve_pct: 0 } };
  }
  const stueck = zahl(f.stueck_pro_gast, 0, 100, true);
  if (stueck === null) return { fehler: "Stück pro Gast: Zahl über 0 mit höchstens 2 Stellen." };
  const faktor = zahl(f.wechselfaktor, 0, 20, true);
  if (faktor === null) return { fehler: "Wechselfaktor: Zahl über 0 mit höchstens 2 Stellen, z.B. 1.5." };
  const reserve = zahl(f.reserve_pct || "0", 0, 100);
  if (reserve === null) return { fehler: "Reserve: Prozent von 0 bis 100." };
  return { daten: { ...basis, stueck_pro_gast: stueck, wechselfaktor: faktor, reserve_pct: reserve, stueck_fix: null } };
}

export type GangGruppe = { gang: string; zeilen: Bedarf[] };

/** Nach Gang in der Reihenfolge des Menüs; unbekannte Gänge danach, Positionen ohne Gang am Schluss. */
export function nachGang(zeilen: Bedarf[], gaenge: string[]): GangGruppe[] {
  const rang = (g: string | null) => (g === null ? 9999 : gaenge.indexOf(g) < 0 ? 999 : gaenge.indexOf(g));
  const m = new Map<string, Bedarf[]>();
  for (const z of [...zeilen].sort((a, b) => rang(a.gang) - rang(b.gang) || (a.gang ?? "").localeCompare(b.gang ?? "", "de-CH") || (a.artikel ?? "").localeCompare(b.artikel ?? "", "de-CH"))) {
    const k = z.gang ?? OHNE_GANG;
    m.set(k, [...(m.get(k) ?? []), z]);
  }
  return [...m.entries()].map(([gang, zeilen]) => ({ gang, zeilen }));
}

export const stueck = (n: number | null, leer = "[Stück]") => (n === null ? leer : formatZahl(n));
export const mengeProGast = (b: Pick<Bedarf, "stueck_fix" | "stueck_pro_gast" | "wechselfaktor" | "reserve_pct">) =>
  b.stueck_fix !== null ? "fest" : `${b.stueck_pro_gast ?? "?"} × ${b.wechselfaktor ?? 1}${b.reserve_pct ? ` + ${b.reserve_pct} %` : ""}`;
export const gewicht = (kg: number | null) => (kg === null ? "[Gewicht]" : formatMenge(kg, "kg"));

/** Summe der Mietkosten; null, sobald bei einer Position mit Miete der Preis fehlt. */
export function mietkosten(zeilen: Bedarf[]): number | null {
  let s = 0;
  for (const z of zeilen) {
    if (z.mietkosten_chf === null) return null;
    s += z.mietkosten_chf;
  }
  return zeilen.length ? s : null;
}
