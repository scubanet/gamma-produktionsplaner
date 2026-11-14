// Planung aus dem Rezept: Produktion pro Welle, Logistik und Service pro Spiel.
// Alle Zahlen kommen aus den Views planung_*; die App gruppiert und zeigt an.
import type { Database } from "./database.types";
import { formatMenge, formatMinuten, formatZahl } from "./format";

type V = Database["public"]["Views"];
export type ProduktionZeile = V["planung_produktion_komponente"]["Row"];
export type RolleZeile = V["planung_produktion_rolle"]["Row"];
export type GeraetZeile = V["planung_produktion_geraet"]["Row"];
export type ServiceZeile = V["planung_service_komponente"]["Row"];

export const GERECHNET = "gerechnet";

export type Bezug<Z> = { bezug: string; sortierung: number; bedarfAm: string | null; zeilen: Z[] };

/** Zeilen nach Welle bzw. Anlass, in der Reihenfolge der Datenbank; darin nach Kategorie und Name. */
export function nachBezug<Z extends { bezug: string | null; sortierung: number | null; bedarf_am: string | null }>(zeilen: Z[], ordnen?: (a: Z, b: Z) => number): Bezug<Z>[] {
  const m = new Map<string, Bezug<Z>>();
  for (const z of zeilen) {
    const k = z.bezug ?? "[Bezug]";
    const g = m.get(k) ?? { bezug: k, sortierung: z.sortierung ?? 0, bedarfAm: z.bedarf_am, zeilen: [] };
    g.zeilen.push(z);
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => a.sortierung - b.sortierung).map((g) => ({ ...g, zeilen: ordnen ? [...g.zeilen].sort(ordnen) : g.zeilen }));
}

export const nachKategorie = (a: { kategorie: string | null; komponente: string | null }, b: { kategorie: string | null; komponente: string | null }) =>
  (a.kategorie ?? "").localeCompare(b.kategorie ?? "", "de-CH") || (a.komponente ?? "").localeCompare(b.komponente ?? "", "de-CH");

/** «gerechnet für 3 von 10 Komponenten»: eine Summe gilt nur für die gerechneten Zeilen. */
export function abdeckung(zeilen: { status: string | null }[]): { gerechnet: number; alle: number; text: string } {
  const gerechnet = zeilen.filter((z) => z.status === GERECHNET).length;
  return { gerechnet, alle: zeilen.length, text: `gerechnet für ${formatZahl(gerechnet)} von ${formatZahl(zeilen.length)} Komponenten` };
}

/** Summe über die Zeilen mit Wert; null, wenn keine Zeile einen Wert hat. */
export function summe<Z>(zeilen: Z[], wert: (z: Z) => number | null): number | null {
  const werte = zeilen.map(wert).filter((w): w is number => w !== null);
  return werte.length ? werte.reduce((a, b) => a + b, 0) : null;
}

export const minuten = (m: number | null, leer = "[Zeit]") => (m === null ? leer : formatMinuten(m));
export const anzahl = (n: number | null, leer: string) => (n === null ? leer : formatZahl(n));

/** Pill für den Status: gerechnet = ok, sonst sagt der Text, was fehlt. */
export const statusPill = (status: string | null): "ok" | "warn" => (status === GERECHNET ? "ok" : "warn");

/** Was am häufigsten fehlt, als kurze Liste «7 × kein Rezept». */
export function fehlend(zeilen: { status: string | null }[]): string[] {
  const m = new Map<string, number>();
  for (const z of zeilen) if (z.status && z.status !== GERECHNET) m.set(z.status, (m.get(z.status) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "de-CH")).map(([s, n]) => `${formatZahl(n)} × ${s}`);
}

export function gewichtText(z: Pick<ServiceZeile, "gewicht_kg" | "gebinde_anzahl">): string {
  if (z.gebinde_anzahl === null) return "[Gewicht]";
  return z.gewicht_kg === null ? "[Tara]" : formatMenge(z.gewicht_kg, "kg");
}

export function volumenText(z: Pick<ServiceZeile, "volumen_l" | "gebinde_anzahl">): string {
  if (z.gebinde_anzahl === null) return "[Volumen]";
  return z.volumen_l === null ? "[Volumen]" : `${formatZahl(z.volumen_l, 1)} l`;
}

/** Services einer Saison für die Auswahl, in ihrer Reihenfolge. */
export function services(zeilen: ServiceZeile[]): { value: string; label: string }[] {
  const m = new Map<string, { label: string; rang: number }>();
  for (const z of zeilen) if (z.service_id) m.set(z.service_id, { label: z.service ?? "[Service]", rang: z.reihenfolge ?? 0 });
  return [...m.entries()].sort((a, b) => a[1].rang - b[1].rang).map(([value, x]) => ({ value, label: x.label }));
}
