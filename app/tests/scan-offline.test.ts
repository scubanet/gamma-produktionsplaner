import { describe, expect, it } from "vitest";
import { beutelVorpruefen, istWiederholung, kisteVorpruefen, kistenOffen, nachgesendet, wartetText, type OffenerScan, type Vorrat } from "../lib/scan-offline";
import { kameraFehler } from "../lib/scan-kamera";

const vorrat: Vorrat = {
  kisten: [
    { code: "K-AAAAAA", laufnummer: 1, zustand: "offen", produkt_id: "speck", produkt: "Speck", beutel: 1 },
    { code: "K-BBBBBB", laufnummer: 2, zustand: "offen", produkt_id: null, produkt: null, beutel: 0 },
    { code: "K-CCCCCC", laufnummer: 3, zustand: "verladen", produkt_id: "jus", produkt: "Portweinjus", beutel: 2 },
    { code: "K-DDDDDD", laufnummer: 4, zustand: "aufgeloest", produkt_id: null, produkt: null, beutel: 0 },
  ],
  soll: ["speck", "jus"],
  beutel: [
    { seriennummer: "SPECK222", zustand: "im_lager", kiste: null, produkt_id: "speck", produkt: "Speck" },
    { seriennummer: "SPECK333", zustand: "in_kiste", kiste: "K-AAAAAA", produkt_id: "speck", produkt: "Speck" },
    { seriennummer: "JUSJUS22", zustand: "im_lager", kiste: null, produkt_id: "jus", produkt: "Portweinjus" },
    { seriennummer: "JUSJUS33", zustand: "in_kiste", kiste: "K-CCCCCC", produkt_id: "jus", produkt: "Portweinjus" },
    { seriennummer: "BUTTER22", zustand: "im_lager", kiste: null, produkt_id: "butter", produkt: "Alpenkräuterbutter" },
  ],
};
const ein = (seriennummer: string, kiste: string): OffenerScan => ({ id: seriennummer, art: "einpacken", seriennummer, kiste, service: "s1", zeitpunkt: "2026-12-24T08:00:00Z" });
const kis = (code: string, stufe: "verladen" | "angekommen"): OffenerScan => ({ id: code + stufe, art: "kiste", code, stufe, service: "s1", zeitpunkt: "2026-12-24T08:00:00Z" });
const kurz = (v: { farbe: string; ergebnis: string; buchen: boolean }) => [v.farbe, v.ergebnis, v.buchen];

describe("Scannen ohne Netz: Beutel einpacken", () => {
  it("bucht, was passt, und sagt, dass es noch nicht gesendet ist", () => {
    const v = beutelVorpruefen(vorrat, [], "SPECK222", "K-AAAAAA");
    expect(kurz(v)).toEqual(["gruen", "ok", true]);
    expect(v.meldung).toBe("Speck eingepackt. Noch nicht gesendet.");
  });
  it("bucht nicht, was die Prüfung rot meldet", () => {
    expect(kurz(beutelVorpruefen(vorrat, [], "JUSJUS22", "K-AAAAAA"))).toEqual(["rot", "anderes_produkt", false]);
    expect(kurz(beutelVorpruefen(vorrat, [], "JUSJUS33", "K-AAAAAA"))).toEqual(["rot", "andere_kiste", false]);
    expect(kurz(beutelVorpruefen(vorrat, [], "SPECK222", "K-CCCCCC"))).toEqual(["rot", "kiste_nicht_offen", false]);
    expect(kurz(beutelVorpruefen(vorrat, [], "SPECK222", "K-ZZZZZZ"))).toEqual(["rot", "unbekannt", false]);
  });
  it("zählt einen Beutel nur einmal, auch wenn er erst in der Warteschlange steht", () => {
    expect(kurz(beutelVorpruefen(vorrat, [], "SPECK333", "K-AAAAAA"))).toEqual(["gelb", "schon_in_kiste", false]);
    expect(kurz(beutelVorpruefen(vorrat, [ein("SPECK222", "K-AAAAAA")], "SPECK222", "K-AAAAAA"))).toEqual(["gelb", "schon_in_kiste", false]);
    expect(kurz(beutelVorpruefen(vorrat, [ein("SPECK222", "K-AAAAAA")], "SPECK222", "K-BBBBBB"))).toEqual(["rot", "andere_kiste", false]);
  });
  it("sortenrein gilt auch für eine Kiste, die erst ohne Netz ihren ersten Beutel bekam", () => {
    const offen = [ein("SPECK222", "K-BBBBBB")];
    expect(kurz(beutelVorpruefen(vorrat, offen, "JUSJUS22", "K-BBBBBB"))).toEqual(["rot", "anderes_produkt", false]);
    expect(kurz(beutelVorpruefen(vorrat, [], "JUSJUS22", "K-BBBBBB"))).toEqual(["gruen", "ok", true]);
  });
  it("bucht gelb, was erst die Datenbank beurteilen kann", () => {
    expect(kurz(beutelVorpruefen(vorrat, [], "NEUNEU22", "K-BBBBBB"))).toEqual(["gelb", "unbekannt_vorlaeufig", true]);
    expect(kurz(beutelVorpruefen(vorrat, [], "BUTTER22", "K-BBBBBB"))).toEqual(["gelb", "nicht_im_bedarf", true]);
  });
});

describe("Scannen ohne Netz: Kisten verladen und ankommen", () => {
  it("prüft gegen den Vorrat und die Warteschlange", () => {
    expect(kurz(kisteVorpruefen(vorrat, [], "K-AAAAAA", "verladen"))).toEqual(["gruen", "ok", true]);
    expect(kurz(kisteVorpruefen(vorrat, [], "K-CCCCCC", "verladen"))).toEqual(["rot", "schon_gescannt", false]);
    expect(kurz(kisteVorpruefen(vorrat, [], "K-CCCCCC", "angekommen"))).toEqual(["gruen", "ok", true]);
    expect(kurz(kisteVorpruefen(vorrat, [kis("K-AAAAAA", "verladen")], "K-AAAAAA", "verladen"))).toEqual(["rot", "schon_gescannt", false]);
    expect(kurz(kisteVorpruefen(vorrat, [], "K-DDDDDD", "verladen"))).toEqual(["rot", "kiste_nicht_offen", false]);
    expect(kurz(kisteVorpruefen(vorrat, [], "K-ZZZZZZ", "verladen"))).toEqual(["gelb", "unbekannt_vorlaeufig", true]);
  });
  it("listet, was in der Stufe noch fehlt", () => {
    expect(kistenOffen(vorrat, [], "verladen").map((k) => k.laufnummer)).toEqual([1, 2]);
    expect(kistenOffen(vorrat, [kis("K-AAAAAA", "verladen")], "verladen").map((k) => k.laufnummer)).toEqual([2]);
    expect(kistenOffen(vorrat, [], "angekommen").map((k) => k.laufnummer)).toEqual([1, 2, 3]);
  });
});

describe("Scannen ohne Netz: Antwort auf den nachgesendeten Scan", () => {
  const a = (p: object) => ({ ergebnis: "ok", farbe: "gruen" as const, meldung: "m", ...p });
  it("erledigt ist, was gebucht ist oder schon gebucht war", () => {
    expect(nachgesendet(ein("A", "K"), a({ eingepackt: true }))).toBeNull();
    expect(nachgesendet(ein("A", "K"), a({ eingepackt: true, klaeren: true, ergebnis: "anderes_produkt", farbe: "rot" }))).toBeNull();
    expect(nachgesendet(ein("A", "K"), a({ eingepackt: false, ergebnis: "schon_in_kiste", farbe: "gelb" }))).toBeNull();
    expect(nachgesendet(kis("K", "verladen"), a({ zaehlt: true }))).toBeNull();
    expect(nachgesendet(kis("K", "verladen"), a({ zaehlt: false, ergebnis: "schon_gescannt", farbe: "rot" }))).toBeNull();
  });
  it("was die Datenbank nicht bucht, bleibt mit ihrer Meldung stehen", () => {
    expect(nachgesendet(ein("A", "K"), a({ eingepackt: false, ergebnis: "kiste_nicht_offen", farbe: "rot", meldung: "Kiste ist aufgelöst." }))).toBe("Kiste ist aufgelöst.");
    expect(nachgesendet(ein("A", "K"), a({ eingepackt: false, ergebnis: "entsorgt", farbe: "rot", meldung: "Beutel ist entsorgt." }))).toBe("Beutel ist entsorgt.");
    expect(nachgesendet(kis("K", "verladen"), a({ zaehlt: false, ergebnis: "anderes_spiel", farbe: "rot", meldung: "Kiste gehört zu einem anderen Spiel (Spiel 2)." }))).toBe("Kiste gehört zu einem anderen Spiel (Spiel 2).");
  });
});

describe("Scannen: Zähler, Wiederholung, Kamera", () => {
  it("nennt die Scans, die noch nicht gesendet sind", () => {
    expect(wartetText([])).toBe("");
    expect(wartetText([ein("A", "K")])).toBe("1 Scan noch nicht gesendet");
    expect(wartetText([ein("A", "K"), { ...ein("B", "K"), fehler: "x" }])).toBe("2 Scans noch nicht gesendet, davon 1 mit Fehler");
  });
  it("denselben Code innert drei Sekunden nur einmal", () => {
    expect(istWiederholung({ text: "a", zeit: 1000 }, "a", 3500)).toBe(true);
    expect(istWiederholung({ text: "a", zeit: 1000 }, "a", 4000)).toBe(false);
    expect(istWiederholung({ text: "a", zeit: 1000 }, "b", 1100)).toBe(false);
    expect(istWiederholung(null, "a", 1)).toBe(false);
  });
  it("erklärt, warum die Kamera nicht startet", () => {
    expect(kameraFehler({ name: "NotAllowedError" })).toContain("nicht freigegeben");
    expect(kameraFehler({ name: "NotFoundError" })).toContain("keine Kamera");
    expect(kameraFehler({ name: "NotReadableError" })).toContain("anderen App");
    expect(kameraFehler(new Error("x"))).toContain("von Hand");
  });
});
