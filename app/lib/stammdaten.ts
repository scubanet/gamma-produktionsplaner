// Stammdaten für Kosten: Lohnsätze, Strompreis, Fixkosten, Geräte. Eine Feldbeschreibung pro Tabelle,
// damit Formular, Prüfung und Speichern für alle vier gleich laufen.

export type Feld = {
  key: string;
  label: string;
  art: "text" | "betrag" | "ganz" | "datum" | "auswahl" | "ja_nein";
  /** Nachkommastellen bei art «betrag» (Standard 2; Strompreis 4). */
  stellen?: number;
  pflicht?: boolean;
  optionen?: { value: string; label: string }[];
  hint?: string;
};

export type Formular = Record<string, string | boolean>;
export type Zeile = Record<string, unknown>;

export function formularAus(felder: Feld[], zeile: Zeile | null): Formular {
  const f: Formular = {};
  for (const x of felder) {
    const v = zeile?.[x.key];
    if (x.art === "ja_nein") f[x.key] = zeile ? !!v : true;
    else f[x.key] = v === null || v === undefined ? "" : String(v);
  }
  return f;
}

/** Formular → Werte für die Datenbank. Prüft Pflichtfelder und Formate; leere Felder werden null. */
export function werteAus(felder: Feld[], f: Formular): { werte: Zeile } | { fehler: string } {
  const werte: Zeile = {};
  for (const x of felder) {
    const roh = f[x.key];
    if (x.art === "ja_nein") {
      werte[x.key] = !!roh;
      continue;
    }
    const t = String(roh ?? "").trim();
    if (t === "") {
      if (x.pflicht) return { fehler: `${x.label}: bitte ausfüllen.` };
      werte[x.key] = null;
      continue;
    }
    if (x.art === "betrag") {
      const z = t.replace(",", ".").replace(/[’']/g, "");
      const stellen = x.stellen ?? 2;
      if (!new RegExp(`^\\d+(\\.\\d{1,${stellen}})?$`).test(z)) return { fehler: `${x.label}: Zahl ab 0 mit höchstens ${stellen} Stellen.` };
      werte[x.key] = Number(z);
    } else if (x.art === "ganz") {
      if (!/^\d+$/.test(t)) return { fehler: `${x.label}: ganze Zahl ab 0.` };
      werte[x.key] = Number(t);
    } else if (x.art === "datum") {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return { fehler: `${x.label}: Datum im Kalender wählen.` };
      werte[x.key] = t;
    } else {
      werte[x.key] = t;
    }
  }
  return { werte };
}

export const FIXKOSTEN_KATEGORIEN = [
  { value: "loehne_fix", label: "Löhne Kader und Administration" },
  { value: "miete", label: "Miete" },
  { value: "abschreibung", label: "Abschreibungen" },
  { value: "energie_grundlast", label: "Energie Grundlast" },
  { value: "fahrzeuge", label: "Fahrzeuge" },
  { value: "versicherung", label: "Versicherungen und Gebühren" },
  { value: "marketing", label: "Marketing und Verkauf" },
  { value: "it_verwaltung", label: "IT und Verwaltung" },
  { value: "uebrige", label: "Übrige" },
];

export const ANGEBOTSFORMEN = [
  { value: "menue_3", label: "3-Gang-Menü" },
  { value: "buffet", label: "Buffet" },
  { value: "live_station", label: "Live Station" },
  { value: "flying_dinner", label: "Flying Dinner" },
];
/** Gänge wie in den Menülinien geschrieben; der Standard greift nur bei gleicher Schreibweise. */
export const GAENGE = ["Vorspeise", "Suppe", "Spezialität", "Hauptgang", "Dessert", "Brunch"].map((g) => ({ value: g, label: g }));
export const SERVICE_ARTEN = [
  { value: "teller", label: "Teller und Schalen" },
  { value: "besteck", label: "Besteck" },
  { value: "glas", label: "Gläser" },
  { value: "serviette", label: "Servietten" },
  { value: "ausgabe", label: "Material für die Ausgabe" },
  { value: "sonstiges", label: "Sonstiges" },
];

/** Felder für den Standard pro Angebotsform und Gang; die Artikel kommen aus der Datenbank. */
export function standardFelder(artikel: { value: string; label: string }[]): Feld[] {
  return [
    { key: "angebotsform", label: "Angebotsform", art: "auswahl", pflicht: true, optionen: ANGEBOTSFORMEN },
    { key: "gang", label: "Gang", art: "auswahl", pflicht: true, optionen: GAENGE },
    { key: "artikel_id", label: "Artikel", art: "auswahl", pflicht: true, optionen: artikel },
    { key: "stueck_pro_gast", label: "Stück pro Gast", art: "betrag", pflicht: true, hint: "meist 1" },
    { key: "wechselfaktor", label: "Wechselfaktor", art: "betrag", pflicht: true, hint: "1 = jeder Gast einmal; 1.5 = jeder zweite nimmt einen zweiten" },
    { key: "reserve_pct", label: "Reserve %", art: "betrag", pflicht: true, hint: "0 bis 100" },
  ];
}

export const FELDER: Record<"lohnsatz" | "energiepreis" | "fixkosten" | "geraet" | "gebinde" | "service_artikel", Feld[]> = {
  service_artikel: [
    { key: "name", label: "Artikel", art: "text", pflicht: true, hint: "z.B. Teller flach 27 cm, Suppentasse, Menügabel" },
    { key: "art", label: "Art", art: "auswahl", pflicht: true, optionen: SERVICE_ARTEN },
    { key: "anzahl_eigen", label: "Eigener Bestand", art: "ganz", pflicht: true, hint: "0 = alles wird gemietet" },
    { key: "mietpreis_chf", label: "Mietpreis CHF pro Stück und Anlass", art: "betrag" },
    { key: "stueck_pro_korb", label: "Stück pro Korb", art: "ganz", hint: "für die Anzahl Körbe im Transport" },
    { key: "gewicht_g", label: "Gewicht pro Stück in Gramm", art: "betrag" },
    { key: "aktiv", label: "aktiv", art: "ja_nein" },
  ],
  lohnsatz: [
    { key: "rolle", label: "Rolle", art: "text", pflicht: true, hint: "z.B. Koch, Service, Abwasch; gleiche Schreibweise wie beim Personal im Anlass" },
    { key: "chf_pro_h", label: "CHF pro Stunde", art: "betrag", pflicht: true, hint: "inkl. Sozialleistungen, Ferien, 13. Monatslohn" },
    { key: "chf_pro_h_freelancer", label: "CHF pro Stunde Freelancer", art: "betrag", hint: "leer = gleicher Satz" },
    { key: "gueltig_ab", label: "Gültig ab", art: "datum", pflicht: true },
    { key: "quelle", label: "Quelle", art: "text", hint: "z.B. Lohnbuchhaltung, Pool-Tarif" },
  ],
  energiepreis: [
    { key: "gueltig_ab", label: "Gültig ab", art: "datum", pflicht: true },
    { key: "chf_pro_kwh", label: "CHF pro kWh", art: "betrag", stellen: 4, pflicht: true, hint: "z.B. 0.2874" },
  ],
  fixkosten: [
    { key: "kategorie", label: "Kategorie", art: "auswahl", pflicht: true, optionen: FIXKOSTEN_KATEGORIEN },
    { key: "bezeichnung", label: "Bezeichnung", art: "text", pflicht: true },
    { key: "chf_pro_monat", label: "CHF pro Monat", art: "betrag", pflicht: true },
    { key: "gueltig_ab", label: "Gültig ab", art: "datum", pflicht: true, hint: "zählt für jeden Monat, den der Zeitraum berührt, mit dem vollen Monatsbetrag" },
    { key: "gueltig_bis", label: "Gültig bis", art: "datum", hint: "leer = läuft weiter" },
  ],
  geraet: [
    { key: "name", label: "Gerät", art: "text", pflicht: true },
    { key: "kapazitaet", label: "Kapazität", art: "text", hint: "z.B. 10× GN 1/1" },
    { key: "anzahl_eigen", label: "Eigener Bestand", art: "ganz", pflicht: true },
    { key: "mietbar", label: "mietbar", art: "ja_nein" },
    { key: "leistung_kw", label: "Leistung kW", art: "betrag" },
    { key: "mietpreis_chf_tag", label: "Mietpreis CHF pro Tag", art: "betrag" },
  ],
  gebinde: [
    { key: "name", label: "Gebinde", art: "text", pflicht: true, hint: "z.B. IFCO-Box, mit Typ oder Höhe" },
    { key: "laenge_mm", label: "Länge mm", art: "ganz" },
    { key: "breite_mm", label: "Breite mm", art: "ganz" },
    { key: "hoehe_mm", label: "Höhe mm", art: "ganz" },
    { key: "tara_g", label: "Tara in Gramm", art: "betrag", hint: "Leergewicht; braucht es für das Bruttogewicht im Transport" },
    { key: "volumen_l", label: "Volumen in Litern", art: "betrag", hint: "Aussenvolumen; braucht es für das Ladevolumen" },
    { key: "bemerkung", label: "Bemerkung", art: "text" },
    { key: "aktiv", label: "aktiv", art: "ja_nein" },
  ],
};

export function fehlerText(e: { message: string; code?: string }): string {
  if (e.code === "23505") return "Diesen Eintrag gibt es schon (gleiche Rolle und Datum, gleiches Datum oder gleicher Name).";
  if (e.code === "23503") return "Der Eintrag wird noch verwendet (z.B. Gerät in einem Rezept oder Anlass) und lässt sich nicht löschen.";
  if (e.code === "23514") return "Wert ausserhalb des erlaubten Bereichs (z.B. Betrag 0 oder «gültig bis» vor «gültig ab»).";
  return e.message;
}
