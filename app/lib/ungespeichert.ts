/** Vergleich über die Serialisierung: reicht für Formulare aus Text, Zahlen und Listen. */
export const istGeaendert = (jetzt: unknown, ausgang: unknown): boolean => JSON.stringify(jetzt) !== JSON.stringify(ausgang);

export type Klick = { href: string; ziel: string; download: boolean; taste: number; mitZusatztaste: boolean };

/**
 * Soll die App bei diesem Klick auf einen Link zuerst nachfragen? Ja, wenn er die Seite im gleichen Tab
 * innerhalb der App verlässt. Fremde Adressen, Tab schliessen und Neuladen übernimmt der Browser (beforeunload).
 */
export function faengtAb(k: Klick, ort: string): boolean {
  if (k.taste !== 0 || k.mitZusatztaste || k.download || (k.ziel && k.ziel !== "_self")) return false;
  let ziel: URL;
  try {
    ziel = new URL(k.href);
  } catch {
    return false;
  }
  const hier = new URL(ort);
  if (ziel.origin !== hier.origin) return false;
  return ziel.pathname !== hier.pathname || ziel.search !== hier.search;
}
