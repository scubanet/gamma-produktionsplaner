// Anlass mit Services, Menülinien und Karten (Aufgabe 6). Mengen und Bedarf rechnen die Views
// anlass_komponente_bedarf und produktionsliste; die App pflegt nur die Eingaben.
import type { Database } from "./database.types";

type T = Database["public"]["Tables"];
export type Anlass = Pick<
  T["anlass"]["Row"],
  | "id" | "nummer" | "name" | "kunde" | "datum" | "datum_bis" | "ort" | "gaeste" | "vorlauf_tage"
  | "saison_id" | "status" | "betrieb" | "angebotsform" | "bemerkung"
>;
export type Service = T["service"]["Row"];
export type Menuelinie = T["menuelinie"]["Row"];
export type LinieGericht = T["menuelinie_gericht"]["Row"];
export type LinieKomponente = T["menuelinie_komponente"]["Row"];
export type Karte = T["karte"]["Row"];
export type KartenPosition = T["karte_position"]["Row"];

export const ANLASS_SPALTEN = "id, nummer, name, kunde, datum, datum_bis, ort, gaeste, vorlauf_tage, saison_id, status, betrieb, angebotsform, bemerkung";

/** Status ausser «offerte»: Offerten werden unter Offerten geführt und über «Offerte bestätigen» zum Anlass. */
export const STATUS: { wert: string; label: string; pill: "ok" | "info" | "warn" | "neutral" }[] = [
  { wert: "option", label: "Option", pill: "warn" },
  { wert: "bestaetigt", label: "Bestätigt", pill: "ok" },
  { wert: "durchgefuehrt", label: "Durchgeführt", pill: "info" },
  { wert: "abgerechnet", label: "Abgerechnet", pill: "neutral" },
];
export const statusLabel = (s: string) => STATUS.find((x) => x.wert === s)?.label ?? s;
export const statusPill = (s: string) => STATUS.find((x) => x.wert === s)?.pill ?? "neutral";

export type Kopf = {
  nummer: string; name: string; kunde: string; datum: string; datum_bis: string; ort: string; gaeste: string;
  vorlauf_tage: string; saison_id: string; status: string; betrieb: string; angebotsform: string; bemerkung: string;
};

const text = (v: string | null | undefined) => v ?? "";
const leer = (s: string) => (s.trim() === "" ? null : s.trim());

export function kopfAus(a: Anlass): Kopf {
  return {
    nummer: text(a.nummer), name: a.name, kunde: text(a.kunde), datum: text(a.datum), datum_bis: text(a.datum_bis),
    ort: text(a.ort), gaeste: a.gaeste === null ? "" : String(a.gaeste), vorlauf_tage: String(a.vorlauf_tage),
    saison_id: text(a.saison_id), status: a.status, betrieb: text(a.betrieb), angebotsform: text(a.angebotsform), bemerkung: text(a.bemerkung),
  };
}

/** Ganze Zahl in einem Bereich; leer = null; ungültig = undefined. */
export function ganzzahl(t: string, min: number, max: number): number | null | undefined {
  const s = t.trim();
  if (s === "") return null;
  if (!/^\d+$/.test(s)) return undefined;
  const n = Number(s);
  return n >= min && n <= max ? n : undefined;
}

/** Dezimalzahl ≥ 0 mit bis zu 2 Stellen (Menge pro Gast, Preis); leer = null; ungültig = undefined. */
export function dezimal(t: string, max = 1_000_000): number | null | undefined {
  const s = t.trim().replace(",", ".");
  if (s === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return undefined;
  const n = Number(s);
  return n <= max ? n : undefined;
}

export function kopfUpdate(k: Kopf): { update: T["anlass"]["Update"] } | { fehler: string } {
  if (k.name.trim() === "") return { fehler: "Anlass: bitte eine Bezeichnung eingeben." };
  const gaeste = ganzzahl(k.gaeste, 1, 100000);
  if (gaeste === undefined) return { fehler: "Gäste: ganze Zahl ab 1, oder leer." };
  const vorlauf = ganzzahl(k.vorlauf_tage, 0, 60);
  if (vorlauf === undefined || vorlauf === null) return { fehler: "Vorlauf: ganze Zahl Tage von 0 bis 60." };
  if (k.datum && k.datum_bis && k.datum_bis < k.datum) return { fehler: "Datum bis liegt vor dem Datum." };
  if (!STATUS.some((s) => s.wert === k.status)) return { fehler: "Status wählen." };
  return {
    update: {
      nummer: leer(k.nummer), name: k.name.trim(), kunde: leer(k.kunde), datum: k.datum || null, datum_bis: k.datum_bis || null,
      ort: leer(k.ort), gaeste, vorlauf_tage: vorlauf, saison_id: k.saison_id || null, status: k.status,
      betrieb: k.betrieb || null, angebotsform: k.angebotsform || null, bemerkung: leer(k.bemerkung),
    },
  };
}

/** Gerichte einer Menülinie nach Gang, in der Reihenfolge der Erfassung (wie im Blatt Spengler Cup). */
export function gerichteNachGang(gerichte: LinieGericht[]): { gang: string; gerichte: LinieGericht[] }[] {
  const out: { gang: string; gerichte: LinieGericht[] }[] = [];
  for (const g of [...gerichte].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
    const grp = out.find((x) => x.gang === g.gang);
    if (grp) grp.gerichte.push(g);
    else out.push({ gang: g.gang, gerichte: [g] });
  }
  return out;
}

/** Datum von–bis als Text: «26.12.2026–31.12.2026», eintägig ohne Bindestrich, fehlend [Datum]. */
export function zeitraum(von: string | null, bis: string | null, fmt: (iso: string) => string): string {
  if (!von) return "[Datum]";
  return bis && bis !== von ? `${fmt(von)}–${fmt(bis)}` : fmt(von);
}

export function fehlerText(e: { message: string; code?: string }): string {
  if (e.code === "23505" && /anlass_nummer_key/.test(e.message)) return "Diese Anlassnummer gibt es schon.";
  if (e.code === "23505" && /service_anlass_id_name_key/.test(e.message)) return "Einen Service mit diesem Namen gibt es schon.";
  if (e.code === "23505" && /menuelinie_anlass_id_name_key/.test(e.message)) return "Eine Menülinie mit diesem Namen gibt es schon.";
  if (e.code === "23503" && /service_menuelinie_id_fkey/.test(e.message)) return "Die Menülinie wird noch von Services verwendet. Zuerst die Services umstellen.";
  return e.message;
}

/** Rubriken in der Reihenfolge ihres ersten Auftretens, darin nach Reihenfolge. */
export function nachRubrik(p: KartenPosition[]): { rubrik: string; positionen: KartenPosition[] }[] {
  const out: { rubrik: string; positionen: KartenPosition[] }[] = [];
  for (const x of [...p].sort((a, b) => a.reihenfolge - b.reihenfolge)) {
    const r = x.rubrik ?? "Ohne Rubrik";
    const g = out.find((y) => y.rubrik === r);
    if (g) g.positionen.push(x);
    else out.push({ rubrik: r, positionen: [x] });
  }
  return out;
}

/** Datum mehrerer Services in einem Schritt: nur die geänderten, leer = Datum entfernen. */
export function geaenderteDaten(services: Pick<Service, "id" | "name" | "datum">[], werte: Record<string, string>): { id: string; name: string; datum: string | null }[] {
  return services
    .filter((s) => s.id in werte && (werte[s.id] || null) !== (s.datum ?? null))
    .map((s) => ({ id: s.id, name: s.name, datum: werte[s.id] || null }));
}

/** Erstes ungültiges Datum (nicht JJJJ-MM-TT oder kein Kalendertag) oder null. */
export function ungueltigesDatum(werte: Record<string, string>): string | null {
  return Object.values(werte).find((w) => w !== "" && !(/^\d{4}-\d{2}-\d{2}$/.test(w) && !Number.isNaN(Date.parse(w)))) ?? null;
}
