// Planung im Rezept: Aufwand pro Schritt (Rüstzeit, Durchgang), Gebinde und Service.
// Nur Anzeige; die Berechnung pro Anlass macht die Datenbank.
import { formatGramm, formatMinuten } from "./format";
import { ORTE } from "./rezept-pflege";

export type PlanungSchritt = {
  id: string; text: string; ort: string | null; rolle: string | null; geraet: string | null;
  ruest_min: number; aktiv_min: number | null; unbeaufsichtigt_min: number | null; menge_pro_durchgang_g: number | null;
};

export const ortText = (ort: string | null) => (ort ? (ORTE.find((o) => o.value === ort)?.label ?? ort) : "[Ort]");

/** Text eines Schritts für die Tabelle: erste Zeile, höchstens 70 Zeichen. */
export function kurzText(text: string, max = 70): string {
  const zeile = text.trim().split("\n")[0];
  return zeile.length > max ? `${zeile.slice(0, max - 1).trimEnd()}…` : zeile;
}

/** Menge pro Durchgang; leer heisst: ein Durchgang ist eine Basis-Charge des Rezepts. */
export const durchgangText = (g: number | null) => (g === null ? "Basis-Charge" : formatGramm(g));
/** 0 Minuten heisst «keine Angabe». */
export const minutenText = (m: number | null) => (m ? formatMinuten(m) : "–");

/** «45 min pro 100 Portionen · Service»; ohne Angabe Platzhalter. */
export function serviceText(min: number | null, rolle: string | null): string {
  if (min === null) return "[Aufwand]";
  return `${formatMinuten(min)} pro 100 Portionen${rolle ? ` · ${rolle}` : ""}`;
}

/** Was für die Berechnung pro Anlass noch fehlt, als kurze Liste. */
export function fehlendeAngaben(p: { gebinde: string | null; fuellmenge_g: number | null; service_min_pro_100: number | null; ergibt_g: number | null; typ: string }, schritte: PlanungSchritt[], verknuepft: number): string[] {
  const f: string[] = [];
  if (p.typ === "komponente" && p.ergibt_g === null) f.push("Ergibt-Menge pro Charge");
  if (!schritte.length) f.push("Arbeitsschritte");
  else if (!schritte.some((s) => s.aktiv_min || s.unbeaufsichtigt_min || s.ruest_min)) f.push("Zeiten der Arbeitsschritte");
  if (schritte.some((s) => !s.ort)) f.push("Ort bei jedem Schritt");
  if (!p.gebinde) f.push("Gebinde");
  if (p.fuellmenge_g === null) f.push("Füllmenge pro Gebinde");
  if (p.service_min_pro_100 === null) f.push("Aufwand Service");
  if (p.typ === "komponente" && verknuepft === 0) f.push("Verknüpfung mit einer Komponente im Katalog");
  return f;
}
