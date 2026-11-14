import { describe, expect, it } from "vitest";
import { geaenderteDaten, ungueltigesDatum } from "../lib/anlass";
import { filtern, gruppieren, vorschlagDetail, type VorschlagZeile } from "../lib/artikel-vorschlag";

describe("Daten der Services in einem Schritt", () => {
  const services = [
    { id: "1", name: "Spiel 1", datum: "2026-12-26" },
    { id: "2", name: "Spiel 2", datum: null },
    { id: "3", name: "Spiel 3", datum: "2026-12-27" },
  ];
  it("schreibt nur geänderte Daten, leer entfernt das Datum", () => {
    expect(geaenderteDaten(services, { "1": "2026-12-26", "2": "2026-12-26", "3": "" })).toEqual([
      { id: "2", name: "Spiel 2", datum: "2026-12-26" },
      { id: "3", name: "Spiel 3", datum: null },
    ]);
    expect(geaenderteDaten(services, { "1": "2026-12-26", "2": "" })).toEqual([]);
  });
  it("erkennt ein ungültiges Datum", () => {
    expect(ungueltigesDatum({ a: "2026-12-26", b: "" })).toBeNull();
    expect(ungueltigesDatum({ a: "26.12.2026" })).toBe("26.12.2026");
    expect(ungueltigesDatum({ a: "2026-13-40" })).toBe("2026-13-40");
  });
});

describe("Artikel-Vorschläge", () => {
  const zeile = (p: Partial<VorschlagZeile>): VorschlagZeile => ({
    komponente_id: "k1", komponente: "Apfelmus", kategorie: "Dessert", status: "ok", rang: 1, artikel_id: "a1", artikel: "Apfelmark 1kg",
    artikelnummer: "100", artikel_einheit: "kg", preis_pro_einheit: 4.5, aehnlichkeit: 0.67, ...p,
  });
  const liste = gruppieren([
    zeile({ rang: 2, artikel_id: "a2", artikel: "Apfel Boskoop", aehnlichkeit: 0.55, preis_pro_einheit: null }),
    zeile({}),
    zeile({ komponente_id: "k2", komponente: "Capuns-Wurst", kategorie: "Fleisch", rang: null, artikel_id: null, artikel: null, aehnlichkeit: null }),
    zeile({ komponente_id: "k3", komponente: "Aprikosen", rang: 1, artikel_id: "a3", artikel: "Aprikosen", aehnlichkeit: 1 }),
  ]);

  it("eine Zeile pro Komponente, Vorschläge nach Rang, sortiert nach Kategorie und Name", () => {
    expect(liste.map((k) => k.komponente)).toEqual(["Apfelmus", "Aprikosen", "Capuns-Wurst"]);
    expect(liste[0].vorschlaege.map((v) => v.artikel)).toEqual(["Apfelmark 1kg", "Apfel Boskoop"]);
    expect(liste[2].vorschlaege).toEqual([]);
  });
  it("filtert nach Kategorie und nach Treffer", () => {
    expect(filtern(liste, { kategorie: "", treffer: "mit" })).toHaveLength(2);
    expect(filtern(liste, { kategorie: "", treffer: "ohne" }).map((k) => k.komponente)).toEqual(["Capuns-Wurst"]);
    expect(filtern(liste, { kategorie: "Dessert", treffer: "" })).toHaveLength(2);
  });
  it("zeigt Preis, Einheit und Ähnlichkeit; fehlender Preis als Platzhalter", () => {
    expect(vorschlagDetail(liste[0].vorschlaege[0])).toMatch(/4\.50 \/ kg · 67 %$/);
    expect(vorschlagDetail(liste[0].vorschlaege[1])).toBe("[Preis] / kg · 55 %");
  });
});
