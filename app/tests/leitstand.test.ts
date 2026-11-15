import { describe, expect, it } from "vitest";
import { naechsterAnlass, summe, tageBis, wannText, wellenName, type LeitAnlass } from "../lib/leitstand";

const a = (id: string, datum: string | null, datum_bis: string | null = null): LeitAnlass => ({ id, name: id, datum, datum_bis, saison_id: "s" });
const heute = new Date(2026, 10, 15, 9, 0);

describe("Leitstand", () => {
  it("zählt die Tage bis zum Anlass in ganzen Tagen, unabhängig von der Uhrzeit", () => {
    expect(tageBis("2026-12-26", heute)).toBe(41);
    expect(tageBis("2026-11-15", new Date(2026, 10, 15, 23, 30))).toBe(0);
    expect(tageBis("2026-11-14", heute)).toBe(-1);
  });

  it("nächster Anlass: der früheste, der noch nicht vorbei ist", () => {
    const liste = [a("wef", "2027-01-18", "2027-01-22"), a("alt", "2026-10-01"), a("spengler", "2026-12-26", "2026-12-31"), a("ohne", null)];
    expect(naechsterAnlass(liste, heute)?.id).toBe("spengler");
  });

  it("ein laufender Anlass bleibt der nächste bis zum letzten Tag", () => {
    const liste = [a("spengler", "2026-12-26", "2026-12-31"), a("wef", "2027-01-18")];
    expect(naechsterAnlass(liste, new Date(2026, 11, 31, 8, 0))?.id).toBe("spengler");
    expect(naechsterAnlass(liste, new Date(2027, 0, 1, 8, 0))?.id).toBe("wef");
    expect(naechsterAnlass([a("alt", "2026-10-01")], heute)).toBeNull();
  });

  it("sagt, wann der Anlass ist", () => {
    expect(wannText(a("x", "2026-12-26"), heute)).toBe("in 41 Tagen");
    expect(wannText(a("x", "2026-11-16"), heute)).toBe("morgen");
    expect(wannText(a("x", "2026-11-15"), heute)).toBe("heute");
    expect(wannText(a("x", "2026-11-13", "2026-11-17"), heute)).toBe("läuft");
  });

  it("Welle 0 heisst «Ohne Welle»", () => {
    expect(wellenName(0)).toBe("Ohne Welle");
    expect(wellenName(2)).toBe("Welle 2");
  });

  it("summiert Aufgaben und Erledigte", () => {
    expect(summe([{ aufgaben: 172, erledigt: 0 }, { aufgaben: 77, erledigt: 5 }, { aufgaben: null, erledigt: null }])).toEqual({ aufgaben: 249, erledigt: 5 });
  });
});
