// Anmeldung ohne Passwort. Der Link in der E-Mail führt auf /anmelden/ mit ?token_hash=…; eingelöst wird er erst
// mit dem Klick auf «Jetzt anmelden». Grund: Mailschutz-Programme öffnen jeden Link in einer E-Mail zur Prüfung.
// Ein Link, der schon beim Öffnen anmeldet, ist danach verbraucht (so geschehen am 17.11.2026).

export type Ankunft = { art: "leer" } | { art: "bestaetigen"; tokenHash: string } | { art: "abgelaufen" };

/** Liest aus der Adresse (Abfrage und Teil nach dem #), womit jemand auf der Anmeldeseite ankommt. */
export function ankunft(abfrage: string, anker: string): Ankunft {
  const q = new URLSearchParams(abfrage);
  const h = new URLSearchParams(anker.replace(/^#/, ""));
  const tokenHash = q.get("token_hash");
  if (tokenHash) return { art: "bestaetigen", tokenHash };
  if ([q, h].some((p) => p.get("error") || p.get("error_code"))) return { art: "abgelaufen" };
  return { art: "leer" };
}

export const nurZiffern = (s: string) => s.replace(/\D/g, "");

export const ABGELAUFEN = "Dieser Link oder Code ist abgelaufen oder wurde schon verwendet. Bitte einen neuen anfordern.";

/** Meldungen von Supabase auf Deutsch; Unbekanntes bleibt, wie es ist. */
export function fehlertext(meldung: string): string {
  if (/signups not allowed/i.test(meldung)) return "Diese Adresse ist im Produktionsplaner nicht eingeladen. Bitte bei Dominik Weckherlin melden.";
  if (/expired|invalid|not found/i.test(meldung)) return ABGELAUFEN;
  if (/security purposes|rate limit/i.test(meldung)) return "Zu viele Versuche kurz nacheinander. Bitte eine Minute warten.";
  return meldung;
}
