import { describe, expect, it } from "vitest";
import { passLagerText, passRezeptHref, standText, standUebernehmen } from "../lib/kueche";

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
  it("nennt Konservierung, Lagerart und «haltbar bis»", () => {
    expect(passLagerText(z, "2026-12-24")).toBe("SF · SV · 0–2 °C · haltbar bis spätestens 24.12.2026");
  });
  it("zeigt Platzhalter, wo etwas fehlt", () => {
    expect(passLagerText(undefined, null)).toBe("[Lagerung] · haltbar bis spätestens [Datum]");
    expect(passLagerText({ ...z, produktion: [], lager_0_2: false }, "2026-12-24")).toBe("[Lagerung] · haltbar bis spätestens 24.12.2026");
  });
  it("führt zur Rezeptkarte mit Rückweg zur Welle", () => {
    expect(passRezeptHref("rinds ragù", 2)).toBe("/rezepte/?r=rinds%20rag%C3%B9&von=kueche&welle=2");
  });
});
