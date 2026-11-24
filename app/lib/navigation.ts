import type { SideNavItem } from "./planer";
import { sichtbar, type Stufe } from "./stufe";

export type Bereich = { label: string; href: string };
export type Gruppe = { label: string; bereiche: Bereich[] };
export type NavEintrag = { label: string; href: string; current: boolean };

// Sechs Bereiche in der Hauptnavigation; die Seiten eines Bereichs stehen als Tabs darunter.
export const GRUPPEN: Gruppe[] = [
  { label: "Leitstand", bereiche: [{ label: "Leitstand", href: "/" }] },
  { label: "Verkauf", bereiche: [{ label: "Offerten", href: "/offerten/" }, { label: "Anlässe", href: "/anlaesse/" }] },
  { label: "Produktion", bereiche: [{ label: "Produktionsplan", href: "/produktion/" }, { label: "Ressourcen", href: "/ressourcen/" }, { label: "Einkauf", href: "/einkauf/" }, { label: "Küchenpass", href: "/kueche/" }, { label: "Lager", href: "/lager/" }, { label: "Temperaturen", href: "/temperatur/" }, { label: "Packliste", href: "/packliste/" }, { label: "Scannen", href: "/scannen/" }] },
  { label: "Küche", bereiche: [{ label: "Rezepte", href: "/rezepte/" }, { label: "Katalog", href: "/katalog/" }, { label: "Systemzuteilung", href: "/systemzuteilung/" }] },
  { label: "Auswertung", bereiche: [{ label: "Rentabilität", href: "/rentabilitaet/" }] },
  { label: "Verwaltung", bereiche: [{ label: "Stammdaten", href: "/stammdaten/" }, { label: "Benutzer", href: "/benutzer/" }] },
];

/** Flache Liste aller Seiten (alte SideNav in den Mockups). */
export const BEREICHE: { label: string; href?: string }[] = GRUPPEN.flatMap((g) => g.bereiche);

/** Ansichten innerhalb einer Seite. Hier zählt der genaue Pfad, nicht «liegt darunter». */
const ANSICHTEN: Record<string, Bereich[]> = {
  "/produktion": [
    { label: "Liste", href: "/produktion/" },
    { label: "Wellen", href: "/produktion/wellen/" },
    { label: "Aufwand aus Rezepten", href: "/produktion/aufwand/" },
  ],
  "/einkauf": [
    { label: "Einkaufsliste", href: "/einkauf/" },
    { label: "Lieferanten", href: "/einkauf/lieferanten/" },
    { label: "Artikel zuordnen", href: "/einkauf/zuordnen/" },
    { label: "Zutaten zuordnen", href: "/einkauf/zutaten/" },
  ],
};

const ohneSchraegstrich = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** Bereich aktiv, wenn der Pfad gleich ist oder darunter liegt (z.B. /offerten/bearbeiten/ → Offerten). */
function aktiv(href: string, aktuell: string): boolean {
  const h = ohneSchraegstrich(href);
  return h === "/" ? aktuell === "/" : aktuell === h || aktuell.startsWith(`${h}/`);
}

/** Bereiche, die eine Stufe sieht; Bereiche ohne sichtbare Seite fallen weg. Ohne Stufe: alle. */
const gruppenFuer = (stufe?: Stufe): Gruppe[] =>
  stufe
    ? GRUPPEN.map((g) => ({ ...g, bereiche: g.bereiche.filter((b) => sichtbar(stufe, b.href)) })).filter((g) => g.bereiche.length > 0)
    : GRUPPEN;

export function navEintraege(pfad: string): SideNavItem[] {
  const aktuell = ohneSchraegstrich(pfad);
  return BEREICHE.map((b) =>
    b.href ? { label: b.label, href: b.href, current: aktiv(b.href, aktuell) } : { label: b.label, disabled: true },
  );
}

const gruppeVon = (aktuell: string, gruppen: Gruppe[]) => gruppen.find((g) => g.bereiche.some((b) => aktiv(b.href, aktuell)));

/** Hauptnavigation: ein Eintrag pro Bereich, verlinkt auf dessen erste Seite. */
export function hauptnav(pfad: string, stufe?: Stufe): NavEintrag[] {
  const gruppen = gruppenFuer(stufe);
  const g = gruppeVon(ohneSchraegstrich(pfad), gruppen);
  return gruppen.map((x) => ({ label: x.label, href: x.bereiche[0].href, current: x === g }));
}

/** Seiten des aktuellen Bereichs; leer, wenn der Bereich nur eine Seite hat. */
export function unternav(pfad: string, stufe?: Stufe): NavEintrag[] {
  const aktuell = ohneSchraegstrich(pfad);
  const g = gruppeVon(aktuell, gruppenFuer(stufe));
  if (!g || g.bereiche.length < 2) return [];
  return g.bereiche.map((b) => ({ label: b.label, href: b.href, current: aktiv(b.href, aktuell) }));
}

/** Ansichten der aktuellen Seite (z.B. Liste, Wellen, Aufwand); leer, wenn die Seite keine hat. */
export function seitenTabs(pfad: string, stufe?: Stufe): NavEintrag[] {
  const aktuell = ohneSchraegstrich(pfad);
  const wurzel = Object.keys(ANSICHTEN).find((w) => aktuell === w || aktuell.startsWith(`${w}/`));
  if (!wurzel) return [];
  const ansichten = ANSICHTEN[wurzel].filter((a) => !stufe || sichtbar(stufe, a.href));
  // Eine einzige Ansicht braucht keine Tabs.
  if (ansichten.length < 2) return [];
  return ansichten.map((a) => ({ label: a.label, href: a.href, current: ohneSchraegstrich(a.href) === aktuell }));
}

export const ANMELDEN = "/anmelden/";

/**
 * Ziel nach der Anmeldung (?weiter=): nur Pfade dieser App. Abgelehnt werden fremde Adressen,
 * «//host» und «/\\host» (Browser lesen den Rückstrich als Schrägstrich) sowie Steuerzeichen.
 */
export function sichererPfad(p: string | null | undefined): string {
  if (!p || !p.startsWith("/") || p.startsWith("//")) return "/";
  if (/[\\\u0000-\u001f\u007f]/.test(p)) return "/";
  return p;
}

export function istOeffentlich(pfad: string): boolean {
  return ohneSchraegstrich(pfad) === ohneSchraegstrich(ANMELDEN);
}
