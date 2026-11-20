import { describe, expect, it } from "vitest";
import { herkunftText, istAnnahme, zutatenStandText } from "../lib/einkauf";

describe("Einkauf aus dem Rezept", () => {
  it("Stand der Zutaten einer Position", () => {
    expect(zutatenStandText({ zutaten: 8, zutaten_ohne_artikel: 3, zutaten_ohne_menge: 2 })).toBe("5 von 8 Zutaten verknüpft, 2 davon Menge von Hand");
    expect(zutatenStandText({ zutaten: 3, zutaten_ohne_artikel: 0, zutaten_ohne_menge: 0 })).toBe("3 von 3 Zutaten verknüpft");
    expect(zutatenStandText({ zutaten: null, zutaten_ohne_artikel: null, zutaten_ohne_menge: null })).toBe("[Zutaten]");
  });

  it("Herkunft einer Artikelzeile, mit Hinweis auf Entwürfe", () => {
    expect(herkunftText({ wege: "rezept", komponenten_nicht_freigegeben: 0 })).toBe("aus dem Rezept");
    expect(herkunftText({ wege: "rezept", komponenten_nicht_freigegeben: 3 })).toBe("aus dem Rezept, 3 nicht freigegeben");
    expect(herkunftText({ wege: "hauptartikel", komponenten_nicht_freigegeben: 0 })).toBe("über den Hauptartikel");
    expect(herkunftText({ wege: "hauptartikel, rezept", komponenten_nicht_freigegeben: 1 })).toBe("über den Hauptartikel und aus dem Rezept, 1 nicht freigegeben");
  });

  it("vor Migration 34 kennt die Zeile keine Herkunft: bisheriger Weg, Annahme", () => {
    expect(herkunftText({ wege: undefined, komponenten_nicht_freigegeben: undefined })).toBe("über den Hauptartikel");
    expect(istAnnahme({ annahme: undefined })).toBe(true);
    expect(istAnnahme({ annahme: null })).toBe(true);
    expect(istAnnahme({ annahme: false })).toBe(false);
  });
});
