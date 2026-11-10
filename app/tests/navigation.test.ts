import { describe, expect, it } from "vitest";
import { istOeffentlich, navEintraege } from "../lib/navigation";

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
