// Zeilen der Produktionsliste aus den Views produktionsliste (Saison) und anlass_komponente_bedarf (Menülinie).
// Die App setzt nur zusammen und filtert; jede Menge stammt aus der Datenbank.
import type { Database } from "./database.types";
import { formatAnteil, formatProGast, formatZahl } from "./format";
import type { Fortschritt } from "./checkliste";

export type ListeZeile = Database["public"]["Views"]["produktionsliste"]["Row"];
export type BedarfZeile = Database["public"]["Views"]["anlass_komponente_bedarf"]["Row"];
/** Bedarf je Service (Spiel): gleiche Spalten wie BedarfZeile, dazu Service, Datum und Anlieferung. */
export type SpielBedarf = Database["public"]["Views"]["service_gericht_bedarf"]["Row"];
export type Spiel = { id: string; name: string; datum: string | null; anlieferung: string | null; gaeste: number | null; menuelinie: string | null; reihenfolge: number };

/** Die Services der geladenen Zeilen, je einmal, in ihrer Reihenfolge. */
export function spiele(bedarf: SpielBedarf[]): Spiel[] {
  const m = new Map<string, Spiel>();
  for (const b of bedarf) {
    if (b.service_id && !m.has(b.service_id)) {
      m.set(b.service_id, { id: b.service_id, name: b.service ?? "[Service]", datum: b.datum, anlieferung: b.anlieferung, gaeste: b.gaeste, menuelinie: b.menuelinie, reihenfolge: b.reihenfolge ?? 0 });
    }
  }
  return [...m.values()].sort((a, b) => a.reihenfolge - b.reihenfolge);
}

/** Ein Spiel: eine Zeile pro Gericht-Komponente mit der Menge dieses Spiels; Haltbarkeit, Wellen und Start aus der Saison. */
export function spielZeilen(bedarf: SpielBedarf[], liste: ListeZeile[], serviceId: string): Zeile[] {
  return linienZeilen(bedarf.filter((b) => b.service_id === serviceId), liste, null);
}

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
  /** Checkliste pro Welle (View produktion_checkliste), hier zusammengefasst pro Komponente. */
  zustaendig: string | null;
  zustaendige: string[];
  /** Gesetzt, wenn alle Wellen der Komponente abgehakt sind. */
  erledigtAm: string | null;
  wellenNr: number[];
  wellenErledigt: number;
  /** Aus der Systemzuteilung (mitZuteilung): Produktionssysteme als Codes, Lagerart, Slug des Rezepts. */
  produktion: string[];
  lagerung: string | null;
  rezeptSlug: string | null;
  /** Status des verknüpften Rezepts (entwurf, geprueft, freigegeben); ohne Rezept null. */
  rezeptStatus: string | null;
};

export type ZuteilungKurz = { id: string | null; produktion: string[] | null; lager_0_2: boolean | null; lager_tk: boolean | null; lager_trocken: boolean | null; rezept_id: string | null };

/** Lagerart als Text: «0–2 °C», «TK», «Economat»; ohne Angabe null. */
export function lagerart(z: Pick<ZuteilungKurz, "lager_0_2" | "lager_tk" | "lager_trocken">): string | null {
  return [z.lager_0_2 ? "0–2 °C" : null, z.lager_tk ? "TK" : null, z.lager_trocken ? "Economat" : null].filter(Boolean).join(", ") || null;
}

/** Konservierung in einem Text: «SF · SV · TK»; ohne Zuteilung null. «TK» gibt es als System und als Lagerart, darum ohne Doppel. */
export function konservierungText(z: Pick<Zeile, "produktion" | "lagerung">): string | null {
  return [...new Set([...z.produktion, z.lagerung])].filter(Boolean).join(" · ") || null;
}

/** Produktionssystem, Lagerart und Rezept aus der Systemzuteilung in die Zeilen übernehmen. */
export function mitZuteilung(zeilen: Zeile[], zuteilung: ZuteilungKurz[], rezepte: Map<string, { slug: string; status: string }>): Zeile[] {
  const m = new Map(zuteilung.map((z) => [z.id, z]));
  return zeilen.map((z) => {
    const k = z.komponenteId ? m.get(z.komponenteId) : undefined;
    const r = k?.rezept_id ? rezepte.get(k.rezept_id) : undefined;
    return k ? { ...z, produktion: k.produktion ?? [], lagerung: lagerart(k), rezeptSlug: r?.slug ?? null, rezeptStatus: r?.status ?? null } : z;
  });
}

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
      zustaendige: [],
      erledigtAm: null,
      wellenNr: [],
      wellenErledigt: 0,
      produktion: [],
      lagerung: null,
      rezeptSlug: null,
      rezeptStatus: null,
    };
  });
}

/** Menülinie: eine Zeile pro Gericht-Komponente der Linie; Haltbarkeit, Wellen und Start aus der Saison. */
export function linienZeilen(bedarf: BedarfZeile[], liste: ListeZeile[], menuelinieId: string | null): Zeile[] {
  const saison = new Map(liste.map((l) => [l.komponente_id, l]));
  return bedarf
    .filter((b) => menuelinieId === null || b.menuelinie_id === menuelinieId)
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
        zustaendige: [],
        erledigtAm: null,
        wellenNr: [],
        wellenErledigt: 0,
        produktion: [],
        lagerung: null,
        rezeptSlug: null,
        rezeptStatus: null,
      };
    });
}

/** Stand der Checkliste (über alle Wellen der Komponente) in die Zeilen übernehmen. */
export function mitAufgaben(zeilen: Zeile[], stand: Map<string, Fortschritt>): Zeile[] {
  return zeilen.map((z) => {
    const f = z.komponenteId ? stand.get(z.komponenteId) : undefined;
    return f
      ? { ...z, zustaendig: f.zustaendige.join(", ") || null, zustaendige: f.zustaendige, erledigtAm: f.erledigtAm, wellenNr: f.wellen, wellenErledigt: f.erledigt }
      : z;
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
      (!f.zustaendig || (f.zustaendig === OHNE_ZUSTAENDIG ? !z.zustaendige.length : z.zustaendige.includes(f.zustaendig))),
  );
}

export type SortFeld = "kategorie" | "komponente" | "startAb" | "wellen" | "haltbarkeit" | "menge" | "zustaendig" | "erledigt";
export type Richtung = "auf" | "ab";

export type Sortierung = { feld: SortFeld; richtung: Richtung };

/** Klick auf einen Spaltenkopf: neue Spalte beginnt aufsteigend, dieselbe Spalte wechselt die Richtung. */
export function naechsteSortierung(jetzt: Sortierung, feld: SortFeld): Sortierung {
  return jetzt.feld === feld ? { feld, richtung: jetzt.richtung === "auf" ? "ab" : "auf" } : { feld, richtung: "auf" };
}

/** Spalten der Tabelle, nach denen sortiert werden kann: Schlüssel der Spalte → Sortierfeld. */
export const SORT_SPALTEN: Record<string, SortFeld> = {
  erledigt: "erledigt", komponente: "komponente", kategorie: "kategorie", zustaendig: "zustaendig",
  menge: "menge", haltbarkeitTage: "haltbarkeit", wellen: "wellen", startAb: "startAb",
};

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
export function leerwert(status: string, feld: "Haltbarkeit" | "Wellen" | "Start" | "Konservierung"): string {
  return status === "offen" ? `[${feld}]` : "–";
}
