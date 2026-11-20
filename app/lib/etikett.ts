// Etiketten für Beutel (Etappe 1). Vorschlag, Vorschau-Felder und das Anlegen kommen aus der Datenbank
// (Views etikett_vorschlag und etikett_beutel, Funktion etiketten_erstellen); hier wird nur die Eingabe geprüft und Text gebildet.
import type { Database } from "./database.types";
import { formatDatum, formatMenge } from "./format";

export type EtikettVorschlag = Database["public"]["Views"]["etikett_vorschlag"]["Row"];
export type EtikettFormular = { anzahl: string; menge: string; produziert_am: string; verbrauchen_bis: string };
/** Stand der Zeile in der Checkliste: Tag des Abhakens und das daraus gerechnete Verbrauchsdatum. */
export type EtikettGrundlage = { produziert_am: string | null; haltbar_bis: string | null; haltbarkeit_tage: number | null };
export type EtikettArgumente = { p_anzahl: number; p_menge: number; p_produziert_am?: string; p_verbrauchen_bis?: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Vorbelegung: was nach den schon etikettierten Beuteln noch fehlt, und die Füllmenge pro Beutel. Ohne Vorschlag leer. */
export function etikettFormular(v: EtikettVorschlag | null, g: EtikettGrundlage): EtikettFormular {
  return {
    anzahl: v?.beutel_rest ? String(v.beutel_rest) : "",
    menge: v?.menge_pro_beutel != null ? String(v.menge_pro_beutel) : "",
    produziert_am: g.produziert_am ?? "",
    verbrauchen_bis: "",
  };
}

/** Zahl aus der Eingabe, mit Punkt oder Komma. */
const zahl = (text: string): number | null => {
  const t = text.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
};

/**
 * Prüft die Eingabe und bildet die Argumente für etiketten_erstellen. Die Datenbank prüft dieselben Regeln nochmals.
 * Das Produktionsdatum lässt sich nur auf einen früheren Tag korrigieren; das Verbrauchsdatum ist Pflicht, wenn die Haltbarkeit fehlt.
 */
export function etikettEingabe(f: EtikettFormular, g: EtikettGrundlage): EtikettArgumente | { fehler: string } {
  const anzahl = zahl(f.anzahl);
  if (anzahl === null || !Number.isInteger(anzahl) || anzahl < 1 || anzahl > 500) return { fehler: "Anzahl Beutel: eine ganze Zahl von 1 bis 500." };
  const menge = zahl(f.menge);
  if (menge === null || menge <= 0 || !/^\d+([.,]\d{1,3})?$/.test(f.menge.trim())) return { fehler: "Menge pro Beutel: eine Zahl über 0 mit höchstens 3 Stellen." };
  if (!ISO.test(f.produziert_am)) return { fehler: "Produktionsdatum fehlt." };
  if (g.produziert_am && f.produziert_am > g.produziert_am) return { fehler: `Das Produktionsdatum lässt sich nur auf einen früheren Tag korrigieren (abgehakt am ${formatDatum(g.produziert_am)}).` };
  const bis = f.verbrauchen_bis.trim();
  if (bis && !ISO.test(bis)) return { fehler: "Verbrauchen bis: ein gültiges Datum, oder leer." };
  if (!bis && g.haltbarkeit_tage === null) return { fehler: "Die Haltbarkeit fehlt in der Systemzuteilung: bitte «Verbrauchen bis» von Hand setzen." };
  if (bis && bis < f.produziert_am) return { fehler: "«Verbrauchen bis» liegt vor dem Produktionsdatum." };
  return {
    p_anzahl: anzahl,
    p_menge: menge,
    ...(g.produziert_am && f.produziert_am !== g.produziert_am ? { p_produziert_am: f.produziert_am } : {}),
    ...(bis ? { p_verbrauchen_bis: bis } : {}),
  };
}

/**
 * Das Verbrauchsdatum für die Vorschau. Gerechnet hat es die Datenbank für den Tag des Abhakens; weicht das Produktionsdatum
 * im Formular davon ab, rechnet sie beim Anlegen neu, und die Vorschau sagt das statt selbst zu rechnen.
 */
export function vorschauDatum(f: EtikettFormular, g: EtikettGrundlage): string {
  if (ISO.test(f.verbrauchen_bis)) return formatDatum(f.verbrauchen_bis);
  if (g.haltbarkeit_tage === null) return "[Datum]";
  if (f.produziert_am === g.produziert_am && g.haltbar_bis) return formatDatum(g.haltbar_bis);
  return `+ ${g.haltbarkeit_tage} Tage`;
}

/** Felder der Vorschau, in der Reihenfolge des Etiketts. Kein Anlass, keine Menülinie. */
export function vorschauFelder(v: EtikettVorschlag | null, f: EtikettFormular, einheit: string | null): { label: string; wert: string }[] {
  const menge = zahl(f.menge);
  return [
    { label: "Menge", wert: menge === null ? "[Menge]" : formatMenge(menge, einheit) },
    { label: "Produziert", wert: ISO.test(f.produziert_am) ? formatDatum(f.produziert_am) : "[Datum]" },
    { label: "Lagerung", wert: v?.lagerung ?? "[Lagerung]" },
    { label: "Regeneration", wert: v?.regeneration ?? "–" },
    { label: "Allergene", wert: v?.allergene ?? "siehe Rezept" },
  ];
}

/** «Beutel 1 von 12»; ohne gültige Anzahl nur «Beutel». */
export function vorschauZaehler(f: EtikettFormular): string {
  const n = zahl(f.anzahl);
  return n !== null && Number.isInteger(n) && n >= 1 ? `Beutel 1 von ${n}` : "Beutel";
}

/** Ein Satz zum Stand des Vorschlags, über dem Formular. */
export function vorschlagHinweis(v: EtikettVorschlag | null): string {
  if (!v) return "Kein Vorschlag: Diese Zeile hat keinen Bedarf mit Welle. Anzahl und Menge von Hand.";
  const da = v.beutel_vorhanden ? ` Bereits ${v.beutel_vorhanden} Beutel, ${formatMenge(v.menge_vorhanden, v.einheit)} etikettiert.` : "";
  if (v.status === "gerechnet") return `Vorschlag: ${v.beutel} Beutel.${da}`;
  return `Kein Vorschlag (${v.status}). Anzahl und Menge von Hand.${da}`;
}
