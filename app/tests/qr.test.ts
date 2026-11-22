import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { qrMatrix } from "../lib/qr";
import { scanCodeLesen } from "../lib/scan-code";

/** Malt die Matrix als Bild (8 Punkte pro Feld), so wie QrBild sie zeichnet: matrix[y][x]. */
function bild(m: boolean[][], feld = 8): { daten: Uint8ClampedArray; seite: number } {
  const seite = m.length * feld;
  const daten = new Uint8ClampedArray(seite * seite * 4);
  for (let y = 0; y < seite; y++)
    for (let x = 0; x < seite; x++) {
      const v = m[Math.floor(y / feld)][Math.floor(x / feld)] ? 0 : 255;
      daten.set([v, v, v, 255], (y * seite + x) * 4);
    }
  return { daten, seite };
}

describe("QR-Code zeichnen und wieder lesen", () => {
  for (const text of ["https://gamma.atoll-os.com/e/?p=389&s=K7M4X2PA", "https://gamma.atoll-os.com/e/?k=K-7BMHPP"]) {
    it(`der Leser der Seite «Scannen» liest, was die Testseite zeichnet: ${text}`, () => {
      const m = qrMatrix(text);
      expect(m.length).toBe(m[0].length);
      // Vier Felder heller Rand.
      expect(m.slice(0, 4).flat().some(Boolean)).toBe(false);
      const { daten, seite } = bild(m);
      expect(jsQR(daten, seite, seite)?.data).toBe(text);
      expect(scanCodeLesen(text).art).not.toBe("unbekannt");
    });
  }
});
