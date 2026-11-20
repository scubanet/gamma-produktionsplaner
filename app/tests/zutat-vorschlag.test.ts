import { describe, expect, it } from "vitest";
import { filtern, gruppieren, rezepteText, standText, umfangText, type ZutatVorschlagZeile } from "../lib/zutat-vorschlag";

const zeile = (z: Partial<ZutatVorschlagZeile>): ZutatVorschlagZeile => ({
  schluessel: "salz", bezeichnung: "Salz", anzahl: 115, rezepte_anzahl: 98, rezepte: ["Jus", "Sugo"], weitere: 81,
  rang: null, artikel_id: null, artikel: null, artikelnummer: null, artikel_einheit: null, preis_pro_einheit: null, aehnlichkeit: null, ...z,
});

describe("Zutaten verknüpfen: Vorschläge", () => {
  it("eine Zeile pro Bezeichnung, Vorschläge nach Rang, häufigste Bezeichnung zuerst", () => {
    const liste = gruppieren([
      zeile({ schluessel: "butter", bezeichnung: "Butter", anzahl: 2, rezepte_anzahl: 2, weitere: 0, rang: 2, artikel_id: "a2", artikel: "Butter 250g", artikel_einheit: "kg", preis_pro_einheit: 14, aehnlichkeit: 0.8 }),
      zeile({ schluessel: "butter", bezeichnung: "Butter", anzahl: 2, rezepte_anzahl: 2, weitere: 0, rang: 1, artikel_id: "a1", artikel: "Butter 1kg", artikel_einheit: "kg", preis_pro_einheit: 12.5, aehnlichkeit: 1 }),
      zeile({}),
    ]);
    expect(liste.map((z) => z.bezeichnung)).toEqual(["Salz", "Butter"]);
    expect(liste[0].vorschlaege).toEqual([]);
    expect(liste[1].vorschlaege.map((v) => v.artikel)).toEqual(["Butter 1kg", "Butter 250g"]);
    expect(liste[0]).toMatchObject({ schluessel: "salz", anzahl: 115, rezepteAnzahl: 98, weitere: 81 });
  });

  it("gleich häufige Bezeichnungen nach dem Alphabet", () => {
    const liste = gruppieren([zeile({ schluessel: "zimt", bezeichnung: "Zimt", anzahl: 3 }), zeile({ schluessel: "anis", bezeichnung: "Anis", anzahl: 3 })]);
    expect(liste.map((z) => z.bezeichnung)).toEqual(["Anis", "Zimt"]);
  });

  it("filtert nach Suche und nach «mit Vorschlag»", () => {
    const liste = gruppieren([zeile({}), zeile({ schluessel: "butter", bezeichnung: "Butter", rang: 1, artikel_id: "a1", artikel: "Butter 1kg", aehnlichkeit: 1 })]);
    expect(filtern(liste, { suche: "", treffer: "mit" }).map((z) => z.bezeichnung)).toEqual(["Butter"]);
    expect(filtern(liste, { suche: "", treffer: "ohne" }).map((z) => z.bezeichnung)).toEqual(["Salz"]);
    expect(filtern(liste, { suche: "sal", treffer: "" }).map((z) => z.bezeichnung)).toEqual(["Salz"]);
  });
});

describe("Zutaten verknüpfen: Texte", () => {
  it("Umfang in Ein- und Mehrzahl", () => {
    expect(umfangText(115, 98)).toBe("115 Zutaten in 98 Rezepten");
    expect(umfangText(1, 1)).toBe("1 Zutat in 1 Rezept");
  });
  it("nennt die Rezepte, bei mehr als fünf den Rest als Zahl", () => {
    expect(rezepteText(["Jus", "Sugo"], 2)).toBe("Jus, Sugo");
    expect(rezepteText(["A", "B", "C", "D", "E"], 98)).toBe("A, B, C, D, E und 93 weitere");
  });
  it("Zähler für den Einkauf, mit Tausenderzeichen", () => {
    expect(standText({ zutaten: 1087, verknuepft: 480 })).toBe("480 von 1’087 Zutaten der Saison verknüpft");
    expect(standText(null)).toBe("[Zutaten] der Saison verknüpft");
  });
});
