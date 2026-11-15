import { describe, expect, it } from "vitest";
import { istGeaendert } from "../lib/ungespeichert";

describe("Ungespeicherte Änderungen", () => {
  it("gleiche Inhalte gelten als unverändert, auch als neue Objekte", () => {
    expect(istGeaendert({ name: "Sugo", gruppen: [{ zutaten: ["Tomate"] }] }, { name: "Sugo", gruppen: [{ zutaten: ["Tomate"] }] })).toBe(false);
  });
  it("ein geändertes Feld gilt als geändert", () => {
    expect(istGeaendert({ name: "Sugo" }, { name: "Sugo rot" })).toBe(true);
  });
  it("ohne Ausgangsstand gibt es nichts zu verlieren", () => {
    expect(istGeaendert(null, null)).toBe(false);
  });
});
