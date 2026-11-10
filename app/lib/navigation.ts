import type { SideNavItem } from "./planer";

// Reihenfolge wie mockups/Nav.dc.html. href nur für Bereiche, die gebaut sind; der Rest bleibt deaktiviert.
export const BEREICHE: { label: string; href?: string }[] = [
  { label: "Leitstand", href: "/" },
  { label: "Offerten", href: "/offerten/" },
  { label: "Anlässe" },
  { label: "Ressourcen" },
  { label: "Produktionsplan", href: "/produktion/" },
  { label: "Systemzuteilung", href: "/systemzuteilung/" },
  { label: "Katalog", href: "/katalog/" },
  { label: "Rezepte", href: "/rezepte/" },
  { label: "Rentabilität" },
  { label: "Einkauf" },
  { label: "Stammdaten" },
];

const ohneSchraegstrich = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/** Bereich aktiv, wenn der Pfad gleich ist oder darunter liegt (z.B. /offerten/bearbeiten/ → Offerten). */
function aktiv(href: string, aktuell: string): boolean {
  const h = ohneSchraegstrich(href);
  return h === "/" ? aktuell === "/" : aktuell === h || aktuell.startsWith(`${h}/`);
}

export function navEintraege(pfad: string): SideNavItem[] {
  const aktuell = ohneSchraegstrich(pfad);
  return BEREICHE.map((b) =>
    b.href ? { label: b.label, href: b.href, current: aktiv(b.href, aktuell) } : { label: b.label, disabled: true },
  );
}

export const ANMELDEN = "/anmelden/";

export function istOeffentlich(pfad: string): boolean {
  return ohneSchraegstrich(pfad) === ohneSchraegstrich(ANMELDEN);
}
