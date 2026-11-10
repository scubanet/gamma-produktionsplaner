import { describe, expect, it } from "vitest";
import { dezimal, fehlerText, ganzzahl, gerichteNachGang, kopfAus, kopfUpdate, nachRubrik, statusLabel, zeitraum, type Anlass, type KartenPosition, type LinieGericht } from "../lib/anlass";
import { formatDatum } from "../lib/format";

const anlass: Anlass = {
  id: "a", nummer: "W-2026-01", name: "Spengler Cup", kunde: null, datum: "2026-12-26", datum_bis: "2026-12-31", ort: "Davos",
  gaeste: 550, vorlauf_tage: 1, saison_id: "s", status: "bestaetigt", betrieb: "catering", angebotsform: "buffet", bemerkung: "Anlieferung klären",
};

describe("Kopf", () => {
  it("Hin und zurück ohne Änderung", () => {
    expect(kopfUpdate(kopfAus(anlass))).toEqual({
      update: {
        nummer: "W-2026-01", name: "Spengler Cup", kunde: null, datum: "2026-12-26", datum_bis: "2026-12-31", ort: "Davos", gaeste: 550,
        vorlauf_tage: 1, saison_id: "s", status: "bestaetigt", betrieb: "catering", angebotsform: "buffet", bemerkung: "Anlieferung klären",
      },
    });
  });
  it("prüft Pflichtfeld, Vorlauf, Gäste, Datum bis und Status", () => {
    const k = kopfAus(anlass);
    expect(kopfUpdate({ ...k, name: " " })).toHaveProperty("fehler");
    expect(kopfUpdate({ ...k, vorlauf_tage: "" })).toHaveProperty("fehler");
    expect(kopfUpdate({ ...k, gaeste: "0" })).toHaveProperty("fehler");
    expect(kopfUpdate({ ...k, datum_bis: "2026-12-01" })).toHaveProperty("fehler");
    expect(kopfUpdate({ ...k, status: "offerte" })).toHaveProperty("fehler");
    expect(kopfUpdate({ ...k, gaeste: "", saison_id: "" })).toMatchObject({ update: { gaeste: null, saison_id: null } });
  });
});

describe("Eingaben", () => {
  it("ganze Zahl und Dezimalzahl", () => {
    expect(ganzzahl("550", 0, 100000)).toBe(550);
    expect(ganzzahl("", 0, 10)).toBeNull();
    expect(ganzzahl("1.5", 0, 10)).toBeUndefined();
    expect(ganzzahl("11", 0, 10)).toBeUndefined();
    expect(dezimal("12,5")).toBe(12.5);
    expect(dezimal("")).toBeNull();
    expect(dezimal("1.234")).toBeUndefined();
    expect(dezimal("-1")).toBeUndefined();
  });
});

describe("Anzeige", () => {
  it("Zeitraum, Status, Gänge, Rubriken", () => {
    expect(zeitraum("2026-12-26", "2026-12-31", formatDatum)).toBe("26.12.2026–31.12.2026");
    expect(zeitraum("2026-12-26", "2026-12-26", formatDatum)).toBe("26.12.2026");
    expect(zeitraum(null, null, formatDatum)).toBe("[Datum]");
    expect(statusLabel("bestaetigt")).toBe("Bestätigt");
    const g = (id: string, gang: string, reihenfolge: number) => ({ id, gang, reihenfolge }) as LinieGericht;
    expect(gerichteNachGang([g("d", "Dessert", 3), g("v", "Vorspeise", 1), g("w", "Vorspeise", 2)]).map((x) => [x.gang, x.gerichte.map((y) => y.id)])).toEqual([
      ["Vorspeise", ["v", "w"]],
      ["Dessert", ["d"]],
    ]);
    const p = (id: string, rubrik: string | null, reihenfolge: number) => ({ id, rubrik, reihenfolge }) as KartenPosition;
    expect(nachRubrik([p("b", "Snacks", 2), p("a", "Süssgetränke", 1), p("c", "Süssgetränke", 3), p("d", null, 4)]).map((x) => [x.rubrik, x.positionen.map((y) => y.id)])).toEqual([
      ["Süssgetränke", ["a", "c"]],
      ["Snacks", ["b"]],
      ["Ohne Rubrik", ["d"]],
    ]);
  });
  it("Datenbankmeldungen", () => {
    expect(fehlerText({ code: "23503", message: 'violates foreign key constraint "service_menuelinie_id_fkey"' })).toMatch(/Services umstellen/);
    expect(fehlerText({ code: "23505", message: 'duplicate key "anlass_nummer_key"' })).toBe("Diese Anlassnummer gibt es schon.");
  });
});
