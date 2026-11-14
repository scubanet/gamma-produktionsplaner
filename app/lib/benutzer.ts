// Benutzerverwaltung: Liste und Aktionen laufen über die Edge Function «benutzer» (nur Admins).
// Hier nur Typen, Prüfung der Eingaben und Anzeige.
import { formatDatum } from "./format";

export type Benutzer = {
  id: string; email: string; name: string; erstellt_am: string; letzte_anmeldung: string | null;
  gesperrt: boolean; admin: boolean; ich: boolean;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Eingaben für einen neuen Zugang prüfen; E-Mail klein geschrieben und ohne Leerzeichen. */
export function neuerZugang(name: string, email: string): { name: string; email: string } | { fehler: string } {
  const e = email.trim().toLowerCase();
  if (!EMAIL.test(e)) return { fehler: "E-Mail-Adresse prüfen, z.B. vorname.name@gammacatering.com." };
  if (name.trim().length > 80) return { fehler: "Name: höchstens 80 Zeichen." };
  return { name: name.trim(), email: e };
}

export type Status = { text: string; pill: "ok" | "warn" | "neutral" };

/** Gesperrt geht vor; ohne Anmeldung ist der Zugang angelegt, aber noch nie benutzt. */
export function status(b: Pick<Benutzer, "gesperrt" | "letzte_anmeldung">): Status {
  if (b.gesperrt) return { text: "gesperrt", pill: "warn" };
  return b.letzte_anmeldung ? { text: "aktiv", pill: "ok" } : { text: "noch nie angemeldet", pill: "neutral" };
}

export const datumText = (iso: string | null) => (iso ? formatDatum(iso.slice(0, 10)) : "–");

/** Admins zuerst, dann nach Name bzw. E-Mail. */
export function sortieren(liste: Benutzer[]): Benutzer[] {
  return [...liste].sort((a, b) => Number(b.admin) - Number(a.admin) || (a.name || a.email).localeCompare(b.name || b.email, "de-CH"));
}

/** Ein Admin darf sich nicht selbst sperren oder das eigene Admin-Recht entziehen. */
export const selbst = (b: Pick<Benutzer, "ich">) => b.ich;
