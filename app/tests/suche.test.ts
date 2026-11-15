import { describe, expect, it } from "vitest";
import { suchen } from "../lib/suche";

const zeilen = [
  { komponente: "Bündner Trockenfleisch", kategorie: "Basiskomponenten" },
  { komponente: "braune Butter", kategorie: "Basiskomponenten" },
  { komponente: "Focaccia", kategorie: "Brot" },
  { komponente: "Crème brûlée", kategorie: null },
];
const felder = (z: (typeof zeilen)[number]) => [z.komponente, z.kategorie];

describe("Suche", () => {
  it("leere Suche gibt alles zurück", () => {
    expect(suchen(zeilen, "  ", felder)).toHaveLength(4);
  });
  it("findet ohne Umlaut, ohne Akzent und ohne Grossschreibung", () => {
    expect(suchen(zeilen, "bundner", felder).map((z) => z.komponente)).toEqual(["Bündner Trockenfleisch"]);
    expect(suchen(zeilen, "CREME BRULEE", felder).map((z) => z.komponente)).toEqual(["Crème brûlée"]);
  });
  it("mehrere Wörter in beliebiger Reihenfolge, alle müssen vorkommen", () => {
    expect(suchen(zeilen, "butter braun", felder).map((z) => z.komponente)).toEqual(["braune Butter"]);
    expect(suchen(zeilen, "butter focaccia", felder)).toEqual([]);
  });
  it("sucht in allen genannten Feldern, leere Felder stören nicht", () => {
    expect(suchen(zeilen, "brot", felder).map((z) => z.komponente)).toEqual(["Focaccia"]);
  });
});
