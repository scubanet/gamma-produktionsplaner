// Lager (Etappe 2): Bestand der etikettierten Beutel. Zahlen, Ablauf und Bedarf rechnet die Datenbank
// (Views lager_bestand, lager_einheit, lager_bedarf); hier wird gefiltert, Text gebildet und die Eingabe geprüft.
import type { Database } from "./database.types";
import { formatDatum } from "./format";

type V = Database["public"]["Views"];
export type Bestand = V["lager_bestand"]["Row"];
export type Einheit = V["lager_einheit"]["Row"];
export type LagerBedarf = V["lager_bedarf"]["Row"];

/** Ab so wenigen Tagen bis zum Verbrauchsdatum gilt ein Beutel als «läuft bald ab». */
export const BALD_TAGE = 3;
export const GRUENDE = ["nicht produziert", "abgelaufen", "beschädigt", "Qualität"] as const;
export type Ablauf = "" | "bald" | "abgelaufen";
/** Lagerarten, wie sie die Datenbank schreibt (Views lager_einheit, etikett_beutel). */
export const LAGERARTEN = ["0–2 °C", "TK −18 °C", "Economat"] as const;

/** «in 3 Tagen», «heute», «seit 2 Tagen abgelaufen»; ohne Angabe ein Strich. */
export function ablaufText(tage: number | null): string {
  if (tage === null) return "–";
  if (tage < 0) return `seit ${-tage} ${tage === -1 ? "Tag" : "Tagen"} abgelaufen`;
  if (tage === 0) return "heute";
  return `in ${tage} ${tage === 1 ? "Tag" : "Tagen"}`;
}

/** Farbe des Ablaufs: abgelaufen kritisch, bald gelb, sonst ok. */
export function ablaufStatus(tage: number | null): "critical" | "warn" | "ok" | "neutral" {
  if (tage === null) return "neutral";
  return tage < 0 ? "critical" : tage <= BALD_TAGE ? "warn" : "ok";
}

/** «Welle 2» oder «ohne Welle eingelagert». */
export const herkunftText = (e: Pick<Einheit, "welle_nr">): string => (e.welle_nr ? `Welle ${e.welle_nr}` : "ohne Welle eingelagert");

export function bestandFiltern(zeilen: Bestand[], f: { suche: string; ablauf: Ablauf; lagerart?: string }): Bestand[] {
  const suche = f.suche.trim().toLocaleLowerCase("de-CH");
  return zeilen.filter((z) => {
    if (suche && !`${z.produkt ?? ""} ${z.produkt_code ?? ""} ${z.kategorie ?? ""}`.toLocaleLowerCase("de-CH").includes(suche)) return false;
    if (f.lagerart && !(z.lagerung ?? "").split(", ").includes(f.lagerart)) return false;
    if (f.ablauf === "abgelaufen" && !(z.beutel_abgelaufen ?? 0)) return false;
    if (f.ablauf === "bald" && !(z.tage_bis_ablauf !== null && z.tage_bis_ablauf <= BALD_TAGE)) return false;
    return true;
  });
}

/** Kennzahlen über den ganzen Bestand (Summen der Zeilen aus der Datenbank). */
export function kennzahlen(zeilen: Bestand[]): { beutel: number; produkte: number; bald: number; abgelaufen: number } {
  return {
    beutel: zeilen.reduce((n, z) => n + (z.beutel ?? 0), 0),
    produkte: new Set(zeilen.filter((z) => (z.beutel ?? 0) > 0).map((z) => z.produkt_id)).size,
    bald: new Set(zeilen.filter((z) => z.tage_bis_ablauf !== null && z.tage_bis_ablauf <= BALD_TAGE).map((z) => z.produkt_id)).size,
    abgelaufen: zeilen.reduce((n, z) => n + (z.beutel_abgelaufen ?? 0), 0),
  };
}

/** Beutel eines Produkts und einer Einheit, die zuerst ablaufenden zuoberst. */
export function einheitenVon(alle: Einheit[], produktId: string | null, einheit: string | null): Einheit[] {
  return alle
    .filter((e) => e.produkt_id === produktId && e.einheit === einheit)
    .sort((a, b) => (a.verbrauchen_bis ?? "").localeCompare(b.verbrauchen_bis ?? "") || (a.seriennummer ?? "").localeCompare(b.seriennummer ?? ""));
}

export type EinlagernFormular = { komponente: string; anzahl: string; menge: string; einheit: string; produziert_am: string; verbrauchen_bis: string };
export type EinlagernArgumente = { p_komponente: string; p_anzahl: number; p_menge: number; p_einheit: string; p_produziert_am: string; p_verbrauchen_bis?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const zahl = (text: string): number | null => {
  const t = text.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};

/** Prüft «Produkt einlagern»; die Datenbank prüft dieselben Regeln nochmals. heute = Tag in der Schweiz (ISO). */
export function einlagernEingabe(f: EinlagernFormular, heute: string): EinlagernArgumente | { fehler: string } {
  if (!f.komponente) return { fehler: "Bitte ein Produkt wählen." };
  const anzahl = zahl(f.anzahl);
  if (anzahl === null || !Number.isInteger(anzahl) || anzahl < 1 || anzahl > 500) return { fehler: "Anzahl Beutel: eine ganze Zahl von 1 bis 500." };
  const menge = zahl(f.menge);
  if (menge === null || menge <= 0 || !/^\d+([.,]\d{1,3})?$/.test(f.menge.trim())) return { fehler: "Menge pro Beutel: eine Zahl über 0 mit höchstens 3 Stellen." };
  if (!["kg", "l", "Stk"].includes(f.einheit)) return { fehler: "Einheit: kg, l oder Stk." };
  if (!ISO.test(f.produziert_am)) return { fehler: "Produktionsdatum fehlt." };
  if (f.produziert_am > heute) return { fehler: `Produktionsdatum: heute (${formatDatum(heute)}) oder früher.` };
  const bis = f.verbrauchen_bis.trim();
  if (bis && !ISO.test(bis)) return { fehler: "Verbrauchen bis: ein gültiges Datum, oder leer." };
  if (bis && bis < f.produziert_am) return { fehler: "«Verbrauchen bis» liegt vor dem Produktionsdatum." };
  return { p_komponente: f.komponente, p_anzahl: anzahl, p_menge: menge, p_einheit: f.einheit, p_produziert_am: f.produziert_am, ...(bis ? { p_verbrauchen_bis: bis } : {}) };
}

/** Heutiges Datum in der Schweiz als ISO-Text, wie es die Datenbank für «heute» nimmt. */
export function heuteSchweiz(jetzt: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zurich" }).format(jetzt);
}

/** Einheit, in der eine Komponente im Bedarf steht (kg, l oder Stk); null, wenn sie nicht oder in mehreren Einheiten vorkommt. */
export function bedarfsEinheit(bedarf: LagerBedarf[], komponenteId: string): string | null {
  const e = new Set(bedarf.filter((z) => z.komponente_id === komponenteId && z.einheit).map((z) => z.einheit as string));
  return e.size === 1 ? [...e][0] : null;
}

/** «P0123» aus der Produktnummer. */
export const produktCode = (nr: number | null | undefined): string => (nr == null ? "[Produkt]" : `P${String(nr).padStart(4, "0")}`);

/** Bedarf pro Spiel zusammengefasst: wie viele Produkte das Lager deckt. */
export function bedarfProSpiel(zeilen: LagerBedarf[]): { serviceId: string; titel: string; datum: string | null; produkte: number; gedeckt: number }[] {
  const m = new Map<string, { serviceId: string; titel: string; datum: string | null; reihenfolge: number; produkte: number; gedeckt: number }>();
  for (const z of zeilen) {
    if (!z.service_id) continue;
    const s = m.get(z.service_id) ?? { serviceId: z.service_id, titel: `${z.anlass ?? "[Anlass]"} · ${z.service ?? "[Spiel]"}`, datum: z.datum, reihenfolge: z.reihenfolge ?? 0, produkte: 0, gedeckt: 0 };
    s.produkte += 1;
    if (z.gedeckt) s.gedeckt += 1;
    m.set(z.service_id, s);
  }
  return [...m.values()].sort((a, b) => (a.datum ?? "9999").localeCompare(b.datum ?? "9999") || a.reihenfolge - b.reihenfolge);
}
