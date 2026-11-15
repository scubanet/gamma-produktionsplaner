import { describe, expect, it } from "vitest";
import { GRUPPEN, hauptnav, istOeffentlich, navEintraege, seitenTabs, unternav } from "../lib/navigation";

describe("Navigation", () => {
  it("markiert den Leitstand als aktiv", () => {
    const e = navEintraege("/");
    expect(e[0]).toEqual({ label: "Leitstand", href: "/", current: true });
  });

  it("markiert den Produktionsplan als aktiv, mit und ohne Schrägstrich", () => {
    for (const pfad of ["/produktion", "/produktion/"]) {
      const e = navEintraege(pfad);
      expect(e.find((x) => x.current)?.label).toBe("Produktionsplan");
    }
  });

  it("markiert die Systemzuteilung als aktiv", () => {
    expect(navEintraege("/systemzuteilung/").find((x) => x.current)?.label).toBe("Systemzuteilung");
  });

  it("Anlässe sind erreichbar, auch Unterseiten", () => {
    expect(navEintraege("/anlaesse/karte/").find((x) => x.current)?.label).toBe("Anlässe");
  });

  it("Offerten sind erreichbar", () => {
    expect(navEintraege("/offerten/").find((x) => x.current)?.label).toBe("Offerten");
    expect(navEintraege("/offerten/bearbeiten/").filter((x) => x.current).map((x) => x.label)).toEqual(["Offerten"]);
  });

  it("Katalog und Rezepte sind erreichbar", () => {
    expect(navEintraege("/katalog/").find((x) => x.current)?.label).toBe("Katalog");
    expect(navEintraege("/rezepte").find((x) => x.current)?.label).toBe("Rezepte");
  });

  it("alle Bereiche sind gebaut", () => {
    expect(navEintraege("/").filter((x) => x.disabled)).toEqual([]);
    expect(navEintraege("/stammdaten/").find((x) => x.current)?.label).toBe("Stammdaten");
  });

  it("nur die Anmeldung ist öffentlich", () => {
    expect(istOeffentlich("/anmelden/")).toBe(true);
    expect(istOeffentlich("/anmelden")).toBe(true);
    expect(istOeffentlich("/")).toBe(false);
  });
});

describe("Navigation in Bereichen", () => {
  it("hat sechs Bereiche in dieser Reihenfolge", () => {
    expect(GRUPPEN.map((g) => g.label)).toEqual(["Leitstand", "Verkauf", "Produktion", "Küche", "Auswertung", "Verwaltung"]);
  });

  it("jede Seite gehört zu genau einem Bereich", () => {
    const alle = GRUPPEN.flatMap((g) => g.bereiche.map((b) => b.href));
    expect([...alle].sort()).toEqual(
      ["/", "/anlaesse/", "/benutzer/", "/einkauf/", "/katalog/", "/kueche/", "/offerten/", "/produktion/", "/rentabilitaet/", "/ressourcen/", "/rezepte/", "/stammdaten/", "/systemzuteilung/"].sort(),
    );
  });

  it("markiert den Bereich der aktuellen Seite und verlinkt auf dessen erste Seite", () => {
    expect(hauptnav("/katalog/").find((x) => x.current)).toEqual({ label: "Küche", href: "/rezepte/", current: true });
    expect(hauptnav("/").filter((x) => x.current).map((x) => x.label)).toEqual(["Leitstand"]);
  });

  it("Unterseiten zählen zum Bereich", () => {
    expect(hauptnav("/produktion/wellen").find((x) => x.current)?.label).toBe("Produktion");
  });

  it("zeigt die Seiten des Bereichs, ausser er hat nur eine", () => {
    expect(unternav("/einkauf/lieferanten/").map((x) => [x.label, x.current])).toEqual([["Produktionsplan", false], ["Ressourcen", false], ["Einkauf", true], ["Küchenpass", false]]);
    expect(unternav("/")).toEqual([]);
    expect(unternav("/rentabilitaet/")).toEqual([]);
  });

  it("Ansichten einer Seite: genau eine ist aktiv", () => {
    expect(seitenTabs("/produktion/wellen/").filter((x) => x.current).map((x) => x.label)).toEqual(["Wellen"]);
    expect(seitenTabs("/produktion/").filter((x) => x.current).map((x) => x.label)).toEqual(["Liste"]);
    expect(seitenTabs("/rezepte/")).toEqual([]);
  });
});
