import { describe, expect, it } from "vitest";
import {
  fehlertext, filtern, formularAus, haltbarkeitText, lagerartSetzen, hinweiseNachKomponente, lagerungText, leerAnzeige, sortieren, sperreAus, umschalten, updateAus,
  type Hinweis, type Zuteilung,
} from "../lib/systemzuteilung";

const z = (p: Partial<Zuteilung>): Zuteilung => ({
  id: "k1", kollektion_id: "c", kategorie: "Fleisch", quelle_zeile: 5, name: "Rindsentrecote", cf_stufe: null,
  produktion: ["SV"], lager_0_2: true, lager_tk: false, lager_gedeckt: true, lager_tage: null, regeneration: ["Steamer"],
  bemerkung: null, hauptartikel_id: null, rezept_id: null, status: "ok", haltbarkeit_tage: 21, nur_vor_ort: false, lager_trocken: false, ...p,
});
const h = (p: Partial<Hinweis>): Hinweis => ({ komponente_id: "k1", kategorie: "Fleisch", name: "x", code: "c", farbe: "gelb", text: "t", ...p });

describe("Formular", () => {
  it("Hin und zurück ohne Änderung", () => {
    const r = updateAus(formularAus(z({ lager_tage: 5, cf_stufe: 2, bemerkung: "Annahme" })));
    expect(r).toEqual({
      update: { produktion: ["SV"], lager_0_2: true, lager_tk: false, lager_gedeckt: true, lager_trocken: false, lager_tage: 5, regeneration: ["Steamer"], cf_stufe: 2, bemerkung: "Annahme" },
    });
  });

  it("leere Felder werden null", () => {
    const r = updateAus({ ...formularAus(z({})), lager_tage: " ", cf_stufe: "", bemerkung: "  " });
    expect(r).toMatchObject({ update: { lager_tage: null, cf_stufe: null, bemerkung: null } });
  });

  it("lehnt ungültige Tage ab, statt zu raten", () => {
    for (const t of ["-1", "0", "2.5", "drei", "99999999999"]) expect(updateAus({ ...formularAus(z({})), lager_tage: t })).toHaveProperty("fehler");
    expect(updateAus({ ...formularAus(z({})), lager_tage: "1" })).toMatchObject({ update: { lager_tage: 1 } });
    expect(updateAus({ ...formularAus(z({})), cf_stufe: "6" })).toHaveProperty("fehler");
  });

  it("Codes ein- und ausschalten in Stammreihenfolge, ohne Doppelte", () => {
    const r = ["FNG", "SF", "SV"];
    expect(umschalten(["SV"], "FNG", true, r)).toEqual(["FNG", "SV"]);
    expect(umschalten(["FNG", "SV"], "SV", true, r)).toEqual(["FNG", "SV"]);
    expect(umschalten(["FNG", "SV"], "FNG", false, r)).toEqual(["SV"]);
  });
});

describe("Anzeige", () => {
  it("Lagerung als Text", () => {
    expect(lagerungText(z({ lager_tage: 5 }))).toBe("0–2 °C, gedeckt, 5 Tage");
    expect(lagerungText(z({ lager_0_2: false, lager_gedeckt: false }))).toBe("–");
    expect(lagerungText(z({ lager_0_2: false, lager_gedeckt: false, lager_tk: true }))).toBe("TK");
    expect(lagerungText(z({ lager_0_2: false, lager_gedeckt: false, lager_trocken: true, lager_tage: 90 }))).toBe("trocken, bis 18 °C, 90 Tage");
    // Trocken schliesst 0–2 °C und TK aus, in beide Richtungen.
    const f = formularAus(z({ lager_tk: true }));
    expect(lagerartSetzen(f, "lager_trocken", true)).toMatchObject({ lager_trocken: true, lager_0_2: false, lager_tk: false, lager_gedeckt: true });
    expect(lagerartSetzen({ ...f, lager_0_2: false, lager_tk: false, lager_trocken: true }, "lager_tk", true)).toMatchObject({ lager_trocken: false, lager_tk: true });
    expect(lagerartSetzen(f, "lager_tk", false)).toMatchObject({ lager_tk: false, lager_0_2: true });
    expect(fehlertext({ code: "23514", message: 'violates check constraint "komponente_lager_trocken_check"' })).toMatch(/Trocken/);
  });

  it("Datenbankmeldungen verständlich", () => {
    expect(fehlertext({ code: "23514", message: 'violates check constraint "komponente_lager_tage_check"' })).toBe("Lagerung Tage: ab 1 Tag, oder leer lassen.");
    expect(fehlertext({ code: "22003", message: "integer out of range" })).toBe("Zahl zu gross.");
    expect(fehlertext({ code: "23514", message: "Unbekannte Regenerationsart: X" })).toBe("Unbekannte Regenerationsart: X");
  });
});

describe("Filter und Sortierung", () => {
  const zeilen = [
    z({ id: "a", name: "Zander", kategorie: "Fisch", quelle_zeile: 9 }),
    z({ id: "b", name: "Apfelstrudel", kategorie: "Dessert", status: "Zukauf", quelle_zeile: 3 }),
    z({ id: "c", name: "Rindsentrecote", kategorie: "Fleisch", status: "offen", quelle_zeile: 2 }),
  ];
  const hw = hinweiseNachKomponente([h({ komponente_id: "a", farbe: "rot" }), h({ komponente_id: "c" })]);
  const leer = { kategorie: "", status: "", hinweis: "" as const, suche: "" };

  it("filtert nach Hinweis, Status, Kategorie und Suche", () => {
    expect(filtern(zeilen, hw, { ...leer, hinweis: "rot" }).map((x) => x.id)).toEqual(["a"]);
    expect(filtern(zeilen, hw, { ...leer, hinweis: "gelb" }).map((x) => x.id)).toEqual(["c"]);
    expect(filtern(zeilen, hw, { ...leer, hinweis: "ohne" }).map((x) => x.id)).toEqual(["b"]);
    expect(filtern(zeilen, hw, { ...leer, status: "Zukauf" }).map((x) => x.id)).toEqual(["b"]);
    expect(filtern(zeilen, hw, { ...leer, suche: "APFEL" }).map((x) => x.id)).toEqual(["b"]);
    expect(filtern(zeilen, hw, { ...leer, kategorie: "Fisch" }).map((x) => x.id)).toEqual(["a"]);
  });

  it("sortiert wie die Kategorienblätter, dann nach Excel-Zeile", () => {
    expect(sortieren(zeilen, ["Fleisch", "Fisch", "Dessert"]).map((x) => x.id)).toEqual(["c", "a", "b"]);
  });
});

describe("Leere Werte und Haltbarkeit", () => {
  it("[Platzhalter] wenn noch nicht erfasst, «–» wenn nicht zutreffend", () => {
    expect(leerAnzeige(z({ status: "offen" }), "Lagerung")).toBe("[Lagerung]");
    expect(leerAnzeige(z({ status: "ok" }), "CF")).toBe("[CF]");
    expect(leerAnzeige(z({ nur_vor_ort: true }), "Regeneration")).toBe("–");
    expect(leerAnzeige(z({ status: "Zukauf" }), "Produktion")).toBe("–");
    expect(leerAnzeige(z({ status: "Zukauf" }), "Regeneration")).toBe("[Regeneration]");
  });

  it("Haltbarkeit: Tage, vor Ort, Zukauf, offen", () => {
    expect(haltbarkeitText(z({}))).toBe("21 Tage");
    expect(haltbarkeitText(z({ haltbarkeit_tage: null, nur_vor_ort: true, status: "ok" }))).toBe("vor Ort");
    expect(haltbarkeitText(z({ haltbarkeit_tage: null, status: "Zukauf" }))).toBe("–");
    expect(haltbarkeitText(z({ haltbarkeit_tage: null, status: "offen" }))).toBe("[Haltbarkeit]");
  });
});

describe("Optimistische Sperre", () => {
  it("vergleicht alle bearbeitbaren Felder mit dem Stand beim Öffnen", () => {
    const b = sperreAus(z({ produktion: ["FNG", "Past."], regeneration: [], bemerkung: 'Sauce "hell"', lager_tage: null, cf_stufe: 2 }));
    expect(b).toEqual([
      { spalte: "produktion", op: "eq", wert: '{"FNG","Past."}' },
      { spalte: "regeneration", op: "eq", wert: "{}" },
      { spalte: "lager_0_2", op: "eq", wert: true },
      { spalte: "lager_tk", op: "eq", wert: false },
      { spalte: "lager_gedeckt", op: "eq", wert: true },
      { spalte: "lager_trocken", op: "eq", wert: false },
      { spalte: "lager_tage", op: "is", wert: null },
      { spalte: "cf_stufe", op: "eq", wert: 2 },
      { spalte: "bemerkung", op: "eq", wert: 'Sauce "hell"' },
    ]);
  });

  it("deckt jedes Feld ab, das gespeichert wird", () => {
    const r = updateAus(formularAus(z({})));
    if (!("update" in r)) throw new Error("kein Update");
    expect(sperreAus(z({})).map((x) => x.spalte).sort()).toEqual(Object.keys(r.update).sort());
  });

  it("maskiert Anführungszeichen in Codes", () => {
    expect(sperreAus(z({ produktion: ['a"b'] }))[0].wert).toBe('{"a\\"b"}');
  });
});
