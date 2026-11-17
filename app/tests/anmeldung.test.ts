import { describe, expect, it } from "vitest";
import { ankunft, fehlertext, nurZiffern } from "../lib/anmeldung";

describe("Anmeldung: was die Adresse mitbringt", () => {
  it("ohne Angaben: Formular", () => {
    expect(ankunft("", "")).toEqual({ art: "leer" });
    expect(ankunft("?weiter=%2Fbenutzer%2F", "")).toEqual({ art: "leer" });
  });

  it("Link aus der E-Mail: wartet auf den Klick, löst nichts von selbst ein", () => {
    expect(ankunft("?token_hash=pkce_abc123&type=email", "")).toEqual({ art: "bestaetigen", tokenHash: "pkce_abc123" });
  });

  it("abgelaufener oder schon verwendeter Link: Fehler in der Abfrage oder nach dem #", () => {
    expect(ankunft("?weiter=%2F&error=access_denied&error_code=otp_expired", "")).toEqual({ art: "abgelaufen" });
    expect(ankunft("?weiter=%2F", "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid")).toEqual({ art: "abgelaufen" });
  });
});

describe("Anmeldung: Code und Meldungen", () => {
  it("Code: nur Ziffern, Leerzeichen aus dem Kopieren fallen weg", () => {
    expect(nurZiffern(" 123 456\n")).toBe("123456");
  });

  it("übersetzt die Meldungen von Supabase", () => {
    expect(fehlertext("Email link is invalid or has expired")).toMatch(/abgelaufen/);
    expect(fehlertext("Token has expired or is invalid")).toMatch(/abgelaufen/);
    expect(fehlertext("Signups not allowed for otp")).toMatch(/nicht eingeladen/);
    expect(fehlertext("For security purposes, you can only request this after 42 seconds.")).toMatch(/warten/);
    expect(fehlertext("Etwas anderes")).toBe("Etwas anderes");
  });
});
