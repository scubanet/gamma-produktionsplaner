// Wahl des Anlasses in der Produktion: leer = alle Anlässe der Saison. Die Wahl überlebt das Neuladen (localStorage).
// Mengen kommen dann aus produktionsliste_anlass (Migration 37); Wellen und Start bleiben die der Saison.
import { formatDatum } from "./format";

export const ANLASS_SCHLUESSEL = "planer.anlass";

export type AnlassWahl = { id: string; name: string; datum: string | null; menuelinien: number };

/** Gespeicherte Wahl, wenn es den Anlass noch gibt; sonst alle. */
export function gueltigeWahl(gespeichert: string | null, anlaesse: Pick<AnlassWahl, "id">[]): string {
  return gespeichert && anlaesse.some((a) => a.id === gespeichert) ? gespeichert : "";
}

export function anlassOptionen(anlaesse: AnlassWahl[]): { value: string; label: string }[] {
  return [
    { value: "", label: "Alle Anlässe (Saison)" },
    ...anlaesse.map((a) => ({ value: a.id, label: `${a.name} · ${a.datum ? formatDatum(a.datum) : "[Datum]"}${a.menuelinien ? "" : " · noch keine Menülinie"}` })),
  ];
}

export function wahlLesen(): string | null {
  try {
    return window.localStorage.getItem(ANLASS_SCHLUESSEL);
  } catch {
    return null;
  }
}

export function wahlMerken(id: string): void {
  try {
    if (id) window.localStorage.setItem(ANLASS_SCHLUESSEL, id);
    else window.localStorage.removeItem(ANLASS_SCHLUESSEL);
  } catch {}
}
