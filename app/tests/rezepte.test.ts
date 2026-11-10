import { describe, expect, it } from "vitest";
import { formatGramm, formatMinuten, formatProzent } from "../lib/format";
import {
  basisZutat, besonderesZeilen, ergibtText, geraete, gruppenAnzeige, listenSub, schrittChips, voreinstellungen, wertAusEingabe,
  type Rezept, type Schritt, type Zutat,
} from "../lib/rezepte";
import { gruppieren, mengeText, suchen, warenkostenText, type Gericht } from "../lib/katalog";

const gericht: Rezept = {
  id: "r1", slug: "hack", typ: "gericht", name: "Hacktätschli", untertitel: null, kategorie: "Hauptgang", quelle: null,
  basis_portionen: 10, portion_g: 180, ergibt_g: null, status: "entwurf", ergibt_annahme: false, portionen_annahme: false,
  chargengroesse: null, besonderes: null, geaendert_am: "2026-11-10T10:00:00+00:00",
};
const sugo: Rezept = { ...gericht, id: "r2", slug: "sugo", typ: "komponente", name: "Sugo", kategorie: "Sauce", basis_portionen: null, portion_g: null, ergibt_g: 1600 };

describe("Format Rezeptkarte", () => {
  it("Gramm wie im Mockup", () => {
    expect(formatGramm(1575)).toBe("1.58 kg");
    expect(formatGramm(315)).toBe("315 g");
    expect(formatGramm(2.5)).toBe("2.5 g");
    expect(formatGramm(0.4)).toBe("0.4 g");
    expect(formatGramm(0.04)).toBe("0.04 g");
    expect(formatGramm(0.004)).toBe("< 0.01 g");
    expect(formatGramm(0)).toBe("0 g");
    expect(formatGramm(null)).toBe("[Menge]");
  });
  it("Minuten und Prozent", () => {
    expect(formatMinuten(90)).toBe("1 h 30 min");
    expect(formatMinuten(45)).toBe("45 min");
    expect(formatMinuten(120)).toBe("2 h");
    expect(formatProzent(50.4)).toBe("50 %");
    expect(formatProzent(4.8)).toBe("4.8 %");
    expect(formatProzent(0.24)).toBe("0.24 %");
  });
});

describe("Skalierung (nur Eingabe und Anzeige; gerechnet wird in der Datenbank)", () => {
  it("Voreinstellungen wie im Mockup", () => {
    expect(voreinstellungen(gericht).map((v) => v.wert)).toEqual([10, 50, 120, 300]);
    expect(voreinstellungen(sugo).map((v) => v.label)).toEqual(["× 1", "× 2", "× 5", "× 10"]);
    expect(voreinstellungen({ ...gericht, basis_portionen: null })).toEqual([]);
  });
  it("Eingabe: Portionen ganz, Chargen mit bis 2 Stellen", () => {
    expect(wertAusEingabe("40", true)).toBe(40);
    expect(wertAusEingabe("1.5", true)).toBeNull();
    expect(wertAusEingabe("1,5", false)).toBe(1.5);
    expect(wertAusEingabe("0", false)).toBeNull();
    expect(wertAusEingabe("-2", true)).toBeNull();
  });
  it("Ergibt mit Herleitung aus der Datenbank", () => {
    const f = { faktor: 5, portionen: 50, chargen: null as unknown as number, ergibt_g: 9000, herleitung: "50 Portionen / 10 Basisportionen = Faktor 5" };
    expect(ergibtText(gericht, f)).toEqual({ text: "50 Portionen à 180 g", sub: "gesamt 9.00 kg · 50 Portionen / 10 Basisportionen = Faktor 5", annahme: false });
    expect(ergibtText(sugo, { ...f, portionen: null as unknown as number, chargen: 2, ergibt_g: 3200, herleitung: "h" })).toEqual({ text: "3.20 kg", sub: "h", annahme: false });
    expect(ergibtText({ ...sugo, ergibt_annahme: true }, { ...f, ergibt_g: 3200, herleitung: "h" })).toEqual({ text: "3.20 kg", sub: "h · Ergibt-Menge angenommen, siehe offene Punkte", annahme: true });
    expect(ergibtText({ ...gericht, portionen_annahme: true }, f).annahme).toBe(true);
    expect(ergibtText(gericht, null).text).toBe("[Menge]");
  });
});

describe("Rezeptkarte", () => {
  const zutat = (p: Partial<Zutat>): Zutat => ({
    id: "z", gruppe_id: "g1", reihenfolge: 1, bezeichnung: "Brot", notiz: null as unknown as string, ist_basis: false, annahme: false,
    menge_basis_g: 315, menge_g: 1575, skal_pct: 50.4, ...p,
  });
  const schritt = (p: Partial<Schritt>): Schritt => ({
    id: "s", gruppe_id: "g1", text: "Einweichen.", reihenfolge: 1, temperatur_c: null, aktiv_min: 5, unbeaufsichtigt_min: 15, haccp: null, annahme: false, geraet: null, ...p,
  });

  it("Gruppen sortiert, Mengen formatiert, Basismenge als Herleitung beim Skalieren", () => {
    const g = gruppenAnzeige(
      [{ id: "g2", titel: "Guss", reihenfolge: 2 }, { id: "g1", titel: null, reihenfolge: 1 }],
      [zutat({ id: "b", reihenfolge: 2, gruppe_id: "g1", notiz: "2.5 dl" }), zutat({ id: "a", reihenfolge: 1 }), zutat({ id: "c", gruppe_id: "g2", ist_basis: true, annahme: true })],
      [schritt({ id: "t2", reihenfolge: 2 }), schritt({ id: "t1", reihenfolge: 1 })],
      5,
    );
    expect(g.map((x) => x.id)).toEqual(["g1", "g2"]);
    expect(g[0].zutaten.map((z) => z.id)).toEqual(["a", "b"]);
    expect(g[0].zutaten[0]).toMatchObject({ menge: "1.58 kg", prozent: "50 %", notiz: "Basis 315 g" });
    expect(g[0].zutaten[1].notiz).toBe("2.5 dl · Basis 315 g");
    expect(g[0].schritte.map((s) => s.id)).toEqual(["t1", "t2"]);
    expect(g[1].zutaten[0]).toMatchObject({ basis: true, annahme: true });
    expect(gruppenAnzeige([{ id: "g1", titel: null, reihenfolge: 1 }], [zutat({})], [], 1)[0].zutaten[0].notiz).toBe("");
  });

  it("Chips eines Schritts", () => {
    expect(schrittChips(schritt({ geraet: { name: "Combi-Steamer" }, temperatur_c: 160, aktiv_min: 0, unbeaufsichtigt_min: 90, haccp: "Kern 72 °C" }))).toEqual([
      { kind: "neutral", text: "Combi-Steamer" },
      { kind: "temp", text: "160 °C" },
      { kind: "unbeaufsichtigt", text: "1 h 30 min unbeaufsichtigt" },
      { kind: "haccp", text: "HACCP Kern 72 °C" },
    ]);
  });

  it("Geräte, Basiszutat, Listenzeile", () => {
    expect(geraete([schritt({ geraet: { name: "A" } }), schritt({ geraet: { name: "A" } }), schritt({})])).toEqual(["A"]);
    expect(basisZutat([zutat({ ist_basis: true, bezeichnung: "Kalbshack" })])).toBe("Kalbshack");
    expect(basisZutat([])).toBe("[Basiszutat]");
    expect(listenSub(gericht)).toBe("Hauptgang · 10 Portionen");
    expect(listenSub(sugo)).toBe("Sauce · Charge 1.60 kg");
  });
});

describe("Katalog", () => {
  const g = (p: Partial<Gericht>): Gericht => ({ id: "x", code: null, name: "GW001 Test", kategorie: "Salat", gang: "Vorspeise", mengentyp: "Vorspeise", quelle_zeile: 1, ...p });
  const liste = [g({ id: "a", kategorie: "Dessert", quelle_zeile: 5, name: "Tarte Tatin" }), g({ id: "b", kategorie: "Salat", quelle_zeile: 9 }), g({ id: "c", kategorie: "Salat", quelle_zeile: 2, name: "Nüsslisalat" })];

  it("sucht ohne Gross-/Kleinschreibung und filtert nach Kategorie", () => {
    expect(suchen(liste, "tarte", "").map((x) => x.id)).toEqual(["a"]);
    expect(suchen(liste, "", "Salat").map((x) => x.id)).toEqual(["b", "c"]);
  });
  it("gruppiert nach Kategorie-Reihenfolge, darin nach Excel-Zeile", () => {
    expect(gruppieren(liste, ["Salat", "Dessert"]).map((x) => [x.titel, x.gerichte.map((y) => y.id)])).toEqual([["Salat", ["c", "b"]], ["Dessert", ["a"]]]);
  });
  it("Menge in kg, sonst Platzhalter", () => {
    expect(mengeText(0.17)).toBe("0.170 kg");
    expect(mengeText(0.0125)).toBe("0.0125 kg");
    expect(mengeText(null)).toBe("[Menge]");
  });
  it("Warenkosten: Platzhalter ohne Preis, Annahme mit Zuschlag", () => {
    expect(warenkostenText({ gericht_id: "a", name: "x", wk_rohware_chf: null, wk_inkl_zuschlag_chf: null, komponenten_ohne_preis: 2 })).toMatchObject({ text: "[Preis]", annahme: false });
    expect(warenkostenText({ gericht_id: "a", name: "x", wk_rohware_chf: 4, wk_inkl_zuschlag_chf: 4.8, komponenten_ohne_preis: 0 })).toMatchObject({ text: "CHF 4.80", annahme: true, sub: "Annahme, bitte prüfen: Hauptartikel × Menge pro Portion + Zuschlag" });
  });
});

describe("Besonders zu beachten", () => {
  it("eine Zeile pro Absatz", () => {
    expect(besonderesZeilen("Erste Zeile\n\n Zweite Zeile ")).toEqual(["Erste Zeile", "Zweite Zeile"]);
    expect(besonderesZeilen(null)).toEqual([]);
  });
});
