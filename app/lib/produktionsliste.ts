// Zeilen der Produktionsliste aus den Views produktionsliste (Saison) und anlass_komponente_bedarf (Menülinie).
// Die App setzt nur zusammen und filtert; jede Menge stammt aus der Datenbank.
import type { Database } from "./database.types";
import { formatAnteil, formatProGast, formatZahl } from "./format";

export type ListeZeile = Database["public"]["Views"]["produktionsliste"]["Row"];
export type BedarfZeile = Database["public"]["Views"]["anlass_komponente_bedarf"]["Row"];

export type Zeile = {
  id: string;
  komponenteId: string | null;
  komponente: string;
  kategorie: string;
  status: string;
  menge: number | null;
  einheit: string | null;
  haltbarkeitTage: number | null;
  wellen: number | null;
  startAb: string | null;
  menuelinie: string | null;
  gericht: string | null;
  gang: string | null;
  herleitung: string;
  /** Checkliste (Tabelle produktion_aufgabe), gilt für die Komponente in der ganzen Saison. */
  zustaendig: string | null;
  erledigtAm: string | null;
};

export type Aufgabe = { komponente_id: string; zustaendig: string | null; erledigt_am: string | null };

/** Ein Summand: «1’100 Gäste × 60 % × 120 g». */
export function herleitungTerm(b: Pick<BedarfZeile, "gaeste" | "anteil" | "menge_pro_gast" | "einheit">): string {
  if (b.gaeste === null || b.anteil === null) return "[Herleitung fehlt]";
  const menge = b.menge_pro_gast === null || b.einheit === null ? "[Menge]" : formatProGast(b.menge_pro_gast, b.einheit);
  return `${formatZahl(b.gaeste)} Gäste × ${formatAnteil(b.anteil)} × ${menge}`;
}

/** Saisonsicht: eine Zeile pro Komponente, Herleitung als Summe über alle Menülinien. */
export function saisonZeilen(liste: ListeZeile[], bedarf: BedarfZeile[]): Zeile[] {
  // Schlüssel wie im View produktionsliste: Komponente und Einheit.
  const schluessel = (id: string | null, einheit: string | null) => `${id}|${einheit}`;
  const proKomponente = new Map<string, BedarfZeile[]>();
  for (const b of bedarf) {
    if (!b.komponente_id) continue;
    const k = schluessel(b.komponente_id, b.einheit_total);
    proKomponente.set(k, [...(proKomponente.get(k) ?? []), b]);
  }
  return liste.map((l) => {
    const teile = proKomponente.get(schluessel(l.komponente_id, l.einheit_total)) ?? [];
    return {
      id: `${l.saison_id}-${l.komponente_id}-${l.einheit_total}`,
      komponenteId: l.komponente_id,
      komponente: l.komponente ?? "[Komponente]",
      kategorie: l.kategorie ?? "",
      status: l.status ?? "offen",
      menge: l.menge_total,
      einheit: l.einheit_total,
      haltbarkeitTage: l.haltbarkeit_tage,
      wellen: l.wellen,
      startAb: l.start_ab,
      menuelinie: null,
      gericht: null,
      gang: null,
      herleitung: teile.length
        ? teile.map((b) => `${herleitungTerm(b)} (${b.menuelinie})`).join(" + ")
        : "[Herleitung fehlt]",
      zustaendig: null,
      erledigtAm: null,
    };
  });
}

/** Menülinie: eine Zeile pro Gericht-Komponente der Linie; Haltbarkeit, Wellen und Start aus der Saison. */
export function linienZeilen(bedarf: BedarfZeile[], liste: ListeZeile[], menuelinieId: string): Zeile[] {
  const saison = new Map(liste.map((l) => [l.komponente_id, l]));
  return bedarf
    .filter((b) => b.menuelinie_id === menuelinieId)
    .map((b, i) => {
      const s = saison.get(b.komponente_id);
      return {
        id: `${b.menuelinie_id}-${b.komponente_id}-${i}`,
        komponenteId: b.komponente_id,
        komponente: s?.komponente ?? b.komponente ?? "[Komponente]",
        kategorie: s?.kategorie ?? "",
        status: s?.status ?? "offen",
        menge: b.menge_total,
        einheit: b.einheit_total,
        haltbarkeitTage: s?.haltbarkeit_tage ?? null,
        wellen: s?.wellen ?? null,
        startAb: s?.start_ab ?? null,
        menuelinie: b.menuelinie,
        gericht: b.gericht,
        gang: b.gang,
        herleitung: herleitungTerm(b),
        zustaendig: null,
        erledigtAm: null,
      };
    });
}

/** Zuständig und Erledigt aus der Checkliste in die Zeilen übernehmen. */
export function mitAufgaben(zeilen: Zeile[], aufgaben: Map<string, Aufgabe>): Zeile[] {
  return zeilen.map((z) => {
    const a = z.komponenteId ? aufgaben.get(z.komponenteId) : undefined;
    return a ? { ...z, zustaendig: a.zustaendig, erledigtAm: a.erledigt_am } : z;
  });
}

/** Wert für den Filter «Zuständig»: niemand eingetragen. */
export const OHNE_ZUSTAENDIG = "__ohne";

export type Filter = { kategorie: string; status: string; erledigt?: "" | "offen" | "erledigt"; zustaendig?: string };

export function filtern(zeilen: Zeile[], f: Filter): Zeile[] {
  return zeilen.filter(
    (z) =>
      (!f.kategorie || z.kategorie === f.kategorie) &&
      (!f.status || z.status === f.status) &&
      (!f.erledigt || (f.erledigt === "erledigt") === !!z.erledigtAm) &&
      (!f.zustaendig || (f.zustaendig === OHNE_ZUSTAENDIG ? !z.zustaendig : z.zustaendig === f.zustaendig)),
  );
}

export type SortFeld = "kategorie" | "komponente" | "startAb" | "wellen" | "haltbarkeit" | "menge" | "zustaendig" | "erledigt";
export type Richtung = "auf" | "ab";

export const SORTIERUNGEN: { value: SortFeld; label: string }[] = [
  { value: "kategorie", label: "Kategorie" },
  { value: "komponente", label: "Komponente" },
  { value: "startAb", label: "Start ab" },
  { value: "wellen", label: "Wellen" },
  { value: "haltbarkeit", label: "Haltbarkeit" },
  { value: "menge", label: "Menge" },
  { value: "zustaendig", label: "Zuständig" },
  { value: "erledigt", label: "Erledigt" },
];

const sortWert = (z: Zeile, feld: SortFeld): string | number | null => {
  switch (feld) {
    case "kategorie": return z.kategorie || null;
    case "komponente": return z.komponente;
    case "startAb": return z.startAb;
    case "wellen": return z.wellen;
    case "haltbarkeit": return z.haltbarkeitTage;
    case "menge": return z.menge;
    case "zustaendig": return z.zustaendig;
    case "erledigt": return z.erledigtAm;
  }
};

/**
 * Sortierung nach einem Feld, Leerwerte immer am Schluss (auch absteigend).
 * Bei Gleichstand nach Kategorie, dann Komponente. Standard: Kategorie aufsteigend.
 */
export function sortieren(zeilen: Zeile[], feld: SortFeld = "kategorie", richtung: Richtung = "auf"): Zeile[] {
  const faktor = richtung === "ab" ? -1 : 1;
  const vergleich = (a: string | number | null, b: string | number | null) =>
    typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "de-CH");
  return [...zeilen].sort((x, y) => {
    const a = sortWert(x, feld), b = sortWert(y, feld);
    if (a === null && b !== null) return 1;
    if (b === null && a !== null) return -1;
    const primaer = a === null || b === null ? 0 : faktor * vergleich(a, b);
    return primaer || x.kategorie.localeCompare(y.kategorie, "de-CH") || x.komponente.localeCompare(y.komponente, "de-CH");
  });
}

/** Leerer Wert bei Haltbarkeit, Wellen, Start: bei Status «offen» unbekannt (Platzhalter), sonst nicht zutreffend («–»). */
export function leerwert(status: string, feld: "Haltbarkeit" | "Wellen" | "Start"): string {
  return status === "offen" ? `[${feld}]` : "–";
}
