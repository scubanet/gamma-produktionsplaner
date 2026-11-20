import { describe, expect, it } from "vitest";
import { ablaufStatus, ablaufText, bedarfProSpiel, bedarfsEinheit, bestandFiltern, einheitenVon, einlagernEingabe, herkunftText, heuteSchweiz, kennzahlen, produktCode, type Bestand, type Einheit, type LagerBedarf } from "../lib/lager";

const b = (p: Partial<Bestand>): Bestand => ({
  beutel: 4, beutel_abgelaufen: 0, einheit: "kg", fruehestes_datum: "2026-12-29", kategorie: "Sauce", lagerung: "0–2 °C", menge: 8, menge_abgelaufen: 0,
  produkt: "Portweinjus", produkt_code: "P0123", produkt_id: "p1", produkt_nr: 123, tage_bis_ablauf: 9, ...p,
});

describe("Lager: Ablauf und Herkunft", () => {
  it("beschreibt die Tage bis zum Verbrauchsdatum", () => {
    expect(ablaufText(3)).toBe("in 3 Tagen");
    expect(ablaufText(1)).toBe("in 1 Tag");
    expect(ablaufText(0)).toBe("heute");
    expect(ablaufText(-1)).toBe("seit 1 Tag abgelaufen");
    expect(ablaufText(-4)).toBe("seit 4 Tagen abgelaufen");
    expect(ablaufText(null)).toBe("–");
  });
  it("färbt abgelaufen kritisch und bald gelb", () => {
    expect([ablaufStatus(-1), ablaufStatus(0), ablaufStatus(3), ablaufStatus(4), ablaufStatus(null)]).toEqual(["critical", "warn", "warn", "ok", "neutral"]);
  });
  it("nennt die Herkunft", () => {
    expect(herkunftText({ welle_nr: 2 })).toBe("Welle 2");
    expect(herkunftText({ welle_nr: null })).toBe("ohne Welle eingelagert");
  });
});

describe("Lager: Bestand", () => {
  const zeilen = [b({}), b({ produkt: "Kartoffelgratin", produkt_code: "P0442", produkt_id: "p2", kategorie: "Stärkebeilage", tage_bis_ablauf: 2 }), b({ produkt: "Fond", produkt_id: "p3", beutel: 0, menge: 0, tage_bis_ablauf: null, beutel_abgelaufen: 3 })];
  it("filtert nach Suche und Ablauf", () => {
    expect(bestandFiltern(zeilen, { suche: "p0442", ablauf: "" }).map((z) => z.produkt)).toEqual(["Kartoffelgratin"]);
    expect(bestandFiltern(zeilen, { suche: "", ablauf: "bald" }).map((z) => z.produkt)).toEqual(["Kartoffelgratin"]);
    expect(bestandFiltern(zeilen, { suche: "", ablauf: "abgelaufen" }).map((z) => z.produkt)).toEqual(["Fond"]);
    expect(bestandFiltern(zeilen, { suche: "", ablauf: "" })).toHaveLength(3);
  });
  it("zählt Beutel, Produkte mit Bestand, bald ablaufende und abgelaufene", () => {
    expect(kennzahlen(zeilen)).toEqual({ beutel: 8, produkte: 2, bald: 1, abgelaufen: 3 });
    // Ein Produkt in zwei Einheiten zählt bei «bald» einmal.
    expect(kennzahlen([b({ tage_bis_ablauf: 1 }), b({ einheit: "l", tage_bis_ablauf: 2 })]).bald).toBe(1);
  });
  it("filtert nach Lagerart und kennt die Einheit des Bedarfs", () => {
    expect(bestandFiltern([b({}), b({ produkt: "Jus", lagerung: "TK −18 °C" }), b({ produkt: "Brot", lagerung: null })], { suche: "", ablauf: "", lagerart: "TK −18 °C" }).map((z) => z.produkt)).toEqual(["Jus"]);
    const z = (p: Partial<LagerBedarf>) => ({ komponente_id: "k1", einheit: "l", ...p }) as LagerBedarf;
    expect(bedarfsEinheit([z({}), z({})], "k1")).toBe("l");
    expect(bedarfsEinheit([z({}), z({ einheit: "kg" })], "k1")).toBeNull();
    expect(bedarfsEinheit([z({})], "k2")).toBeNull();
    expect(produktCode(42)).toBe("P0042");
    expect(produktCode(null)).toBe("[Produkt]");
  });
  it("ordnet die Beutel eines Produkts nach Verbrauchsdatum", () => {
    const e = (p: Partial<Einheit>) => ({ produkt_id: "p1", einheit: "kg", verbrauchen_bis: "2026-12-29", seriennummer: "AAAAAAAA", ...p }) as Einheit;
    const alle = [e({ seriennummer: "ZZZZZZZZ" }), e({ verbrauchen_bis: "2026-12-27", seriennummer: "BBBBBBBB" }), e({ produkt_id: "p2" }), e({ einheit: "l" })];
    expect(einheitenVon(alle, "p1", "kg").map((x) => x.seriennummer)).toEqual(["BBBBBBBB", "ZZZZZZZZ"]);
  });
});

describe("Lager: Produkt einlagern", () => {
  const f = { komponente: "k1", anzahl: "4", menge: "2,5", einheit: "kg", produziert_am: "2026-12-20", verbrauchen_bis: "" };
  it("bildet die Argumente für die Datenbank", () => {
    expect(einlagernEingabe(f, "2026-12-22")).toEqual({ p_komponente: "k1", p_anzahl: 4, p_menge: 2.5, p_einheit: "kg", p_produziert_am: "2026-12-20" });
    expect(einlagernEingabe({ ...f, verbrauchen_bis: "2026-12-30" }, "2026-12-22")).toMatchObject({ p_verbrauchen_bis: "2026-12-30" });
  });
  it("lehnt ein Produktionsdatum in der Zukunft und unvollständige Angaben ab", () => {
    expect(einlagernEingabe({ ...f, produziert_am: "2026-12-23" }, "2026-12-22")).toHaveProperty("fehler");
    expect(einlagernEingabe({ ...f, komponente: "" }, "2026-12-22")).toHaveProperty("fehler");
    expect(einlagernEingabe({ ...f, anzahl: "0" }, "2026-12-22")).toHaveProperty("fehler");
    expect(einlagernEingabe({ ...f, menge: "1.2345" }, "2026-12-22")).toHaveProperty("fehler");
    expect(einlagernEingabe({ ...f, einheit: "g" }, "2026-12-22")).toHaveProperty("fehler");
    expect(einlagernEingabe({ ...f, verbrauchen_bis: "2026-12-19" }, "2026-12-22")).toHaveProperty("fehler");
  });
  it("nimmt für «heute» den Tag in der Schweiz", () => {
    expect(heuteSchweiz(new Date("2026-12-22T23:30:00Z"))).toBe("2026-12-23");
    expect(heuteSchweiz(new Date("2026-12-22T12:00:00Z"))).toBe("2026-12-22");
  });
});

describe("Lager: Bedarf der Spiele", () => {
  it("fasst pro Spiel zusammen, nach Datum", () => {
    const z = (p: Partial<LagerBedarf>) => ({ anlass: "Spengler Cup", service: "Spiel 1", service_id: "s1", datum: "2026-12-26", reihenfolge: 1, gedeckt: false, ...p }) as LagerBedarf;
    const r = bedarfProSpiel([z({}), z({ gedeckt: true }), z({ service: "Spiel 2", service_id: "s2", datum: "2026-12-27", reihenfolge: 2, gedeckt: true }), z({ service_id: null })]);
    expect(r).toEqual([
      { serviceId: "s1", titel: "Spengler Cup · Spiel 1", datum: "2026-12-26", reihenfolge: 1, produkte: 2, gedeckt: 1 },
      { serviceId: "s2", titel: "Spengler Cup · Spiel 2", datum: "2026-12-27", reihenfolge: 2, produkte: 1, gedeckt: 1 },
    ]);
  });
});
