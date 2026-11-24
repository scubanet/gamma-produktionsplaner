import { describe, expect, it } from "vitest";
import { grenzeText, gradText, heuteKennzahlen, istAbweichung, messungEingabe, monatsGrenzen, standPill, stelleEingabe, stelleStandard, temperaturAus, zeitSchweiz, type Heute } from "../lib/temperatur";

const h = (p: Partial<Heute>): Heute => ({
  kuehlstelle_id: "k1", name: "Kühlraum 1", art: "kuehlung", grenze_min: 0, grenze_max: 2, messungen_pro_tag: 2, reihenfolge: 0,
  messungen: 0, fehlend: 2, abweichung: false, letzte_am: null, letzte_temperatur: null, status: "offen", ...p,
});
const leer = { temperatur: "", visum: "DW", massnahme: "", bemerkung: "" };

describe("Temperatur: Text", () => {
  it("schreibt Grad mit Vorzeichen und einer Stelle", () => {
    expect([gradText(1.5), gradText(-18), gradText(0), gradText(null)]).toEqual(["+1.5 °C", "−18.0 °C", "0.0 °C", "–"]);
  });
  it("beschreibt die Grenze", () => {
    expect(grenzeText(0, 2)).toBe("0.0 bis +2.0 °C");
    expect(grenzeText(null, -18)).toBe("höchstens −18.0 °C");
  });
  it("liest Eingaben mit Komma, Minus und °C", () => {
    expect([temperaturAus("1,5"), temperaturAus("−19"), temperaturAus("-18.2 °C"), temperaturAus("+3"), temperaturAus("abc"), temperaturAus("1,55"), temperaturAus("")]).toEqual([1.5, -19, -18.2, 3, null, null, null]);
  });
  it("gibt die Uhrzeit in der Schweiz", () => {
    expect(zeitSchweiz("2026-11-24T06:42:00Z")).toBe("07:42");
  });
});

describe("Temperatur: Abweichung und Eingabe", () => {
  it("erkennt Abweichungen wie die Datenbank (gerundet auf eine Stelle)", () => {
    expect([istAbweichung(2, 0, 2), istAbweichung(2.04, 0, 2), istAbweichung(2.1, 0, 2), istAbweichung(-0.1, 0, 2), istAbweichung(-17.9, null, -18), istAbweichung(-25, null, -18)]).toEqual([false, false, true, true, true, false]);
  });
  it("verlangt bei Abweichung eine Massnahme", () => {
    expect(messungEingabe(h({}), { ...leer, temperatur: "4" })).toEqual({ fehler: expect.stringContaining("Massnahme") });
    expect(messungEingabe(h({}), { ...leer, temperatur: "4", massnahme: " Tür zu " })).toEqual({ p_kuehlstelle: "k1", p_temperatur: 4, p_visum: "DW", p_massnahme: "Tür zu" });
  });
  it("prüft Temperatur und Visum", () => {
    expect(messungEingabe(h({}), { ...leer, temperatur: "1,5" })).toEqual({ p_kuehlstelle: "k1", p_temperatur: 1.5, p_visum: "DW" });
    expect("fehler" in messungEingabe(h({}), { ...leer, temperatur: "50" })).toBe(true);
    expect("fehler" in messungEingabe(h({}), { ...leer, temperatur: "1", visum: " " })).toBe(true);
  });
});

describe("Temperatur: Kühlstellen", () => {
  it("schlägt die Grenzwerte der Art vor", () => {
    expect([stelleStandard("kuehlung").min, stelleStandard("kuehlung").max, stelleStandard("tk").min, stelleStandard("tk").max, stelleStandard("economat").max]).toEqual(["0", "2", "", "-18", "18"]);
  });
  it("prüft die Eingabe", () => {
    expect(stelleEingabe({ ...stelleStandard("tk"), name: " TK 1 " })).toEqual({ name: "TK 1", art: "tk", grenze_min: null, grenze_max: -18, messungen_pro_tag: 1, reihenfolge: 0, aktiv: true, bemerkung: null });
    expect("fehler" in stelleEingabe({ ...stelleStandard(), name: "K", min: "3", max: "2" })).toBe(true);
    expect("fehler" in stelleEingabe({ ...stelleStandard(), name: "" })).toBe(true);
    expect("fehler" in stelleEingabe({ ...stelleStandard(), name: "K", messungen: "0" })).toBe(true);
  });
});

describe("Temperatur: Stand heute", () => {
  it("zeigt den Stand als Pill", () => {
    expect(standPill(h({}))).toEqual({ status: "neutral", text: "0 von 2 gemessen" });
    expect(standPill(h({ messungen: 1 }))).toEqual({ status: "warn", text: "1 von 2 gemessen" });
    expect(standPill(h({ messungen: 2, status: "ok" }))).toEqual({ status: "ok", text: "2 von 2 gemessen" });
    expect(standPill(h({ messungen: 1, status: "abweichung" }))).toEqual({ status: "critical", text: "Abweichung · 1 von 2" });
  });
  it("zählt Messungen höchstens bis zum Soll", () => {
    expect(heuteKennzahlen([h({ messungen: 3, status: "ok" }), h({ messungen: 0 }), h({ messungen: 1, status: "abweichung" })])).toEqual({ stellen: 3, gemessen: 3, soll: 6, offen: 1, abweichungen: 1 });
  });
  it("kennt die Monatsgrenzen", () => {
    expect(monatsGrenzen("2026-02")).toEqual({ von: "2026-02-01", bis: "2026-02-28" });
    expect(monatsGrenzen("2026-11")).toEqual({ von: "2026-11-01", bis: "2026-11-30" });
    expect(monatsGrenzen("2026-13")).toBeNull();
  });
});
