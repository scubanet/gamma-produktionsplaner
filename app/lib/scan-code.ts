// Liest aus einem gescannten oder eingetippten Text die Seriennummer eines Beutels oder den Code einer Kiste.
// Form der Codes: Spezifikation Etiketten und Packliste, Abschnitt «QR-Code». Geprüft wird hier nur die Form;
// ob es den Beutel oder die Kiste gibt, sagt die Datenbank.

/** Adresse, die auf den Etiketten steht. Beim Umzug auf den GAMMA-Server kommt die neue dazu, die alte bleibt gültig. */
export const ETIKETT_HOSTS = ["gamma.atoll-os.com"];

const SERIE = /^[A-HJKMNP-Z2-9]{8}$/;
const KISTE = /^K-[A-HJKMNP-Z2-9]{6}$/;

export type ScanCode =
  | { art: "beutel"; seriennummer: string; produktNr: number | null }
  | { art: "kiste"; code: string }
  | { art: "unbekannt" };

const UNBEKANNT: ScanCode = { art: "unbekannt" };

const beutel = (serie: string, produkt: string | null): ScanCode => {
  const s = serie.trim().toUpperCase();
  if (!SERIE.test(s)) return UNBEKANNT;
  const nr = produkt && /^\d{1,6}$/.test(produkt.trim()) ? Number(produkt.trim()) : null;
  return { art: "beutel", seriennummer: s, produktNr: nr };
};

const kiste = (code: string): ScanCode => {
  const c = code.trim().toUpperCase();
  return KISTE.test(c) ? { art: "kiste", code: c } : UNBEKANNT;
};

/**
 * QR-Code (…/e/?p=123&s=K7M4X2PA oder …/e/?k=K-7BMHPP), lesbare Zeile unter dem Code («P0123 · K7M4X2PA»),
 * blosse Seriennummer oder blosser Kistencode. Eine Adresse mit fremdem Host ist «unbekannt» und wird nie geöffnet.
 */
export function scanCodeLesen(text: string): ScanCode {
  const t = text.trim();
  if (!t) return UNBEKANNT;
  if (/^https?:\/\//i.test(t)) {
    let u: URL;
    try {
      u = new URL(t);
    } catch {
      return UNBEKANNT;
    }
    if (u.protocol !== "https:" || !ETIKETT_HOSTS.includes(u.hostname) || u.pathname.replace(/\/+$/, "") !== "/e") return UNBEKANNT;
    const k = u.searchParams.get("k");
    if (k) return kiste(k);
    const s = u.searchParams.get("s");
    return s ? beutel(s, u.searchParams.get("p")) : UNBEKANNT;
  }
  if (/^k-/i.test(t)) return kiste(t);
  const m = /^(?:P(\d{1,6})\s*[·.\-\s]\s*)?([A-Za-z0-9]{8})$/.exec(t);
  return m ? beutel(m[2], m[1] ?? null) : UNBEKANNT;
}

/** Adresse der Seite «Nachschlagen» für einen gelesenen Code. */
export function nachschlagenPfad(c: ScanCode): string | null {
  if (c.art === "kiste") return `/e/?k=${encodeURIComponent(c.code)}`;
  if (c.art === "beutel") return `/e/?${c.produktNr === null ? "" : `p=${c.produktNr}&`}s=${c.seriennummer}`;
  return null;
}
