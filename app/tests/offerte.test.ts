import { describe, expect, it } from "vitest";
import { anteilAus, anteilText, fehlerText, formatChf, kopfAus, kopfUpdate, nachGang, type Offerte, type Position } from "../lib/offerte";

const offerte: Offerte = {
  id: "a", nummer: "O-2026-0001", name: "Firmenjubiläum", kunde: null, datum: null, ort: null, gaeste: null,
  angebotsform: null, betrieb: null, bemerkung: null, status: "offerte",
};

describe("Kopf", () => {
  it("leere Felder werden null, Pflichtfeld Anlass", () => {
    expect(kopfUpdate(kopfAus(offerte))).toEqual({
      update: { name: "Firmenjubiläum", kunde: null, datum: null, ort: null, gaeste: null, angebotsform: null, betrieb: null, bemerkung: null },
    });
    expect(kopfUpdate({ ...kopfAus(offerte), name: "  " })).toHaveProperty("fehler");
  });
  it("Gäste ganz ab 1, Datum aus dem Kalender", () => {
    const k = kopfAus(offerte);
    expect(kopfUpdate({ ...k, gaeste: "120", datum: "2027-03-14", kunde: " Muster AG " })).toMatchObject({ update: { gaeste: 120, datum: "2027-03-14", kunde: "Muster AG" } });
    for (const g of ["0", "1.5", "abc"]) expect(kopfUpdate({ ...k, gaeste: g })).toHaveProperty("fehler");
    expect(kopfUpdate({ ...k, datum: "14.03.2027" })).toHaveProperty("fehler");
  });
});

describe("Anteil", () => {
  it("Prozent → Bruchteil, leer = gleich verteilt, ungültig = undefined", () => {
    expect(anteilAus("50")).toBe(0.5);
    expect(anteilAus("33,33 %")).toBe(0.3333);
    expect(anteilAus("")).toBeNull();
    for (const t of ["0", "101", "-5", "abc", "1.234"]) expect(anteilAus(t)).toBeUndefined();
    expect(anteilText(0.5)).toBe("50");
    expect(anteilText(0.3333)).toBe("33.33");
    expect(anteilText(null)).toBe("");
  });
});

describe("Anzeige", () => {
  it("CHF mit zwei Stellen, sonst Platzhalter", () => {
    expect(formatChf(28.35)).toBe("CHF 28.35");
    expect(formatChf(3402)).toBe("CHF 3’402.00");
    expect(formatChf(null)).toBe("[Preis]");
  });
  it("gruppiert nach Gang in der Reihenfolge der Mengentypen", () => {
    const p = (x: Partial<Position>) => ({ gericht_id: "x", gang: "Hauptgang", mengentyp: "Hauptgang Fleisch und Fisch", reihenfolge: 1, ...x }) as Position;
    const g = nachGang(
      [p({ gericht_id: "d", gang: "Dessert", mengentyp: "Dessert" }), p({ gericht_id: "v", mengentyp: "Hauptgang Vegi und Pasta", reihenfolge: 0 }), p({ gericht_id: "f", reihenfolge: 2 }), p({ gericht_id: "s", gang: "Vorspeise", mengentyp: "Vorspeise" })],
      ["Vorspeise", "Hauptgang Fleisch und Fisch", "Hauptgang Vegi und Pasta", "Dessert"],
    );
    expect(g.map((x) => [x.gang, x.positionen.map((y) => y.gericht_id)])).toEqual([["Vorspeise", ["s"]], ["Hauptgang", ["f", "v"]], ["Dessert", ["d"]]]);
  });
});

describe("Fehlermeldungen", () => {
  it("doppeltes Gericht und ungültiger Anteil verständlich", () => {
    expect(fehlerText({ code: "23505", message: 'duplicate key value violates unique constraint "offerte_gericht_pkey"' })).toBe("Dieses Gericht ist schon in der Offerte.");
    expect(fehlerText({ code: "23514", message: 'violates check constraint "offerte_gericht_anteil_check"' })).toBe("Anteil muss über 0 und höchstens 100 % sein.");
    expect(fehlerText({ message: "Netzwerkfehler" })).toBe("Netzwerkfehler");
  });
});
