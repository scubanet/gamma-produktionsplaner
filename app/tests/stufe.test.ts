import { describe, expect, it } from "vitest";
import { hauptnav, seitenTabs, unternav } from "../lib/navigation";
import { darf, ohnePreis, sichtbar, stufeAus, stufeLabel } from "../lib/stufe";

describe("Stufen", () => {
  it("Küche plant nicht und sieht keine Preise; Admin und Benutzer beides", () => {
    expect([darf("kueche", "planen"), darf("kueche", "preise")]).toEqual([false, false]);
    expect([darf("benutzer", "planen"), darf("benutzer", "preise")]).toEqual([true, true]);
    expect([darf("admin", "planen"), darf("admin", "preise")]).toEqual([true, true]);
  });
  it("Küche sieht keine Offerten, Rentabilität, Ressourcen, Stammdaten, Benutzer und keine Seiten zum Zuordnen oder Bearbeiten", () => {
    for (const p of ["/offerten/", "/offerten/bearbeiten/", "/rentabilitaet/", "/ressourcen/", "/stammdaten/", "/benutzer/", "/einkauf/zuordnen/", "/einkauf/zutaten/", "/einkauf/lieferanten/", "/rezepte/bearbeiten/", "/anlaesse/karte/"]) {
      expect(sichtbar("kueche", p), p).toBe(false);
      expect(sichtbar("benutzer", p), p).toBe(true);
    }
    for (const p of ["/", "/produktion/", "/produktion/wellen/", "/produktion/aufwand/", "/kueche/", "/lager/", "/einkauf/", "/rezepte/", "/katalog/", "/systemzuteilung/", "/anlaesse/", "/anlaesse/bearbeiten/"]) {
      expect(sichtbar("kueche", p), p).toBe(true);
    }
  });
  it("Unbekannte Antwort der Datenbank gilt als tiefste Stufe", () => {
    expect([stufeAus("admin"), stufeAus("benutzer"), stufeAus("kueche"), stufeAus("scannen"), stufeAus(null), stufeAus("chef")]).toEqual(["admin", "benutzer", "kueche", "scannen", "scannen", "scannen"]);
    expect(stufeLabel("kueche")).toBe("Küche");
    expect(stufeLabel("scannen")).toBe("Scannen");
  });
  it("Scannen plant nicht, sieht keine Preise und nur Scannen, Packliste und Nachschlagen", () => {
    expect([darf("scannen", "planen"), darf("scannen", "preise")]).toEqual([false, false]);
    for (const p of ["/", "/produktion/", "/kueche/", "/lager/", "/einkauf/", "/rezepte/", "/katalog/", "/systemzuteilung/", "/anlaesse/", "/offerten/", "/benutzer/", "/stammdaten/", "/eine-neue-seite/", "/einkauf/zutaten/"]) {
      expect(sichtbar("scannen", p), p).toBe(false);
    }
    for (const p of ["/scannen/", "/packliste/", "/e/", "/e"]) {
      expect(sichtbar("scannen", p), p).toBe(true);
    }
  });
  it("Navigation für Scannen: nur die Packliste", () => {
    expect(hauptnav("/packliste/", "scannen").map((x) => [x.label, x.href, x.current])).toEqual([["Produktion", "/packliste/", true]]);
    expect(unternav("/packliste/", "scannen")).toEqual([]);
    expect(seitenTabs("/einkauf/", "scannen")).toEqual([]);
  });
  it("Navigation für Küche: vier Bereiche, Verkauf führt zu den Anlässen", () => {
    expect(hauptnav("/kueche/", "kueche").map((x) => [x.label, x.href, x.current])).toEqual([
      ["Leitstand", "/", false], ["Verkauf", "/anlaesse/", false], ["Produktion", "/produktion/", true], ["Küche", "/rezepte/", false],
    ]);
    expect(unternav("/kueche/", "kueche").map((x) => x.label)).toEqual(["Produktionsplan", "Einkauf", "Küchenpass", "Lager", "Packliste"]);
    // Verkauf hat für Küche nur noch eine Seite: keine Tabs.
    expect(unternav("/anlaesse/", "kueche")).toEqual([]);
    // Einkauf hat für Küche nur die Liste: keine Ansichten.
    expect(seitenTabs("/einkauf/", "kueche")).toEqual([]);
    expect(seitenTabs("/produktion/", "kueche").map((x) => x.label)).toEqual(["Liste", "Wellen", "Aufwand aus Rezepten"]);
  });
  it("Ohne Stufe und für Benutzer bleibt die Navigation wie bisher", () => {
    expect(hauptnav("/", "benutzer")).toEqual(hauptnav("/"));
    expect(unternav("/einkauf/", "admin")).toEqual(unternav("/einkauf/"));
    expect(seitenTabs("/einkauf/", "benutzer")).toEqual(seitenTabs("/einkauf/"));
  });
  it("Herleitung ohne Preise: Beträge fallen weg, Mengen und Namen bleiben", () => {
    expect(ohnePreis("Preiselbeeren: 2 kg × CHF 9.50 = CHF 19.00")).toBe("Preiselbeeren: 2 kg");
    expect(ohnePreis("3 Zutaten × Faktor 2.5; Kosten CHF 12.00")).toBe("3 Zutaten × Faktor 2.5");
    expect(ohnePreis("3 Zutaten; Kosten [Preis], weil unvollständig")).toBe("3 Zutaten");
    expect(ohnePreis("1.2 kg + 5 % Verlust; [Preis]")).toBe("1.2 kg + 5 % Verlust");
    // Unbekannte Form mit Betrag: lieber nichts zeigen.
    expect(ohnePreis("Total CHF 5.00")).toBe("–");
    expect(ohnePreis(null)).toBe("–");
  });
});
