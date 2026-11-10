import { describe, expect, it } from "vitest";
import { datumGueltig, hinweisPill, planNachWelle, vorschlagNachTag, type PlanZeile, type Vorschlag } from "../lib/wellen";
import { bestellschlussText, fehlerText, formAus, lieferantDaten, liefertageText, nachLieferant, type ArtikelZeile, type Lieferant } from "../lib/einkauf";

describe("Wellen", () => {
  const v = (p: Partial<Vorschlag>) => ({ komponente: "Rindsentrecote", kategorie: "Fleisch", produktion_am: "2026-12-24", ...p }) as Vorschlag;
  it("Vorschlag: ein Produktionstag = eine Welle, nach Datum nummeriert, darin nach Kategorie", () => {
    const w = vorschlagNachTag([
      v({ produktion_am: "2027-01-20", komponente: "Jus", kategorie: "Sauce" }),
      v({ komponente: "Zander", kategorie: "Fisch" }),
      v({}),
      v({ produktion_am: "2027-01-20" }),
    ]);
    expect(w.map((x) => [x.nr, x.datum, x.zeilen.map((z) => z.komponente)])).toEqual([
      [1, "2026-12-24", ["Zander", "Rindsentrecote"]],
      [2, "2027-01-20", ["Rindsentrecote", "Jus"]],
    ]);
  });

  it("Plan: nach Welle, Prüfhinweise gezählt", () => {
    const p = (x: Partial<PlanZeile>) => ({ welle_id: "w1", nummer: 1, datum: "2026-12-24", spaetestens_am: "2026-12-24", bemerkung: null, komponente: "A", kategorie: "K", hinweis_farbe: null, ...x }) as PlanZeile;
    const w = planNachWelle([p({ welle_id: "w2", nummer: 2, hinweis_farbe: "rot" }), p({ hinweis_farbe: "gelb" }), p({ komponente: "B" }), p({ welle_id: "w2", nummer: 2, komponente: "C", hinweis_farbe: "gelb" })]);
    expect(w.map((x) => [x.nummer, x.zeilen.length, x.rot, x.gelb])).toEqual([[1, 2, 0, 1], [2, 2, 1, 1]]);
  });

  it("Prüfhinweis-Farben und Datum", () => {
    expect(hinweisPill("rot")).toBe("critical");
    expect(hinweisPill("gelb")).toBe("warn");
    expect(hinweisPill(null)).toBeNull();
    expect(datumGueltig("2026-12-24")).toBe(true);
    expect(datumGueltig("24.12.2026")).toBe(false);
    expect(datumGueltig("")).toBe(false);
  });
});

describe("Lieferant", () => {
  const l: Lieferant = { id: "l1", name: "Marinello", liefertage: [1, 2, 3, 4, 5, 6], bestellschluss_stunde: 14, vorlauf_tage: 1, telefon: null, email: null, bemerkung: null, aktiv: true };

  it("Liefertage und Bestellschluss als Text", () => {
    expect(liefertageText([5, 1, 3])).toBe("Mo, Mi, Fr");
    expect(liefertageText([])).toBe("[Liefertage]");
    expect(bestellschlussText("2026-12-22T14:00:00")).toBe("22.12.2026, 14 Uhr");
    expect(bestellschlussText("2026-12-22 09:00:00")).toBe("22.12.2026, 9 Uhr");
    expect(bestellschlussText(null)).toBe("[Bestelltermin]");
  });

  it("Formular hin und zurück, Prüfung der Eingaben", () => {
    expect(lieferantDaten(formAus(l))).toEqual({ daten: { name: "Marinello", liefertage: [1, 2, 3, 4, 5, 6], bestellschluss_stunde: 14, vorlauf_tage: 1, telefon: null, email: null, bemerkung: null, aktiv: true } });
    expect(formAus(null)).toMatchObject({ id: null, bestellschluss: "12", vorlauf: "1", liefertage: [], aktiv: true });
    const f = formAus(l);
    expect(lieferantDaten({ ...f, name: " " })).toHaveProperty("fehler");
    expect(lieferantDaten({ ...f, bestellschluss: "24" })).toHaveProperty("fehler");
    expect(lieferantDaten({ ...f, vorlauf: "1.5" })).toHaveProperty("fehler");
    expect(lieferantDaten({ ...f, liefertage: [5, 1] })).toMatchObject({ daten: { liefertage: [1, 5] } });
  });

  it("Bestellliste nach Lieferant, ohne Lieferant am Schluss, darin nach Bestellschluss", () => {
    const z = (p: Partial<ArtikelZeile>) => ({ lieferant: "Marinello", artikel: "Fenchel", bestellen_bis: null, sortierung: 1, ...p }) as ArtikelZeile;
    const g = nachLieferant([
      z({ lieferant: null, artikel: "X" }),
      z({ artikel: "Spät", bestellen_bis: "2027-01-18T14:00:00" }),
      z({ artikel: "Früh", bestellen_bis: "2026-12-22T14:00:00" }),
      z({ lieferant: "Bell", artikel: "Entrecote" }),
    ]);
    expect(g.map((x) => [x.titel, x.zeilen.map((y) => y.artikel)])).toEqual([["Bell", ["Entrecote"]], ["Marinello", ["Früh", "Spät"]], ["[Lieferant]", ["X"]]]);
  });

  it("Datenbankmeldungen", () => {
    expect(fehlerText({ code: "23505", message: 'duplicate key "lieferant_name_key"' })).toBe("Einen Lieferanten mit diesem Namen gibt es schon.");
  });
});
