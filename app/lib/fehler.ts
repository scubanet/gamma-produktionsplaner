// Fehlermeldungen in klarer Sprache. Die technische Meldung (von Supabase, auf Englisch) steht nie im Haupttext;
// Notice zeigt sie aufklappbar unter «Technische Angaben». Eigene Texte der App und der Datenbankfunktionen (auf Deutsch) bleiben.

export type FehlerArt = "verbindung" | "sitzung" | "berechtigung" | "verwendet" | "doppelt" | "stand" | "eigen" | "unbekannt";

export const ALLGEMEIN = "Das hat nicht geklappt. Bitte nochmals versuchen.";

const TEXT: Record<Exclude<FehlerArt, "eigen" | "unbekannt">, string> = {
  verbindung: "Keine Verbindung zum Server. Bitte Netz prüfen und nochmals versuchen.",
  sitzung: "Die Sitzung ist abgelaufen. Bitte neu anmelden.",
  berechtigung: "Dafür fehlt die Berechtigung (keine Berechtigung für diese Aktion).",
  verwendet: "Der Datensatz wird noch verwendet und lässt sich darum nicht löschen oder ändern.",
  doppelt: "Diesen Wert gibt es schon. Bitte einen anderen wählen.",
  stand: "Die Datenbank ist nicht auf dem Stand der App. Bitte bei Dominik Weckherlin melden.",
};

const teile = (e: unknown): { message: string; code: string } => {
  if (typeof e === "string") return { message: e, code: "" };
  const o = (e ?? {}) as { message?: unknown; code?: unknown };
  return { message: typeof o.message === "string" ? o.message : "", code: typeof o.code === "string" ? o.code : "" };
};

// Meldungen, die Postgres, PostgREST oder der Browser selbst schreiben (Englisch, technisch). Alles andere hat die App
// oder eine Funktion der Datenbank geschrieben (raise exception '…' auf Deutsch, auch mit Code 23514 oder 42501) und bleibt stehen.
const TECHNISCH =
  /violates .*constraint|duplicate key|permission denied|row-level security|invalid input|out of range|syntax error|does not exist|schema cache|null value in column|could not |failed to |edge function|statement timeout|deadlock|jwt|unexpected|(relation|column|function|operator) "?[\w.]+"? /i;

export function fehlerArt(e: unknown): FehlerArt {
  const { message, code } = teile(e);
  if (/failed to fetch|load failed|networkerror|fetch failed|network request failed|failed to send a request/i.test(message)) return "verbindung";
  if (code === "PGRST301" || code === "PGRST303" || /jwt expired|invalid jwt|refresh token/i.test(message)) return "sitzung";
  if (message && !code.startsWith("PGRST") && !TECHNISCH.test(message)) return "eigen";
  if (code === "42501" || /permission denied|row-level security/i.test(message)) return "berechtigung";
  if (code === "23503") return "verwendet";
  if (code === "23505") return "doppelt";
  if (code === "PGRST202" || code === "PGRST205" || code === "42P01" || code === "42883") return "stand";
  return "unbekannt";
}

let sitzungsende: (() => void) | null = null;
/** Wird aufgerufen, sobald ein Fehler «Sitzung abgelaufen» meldet; <Anmeldung> leitet dann zur Anmeldeseite. */
export function beiSitzungsende(fn: (() => void) | null): void {
  sitzungsende = fn;
}

// Technische Meldung zum zuletzt angezeigten Text. So kommen die Seiten mit einem Text als Zustand aus,
// und Notice (lib/planer.ts) findet die technischen Angaben dazu.
const technik = new Map<string, string>();

export function fehlerText(e: unknown): string {
  const art = fehlerArt(e);
  const { message, code } = teile(e);
  if (art === "eigen") return message;
  const text = art === "unbekannt" ? ALLGEMEIN : TEXT[art];
  if (message) technik.set(text, code ? `${code}: ${message}` : message);
  if (art === "sitzung") sitzungsende?.();
  return text;
}

/** Technische Angaben zu einem angezeigten Fehlertext (auch wenn davor «… nicht geladen: » steht). */
export function fehlerDetail(anzeige: unknown): string | undefined {
  if (typeof anzeige !== "string") return undefined;
  for (const [text, detail] of technik) if (anzeige.includes(text)) return detail;
  return undefined;
}
