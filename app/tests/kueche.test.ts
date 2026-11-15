import { describe, expect, it } from "vitest";
import { ersteOffeneWelle, nachKategorie, passFiltern, passStand, passWellen } from "../lib/kueche";
import { schluessel, type Aufgabe } from "../lib/checkliste";
import type { Vorschlag } from "../lib/wellen";

const v = (p: Partial<Vorschlag>): Vorschlag => ({ komponente_id: "k1", komponente: "Apfel", kategorie: "Basis", menge: 6.2, einheit_total: "kg", nr: 1, produktion_am: "2026-12-04", saison_id: "s", ...p }) as Vorschlag;
const erledigt = (id: string, nr: number): [string, Aufgabe] => [schluessel(id, nr), { komponente_id: id, welle_nr: nr, zustaendig: null, erledigt_am: "2026-12-04T08:00:00Z" }];

const vorschlag = [
  v({ komponente_id: "k2", komponente: "Sugo", kategorie: "Sauce", nr: 2, produktion_am: "2026-12-15" }),
  v({ komponente_id: "k1", komponente: "Birne", nr: 1, produktion_am: "2026-12-05" }),
  v({ komponente_id: "k3", komponente: "Apfel", nr: 1, produktion_am: "2026-12-04" }),
  v({ komponente_id: null }),
  v({ nr: null }),
];

describe("Küchenpass", () => {
  it("gruppiert nach Welle, sortiert nach Kategorie und Name, Datum = frühester Tag", () => {
    const w = passWellen(vorschlag);
    expect(w.map((x) => [x.nr, x.datum, x.zeilen.map((z) => z.komponente)])).toEqual([[1, "2026-12-04", ["Apfel", "Birne"]], [2, "2026-12-15", ["Sugo"]]]);
  });

  it("zählt den Stand pro Welle", () => {
    const w = passWellen(vorschlag);
    expect(passStand(w[0], new Map([erledigt("k3", 1)]))).toEqual({ erledigt: 1, total: 2 });
  });

  it("ein Häkchen gilt nur für seine Welle", () => {
    const w = passWellen([v({ komponente_id: "k1", nr: 1 }), v({ komponente_id: "k1", nr: 2 })]);
    const a = new Map([erledigt("k1", 1)]);
    expect(passStand(w[0], a).erledigt).toBe(1);
    expect(passStand(w[1], a).erledigt).toBe(0);
  });

  it("öffnet die erste Welle mit offenen Zeilen, sonst die letzte", () => {
    const w = passWellen(vorschlag);
    expect(ersteOffeneWelle(w, new Map())).toBe(1);
    expect(ersteOffeneWelle(w, new Map([erledigt("k1", 1), erledigt("k3", 1)]))).toBe(2);
    expect(ersteOffeneWelle(w, new Map([erledigt("k1", 1), erledigt("k3", 1), erledigt("k2", 2)]))).toBe(2);
    expect(ersteOffeneWelle([], new Map())).toBeNull();
  });

  it("filtert offen und erledigt", () => {
    const z = passWellen(vorschlag)[0].zeilen;
    const a = new Map([erledigt("k3", 1)]);
    expect(passFiltern(z, a, "offen").map((x) => x.komponente)).toEqual(["Birne"]);
    expect(passFiltern(z, a, "erledigt").map((x) => x.komponente)).toEqual(["Apfel"]);
    expect(passFiltern(z, a, "alle")).toHaveLength(2);
  });

  it("gruppiert nach Kategorie", () => {
    const z = passWellen([v({ komponente_id: "a", kategorie: "Sauce" }), v({ komponente_id: "b", kategorie: "Basis" }), v({ komponente_id: "c", kategorie: "Sauce", komponente: "Jus" })])[0].zeilen;
    expect(nachKategorie(z).map((g) => [g.kategorie, g.zeilen.length])).toEqual([["Basis", 1], ["Sauce", 2]]);
  });
});
