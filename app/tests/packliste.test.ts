import { describe, expect, it } from "vitest";
import { entscheidOptionen, farbePill, gewichtText, kennzahlen, kisteGewichtText, kisteTitel, kistenOhneAnkunft, kistenZustand, logistikLuecken, logistikText, standText, transportartText, type Kiste, type Logistik, type Zeile } from "../lib/packliste";
import { nachschlagenPfad, scanCodeLesen } from "../lib/scan-code";

describe("Scan-Code lesen", () => {
  it("liest den QR-Code eines Beutels und einer Kiste", () => {
    expect(scanCodeLesen("https://gamma.atoll-os.com/e/?p=123&s=K7M4X2PA")).toEqual({ art: "beutel", seriennummer: "K7M4X2PA", produktNr: 123 });
    expect(scanCodeLesen("https://gamma.atoll-os.com/e/?k=K-7BMHPP")).toEqual({ art: "kiste", code: "K-7BMHPP" });
    expect(scanCodeLesen("https://gamma.atoll-os.com/e?s=k7m4x2pa")).toEqual({ art: "beutel", seriennummer: "K7M4X2PA", produktNr: null });
  });
  it("liest die lesbare Zeile, die blosse Seriennummer und den Kistencode, auch klein und mit Leerzeichen", () => {
    expect(scanCodeLesen("P0123 · K7M4X2PA")).toEqual({ art: "beutel", seriennummer: "K7M4X2PA", produktNr: 123 });
    expect(scanCodeLesen(" k7m4x2pa ")).toEqual({ art: "beutel", seriennummer: "K7M4X2PA", produktNr: null });
    expect(scanCodeLesen("k-7bmhpp")).toEqual({ art: "kiste", code: "K-7BMHPP" });
  });
  it("fremde Adressen und falsche Formen sind unbekannt", () => {
    for (const t of ["", "https://example.com/e/?s=K7M4X2PA", "http://gamma.atoll-os.com/e/?s=K7M4X2PA", "https://gamma.atoll-os.com/x/?s=K7M4X2PA", "https://gamma.atoll-os.com.boese.ch/e/?k=K-7BMHPP",
      "K7M4X2P", "K7M4X2PO", "K-7BMHP", "K-7BMHPPP", "javascript:alert(1)", "https://gamma.atoll-os.com/e/"]) {
      expect(scanCodeLesen(t), t).toEqual({ art: "unbekannt" });
    }
  });
  it("bildet die Adresse zum Nachschlagen", () => {
    expect(nachschlagenPfad({ art: "kiste", code: "K-7BMHPP" })).toBe("/e/?k=K-7BMHPP");
    expect(nachschlagenPfad({ art: "beutel", seriennummer: "K7M4X2PA", produktNr: 123 })).toBe("/e/?p=123&s=K7M4X2PA");
    expect(nachschlagenPfad({ art: "beutel", seriennummer: "K7M4X2PA", produktNr: null })).toBe("/e/?s=K7M4X2PA");
    expect(nachschlagenPfad({ art: "unbekannt" })).toBeNull();
  });
});

const z = (p: Partial<Zeile>) => ({ status: "offen", zu_klaeren: 0, ...p }) as Zeile;
const k = (p: Partial<Kiste>) => ({ zustand: "offen", beutel: 2, laufnummer: 1, kisten_im_spiel: 3, ...p }) as Kiste;

describe("Packliste", () => {
  it("benennt Stand und Zustand; «fehlt noch» ist kein Fehler", () => {
    expect(standText("erreicht")).toEqual({ text: "gepackt", pill: "ok" });
    expect(standText("offen")).toEqual({ text: "fehlt noch", pill: "info" });
    expect(standText("zusaetzlich").text).toBe("zusätzlich");
    expect(standText("ohne_soll").text).toBe("[Menge]");
    expect(kistenZustand("aufgeloest").text).toBe("aufgelöst");
    expect([farbePill("gruen"), farbePill("gelb"), farbePill("rot")]).toEqual(["ok", "warn", "critical"]);
  });
  it("zählt Produkte und Kisten; aufgelöste Kisten zählen nicht", () => {
    const zeilen = [z({ status: "erreicht" }), z({}), z({ status: "ohne_soll" }), z({ status: "zusaetzlich", zu_klaeren: 2 })];
    const kisten = [k({}), k({ zustand: "verladen" }), k({ zustand: "angekommen" }), k({ zustand: "aufgeloest" })];
    expect(kennzahlen(zeilen, kisten)).toEqual({ imSoll: 3, gepackt: 1, zusaetzlich: 1, zuKlaeren: 2, kisten: 3, verladen: 2, angekommen: 1 });
  });
  it("zeigt das Gewicht einer Kiste mit Tara oder mit Vermerk", () => {
    expect(gewichtText(12.4)).toBe("12.40 kg");
    expect(gewichtText(null)).toBe("[Gewicht]");
    expect(kisteGewichtText({ beutel: 3, brutto_kg: 13.94, netto_kg: 12.4 })).toBe("13.94 kg");
    expect(kisteGewichtText({ beutel: 3, brutto_kg: null, netto_kg: 12.4 })).toBe("12.40 kg ohne Tara");
    expect(kisteGewichtText({ beutel: 0, brutto_kg: null, netto_kg: 0 })).toBe("–");
    expect(kisteGewichtText(undefined)).toBe("–");
    expect(kisteTitel(k({ laufnummer: 2, kisten_im_spiel: 5 }))).toBe("Kiste 2 von 5");
  });
  it("Abschluss: nur Kisten mit Inhalt ohne Ankunfts-Scan brauchen einen Entscheid; zurück ins Lager nur für offene", () => {
    const kisten = [k({ laufnummer: 1 }), k({ laufnummer: 2, zustand: "verladen" }), k({ laufnummer: 3, zustand: "angekommen" }), k({ laufnummer: 4, beutel: 0 }), k({ laufnummer: 5, zustand: "aufgeloest" })];
    expect(kistenOhneAnkunft(kisten).map((x) => x.laufnummer)).toEqual([1, 2]);
    expect(entscheidOptionen("offen").map((o) => o.value)).toEqual(["verbraucht", "lager", "entsorgt"]);
    expect(entscheidOptionen("verladen").map((o) => o.value)).toEqual(["verbraucht", "entsorgt"]);
  });
});

const l = (p: Partial<Logistik>) => ({
  transportart: "gekühlt", sortierung: 1, produkte: 2, produkte_stueck: 0, produkte_ohne_menge: 0, produkte_ohne_fuellmenge: 0, produkte_ohne_tara: 0,
  soll_kisten: 4, soll_netto_kg: 18.7, soll_brutto_kg: 24.86, ist_kisten: 1, ist_beutel: 3, ist_beutel_stueck: 0, ist_netto_kg: 6, ist_kisten_ohne_tara: 0, ist_brutto_kg: 7.54, liter_annahme: false, ...p,
}) as Logistik;

describe("Gewicht für die Logistik", () => {
  it("nennt die Transportart, auch wenn die Lagerart fehlt", () => {
    expect([transportartText("gekühlt"), transportartText("tiefgekühlt"), transportartText("ungekühlt"), transportartText(null)]).toEqual(["Gekühlt", "Tiefgekühlt", "Ungekühlt", "Ohne Lagerart"]);
  });
  it("listet, was am Gewicht fehlt", () => {
    expect(logistikLuecken(l({}))).toEqual([]);
    expect(logistikLuecken(l({ produkte_stueck: 1, produkte_ohne_fuellmenge: 3, produkte_ohne_tara: 20, ist_kisten_ohne_tara: 1, liter_annahme: true }))).toEqual([
      "1 Produkt in Stück ohne Gewicht", "3 Produkte ohne Füllmenge pro Kiste am Rezept", "20 Produkte ohne Tara für den Planwert", "1 gepackte Kiste ohne Tara", "Annahme: 1 l = 1 kg",
    ]);
  });
  it("bildet den Text zum Weitergeben; Unvollständiges bleibt Platzhalter", () => {
    const text = logistikText({ anlass: "Spengler Cup", service: "Spiel 1", datum: "2026-12-26" }, [
      l({ transportart: null, sortierung: 4, soll_kisten: null, soll_netto_kg: 290.455, soll_brutto_kg: null, ist_kisten: 0, ist_netto_kg: 0, ist_brutto_kg: 0, produkte_ohne_tara: 20 }),
      l({}),
    ]);
    expect(text).toBe(
      [
        "Spengler Cup · Spiel 1 · 26.12.2026",
        "Gewicht der Speisen in IFCO-Kisten (ohne Geschirr, Geräte und Getränke)",
        "",
        "Gekühlt:",
        "  Plan: rund 4 Kisten, 18.70 kg ohne Tara, 24.86 kg mit Tara",
        "  Gepackt: 1 Kiste, 6.00 kg ohne Tara, 7.54 kg mit Tara",
        "Ohne Lagerart:",
        "  Plan: rund [Kisten], 290.46 kg ohne Tara, [Gewicht] mit Tara",
        "  Gepackt: 0 Kisten, 0.00 kg ohne Tara, 0.00 kg mit Tara",
        "  Hinweis: 20 Produkte ohne Tara für den Planwert",
      ].join("\n"),
    );
  });
});
