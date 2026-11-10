import { describe, expect, it } from "vitest";
import { filtern, herleitungTerm, leerwert, linienZeilen, mitAufgaben, OHNE_ZUSTAENDIG, saisonZeilen, sortieren, type Aufgabe, type BedarfZeile, type ListeZeile } from "../lib/produktionsliste";
import { mengenKontrollen, statusKontrolle, wellenKontrolle } from "../lib/kontrollwerte";
import { formatAnteil, formatDatum, formatMenge } from "../lib/format";

const liste = (p: Partial<ListeZeile>): ListeZeile => ({
  saison_id: "s", kategorie: "Fleisch", komponente: "Rindsentrecote", status: "ok", menge_total: 79.2, einheit_total: "kg",
  haltbarkeit_tage: 21, wellen: 3, start_ab: "2026-12-04", komponente_id: "k1", zeilen_ohne_menge: 0, ...p,
});
const bedarf = (p: Partial<BedarfZeile>): BedarfZeile => ({
  anlass_id: "a", menuelinie_id: "l1", menuelinie: "Spiel 1 und 6", gang: "Hauptgang", gericht: "Entrecote", komponente_id: "k1",
  komponente: "Rindsentrecote", gaeste: 1100, anteil: 0.6, menge_pro_gast: 120, einheit: "g", menge_total: 79.2, einheit_total: "kg", ...p,
});

describe("Format", () => {
  it("Menge, Datum, Anteil", () => {
    expect(formatMenge(181.5, "kg")).toBe("181.50 kg");
    expect(formatMenge(1200, "Stk")).toBe("1’200 Stk");
    expect(formatMenge(null, "kg")).toBe("[Menge]");
    expect(formatDatum("2026-12-04")).toBe("04.12.2026");
    expect(formatAnteil(0.6)).toBe("60 %");
    expect(formatAnteil(1)).toBe("100 %");
  });
});

describe("Herleitung", () => {
  it("Gäste × Anteil × Menge pro Gast", () => {
    expect(herleitungTerm(bedarf({}))).toBe("1’100 Gäste × 60 % × 120 g");
  });

  it("Saison: Summe über die Menülinien", () => {
    const z = saisonZeilen(
      [liste({ komponente: "Bündner Trockenfleisch", menge_total: 66 })],
      [bedarf({ anteil: 1, menge_pro_gast: 30 }), bedarf({ menuelinie_id: "l2", menuelinie: "Spiel 2 und 7", anteil: 1, menge_pro_gast: 30 })],
    );
    expect(z[0].herleitung).toBe("1’100 Gäste × 100 % × 30 g (Spiel 1 und 6) + 1’100 Gäste × 100 % × 30 g (Spiel 2 und 7)");
    expect(z[0].menge).toBe(66);
  });

  it("fehlende Werte als Platzhalter, nie geschätzt", () => {
    expect(herleitungTerm(bedarf({ gaeste: null }))).toBe("[Herleitung fehlt]");
    expect(herleitungTerm(bedarf({ menge_pro_gast: null }))).toBe("1’100 Gäste × 60 % × [Menge]");
    expect(saisonZeilen([liste({})], [])[0].herleitung).toBe("[Herleitung fehlt]");
  });
});

describe("Menülinie", () => {
  it("nimmt Menge der Linie und Haltbarkeit der Saison", () => {
    const z = linienZeilen([bedarf({}), bedarf({ menuelinie_id: "l2" })], [liste({ menge_total: 999 })], "l1");
    expect(z).toHaveLength(1);
    expect(z[0]).toMatchObject({ menge: 79.2, haltbarkeitTage: 21, wellen: 3, gericht: "Entrecote", menuelinie: "Spiel 1 und 6" });
  });
});

describe("Filter und Sortierung", () => {
  const z = saisonZeilen(
    [liste({ komponente_id: "a", komponente: "Zander", kategorie: "Fisch" }), liste({ komponente_id: "b", komponente: "Apfel", kategorie: "Dessert", status: "Zukauf" })],
    [],
  );
  it("filtert nach Kategorie und Status", () => {
    expect(filtern(z, { kategorie: "Fisch", status: "" }).map((x) => x.komponente)).toEqual(["Zander"]);
    expect(filtern(z, { kategorie: "", status: "Zukauf" }).map((x) => x.komponente)).toEqual(["Apfel"]);
    expect(filtern(z, { kategorie: "", status: "" })).toHaveLength(2);
  });
  it("sortiert nach Kategorie, dann Komponente", () => {
    expect(sortieren(z).map((x) => x.kategorie)).toEqual(["Dessert", "Fisch"]);
  });
});

describe("Checkliste", () => {
  const roh = saisonZeilen(
    [
      liste({ komponente_id: "a", komponente: "Zander", kategorie: "Fisch", start_ab: "2026-12-10", wellen: 2 }),
      liste({ komponente_id: "b", komponente: "Apfel", kategorie: "Dessert", start_ab: "2026-10-19", wellen: 1 }),
      liste({ komponente_id: "c", komponente: "Käse", kategorie: "Special_Livestation", start_ab: null, wellen: null, status: "offen" }),
    ],
    [],
  );
  const aufgaben = new Map<string, Aufgabe>([
    ["a", { komponente_id: "a", zustaendig: "Remo", erledigt_am: "2026-11-10T09:00:00Z" }],
    ["b", { komponente_id: "b", zustaendig: null, erledigt_am: null }],
  ]);
  const z = mitAufgaben(roh, aufgaben);

  it("übernimmt Zuständig und Erledigt", () => {
    expect(z.find((x) => x.komponenteId === "a")).toMatchObject({ zustaendig: "Remo", erledigtAm: "2026-11-10T09:00:00Z" });
    expect(z.find((x) => x.komponenteId === "c")).toMatchObject({ zustaendig: null, erledigtAm: null });
  });
  it("filtert nach erledigt und zuständig", () => {
    expect(filtern(z, { kategorie: "", status: "", erledigt: "erledigt" }).map((x) => x.komponente)).toEqual(["Zander"]);
    expect(filtern(z, { kategorie: "", status: "", erledigt: "offen" })).toHaveLength(2);
    expect(filtern(z, { kategorie: "", status: "", zustaendig: "Remo" }).map((x) => x.komponente)).toEqual(["Zander"]);
    expect(filtern(z, { kategorie: "", status: "", zustaendig: OHNE_ZUSTAENDIG })).toHaveLength(2);
  });
  it("sortiert nach Start ab und Wellen, Leerwerte am Schluss", () => {
    expect(sortieren(z, "startAb").map((x) => x.komponente)).toEqual(["Apfel", "Zander", "Käse"]);
    expect(sortieren(z, "startAb", "ab").map((x) => x.komponente)).toEqual(["Zander", "Apfel", "Käse"]);
    expect(sortieren(z, "wellen", "ab").map((x) => x.komponente)).toEqual(["Zander", "Apfel", "Käse"]);
    expect(sortieren(z, "zustaendig").map((x) => x.komponente)).toEqual(["Zander", "Apfel", "Käse"]);
  });
});

describe("Kontrollwerte", () => {
  it("erkennt Übereinstimmung und Abweichung", () => {
    const k = mengenKontrollen(
      [liste({ komponente: "Bündner Trockenfleisch", menge_total: 181.5 })],
      [bedarf({}), bedarf({ komponente: "Bunter Blattsalat", menge_total: 27.4 })],
    );
    expect(k.map((x) => x.ok)).toEqual([true, true, false]);
  });
  it("fehlender Wert ist unbekannt, nicht falsch", () => {
    expect(mengenKontrollen([], [])[0].ok).toBeNull();
    expect(wellenKontrolle(21, 3, null).ok).toBeNull();
    expect(wellenKontrolle(21, 3, 3).ok).toBe(true);
  });
});

describe("Nachbesserungen aus dem Review", () => {
  it("Herleitung trennt Einheiten derselben Komponente", () => {
    const z = saisonZeilen(
      [liste({ einheit_total: "kg", menge_total: 1 }), liste({ einheit_total: "Stk", menge_total: 50 })],
      [bedarf({ einheit: "g", einheit_total: "kg" }), bedarf({ einheit: "Stk", einheit_total: "Stk", menge_pro_gast: 1, menuelinie: "Brunch Spiel 11" })],
    );
    expect(z[0].herleitung).toContain("120 g");
    expect(z[0].herleitung).not.toContain("Stk");
    expect(z[1].herleitung).toContain("1 Stk (Brunch Spiel 11)");
  });

  it("unbekannt bei offen, nicht zutreffend sonst", () => {
    expect(leerwert("offen", "Haltbarkeit")).toBe("[Haltbarkeit]");
    expect(leerwert("Zukauf", "Wellen")).toBe("–");
    expect(leerwert("ok", "Start")).toBe("–");
  });

  it("Status-Kontrollwert 310 / 130 / 53", () => {
    expect(statusKontrolle({ ok: 310, offen: 130, Zukauf: 53 }).ok).toBe(true);
    expect(statusKontrolle({ ok: 309, offen: 131, Zukauf: 53 }).ok).toBe(false);
    expect(statusKontrolle({ ok: null, offen: 130, Zukauf: 53 }).ok).toBeNull();
  });
});
