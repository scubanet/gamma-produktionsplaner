import { describe, expect, it } from "vitest";
import { abdeckung, anzahl, fehlend, gewichtText, minuten, nachBezug, nachKategorie, services, statusPill, summe, volumenText, type ProduktionZeile, type ServiceZeile } from "../lib/planung";

const p = (x: Partial<ProduktionZeile>): ProduktionZeile => ({
  saison_id: "s", bezug_typ: "welle", bezug: "Welle 1", sortierung: 1, bedarf_am: "2026-12-22", komponente_id: "k1", komponente: "Kartoffelgratin", kategorie: "Beilage",
  einheit: "kg", menge: 33, liter_annahme: false, rezept_id: "r1", rezept: "Kartoffelgratin", rezept_slug: "kartoffelgratin", schritte: 3, durchgaenge: 3,
  aktiv_min: 135, geraet_min: 420, status: "gerechnet", herleitung: "33 kg ÷ 12 kg = 3 Durchgänge", ...x,
});
const s = (x: Partial<ServiceZeile>): ServiceZeile => ({
  service_id: "sv1", anlass_id: "a", saison_id: "s", service: "Spiel 1", reihenfolge: 1, datum: "2026-12-26", komponente_id: "k1", komponente: "Kartoffelgratin", kategorie: "Beilage",
  einheit: "kg", menge: 33, liter_annahme: false, portionen: 330, rezept_id: "r1", rezept: "Kartoffelgratin", rezept_slug: "kartoffelgratin", gebinde: "IFCO-Box",
  fuellmenge_g: 12000, gebinde_anzahl: 3, gewicht_kg: null, volumen_l: null, vorort_schritte: 1, vorort_aktiv_min: 15, vorort_geraet_min: 75, ausgabe_min: 49.5,
  service_rolle: "Koch", status: "gerechnet", herleitung: "33 kg ÷ 12 kg = 3 IFCO-Box", ...x,
});

describe("Planung aus dem Rezept", () => {
  const zeilen = [
    p({}),
    p({ komponente_id: "k2", komponente: "Apfelmus", kategorie: "Dessert", rezept: null, rezept_id: null, status: "kein Rezept", aktiv_min: null, durchgaenge: null }),
    p({ bezug: "Spengler Cup", bezug_typ: "anlass", sortierung: 1001, komponente_id: "k3", komponente: "Brot", status: "kein Rezept", aktiv_min: null }),
  ];

  it("gruppiert nach Welle oder Anlass, darin nach Kategorie und Name", () => {
    const g = nachBezug(zeilen, nachKategorie);
    expect(g.map((x) => x.bezug)).toEqual(["Welle 1", "Spengler Cup"]);
    expect(g[0].zeilen.map((z) => z.komponente)).toEqual(["Kartoffelgratin", "Apfelmus"]);
  });
  it("Summen gelten nur für gerechnete Zeilen und sagen das", () => {
    expect(abdeckung(zeilen)).toMatchObject({ gerechnet: 1, alle: 3, text: "gerechnet für 1 von 3 Komponenten" });
    expect(summe(zeilen, (z) => z.aktiv_min)).toBe(135);
    expect(summe([zeilen[1]], (z) => z.aktiv_min)).toBeNull();
    expect(fehlend(zeilen)).toEqual(["2 × kein Rezept"]);
  });
  it("Platzhalter statt geschätzter Werte", () => {
    expect(minuten(null)).toBe("[Zeit]");
    expect(minuten(135)).toBe("2 h 15 min");
    expect(anzahl(null, "[Gebinde]")).toBe("[Gebinde]");
    expect(statusPill("gerechnet")).toBe("ok");
    expect(statusPill("Füllmenge fehlt")).toBe("warn");
  });
  it("Gewicht und Volumen brauchen Tara und Volumen des Gebindes", () => {
    expect(gewichtText(s({}))).toBe("[Tara]");
    expect(gewichtText(s({ gewicht_kg: 38.4 }))).toBe("38.40 kg");
    expect(gewichtText(s({ gebinde_anzahl: null }))).toBe("[Gewicht]");
    expect(volumenText(s({ volumen_l: 120 }))).toBe("120.0 l");
    expect(volumenText(s({}))).toBe("[Volumen]");
  });
  it("Services in ihrer Reihenfolge, je einmal", () => {
    expect(services([s({ service_id: "b", service: "Spiel 2", reihenfolge: 2 }), s({}), s({ komponente_id: "k9" })])).toEqual([
      { value: "sv1", label: "Spiel 1" }, { value: "b", label: "Spiel 2" },
    ]);
  });
});
