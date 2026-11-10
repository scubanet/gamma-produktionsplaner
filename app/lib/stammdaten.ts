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

export const FELDER: Record<"lohnsatz" | "energiepreis" | "fixkosten" | "geraet", Feld[]> = {
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
};

export function fehlerText(e: { message: string; code?: string }): string {
  if (e.code === "23505") return "Diesen Eintrag gibt es schon (gleiche Rolle und Datum, gleiches Datum oder gleicher Name).";
  if (e.code === "23503") return "Der Eintrag wird noch verwendet (z.B. Gerät in einem Rezept oder Anlass) und lässt sich nicht löschen.";
  if (e.code === "23514") return "Wert ausserhalb des erlaubten Bereichs (z.B. Betrag 0 oder «gültig bis» vor «gültig ab»).";
  return e.message;
}
