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

import { faengtAb, type Klick } from "../lib/ungespeichert";

describe("Klick auf einen Link bei ungespeicherten Änderungen", () => {
  const ort = "https://gamma.atoll-os.com/rezepte/bearbeiten/?r=sugo";
  const klick = (k: Partial<Klick>): Klick => ({ href: "https://gamma.atoll-os.com/rezepte/", ziel: "", download: false, taste: 0, mitZusatztaste: false, ...k });

  it("Link innerhalb der App im gleichen Tab wird abgefangen", () => {
    expect(faengtAb(klick({}), ort)).toBe(true);
  });
  it("fremder Ursprung nicht: dort fragt der Browser", () => {
    expect(faengtAb(klick({ href: "https://gammagruppe.ch/" }), ort)).toBe(false);
  });
  it("neuer Tab nicht: die Seite bleibt offen", () => {
    expect(faengtAb(klick({ ziel: "_blank" }), ort)).toBe(false);
    expect(faengtAb(klick({ mitZusatztaste: true }), ort)).toBe(false);
    expect(faengtAb(klick({ taste: 1 }), ort)).toBe(false);
  });
  it("Download nicht", () => {
    expect(faengtAb(klick({ download: true }), ort)).toBe(false);
  });
  it("Anker auf derselben Seite nicht", () => {
    expect(faengtAb(klick({ href: `${ort}#schritte` }), ort)).toBe(false);
  });
  it("gleiche Seite mit anderer Abfrage schon: das Formular würde neu geladen", () => {
    expect(faengtAb(klick({ href: "https://gamma.atoll-os.com/rezepte/bearbeiten/?r=jus" }), ort)).toBe(true);
  });
  it("ungültige Adresse nicht", () => {
    expect(faengtAb(klick({ href: "" }), ort)).toBe(false);
  });
});
