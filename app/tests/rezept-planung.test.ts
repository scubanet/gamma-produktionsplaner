import { describe, expect, it } from "vitest";
import { neuerSchritt, rezeptDaten, rezeptFormular, type SchrittRoh } from "../lib/rezept-pflege";
import { durchgangText, fehlendeAngaben, kurzText, minutenText, ortText, serviceText, type PlanungSchritt } from "../lib/rezept-planung";
import type { Rezept } from "../lib/rezepte";

const gratin: Rezept & { gebinde_id: string | null; verpackung: string | null; fuellmenge_g: number | null; service_min_pro_100: number | null; service_rolle: string | null } = {
  id: "r1", slug: "kartoffelgratin", typ: "komponente", name: "Kartoffelgratin", untertitel: null, kategorie: "Beilage", quelle: null,
  basis_portionen: null, portion_g: null, ergibt_g: 1000, status: "entwurf", ergibt_annahme: false, portionen_annahme: false,
  chargengroesse: null, besonderes: null, geaendert_am: "2026-11-14T08:00:00Z",
  gebinde_id: "ifco", verpackung: "GN 1/1 mit Deckel", fuellmenge_g: 12000, service_min_pro_100: 15, service_rolle: "Koch",
};
const gruppen = [{ id: "g1", titel: null, reihenfolge: 1 }];
const schritte: SchrittRoh[] = [
  { id: "s1", gruppe_id: "g1", text: "Garen.", reihenfolge: 1, geraet_id: "steamer", temperatur_c: 160, aktiv_min: 5, unbeaufsichtigt_min: 50, haccp: null, annahme: false, ort: "zentralkueche", rolle: "Koch", ruest_min: 30, menge_pro_durchgang_g: 12000 },
];
const daten = (x: ReturnType<typeof rezeptDaten>) => ("daten" in x ? (x.daten as Record<string, unknown>) : null);

describe("Planung im Rezeptformular", () => {
  it("lädt und speichert Gebinde, Service, Ort, Rolle, Rüstzeit und Durchgang", () => {
    const f = rezeptFormular(gratin, gruppen, [], schritte);
    expect(f).toMatchObject({ gebinde_id: "ifco", fuellmenge_g: "12000", service_min_pro_100: "15", service_rolle: "Koch" });
    expect(f.gruppen[0].schritte[0]).toMatchObject({ ort: "zentralkueche", rolle: "Koch", ruest: "30", durchgang: "12000" });
    const d = daten(rezeptDaten(gratin, f))!;
    expect(d).toMatchObject({ gebinde_id: "ifco", verpackung: "GN 1/1 mit Deckel", fuellmenge_g: 12000, service_min_pro_100: 15, service_rolle: "Koch" });
    const s = (d.gruppen as { schritte: Record<string, unknown>[] }[])[0].schritte[0];
    expect(s).toMatchObject({ ort: "zentralkueche", rolle: "Koch", ruest_min: 30, menge_pro_durchgang_g: 12000 });
  });
  it("leere Angaben bleiben leer, nie geschätzt", () => {
    const f = { ...rezeptFormular(gratin, gruppen, [], schritte), gebinde_id: "", fuellmenge_g: "", service_min_pro_100: "" };
    f.gruppen[0].schritte[0] = { ...f.gruppen[0].schritte[0], ruest: "", durchgang: "", ort: "" };
    const d = daten(rezeptDaten(gratin, f))!;
    expect(d).toMatchObject({ gebinde_id: null, fuellmenge_g: null, service_min_pro_100: null });
    expect((d.gruppen as { schritte: Record<string, unknown>[] }[])[0].schritte[0]).toMatchObject({ ort: "", ruest_min: null, menge_pro_durchgang_g: null });
  });
  it("lehnt ungültige Zahlen ab", () => {
    const f = rezeptFormular(gratin, gruppen, [], schritte);
    expect(rezeptDaten(gratin, { ...f, fuellmenge_g: "0" })).toHaveProperty("fehler");
    expect(rezeptDaten(gratin, { ...f, service_min_pro_100: "-1" })).toHaveProperty("fehler");
    const g = { ...f, gruppen: [{ ...f.gruppen[0], schritte: [{ ...f.gruppen[0].schritte[0], durchgang: "abc" }] }] };
    expect(rezeptDaten(gratin, g)).toHaveProperty("fehler");
  });
  it("ein neuer Schritt nur mit Ort ist nicht leer", () => {
    const f = rezeptFormular(gratin, gruppen, [], schritte);
    f.gruppen[0].schritte.push({ ...neuerSchritt("neu-s1"), ort: "vor_ort" });
    expect(rezeptDaten(gratin, f)).toHaveProperty("fehler");
  });
});

describe("Planung anzeigen", () => {
  const s = (p: Partial<PlanungSchritt>): PlanungSchritt => ({
    id: "s", text: "Garen", ort: "zentralkueche", rolle: "Koch", geraet: "Combi-Steamer", ruest_min: 0, aktiv_min: 5, unbeaufsichtigt_min: 50, menge_pro_durchgang_g: 12000, ...p,
  });
  const kopf = { gebinde: "IFCO-Box", fuellmenge_g: 12000, service_min_pro_100: 15, ergibt_g: 1000, typ: "komponente" };

  it("Texte und Platzhalter", () => {
    expect(ortText("vor_ort")).toBe("vor Ort (Service)");
    expect(ortText(null)).toBe("[Ort]");
    expect(durchgangText(null)).toBe("Basis-Charge");
    expect(durchgangText(12000)).toBe("12.00 kg");
    expect(minutenText(0)).toBe("–");
    expect(minutenText(90)).toBe("1 h 30 min");
    expect(serviceText(null, null)).toBe("[Aufwand]");
    expect(serviceText(15, "Koch")).toBe("15 min pro 100 Portionen · Koch");
    expect(kurzText("Erste Zeile\nzweite")).toBe("Erste Zeile");
    expect(kurzText("x".repeat(80)).length).toBe(70);
  });
  it("vollständig: nichts fehlt", () => {
    expect(fehlendeAngaben(kopf, [s({})], 1)).toEqual([]);
  });
  it("nennt, was für die Berechnung fehlt", () => {
    expect(fehlendeAngaben({ ...kopf, gebinde: null, fuellmenge_g: null, service_min_pro_100: null, ergibt_g: null }, [s({ ort: null, aktiv_min: 0, unbeaufsichtigt_min: 0 })], 0)).toEqual([
      "Ergibt-Menge pro Charge", "Zeiten der Arbeitsschritte", "Ort bei jedem Schritt", "Gebinde", "Füllmenge pro Gebinde", "Aufwand Service",
      "Verknüpfung mit einer Komponente im Katalog",
    ]);
    expect(fehlendeAngaben(kopf, [], 1)).toEqual(["Arbeitsschritte"]);
    expect(fehlendeAngaben({ ...kopf, typ: "gericht", ergibt_g: null }, [s({})], 0)).toEqual([]);
  });
});
