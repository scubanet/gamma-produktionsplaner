import { describe, expect, it } from "vitest";
import { formAus, mengeProGast, mietkosten, nachGang, OHNE_GANG, positionDaten, stueck, type Bedarf } from "../lib/geschirr";

const b = (x: Partial<Bedarf>): Bedarf => ({
  id: "p1", anlass_id: "a", gang: "Vorspeise", artikel_id: "t1", artikel: "Teller flach", art: "teller", stueck_pro_gast: 1, wechselfaktor: 1.5, reserve_pct: 10,
  stueck_fix: null, aus_standard: true, bemerkung: null, gaeste: 550, bedarf: 908, eigen: 600, miete: 308, mietkosten_chf: 154, koerbe: 37, gewicht_kg: 544.8,
  herleitung: "550 Gäste × 1 Stück × Wechselfaktor 1.5 + 10 % Reserve, aufgerundet", ...x,
});
const daten = (x: ReturnType<typeof positionDaten>) => ("daten" in x ? x.daten : null);

describe("Geschirr und Besteck", () => {
  it("Formular aus dem Standard und als neue Position", () => {
    expect(formAus(b({}))).toMatchObject({ id: "p1", art: "gast", stueck_pro_gast: "1", wechselfaktor: "1.5", reserve_pct: "10", gang: "Vorspeise" });
    expect(formAus(b({ stueck_fix: 12, stueck_pro_gast: null, gang: null }))).toMatchObject({ art: "fix", stueck_fix: "12", gang: "" });
    expect(formAus(null, "Suppe")).toMatchObject({ id: null, gang: "Suppe", wechselfaktor: "1", reserve_pct: "0" });
  });
  it("pro Gast: Stück, Wechselfaktor und Reserve; feste Stückzahl schliesst das aus", () => {
    expect(daten(positionDaten({ ...formAus(b({})), wechselfaktor: "1,5" }))).toMatchObject({ stueck_pro_gast: 1, wechselfaktor: 1.5, reserve_pct: 10, stueck_fix: null, gang: "Vorspeise" });
    expect(daten(positionDaten({ ...formAus(null), artikel_id: "t1", art: "fix", stueck_fix: "24", gang: "" }))).toMatchObject({ stueck_fix: 24, stueck_pro_gast: null, gang: null });
  });
  it("lehnt ungültige Eingaben ab", () => {
    const f = formAus(b({}));
    expect(positionDaten({ ...f, artikel_id: "" })).toHaveProperty("fehler");
    expect(positionDaten({ ...f, wechselfaktor: "0" })).toHaveProperty("fehler");
    expect(positionDaten({ ...f, reserve_pct: "150" })).toHaveProperty("fehler");
    expect(positionDaten({ ...f, art: "fix", stueck_fix: "1.5" })).toHaveProperty("fehler");
  });
  it("gruppiert nach Gang in der Reihenfolge des Menüs, ohne Gang am Schluss", () => {
    const g = nachGang([b({ id: "x", gang: null, artikel: "Platte" }), b({ id: "d", gang: "Dessert" }), b({}), b({ id: "s", gang: "Suppe", artikel: "Suppentasse" })], ["Vorspeise", "Suppe", "Dessert"]);
    expect(g.map((x) => x.gang)).toEqual(["Vorspeise", "Suppe", "Dessert", OHNE_GANG]);
  });
  it("Mietkosten nur als Summe, wenn kein Preis fehlt", () => {
    expect(mietkosten([b({}), b({ mietkosten_chf: 0 })])).toBe(154);
    expect(mietkosten([b({}), b({ mietkosten_chf: null })])).toBeNull();
    expect(mietkosten([])).toBeNull();
  });
  it("Anzeige", () => {
    expect(mengeProGast(b({}))).toBe("1 × 1.5 + 10 %");
    expect(mengeProGast(b({ stueck_fix: 12 }))).toBe("fest");
    expect(stueck(null)).toBe("[Stück]");
  });
});
