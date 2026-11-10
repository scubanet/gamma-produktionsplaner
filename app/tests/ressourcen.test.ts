import { describe, expect, it } from "vitest";
import { betrag, chf, dbStatus, geraetDaten, monatText, personalDaten, prozent } from "../lib/ressourcen";
import { FELDER, formularAus, werteAus } from "../lib/stammdaten";

describe("Ressourcen", () => {
  it("Beträge, Prozent, Monat", () => {
    expect(chf(4443)).toBe("CHF 4’443.00");
    expect(chf(-1344.5)).toBe("− CHF 1’344.50");
    expect(chf(null)).toBe("[Preis]");
    expect(chf(null, "[Umsatz]")).toBe("[Umsatz]");
    expect(prozent(37.6)).toBe("37.6 %");
    expect(prozent(null)).toBe("[%]");
    expect(prozent(null, "[DB]")).toBe("[DB]");
    expect(monatText("2026-12-01")).toBe("Dezember 2026");
    expect(monatText(null)).toBe("[Monat]");
  });

  it("Personal: Eingaben prüfen", () => {
    const f = { id: null, rolle: "Service", eigen: "8", freelancer: "3", stunden: "6,5", einsatz: "17:30–23:30", bemerkung: "" };
    expect(personalDaten(f)).toEqual({ daten: { rolle: "Service", anzahl_eigen: 8, anzahl_freelancer: 3, stunden_pro_person: 6.5, einsatz: "17:30–23:30", bemerkung: null } });
    expect(personalDaten({ ...f, eigen: "", freelancer: "" })).toHaveProperty("fehler");
    expect(personalDaten({ ...f, stunden: "0" })).toHaveProperty("fehler");
    expect(personalDaten({ ...f, stunden: "25" })).toHaveProperty("fehler");
    expect(personalDaten({ ...f, rolle: " " })).toHaveProperty("fehler");
    expect(personalDaten({ ...f, eigen: "", freelancer: "2" })).toMatchObject({ daten: { anzahl_eigen: 0, anzahl_freelancer: 2 } });
  });

  it("Gerät und Beträge von Hand", () => {
    expect(geraetDaten({ id: null, geraetId: "g1", anzahl: "2", bemerkung: " mobil " })).toEqual({ daten: { geraet_id: "g1", anzahl: 2, bemerkung: "mobil" } });
    expect(geraetDaten({ id: null, geraetId: "", anzahl: "2", bemerkung: "" })).toHaveProperty("fehler");
    expect(geraetDaten({ id: null, geraetId: "g1", anzahl: "0", bemerkung: "" })).toHaveProperty("fehler");
    expect(betrag("")).toBeNull();
    expect(betrag("1’250.50")).toBe(1250.5);
    expect(betrag("12,5")).toBe(12.5);
    expect(betrag("-3")).toBeUndefined();
    expect(betrag("1.234")).toBeUndefined();
  });

  it("Deckungsbeitrag gegen Zielwert", () => {
    expect(dbStatus(37.6, 35)).toEqual({ pill: "ok", text: "Ziel erreicht" });
    expect(dbStatus(30, 35)).toEqual({ pill: "warn", text: "unter Ziel" });
    expect(dbStatus(null, 35).pill).toBe("neutral");
    expect(dbStatus(30, null).pill).toBe("neutral");
  });
});

describe("Stammdaten", () => {
  it("Lohnsatz: Pflichtfelder, Beträge, leer wird null", () => {
    const f = { rolle: "Koch", chf_pro_h: "48", chf_pro_h_freelancer: "", gueltig_ab: "2026-11-01", quelle: " Lohnbuchhaltung " };
    expect(werteAus(FELDER.lohnsatz, f)).toEqual({ werte: { rolle: "Koch", chf_pro_h: 48, chf_pro_h_freelancer: null, gueltig_ab: "2026-11-01", quelle: "Lohnbuchhaltung" } });
    expect(werteAus(FELDER.lohnsatz, { ...f, rolle: "" })).toHaveProperty("fehler");
    expect(werteAus(FELDER.lohnsatz, { ...f, chf_pro_h: "abc" })).toHaveProperty("fehler");
    expect(werteAus(FELDER.lohnsatz, { ...f, gueltig_ab: "01.11.2026" })).toHaveProperty("fehler");
  });

  it("Strompreis mit 4 Nachkommastellen", () => {
    expect(werteAus(FELDER.energiepreis, { gueltig_ab: "2026-01-01", chf_pro_kwh: "0.2874" })).toEqual({ werte: { gueltig_ab: "2026-01-01", chf_pro_kwh: 0.2874 } });
    expect(werteAus(FELDER.energiepreis, { gueltig_ab: "2026-01-01", chf_pro_kwh: "0.28741" })).toHaveProperty("fehler");
    expect(werteAus(FELDER.lohnsatz, { rolle: "Koch", chf_pro_h: "48.123", chf_pro_h_freelancer: "", gueltig_ab: "2026-11-01", quelle: "" })).toHaveProperty("fehler");
  });

  it("Gerät: Formular aus Zeile und zurück", () => {
    const z = { id: "g", name: "Combi-Steamer", kapazitaet: null, anzahl_eigen: 2, mietbar: false, leistung_kw: 18.5, mietpreis_chf_tag: null };
    const f = formularAus(FELDER.geraet, z);
    expect(f).toEqual({ name: "Combi-Steamer", kapazitaet: "", anzahl_eigen: "2", mietbar: false, leistung_kw: "18.5", mietpreis_chf_tag: "" });
    expect(werteAus(FELDER.geraet, f)).toEqual({ werte: { name: "Combi-Steamer", kapazitaet: null, anzahl_eigen: 2, mietbar: false, leistung_kw: 18.5, mietpreis_chf_tag: null } });
    expect(formularAus(FELDER.geraet, null).mietbar).toBe(true);
    expect(werteAus(FELDER.geraet, { ...f, anzahl_eigen: "1.5" })).toHaveProperty("fehler");
  });
});
