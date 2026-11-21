// Packliste pro Spiel (Scan-App S4). Soll, Ist, Kisten, Gewicht und jedes Scan-Ergebnis rechnet die Datenbank
// (Views packliste, etikett_kiste, kiste_gewicht, logistik_gewicht; Funktionen beutel_einpacken usw.).
// Hier werden nur Texte gebildet und Zeilen gezählt.
import type { Database } from "./database.types";
import { formatDatum, formatZahl } from "./format";

type V = Database["public"]["Views"];
export type Zeile = V["packliste"]["Row"];
export type OhneEtikett = V["packliste_ohne_etikett"]["Row"];
export type Kiste = V["etikett_kiste"]["Row"];
export type KisteGewicht = V["kiste_gewicht"]["Row"];
export type Logistik = V["logistik_gewicht"]["Row"];

type Pill = "ok" | "info" | "warn" | "critical" | "neutral";

/** Antwort der Scan-Funktionen der Datenbank (beutel_einpacken, beutel_auspacken, scan_erfassen). */
export type ScanAntwort = {
  ergebnis: string;
  farbe: "gruen" | "gelb" | "rot";
  meldung: string;
  eingepackt?: boolean;
  ausgepackt?: boolean;
  bestaetigung?: boolean;
  klaeren?: boolean;
  hinweise?: { code: string; text: string }[];
};

export const farbePill = (farbe: string): Pill => (farbe === "gruen" ? "ok" : farbe === "gelb" ? "warn" : "critical");

/** Stand eines Produkts in der Packliste. «Fehlt noch» ist kein Fehler (info). */
export function standText(status: string | null): { text: string; pill: Pill } {
  switch (status) {
    case "erreicht": return { text: "gepackt", pill: "ok" };
    case "offen": return { text: "fehlt noch", pill: "info" };
    case "zusaetzlich": return { text: "zusätzlich", pill: "neutral" };
    default: return { text: "[Menge]", pill: "neutral" };
  }
}

export function kistenZustand(zustand: string | null): { text: string; pill: Pill } {
  switch (zustand) {
    case "offen": return { text: "offen", pill: "info" };
    case "verladen": return { text: "verladen", pill: "ok" };
    case "angekommen": return { text: "angekommen", pill: "ok" };
    case "abgeschlossen": return { text: "abgeschlossen", pill: "neutral" };
    case "aufgeloest": return { text: "aufgelöst", pill: "neutral" };
    default: return { text: "[Zustand]", pill: "neutral" };
  }
}

/** Kennzahlen eines Spiels. Aufgelöste Kisten zählen nicht. */
export function kennzahlen(zeilen: Zeile[], kisten: Kiste[]): { imSoll: number; gepackt: number; zusaetzlich: number; zuKlaeren: number; kisten: number; verladen: number; angekommen: number } {
  const k = kisten.filter((x) => x.zustand !== "aufgeloest");
  return {
    imSoll: zeilen.filter((z) => z.status !== "zusaetzlich").length,
    gepackt: zeilen.filter((z) => z.status === "erreicht").length,
    zusaetzlich: zeilen.filter((z) => z.status === "zusaetzlich").length,
    zuKlaeren: zeilen.reduce((n, z) => n + (z.zu_klaeren ?? 0), 0),
    kisten: k.length,
    verladen: k.filter((x) => x.zustand === "verladen" || x.zustand === "angekommen" || x.zustand === "abgeschlossen").length,
    angekommen: k.filter((x) => x.zustand === "angekommen" || x.zustand === "abgeschlossen").length,
  };
}

/** Gewicht in kg mit zwei Stellen; fehlt es, der Platzhalter. */
export const gewichtText = (kg: number | null | undefined): string => (kg === null || kg === undefined ? "[Gewicht]" : `${formatZahl(kg, 2)} kg`);

/** Gewicht einer Kiste: mit Tara, wenn vollständig; sonst der Inhalt mit dem Vermerk «ohne Tara». */
export function kisteGewichtText(g: Pick<KisteGewicht, "beutel" | "brutto_kg" | "netto_kg"> | undefined): string {
  if (!g || !g.beutel) return "–";
  return g.brutto_kg !== null ? gewichtText(g.brutto_kg) : `${gewichtText(g.netto_kg)} ohne Tara`;
}

export const transportartText = (t: string | null): string => (t ? t.charAt(0).toLocaleUpperCase("de-CH") + t.slice(1) : "Ohne Lagerart");

const kistenText = (n: number | null): string => (n === null ? "[Kisten]" : `${formatZahl(n)} ${n === 1 ? "Kiste" : "Kisten"}`);

/** Was am Planwert einer Zeile fehlt, als Liste von Sätzen. */
export function logistikLuecken(z: Logistik): string[] {
  const l: string[] = [];
  const p = (n: number | null, text: string) => {
    if (n) l.push(`${formatZahl(n)} ${n === 1 ? "Produkt" : "Produkte"} ${text}`);
  };
  p(z.produkte_stueck, "in Stück ohne Gewicht");
  p(z.produkte_ohne_menge, "ohne Menge im Bedarf");
  p(z.produkte_ohne_fuellmenge, "ohne Füllmenge pro Kiste am Rezept");
  p(z.produkte_ohne_tara, "ohne Tara für den Planwert");
  if (z.ist_beutel_stueck) l.push(`${formatZahl(z.ist_beutel_stueck)} gepackte Beutel in Stück ohne Gewicht`);
  if (z.ist_kisten_ohne_tara) l.push(`${formatZahl(z.ist_kisten_ohne_tara)} gepackte ${z.ist_kisten_ohne_tara === 1 ? "Kiste" : "Kisten"} ohne Tara`);
  if (z.liter_annahme) l.push("Annahme: 1 l = 1 kg");
  return l;
}

/**
 * Angabe für die Logistik als Text zum Kopieren: pro Transportart der Planwert aus dem Bedarf und der Stand der gepackten Kisten.
 * Unvollständige Zahlen stehen als Platzhalter, die Lücken darunter.
 */
export function logistikText(spiel: { anlass: string; service: string; datum: string | null }, zeilen: Logistik[]): string {
  const kopf = `${spiel.anlass} · ${spiel.service}${spiel.datum ? ` · ${formatDatum(spiel.datum)}` : ""}`;
  const teile = [...zeilen]
    .sort((a, b) => (a.sortierung ?? 9) - (b.sortierung ?? 9))
    .map((z) => {
      const zeile = [
        `${transportartText(z.transportart)}:`,
        `  Plan: rund ${kistenText(z.soll_kisten)}, ${gewichtText(z.soll_netto_kg)} ohne Tara, ${gewichtText(z.soll_brutto_kg)} mit Tara`,
        `  Gepackt: ${kistenText(z.ist_kisten ?? 0)}, ${gewichtText(z.ist_netto_kg ?? 0)} ohne Tara, ${gewichtText(z.ist_brutto_kg)} mit Tara`,
      ];
      const luecken = logistikLuecken(z);
      if (luecken.length) zeile.push(`  Hinweis: ${luecken.join("; ")}`);
      return zeile.join("\n");
    });
  return [kopf, "Gewicht der Speisen in IFCO-Kisten (ohne Geschirr, Geräte und Getränke)", "", ...teile].join("\n");
}

/** Kisten, die beim Abschluss einen Entscheid brauchen: mit Inhalt und ohne Ankunfts-Scan. */
export const kistenOhneAnkunft = (kisten: Kiste[]): Kiste[] => kisten.filter((k) => (k.zustand === "offen" || k.zustand === "verladen") && (k.beutel ?? 0) > 0);

export type Entscheid = "verbraucht" | "lager" | "entsorgt";
/** «Zurück ins Lager» gibt es nur für Kisten, die nie verladen wurden (Spezifikation, Punkt 7 ist offen). */
export function entscheidOptionen(zustand: string | null): { value: Entscheid; label: string }[] {
  const o: { value: Entscheid; label: string }[] = [{ value: "verbraucht", label: "verbraucht" }];
  if (zustand === "offen") o.push({ value: "lager", label: "zurück ins Lager" });
  o.push({ value: "entsorgt", label: "entsorgt" });
  return o;
}

/** «Kiste 2 von 5 · K-7BMHPP». */
export const kisteTitel = (k: Pick<Kiste, "laufnummer" | "kisten_im_spiel">): string => `Kiste ${k.laufnummer ?? "?"}${k.kisten_im_spiel ? ` von ${k.kisten_im_spiel}` : ""}`;
