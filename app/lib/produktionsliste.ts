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
};

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
      };
    });
}

export type Filter = { kategorie: string; status: string };

export function filtern(zeilen: Zeile[], f: Filter): Zeile[] {
  return zeilen.filter((z) => (!f.kategorie || z.kategorie === f.kategorie) && (!f.status || z.status === f.status));
}

/** Sortierung nach Kategorie, dann Komponente. */
export function sortieren(zeilen: Zeile[]): Zeile[] {
  return [...zeilen].sort((a, b) => a.kategorie.localeCompare(b.kategorie, "de-CH") || a.komponente.localeCompare(b.komponente, "de-CH"));
}

/** Leerer Wert bei Haltbarkeit, Wellen, Start: bei Status «offen» unbekannt (Platzhalter), sonst nicht zutreffend («–»). */
export function leerwert(status: string, feld: "Haltbarkeit" | "Wellen" | "Start"): string {
  return status === "offen" ? `[${feld}]` : "–";
}
