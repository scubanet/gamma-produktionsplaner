import { describe, expect, it } from "vitest";
import type { Gruppe, Rezept, ZutatRoh } from "../lib/rezepte";
import {
  basisOptionen, grammAusEingabe, minutenAusEingabe, neueGruppe, neueZutat, neuerSchritt, rezeptDaten, rezeptFormular, temperaturAusEingabe,
  type RezeptFormular, type SchrittRoh,
} from "../lib/rezept-pflege";

const sugo: Rezept = {
  id: "r2", slug: "sugo", typ: "komponente", name: "Sugo", untertitel: null, kategorie: "Sauce", quelle: null,
  basis_portionen: null, portion_g: null, ergibt_g: 1600, status: "entwurf", ergibt_annahme: true, portionen_annahme: false,
  chargengroesse: "GN 1/1", besonderes: null, geaendert_am: "2026-11-10T10:00:00+00:00",
};
const gericht: Rezept = { ...sugo, id: "r1", slug: "hack", typ: "gericht", name: "Hacktätschli", basis_portionen: 10, portion_g: 180, ergibt_g: null, ergibt_annahme: false, chargengroesse: null };
const gruppen: Gruppe[] = [{ id: "g2", titel: "Sauce", reihenfolge: 2 }, { id: "g1", titel: null, reihenfolge: 1 }];
const zutaten: ZutatRoh[] = [
  { id: "z2", gruppe_id: "g1", bezeichnung: "Milch", menge_g: 250, annahme: true, notiz: "2.5 dl (1 ml = 1 g)", ist_basis: false, reihenfolge: 2 },
  { id: "z1", gruppe_id: "g1", bezeichnung: "Mehl", menge_g: 500, annahme: false, notiz: null, ist_basis: true, reihenfolge: 1 },
  { id: "z3", gruppe_id: "g2", bezeichnung: "Knoblauch", menge_g: null, annahme: false, notiz: "2 Zehen", ist_basis: false, reihenfolge: 1 },
];
const schritte: SchrittRoh[] = [
  { id: "s1", gruppe_id: "g2", text: "Andünsten.", reihenfolge: 1, geraet_id: "ger1", temperatur_c: 160, aktiv_min: 5, unbeaufsichtigt_min: 0, haccp: null, annahme: false, ort: "zentralkueche", rolle: "Koch", ruest_min: 10, menge_pro_durchgang_g: 12000 },
];
const f = () => rezeptFormular(sugo, gruppen, zutaten, schritte);
type Daten = {
  name: string; typ: string; basis_portionen: number | null; portion_g: number | null; ergibt_g: number | null; chargengroesse: string;
  ergibt_annahme: boolean; portionen_annahme: boolean; erledigt: string[];
  gruppen: { id: string | null; titel: string; zutaten: Record<string, unknown>[]; schritte: Record<string, unknown>[] }[];
};
const daten = (r: ReturnType<typeof rezeptDaten>) => ("daten" in r ? (r.daten as unknown as Daten) : null);
const fehler = (r: ReturnType<typeof rezeptDaten>) => ("fehler" in r ? r.fehler : null);
const mit = (fn: (x: RezeptFormular) => void) => {
  const x = f();
  fn(x);
  return x;
};

describe("Eingaben", () => {
  it("Gramm: leer, Komma, Grenzen", () => {
    expect(grammAusEingabe("")).toBeNull();
    expect(grammAusEingabe(" 12,5 ")).toBe(12.5);
    expect(grammAusEingabe("0")).toBeUndefined();
    expect(grammAusEingabe("1.234")).toBeUndefined();
    expect(grammAusEingabe("-3")).toBeUndefined();
    expect(grammAusEingabe("abc")).toBeUndefined();
  });
  it("Minuten ab 0, Temperatur auch negativ", () => {
    expect(minutenAusEingabe("0")).toBe(0);
    expect(minutenAusEingabe("7.5")).toBe(7.5);
    expect(minutenAusEingabe("-1")).toBeUndefined();
    expect(temperaturAusEingabe("-18")).toBe(-18);
    expect(temperaturAusEingabe("−18")).toBe(-18);
    expect(temperaturAusEingabe("62.5")).toBe(62.5);
    expect(temperaturAusEingabe("62.55")).toBeUndefined();
    expect(temperaturAusEingabe("")).toBeNull();
  });
});

describe("Formular aus dem geladenen Stand", () => {
  it("Gruppen, Zutaten und Schritte in der Reihenfolge des Rezepts", () => {
    const x = f();
    expect(x.gruppen.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(x.gruppen[0].zutaten.map((z) => z.bezeichnung)).toEqual(["Mehl", "Milch"]);
    expect(x.gruppen[1].schritte[0]).toMatchObject({ id: "s1", geraet_id: "ger1", temperatur: "160", aktiv: "5", unbeaufsichtigt: "" });
    expect(x).toMatchObject({ name: "Sugo", typ: "komponente", ergibt_g: "1600", basis_zutat: "z1", besonderes: "", erledigt: [] });
  });
  it("neues Rezept: Komponente mit einer leeren Gruppe", () => {
    const x = rezeptFormular(null, [], [], []);
    expect(x).toMatchObject({ name: "", typ: "komponente", basis_zutat: "" });
    expect(x.gruppen).toHaveLength(1);
    expect(x.gruppen[0].id).toBeNull();
  });
});

describe("Dokument für rezept_speichern", () => {
  it("unverändert: alles geht mit, mit IDs und Basiszutat", () => {
    const d = daten(rezeptDaten(sugo, f()));
    expect(d).toMatchObject({ name: "Sugo", typ: "komponente", ergibt_g: 1600, ergibt_annahme: true, chargengroesse: "GN 1/1", basis_portionen: null });
    expect(d?.gruppen[0].zutaten).toEqual([
      { id: "z1", bezeichnung: "Mehl", menge_g: 500, annahme: false, notiz: "", ist_basis: true },
      { id: "z2", bezeichnung: "Milch", menge_g: 250, annahme: true, notiz: "2.5 dl (1 ml = 1 g)", ist_basis: false },
    ]);
    expect(d?.gruppen[1].schritte).toEqual([
      { id: "s1", text: "Andünsten.", geraet_id: "ger1", temperatur_c: 160, aktiv_min: 5, unbeaufsichtigt_min: null, haccp: "", annahme: false, ort: "zentralkueche", rolle: "Koch", ruest_min: 10, menge_pro_durchgang_g: 12000 },
    ]);
  });

  it("neue Zeilen ohne id; ganz leere neue Zeilen und Gruppen fallen weg", () => {
    const d = daten(rezeptDaten(sugo, mit((x) => {
      x.gruppen[0].zutaten.push({ ...neueZutat("neu-z1"), bezeichnung: " Salz ", menge: "12" }, neueZutat("neu-z2"));
      x.gruppen[0].schritte.push({ ...neuerSchritt("neu-s1"), text: "Kneten." }, neuerSchritt("neu-s2"));
      x.gruppen.push(neueGruppe("neu-g1"), { ...neueGruppe("neu-g2"), titel: "Guss" });
    })));
    expect(d?.gruppen.map((g) => [g.id, g.titel])).toEqual([["g1", ""], ["g2", "Sauce"], [null, "Guss"]]);
    expect(d?.gruppen[0].zutaten[2]).toEqual({ id: null, bezeichnung: "Salz", menge_g: 12, annahme: false, notiz: "", ist_basis: false });
    expect(d?.gruppen[0].zutaten).toHaveLength(3);
    expect(d?.gruppen[0].schritte).toHaveLength(1);
  });

  it("entfernte Zeilen fehlen im Dokument (die Datenbank löscht sie)", () => {
    const d = daten(rezeptDaten(sugo, mit((x) => {
      x.gruppen[0].zutaten = x.gruppen[0].zutaten.filter((z) => z.key !== "z2");
      x.gruppen = x.gruppen.filter((g) => g.key !== "g2");
    })));
    expect(d?.gruppen).toHaveLength(1);
    expect(d?.gruppen[0].zutaten.map((z) => z.id)).toEqual(["z1"]);
  });

  it("Basiszutat: ohne Menge gilt sie als keine; Annahme ohne Menge fällt weg", () => {
    const d = daten(rezeptDaten(sugo, mit((x) => {
      x.gruppen[0].zutaten[0].menge = "";
      x.gruppen[0].zutaten[1] = { ...x.gruppen[0].zutaten[1], menge: "", annahme: true };
    })));
    expect(d?.gruppen[0].zutaten.map((z) => [z.ist_basis, z.annahme, z.menge_g])).toEqual([[false, false, null], [false, false, null]]);
    expect(basisOptionen(f()).map((o) => o.value)).toEqual(["z1", "z2"]);
    expect(basisOptionen(f())[0].label).toBe("Mehl · 500 g");
  });

  it("Basiszutat auf einer neuen Zeile wird über den key gefunden", () => {
    const d = daten(rezeptDaten(sugo, mit((x) => {
      x.gruppen[0].zutaten.push({ ...neueZutat("neu-z1"), bezeichnung: "Salz", menge: "12" });
      x.basis_zutat = "neu-z1";
    })));
    expect(d?.gruppen[0].zutaten.map((z) => [z.id, z.ist_basis])).toEqual([["z1", false], ["z2", false], [null, true]]);
  });

  it("Fehler: Name, bestehende Zeile geleert, ungültige Zahlen, Gericht ohne Portionen", () => {
    expect(fehler(rezeptDaten(sugo, { ...f(), name: " " }))).toContain("Namen");
    expect(fehler(rezeptDaten(sugo, mit((x) => { x.gruppen[0].zutaten[0] = { ...x.gruppen[0].zutaten[0], bezeichnung: "", menge: "", notiz: "" }; })))).toContain("keine Bezeichnung");
    expect(fehler(rezeptDaten(sugo, mit((x) => { x.gruppen[0].zutaten[1].menge = "viel"; })))).toContain("Milch");
    expect(fehler(rezeptDaten(sugo, mit((x) => { x.gruppen[1].schritte[0].text = ""; })))).toContain("«Sauce», Schritt 1");
    expect(fehler(rezeptDaten(sugo, mit((x) => { x.gruppen[1].schritte[0].temperatur = "heiss"; })))).toContain("Temperatur");
    expect(fehler(rezeptDaten(sugo, mit((x) => { x.gruppen[1].schritte[0].aktiv = "-2"; })))).toContain("Minuten");
    expect(fehler(rezeptDaten(sugo, { ...f(), typ: "gericht" }))).toContain("Basisportionen");
    expect(fehler(rezeptDaten(sugo, { ...f(), typ: "gericht", basis_portionen: "1.5" }))).toContain("ganze Zahl ab 1");
    expect(fehler(rezeptDaten(sugo, { ...f(), typ: "gericht", basis_portionen: "4", portion_g: "x" }))).toContain("Portion in Gramm");
    expect(fehler(rezeptDaten(sugo, { ...f(), ergibt_g: "0" }))).toContain("Ergibt");
  });

  it("Felder des anderen Typs werden nicht geprüft und bleiben wie geladen", () => {
    const a = daten(rezeptDaten(sugo, { ...f(), typ: "gericht", basis_portionen: "10", ergibt_g: "5 kg", chargengroesse: "x", ergibt_annahme: false }));
    expect(a).toMatchObject({ typ: "gericht", basis_portionen: 10, ergibt_g: 1600, chargengroesse: "GN 1/1", ergibt_annahme: true });
    const b = daten(rezeptDaten(gericht, { ...rezeptFormular(gericht, [], [], []), typ: "komponente", basis_portionen: "abc", portion_g: "0" }));
    expect(b).toMatchObject({ typ: "komponente", basis_portionen: 10, portion_g: 180 });
  });

  it("neues Rezept: Werte des anderen Typs sind leer", () => {
    const neu = { ...rezeptFormular(null, [], [], []), name: "Pesto", typ: "gericht" as const, basis_portionen: "4" };
    expect(daten(rezeptDaten(null, neu))).toMatchObject({ name: "Pesto", basis_portionen: 4, portion_g: null, ergibt_g: null, chargengroesse: "", gruppen: [] });
  });
});
