// Stufen der Benutzer (Entscheide Dominik, 20.11.2026). Die Sperre selbst liegt in der Datenbank (Migrationen 43, 44);
// hier steht, was die App einer Stufe zeigt. Eine weitere Stufe braucht einen Eintrag in STUFEN und in RECHTE.
export type Stufe = "admin" | "benutzer" | "kueche" | "scannen";

export const STUFEN: { stufe: Stufe; label: string; darf: string }[] = [
  { stufe: "admin", label: "Admin", darf: "alles, dazu Benutzer verwalten und Rezepte löschen" },
  { stufe: "benutzer", label: "Benutzer", darf: "alles lesen und schreiben" },
  { stufe: "kueche", label: "Küche", darf: "lesen ohne Preise, abhaken, Etiketten und Lager" },
  { stufe: "scannen", label: "Scannen", darf: "nur packen, scannen und nachschlagen" },
];

/**
 * planen: Daten ändern (Zuständig, Wellen, Rezepte, Zuordnungen, Anlässe). preise: Franken-Beträge sehen.
 * Abhaken, Etiketten und Lager dürfen alle Stufen ausser «Scannen».
 */
export type Recht = "planen" | "preise";

const RECHTE: Record<Stufe, Recht[]> = {
  admin: ["planen", "preise"],
  benutzer: ["planen", "preise"],
  kueche: [],
  scannen: [],
};

/** Seiten, die eine Stufe nicht sieht (Pfad gleich oder darunter). */
const GESPERRT: Record<Exclude<Stufe, "scannen">, string[]> = {
  admin: [],
  benutzer: [],
  kueche: [
    "/offerten", "/ressourcen", "/rentabilitaet", "/stammdaten", "/benutzer",
    "/einkauf/lieferanten", "/einkauf/zuordnen", "/einkauf/zutaten", "/rezepte/bearbeiten", "/anlaesse/karte",
  ],
};

export const darf = (stufe: Stufe, recht: Recht) => RECHTE[stufe].includes(recht);

/** «Scannen» sieht nur diese Seiten (Pfad gleich oder darunter); alles andere ist gesperrt, auch neue Seiten. */
const NUR_SCANNEN = ["/scannen", "/packliste", "/e"];

export function sichtbar(stufe: Stufe, pfad: string): boolean {
  const p = pfad.length > 1 ? pfad.replace(/\/+$/, "") : pfad;
  const trifft = (g: string) => p === g || p.startsWith(`${g}/`);
  return stufe === "scannen" ? NUR_SCANNEN.some(trifft) : !GESPERRT[stufe].some(trifft);
}

/** Antwort der Datenbank-Funktion stufe(); Unbekanntes gilt als tiefste Stufe. */
export const stufeAus = (wert: unknown): Stufe => (wert === "admin" || wert === "benutzer" || wert === "kueche" ? wert : "scannen");

export const stufeLabel = (stufe: Stufe) => STUFEN.find((s) => s.stufe === stufe)?.label ?? stufe;

/**
 * Herleitung der Einkaufsliste ohne Franken-Beträge (Stufe ohne «preise»). Die Views schreiben Preise in den Text
 * («… × CHF 1.20 = CHF 4.80», «; Kosten CHF 12.00», «; Kosten [Preis], weil unvollständig», «; [Preis]»).
 * Bleibt trotzdem ein Betrag oder der Platzhalter stehen, fällt der Text ganz weg.
 */
export function ohnePreis(text: string | null): string {
  const t = (text ?? "")
    .replace(/ × CHF [\d.]+ = CHF [\d.]+/g, "")
    .replace(/; Kosten (CHF [\d.]+|\[Preis\], weil unvollständig)/g, "")
    .replace(/; \[Preis\]/g, "");
  return !t || /CHF|\[Preis\]/.test(t) ? "–" : t;
}
