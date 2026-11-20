import { describe, expect, it } from "vitest";
import { anlassOptionen, gueltigeWahl } from "../lib/kontext";

const anlaesse = [
  { id: "a1", name: "Spengler Cup", datum: "2026-12-26", menuelinien: 6 },
  { id: "a2", name: "White Turf 1", datum: "2027-02-06", menuelinien: 0 },
];

describe("Wahl des Anlasses", () => {
  it("ohne gespeicherte Wahl: alle Anlässe der Saison", () => {
    expect(gueltigeWahl(null, anlaesse)).toBe("");
    expect(gueltigeWahl("", anlaesse)).toBe("");
  });
  it("gespeicherte Wahl bleibt, wenn es den Anlass noch gibt", () => {
    expect(gueltigeWahl("a2", anlaesse)).toBe("a2");
  });
  it("gelöschter Anlass fällt auf alle zurück", () => {
    expect(gueltigeWahl("weg", anlaesse)).toBe("");
  });
  it("Auswahl: zuerst alle, dann die Anlässe mit Datum; ohne Menülinie ist das vermerkt", () => {
    expect(anlassOptionen(anlaesse)).toEqual([
      { value: "", label: "Alle Anlässe (Saison)" },
      { value: "a1", label: "Spengler Cup · 26.12.2026" },
      { value: "a2", label: "White Turf 1 · 06.02.2027 · noch keine Menülinie" },
    ]);
  });
});
