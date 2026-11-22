// QR-Code als Matrix für den Baustein QrBild. Gezeichnet wird der Text, den die Datenbank fürs Etikett liefert
// (qr_text in etikett_beutel und etikett_kiste); die App setzt ihn nicht selbst zusammen.
import { encode } from "uqr";

/** Matrix mit vier Feldern Rand, Fehlerkorrektur M (wie für ein Etikett üblich). */
export function qrMatrix(text: string): boolean[][] {
  return encode(text, { border: 4, ecc: "M" }).data;
}
