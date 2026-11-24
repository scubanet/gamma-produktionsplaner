// Temperaturkontrolle (24.11.2026): tägliche Messung der Kühl- und TK-Räume. Abweichung, Soll pro Tag und Stand
// rechnet die Datenbank (temperatur_erfassen, Views temperatur_heute und temperatur_liste); hier werden Text gebildet
// und Eingaben geprüft. Die Datenbank prüft dieselben Regeln nochmals.
import type { Database } from "./database.types";
import { zahlDeCh } from "./format";

type T = Database["public"]["Tables"];
type V = Database["public"]["Views"];
export type Kuehlstelle = T["kuehlstelle"]["Row"];
export type Heute = V["temperatur_heute"]["Row"];
export type Messung = V["temperatur_liste"]["Row"];

export type Art = "kuehlung" | "tk" | "economat";
/** Arten mit den Standard-Grenzwerten aus den fachlichen Vorgaben (Systemzuteilung, Economat bis +18 °C). */
export const ARTEN: { art: Art; label: string; min: number | null; max: number }[] = [
  { art: "kuehlung", label: "Kühlung", min: 0, max: 2 },
  { art: "tk", label: "Tiefkühlung", min: null, max: -18 },
  { art: "economat", label: "Economat", min: null, max: 18 },
];
/** Entscheid Dominik (24.11.2026): eine Messung pro Tag, am Morgen. */
export const MESSUNGEN_STANDARD = 1;

export const artLabel = (art: string | null): string => ARTEN.find((a) => a.art === art)?.label ?? "[Art]";

/** «+1,5 °C», «−18,0 °C»: immer mit Vorzeichen und einer Stelle, wie auf einem Thermometer. */
export function gradText(t: number | null): string {
  if (t === null || t === undefined) return "–";
  const z = zahlDeCh(Math.abs(t), { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${t < 0 ? "−" : t > 0 ? "+" : ""}${z} °C`;
}

/** «0,0 bis +2,0 °C» oder «höchstens −18,0 °C». */
export function grenzeText(min: number | null, max: number | null): string {
  if (max === null || max === undefined) return "[Grenze]";
  if (min === null || min === undefined) return `höchstens ${gradText(max)}`;
  return `${gradText(min).replace(" °C", "")} bis ${gradText(max)}`;
}

/** Wie temperatur_erfassen: ausserhalb der Grenze, auf eine Stelle gerundet. */
export function istAbweichung(t: number, min: number | null, max: number): boolean {
  const r = Math.round(t * 10) / 10;
  return r > max || (min !== null && r < min);
}

/** Text zu einer Zahl: Komma oder Punkt, Minus auch als «−». Leer oder ungültig: null. */
export function temperaturAus(text: string): number | null {
  const t = text.trim().replace(",", ".").replace("−", "-").replace(/\s*°?C?$/i, "");
  return /^[-+]?\d{1,2}(\.\d)?$/.test(t) ? Number(t) : null;
}

export type MessungFormular = { temperatur: string; visum: string; massnahme: string; bemerkung: string };
export type MessungArgumente = { p_kuehlstelle: string; p_temperatur: number; p_visum: string; p_massnahme?: string; p_bemerkung?: string };

export function messungEingabe(k: Pick<Heute, "kuehlstelle_id" | "grenze_min" | "grenze_max">, f: MessungFormular): MessungArgumente | { fehler: string } {
  const t = temperaturAus(f.temperatur);
  if (t === null || t < -40 || t > 40) return { fehler: "Temperatur: eine Zahl von −40 bis +40 mit höchstens einer Stelle, z.B. 1.5 oder −19." };
  const visum = f.visum.trim();
  if (visum.length < 1 || visum.length > 10) return { fehler: "Visum: 1 bis 10 Zeichen, z.B. dein Kürzel." };
  const abw = k.grenze_max !== null && istAbweichung(t, k.grenze_min, k.grenze_max);
  const massnahme = f.massnahme.trim();
  if (abw && !massnahme) return { fehler: `${gradText(t)} liegt ausserhalb der Grenze (${grenzeText(k.grenze_min, k.grenze_max)}). Bitte die Massnahme eintragen.` };
  const bemerkung = f.bemerkung.trim();
  return { p_kuehlstelle: k.kuehlstelle_id as string, p_temperatur: t, p_visum: visum, ...(massnahme ? { p_massnahme: massnahme } : {}), ...(bemerkung ? { p_bemerkung: bemerkung } : {}) };
}

export type StelleFormular = { name: string; art: Art; min: string; max: string; messungen: string; reihenfolge: string; aktiv: boolean; bemerkung: string };
export type StelleDaten = Pick<Kuehlstelle, "name" | "art" | "grenze_min" | "grenze_max" | "messungen_pro_tag" | "reihenfolge" | "aktiv" | "bemerkung">;

/** Neues Formular mit den Standard-Grenzwerten der Art. */
export function stelleStandard(art: Art = "kuehlung"): StelleFormular {
  const a = ARTEN.find((x) => x.art === art)!;
  return { name: "", art, min: a.min === null ? "" : String(a.min), max: String(a.max), messungen: String(MESSUNGEN_STANDARD), reihenfolge: "0", aktiv: true, bemerkung: "" };
}

export function stelleEingabe(f: StelleFormular): StelleDaten | { fehler: string } {
  const name = f.name.trim();
  if (!name || name.length > 60) return { fehler: "Name: 1 bis 60 Zeichen, z.B. «Kühlraum 1»." };
  if (!ARTEN.some((a) => a.art === f.art)) return { fehler: "Art: Kühlung, Tiefkühlung oder Economat." };
  const max = temperaturAus(f.max);
  if (max === null) return { fehler: "Obere Grenze: eine Zahl mit höchstens einer Stelle." };
  const min = f.min.trim() ? temperaturAus(f.min) : null;
  if (f.min.trim() && min === null) return { fehler: "Untere Grenze: eine Zahl mit höchstens einer Stelle, oder leer." };
  if (min !== null && min >= max) return { fehler: "Die untere Grenze muss tiefer sein als die obere." };
  const n = Number(f.messungen);
  if (!Number.isInteger(n) || n < 1 || n > 6) return { fehler: "Messungen pro Tag: 1 bis 6." };
  const r = Number(f.reihenfolge || "0");
  if (!Number.isInteger(r)) return { fehler: "Reihenfolge: eine ganze Zahl." };
  return { name, art: f.art, grenze_min: min, grenze_max: max, messungen_pro_tag: n, reihenfolge: r, aktiv: f.aktiv, bemerkung: f.bemerkung.trim() || null };
}

export const stelleFormular = (k: Kuehlstelle): StelleFormular => ({
  name: k.name, art: k.art as Art, min: k.grenze_min === null ? "" : String(k.grenze_min), max: String(k.grenze_max),
  messungen: String(k.messungen_pro_tag), reihenfolge: String(k.reihenfolge), aktiv: k.aktiv, bemerkung: k.bemerkung ?? "",
});

export type StandStatus = "ok" | "warn" | "critical" | "neutral";
/** Pill für den heutigen Stand einer Kühlstelle. */
export function standPill(h: Pick<Heute, "status" | "messungen" | "messungen_pro_tag">): { status: StandStatus; text: string } {
  const n = h.messungen ?? 0;
  const soll = h.messungen_pro_tag ?? 0;
  if (h.status === "abweichung") return { status: "critical", text: `Abweichung · ${n} von ${soll}` };
  if (h.status === "offen") return { status: n ? "warn" : "neutral", text: `${n} von ${soll} gemessen` };
  return { status: "ok", text: `${n} von ${soll} gemessen` };
}

/** Kennzahlen für heute aus temperatur_heute. */
export function heuteKennzahlen(zeilen: Heute[]): { stellen: number; gemessen: number; soll: number; offen: number; abweichungen: number } {
  return {
    stellen: zeilen.length,
    gemessen: zeilen.reduce((s, z) => s + Math.min(z.messungen ?? 0, z.messungen_pro_tag ?? 0), 0),
    soll: zeilen.reduce((s, z) => s + (z.messungen_pro_tag ?? 0), 0),
    offen: zeilen.filter((z) => z.status === "offen").length,
    abweichungen: zeilen.filter((z) => z.status === "abweichung").length,
  };
}

/** Erster und letzter Tag eines Monats «2026-11» (ISO), für die Abfrage der Liste. */
export function monatsGrenzen(monat: string): { von: string; bis: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(monat);
  if (!m) return null;
  const j = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const tage = new Date(Date.UTC(j, mo, 0)).getUTCDate();
  return { von: `${monat}-01`, bis: `${monat}-${String(tage).padStart(2, "0")}` };
}

/** Uhrzeit in der Schweiz, «07:42». */
export function zeitSchweiz(iso: string | null): string {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
