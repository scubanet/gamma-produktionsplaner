import { describe, expect, it } from "vitest";
import { datumText, neuerZugang, sortieren, status, type Benutzer } from "../lib/benutzer";
import { navEintraege } from "../lib/navigation";

const b = (x: Partial<Benutzer>): Benutzer => ({
  id: "1", email: "a@gamma.ch", name: "", erstellt_am: "2026-11-10T08:00:00Z", letzte_anmeldung: null, gesperrt: false, admin: false, ich: false, ...x,
});

describe("Benutzerverwaltung", () => {
  it("prüft die E-Mail und schreibt sie klein", () => {
    expect(neuerZugang(" Philip Hösli ", " Philip.Hoesli@GammaCatering.com ")).toEqual({ name: "Philip Hösli", email: "philip.hoesli@gammacatering.com" });
    expect(neuerZugang("", "philip")).toHaveProperty("fehler");
    expect(neuerZugang("", "a b@c.ch")).toHaveProperty("fehler");
    expect(neuerZugang("x".repeat(81), "a@b.ch")).toHaveProperty("fehler");
  });
  it("Status: gesperrt geht vor, ohne Anmeldung noch nie angemeldet", () => {
    expect(status(b({}))).toEqual({ text: "noch nie angemeldet", pill: "neutral" });
    expect(status(b({ letzte_anmeldung: "2026-11-14T07:00:00Z" }))).toEqual({ text: "aktiv", pill: "ok" });
    expect(status(b({ letzte_anmeldung: "2026-11-14T07:00:00Z", gesperrt: true }))).toEqual({ text: "gesperrt", pill: "warn" });
  });
  it("Admins zuerst, dann nach Name oder E-Mail", () => {
    const l = sortieren([b({ id: "1", email: "zoe@gamma.ch" }), b({ id: "2", name: "Dominik", admin: true }), b({ id: "3", name: "Anna" })]);
    expect(l.map((x) => x.id)).toEqual(["2", "3", "1"]);
  });
  it("Datum und Navigation", () => {
    expect(datumText("2026-11-14T07:00:00Z")).toBe("14.11.2026");
    expect(datumText(null)).toBe("–");
    expect(navEintraege("/benutzer/").find((x) => x.current)?.label).toBe("Benutzer");
  });
});
