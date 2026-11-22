// Scannen ohne Netz (Scan-App S5). Regel aus der Spezifikation, Abschnitt «Ohne Netz»:
// Packliste und Lagerbestand des Spiels werden beim Öffnen geladen (Vorrat). Fällt das Netz aus, prüft die Seite einen
// Scan vorläufig gegen diesen Vorrat, legt ihn in die Warteschlange (IndexedDB) und sendet ihn später mit dem echten
// Zeitpunkt. Massgebend bleibt das Ergebnis der Datenbank; was sie anders sieht, steht danach als «zu klären».
// Was die vorläufige Prüfung rot meldet, wird nicht gebucht und nicht gesendet: der Beutel kommt wieder aus der Kiste.
import type { ScanAntwort } from "./packliste";

export type ScanStufe = "packen" | "verladen" | "angekommen";

export type ScanInhalt = { art: "einpacken"; seriennummer: string; kiste: string } | { art: "kiste"; code: string; stufe: "verladen" | "angekommen" };
export type OffenerScan = { id: string; service: string; zeitpunkt: string; fehler?: string } & ScanInhalt;

export type VorratKiste = { code: string; laufnummer: number; zustand: string; produkt_id: string | null; produkt: string | null; beutel: number };
export type VorratBeutel = { seriennummer: string; zustand: string; kiste: string | null; produkt_id: string; produkt: string };
/** Stand des Spiels beim Öffnen: seine Kisten, die Produkte im Soll und alle Beutel im Lager oder in einer Kiste. */
export type Vorrat = { kisten: VorratKiste[]; soll: string[]; beutel: VorratBeutel[] };

export type Vorpruefung = ScanAntwort & { buchen: boolean };

const antwort = (farbe: ScanAntwort["farbe"], ergebnis: string, meldung: string, buchen: boolean): Vorpruefung => ({ farbe, ergebnis, meldung, buchen });
const WARTET = " Noch nicht gesendet.";

/** Vorläufige Prüfung eines Beutels, der ohne Netz in eine Kiste gescannt wird. offen: Scans, die noch nicht gesendet sind. */
export function beutelVorpruefen(vorrat: Vorrat, offen: OffenerScan[], seriennummer: string, kisteCode: string): Vorpruefung {
  const kiste = vorrat.kisten.find((k) => k.code === kisteCode);
  if (!kiste) return antwort("rot", "unbekannt", "Unbekannte Kiste.", false);
  if (kiste.zustand !== "offen") return antwort("rot", "kiste_nicht_offen", "Kiste ist schon verladen.", false);
  const wartend = offen.filter((s) => s.art === "einpacken");
  if (wartend.some((s) => s.seriennummer === seriennummer && s.kiste === kisteCode)) return antwort("gelb", "schon_in_kiste", "Beutel ist schon in dieser Kiste, schon gezählt.", false);
  if (wartend.some((s) => s.seriennummer === seriennummer)) return antwort("rot", "andere_kiste", "Beutel ist schon in eine andere Kiste gescannt.", false);
  const beutel = vorrat.beutel.find((b) => b.seriennummer === seriennummer);
  // Das Gerät kennt den Beutel nicht (z.B. erst nach dem Öffnen etikettiert): einbuchen, die Datenbank prüft beim Abgleich.
  if (!beutel) return antwort("gelb", "unbekannt_vorlaeufig", `Beutel wird beim Abgleich geprüft.${WARTET}`, true);
  if (beutel.kiste === kisteCode) return antwort("gelb", "schon_in_kiste", "Beutel ist schon in dieser Kiste, schon gezählt.", false);
  if (beutel.kiste) return antwort("rot", "andere_kiste", `Beutel ist in einer anderen Kiste (${beutel.kiste}).`, false);
  // Produkt der Kiste: aus dem Vorrat oder aus dem ersten Beutel, der ohne Netz hineingescannt wurde.
  const erster = wartend.find((s) => s.kiste === kisteCode);
  const inKiste = kiste.produkt_id ?? (erster ? vorrat.beutel.find((b) => b.seriennummer === erster.seriennummer)?.produkt_id ?? null : null);
  if (inKiste && inKiste !== beutel.produkt_id) return antwort("rot", "anderes_produkt", `Anderes Produkt als in der Kiste (${kiste.produkt ?? "siehe Kiste"}).`, false);
  if (!vorrat.soll.includes(beutel.produkt_id)) return antwort("gelb", "nicht_im_bedarf", `${beutel.produkt} steht nicht im Bedarf dieses Spiels: wird beim Abgleich geklärt.${WARTET}`, true);
  return antwort("gruen", "ok", `${beutel.produkt} eingepackt.${WARTET}`, true);
}

const NACH: Record<"verladen" | "angekommen", string[]> = { verladen: ["verladen", "angekommen", "abgeschlossen"], angekommen: ["angekommen", "abgeschlossen"] };

/** Vorläufige Prüfung einer Kiste beim Verladen oder bei der Ankunft ohne Netz. */
export function kisteVorpruefen(vorrat: Vorrat, offen: OffenerScan[], code: string, stufe: "verladen" | "angekommen"): Vorpruefung {
  if (offen.some((s) => s.art === "kiste" && s.code === code && s.stufe === stufe)) return antwort("rot", "schon_gescannt", "Kiste ist schon gescannt.", false);
  const kiste = vorrat.kisten.find((k) => k.code === code);
  // Nicht im Vorrat: anderes Spiel oder nach dem Öffnen angelegt. Speichern; die Datenbank entscheidet.
  if (!kiste) return antwort("gelb", "unbekannt_vorlaeufig", `Kiste wird beim Abgleich geprüft.${WARTET}`, true);
  if (kiste.zustand === "abgeschlossen" || kiste.zustand === "aufgeloest") return antwort("rot", "kiste_nicht_offen", "Kiste ist abgeschlossen oder aufgelöst.", false);
  if (NACH[stufe].includes(kiste.zustand)) return antwort("rot", "schon_gescannt", "Kiste ist schon gescannt.", false);
  return antwort("gruen", "ok", `Kiste ${kiste.laufnummer} ${stufe === "verladen" ? "verladen" : "angekommen"}.${WARTET}`, true);
}

/** Kisten des Spiels, die in dieser Stufe noch fehlen (ohne aufgelöste), gescannte ohne Netz eingerechnet. */
export function kistenOffen(vorrat: Vorrat, offen: OffenerScan[], stufe: "verladen" | "angekommen"): VorratKiste[] {
  const gescannt = new Set(offen.filter((s) => s.art === "kiste" && s.stufe === stufe).map((s) => (s as { code: string }).code));
  return vorrat.kisten.filter((k) => k.zustand !== "aufgeloest" && !NACH[stufe].includes(k.zustand) && !gescannt.has(k.code));
}

/** «3 Scans noch nicht gesendet», mit dem Hinweis auf Scans, die die Datenbank abgelehnt hat. */
export function wartetText(offen: OffenerScan[]): string {
  if (!offen.length) return "";
  const fehler = offen.filter((s) => s.fehler).length;
  return `${offen.length} ${offen.length === 1 ? "Scan" : "Scans"} noch nicht gesendet${fehler ? `, davon ${fehler} mit Fehler` : ""}`;
}

/** Derselbe Code innert kurzer Zeit gilt als derselbe Scan (die Kamera liest ein Etikett mehrmals pro Sekunde). */
export const WIEDERHOLT_MS = 3000;
export function istWiederholung(letzter: { text: string; zeit: number } | null, text: string, jetzt: number): boolean {
  return !!letzter && letzter.text === text && jetzt - letzter.zeit < WIEDERHOLT_MS;
}

// Warteschlange im Browser. Ohne IndexedDB (privates Fenster) bleibt sie im Speicher der Seite.
const DB = "planer-scan";
const LAGER = "offen";
let imSpeicher: OffenerScan[] | null = null;

function oeffnen(): Promise<IDBDatabase> {
  return new Promise((ok, nein) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(LAGER, { keyPath: "id" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => nein(r.error);
  });
}

async function mitLager<T>(modus: IDBTransactionMode, tun: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await oeffnen();
  try {
    return await new Promise<T>((ok, nein) => {
      const t = db.transaction(LAGER, modus);
      const r = tun(t.objectStore(LAGER));
      t.oncomplete = () => ok(r.result);
      t.onerror = () => nein(t.error);
      t.onabort = () => nein(t.error);
    });
  } finally {
    db.close();
  }
}

export async function offeneLesen(): Promise<OffenerScan[]> {
  if (imSpeicher) return imSpeicher;
  try {
    const alle = await mitLager<OffenerScan[]>("readonly", (s) => s.getAll());
    return alle.sort((a, b) => a.zeitpunkt.localeCompare(b.zeitpunkt));
  } catch {
    imSpeicher = [];
    return imSpeicher;
  }
}

export async function offenSpeichern(scan: OffenerScan): Promise<void> {
  if (imSpeicher) {
    imSpeicher = [...imSpeicher.filter((s) => s.id !== scan.id), scan];
    return;
  }
  try {
    await mitLager("readwrite", (s) => s.put(scan));
  } catch {
    imSpeicher = [scan];
  }
}

export async function offenLoeschen(id: string): Promise<void> {
  if (imSpeicher) {
    imSpeicher = imSpeicher.filter((s) => s.id !== id);
    return;
  }
  await mitLager("readwrite", (s) => s.delete(id));
}
