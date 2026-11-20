import { describe, expect, it } from "vitest";
import { etikettEingabe, etikettFormular, vorschauDatum, vorschauFelder, vorschauZaehler, vorschlagHinweis, type EtikettVorschlag } from "../lib/etikett";

const v = (p: Partial<EtikettVorschlag>): EtikettVorschlag => ({
  allergene: "siehe Rezept", beutel: 6, beutel_g: 2000, beutel_rest: 6, beutel_vorhanden: 0, einheit: "kg", herleitung: "", kategorie: "Sauce",
  komponente_id: "k", lagerung: "0–2 °C", liter_annahme: false, menge_pro_beutel: 2, menge_vorhanden: 0, menge_welle: 10, produkt: "Portweinjus",
  produkt_code: "P0123", regeneration: "Herd", saison_id: "s", status: "gerechnet", tk: false, welle_nr: 1, ...p,
});
const g = { produziert_am: "2026-12-22", haltbar_bis: "2027-01-12", haltbarkeit_tage: 21 };
const f = { anzahl: "6", menge: "2", produziert_am: "2026-12-22", verbrauchen_bis: "" };

describe("Etiketten: Formular und Eingabe", () => {
  it("belegt Anzahl mit dem Rest und die Menge mit der Füllmenge vor", () => {
    expect(etikettFormular(v({ beutel_rest: 4, beutel_vorhanden: 2 }), g)).toEqual({ anzahl: "4", menge: "2", produziert_am: "2026-12-22", verbrauchen_bis: "" });
    expect(etikettFormular(null, g)).toMatchObject({ anzahl: "", menge: "" });
    expect(etikettFormular(v({ beutel_rest: 0 }), g).anzahl).toBe("");
  });
  it("gibt nur weiter, was von der Datenbank abweicht", () => {
    expect(etikettEingabe(f, g)).toEqual({ p_anzahl: 6, p_menge: 2 });
    expect(etikettEingabe({ ...f, menge: "2,5", produziert_am: "2026-12-21", verbrauchen_bis: "2027-01-05" }, g))
      .toEqual({ p_anzahl: 6, p_menge: 2.5, p_produziert_am: "2026-12-21", p_verbrauchen_bis: "2027-01-05" });
  });
  it("lehnt ungültige Zahlen ab", () => {
    for (const anzahl of ["", "0", "2.5", "501", "abc"]) expect(etikettEingabe({ ...f, anzahl }, g)).toHaveProperty("fehler");
    for (const menge of ["", "0", "-1", "1.2345", "x"]) expect(etikettEingabe({ ...f, menge }, g)).toHaveProperty("fehler");
  });
  it("lässt das Produktionsdatum nur auf einen früheren Tag korrigieren", () => {
    expect(etikettEingabe({ ...f, produziert_am: "2026-12-23" }, g)).toHaveProperty("fehler");
    expect(etikettEingabe({ ...f, produziert_am: "" }, g)).toHaveProperty("fehler");
  });
  it("verlangt das Verbrauchsdatum, wenn die Haltbarkeit fehlt, und nie vor dem Produktionsdatum", () => {
    const ohne = { ...g, haltbar_bis: null, haltbarkeit_tage: null };
    expect(etikettEingabe(f, ohne)).toHaveProperty("fehler");
    expect(etikettEingabe({ ...f, verbrauchen_bis: "2026-12-30" }, ohne)).toMatchObject({ p_verbrauchen_bis: "2026-12-30" });
    expect(etikettEingabe({ ...f, verbrauchen_bis: "2026-12-20" }, g)).toHaveProperty("fehler");
  });
});

describe("Etiketten: Vorschau", () => {
  it("zeigt das Verbrauchsdatum der Datenbank und rechnet nicht selbst", () => {
    expect(vorschauDatum(f, g)).toBe("12.01.2027");
    expect(vorschauDatum({ ...f, produziert_am: "2026-12-21" }, g)).toBe("+ 21 Tage");
    expect(vorschauDatum({ ...f, verbrauchen_bis: "2027-01-05" }, g)).toBe("05.01.2027");
    expect(vorschauDatum(f, { ...g, haltbar_bis: null, haltbarkeit_tage: null })).toBe("[Datum]");
  });
  it("nennt die Felder des Etiketts ohne Anlass und Menülinie", () => {
    const felder = vorschauFelder(v({}), f, "kg");
    expect(felder.map((x) => x.label)).toEqual(["Menge", "Produziert", "Lagerung", "Regeneration", "Allergene"]);
    expect(felder.map((x) => x.wert)).toEqual(["2.00 kg", "22.12.2026", "0–2 °C", "Herd", "siehe Rezept"]);
    expect(vorschauFelder(null, { ...f, menge: "" }, "kg").map((x) => x.wert)).toEqual(["[Menge]", "22.12.2026", "[Lagerung]", "–", "siehe Rezept"]);
  });
  it("zählt die Beutel und beschreibt den Vorschlag", () => {
    expect(vorschauZaehler(f)).toBe("Beutel 1 von 6");
    expect(vorschauZaehler({ ...f, anzahl: "" })).toBe("Beutel");
    expect(vorschlagHinweis(v({ beutel_vorhanden: 2, menge_vorhanden: 4 }))).toBe("Vorschlag: 6 Beutel. Bereits 2 Beutel, 4.00 kg etikettiert.");
    expect(vorschlagHinweis(v({ status: "kein Rezept", beutel_vorhanden: 3, menge_vorhanden: 6 }))).toContain("Bereits 3 Beutel, 6.00 kg etikettiert.");
    expect(vorschlagHinweis(v({ status: "Füllmenge pro Beutel fehlt" }))).toContain("Füllmenge pro Beutel fehlt");
    expect(vorschlagHinweis(null)).toContain("Kein Vorschlag");
  });
});
