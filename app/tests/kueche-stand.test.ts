import { describe, expect, it } from "vitest";
import { passHaltbar, passKonservierung, passRezeptHref, standText, standUebernehmen } from "../lib/kueche";

describe("Küchenpass: Stand nachladen", () => {
  it("nennt die Uhrzeit des letzten Ladens", () => {
    expect(standText(new Date(2026, 11, 24, 9, 5))).toBe("Stand 09:05");
    expect(standText(null)).toBe("Stand [Zeit]");
  });

  it("übernimmt Häkchen von anderen Geräten", () => {
    const geladen = new Map([["a", "erledigt"], ["b", "erledigt"]]);
    const jetzt = new Map([["a", "offen"]]);
    expect([...standUebernehmen(geladen, jetzt, [])]).toEqual([["a", "erledigt"], ["b", "erledigt"]]);
  });

  it("eine Zeile, die gerade gespeichert wird, behält den Stand auf dem Gerät", () => {
    const geladen = new Map([["a", "offen"], ["b", "erledigt"]]);
    const jetzt = new Map([["a", "erledigt"]]);
    expect(standUebernehmen(geladen, jetzt, ["a"]).get("a")).toBe("erledigt");
    expect(standUebernehmen(geladen, jetzt, ["a"]).get("b")).toBe("erledigt");
  });

  it("wird gerade ein Häkchen entfernt, das die Datenbank noch kennt, bleibt es entfernt", () => {
    const geladen = new Map([["a", "erledigt"]]);
    expect(standUebernehmen(geladen, new Map<string, string>(), ["a"]).has("a")).toBe(false);
  });
});

describe("Küchenpass: Nachladen, das vor dem Speichern gelesen hat", () => {
  it("eine seit dem Start des Nachladens gespeicherte Zeile behält die Antwort des Speicherns", () => {
    // Das Nachladen las «offen», das Speichern ist inzwischen fertig: die Zeile gilt als berührt.
    const geladen = new Map([["a", "offen"], ["b", "erledigt"]]);
    const jetzt = new Map([["a", "erledigt"]]);
    const geschuetzt = new Set([...new Map<string, number>().keys(), ...new Set(["a"])]);
    expect([...standUebernehmen(geladen, jetzt, geschuetzt)]).toEqual([["a", "erledigt"], ["b", "erledigt"]]);
  });
});

describe("Küchenpass: Zeile fürs Etikett", () => {
  const z = { id: "k", produktion: ["SF", "SV"], lager_0_2: true, lager_tk: false, lager_trocken: false, rezept_id: null };
  it("nennt Konservierung und Lagerart, sonst einen Platzhalter", () => {
    expect(passKonservierung(z)).toBe("SF · SV · 0–2 °C");
    expect(passKonservierung(undefined)).toBe("[Lagerung]");
    expect(passKonservierung({ ...z, produktion: [], lager_0_2: false })).toBe("[Lagerung]");
  });
  it("rechnet die Haltbarkeit ab dem Tag des Abhakens", () => {
    expect(passHaltbar({ haltbar_grundlage: "produziert", haltbarkeit_tage: 21, produziert_am: "2026-12-22", produktion_am: "2026-12-24", haltbar_bis: "2027-01-12" }, "2027-01-14"))
      .toBe("produziert 22.12.2026 · haltbar bis 12.01.2027");
  });
  it("offen: nennt das Datum, mit dem gerechnet wurde", () => {
    expect(passHaltbar({ haltbar_grundlage: "geplant", haltbarkeit_tage: 21, produziert_am: null, produktion_am: "2026-12-23", haltbar_bis: "2027-01-13" }, null))
      .toBe("Produktion 23.12.2026 geplant · haltbar bis 13.01.2027");
    expect(passHaltbar({ haltbar_grundlage: "spaetestens", haltbarkeit_tage: 21, produziert_am: null, produktion_am: "2026-12-24", haltbar_bis: "2027-01-14" }, null))
      .toBe("Produktion spätestens 24.12.2026 · haltbar bis 14.01.2027");
  });
  it("zeigt Platzhalter, wo etwas fehlt", () => {
    expect(passHaltbar({ haltbar_grundlage: null, haltbarkeit_tage: null, haltbar_bis: null }, null)).toBe("haltbar bis [Haltbarkeit]");
    expect(passHaltbar({ haltbar_grundlage: null, haltbarkeit_tage: 3, haltbar_bis: null }, null)).toBe("haltbar bis [Datum]");
  });
  it("ohne die neuen Spalten (Migration 40 fehlt) gilt «spätestens» aus dem Vorschlag", () => {
    expect(passHaltbar({}, "2027-01-14")).toBe("haltbar bis spätestens 14.01.2027");
    expect(passHaltbar(undefined, null)).toBe("haltbar bis spätestens [Datum]");
  });
  it("führt zur Rezeptkarte mit Rückweg zur Welle", () => {
    expect(passRezeptHref("rinds ragù", 2)).toBe("/rezepte/?r=rinds%20rag%C3%B9&von=kueche&welle=2");
  });
});
