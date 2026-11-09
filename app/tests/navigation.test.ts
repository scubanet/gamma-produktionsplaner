import { describe, expect, it } from "vitest";
import { istOeffentlich, navEintraege } from "../lib/navigation";

describe("Navigation", () => {
  it("markiert den Leitstand als aktiv", () => {
    const e = navEintraege("/");
    expect(e[0]).toEqual({ label: "Leitstand", href: "/", current: true });
  });

  it("zeigt nicht gebaute Bereiche deaktiviert", () => {
    const e = navEintraege("/");
    expect(e.filter((x) => x.disabled).map((x) => x.label)).toContain("Produktionsplan");
  });

  it("nur die Anmeldung ist öffentlich", () => {
    expect(istOeffentlich("/anmelden/")).toBe(true);
    expect(istOeffentlich("/anmelden")).toBe(true);
    expect(istOeffentlich("/")).toBe(false);
  });
});
