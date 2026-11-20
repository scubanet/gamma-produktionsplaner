import { afterEach, describe, expect, it, vi } from "vitest";
import { ALLGEMEIN, beiSitzungsende, fehlerArt, fehlerDetail, fehlerText } from "../lib/fehler";

afterEach(() => beiSitzungsende(null));

describe("Fehlermeldungen in klarer Sprache", () => {
  it("keine Verbindung", () => {
    expect(fehlerArt(new TypeError("Failed to fetch"))).toBe("verbindung");
    expect(fehlerArt({ message: "TypeError: Load failed", code: "" })).toBe("verbindung");
    expect(fehlerText(new TypeError("Failed to fetch"))).toMatch(/Keine Verbindung/);
  });

  it("Edge Function: nicht erreichbar ist keine Verbindung, ein Statusfehler bleibt allgemein", () => {
    expect(fehlerArt(new Error("Failed to send a request to the Edge Function"))).toBe("verbindung");
    expect(fehlerText(new Error("Edge Function returned a non-2xx status code"))).toBe(ALLGEMEIN);
  });

  it("Sitzung abgelaufen", () => {
    expect(fehlerArt({ message: "JWT expired", code: "PGRST303" })).toBe("sitzung");
    expect(fehlerText({ message: "JWT expired", code: "PGRST301" })).toMatch(/Sitzung ist abgelaufen/);
  });

  it("keine Berechtigung", () => {
    expect(fehlerArt({ message: 'permission denied for table rezept', code: "42501" })).toBe("berechtigung");
    expect(fehlerText({ message: 'new row violates row-level security policy for table "rezept"', code: "42501" })).toMatch(/keine Berechtigung/i);
  });

  it("Datensatz wird noch verwendet", () => {
    expect(fehlerText({ message: 'update or delete on table "geraet" violates foreign key constraint', code: "23503" })).toMatch(/wird noch verwendet/);
  });

  it("doppelter Wert", () => {
    expect(fehlerText({ message: 'duplicate key value violates unique constraint "x_key"', code: "23505" })).toMatch(/gibt es schon/);
  });

  it("Datenbank älter als die App (Tabelle oder Funktion fehlt)", () => {
    expect(fehlerArt({ message: "Could not find the table 'public.leitstand_rezepte' in the schema cache", code: "PGRST205" })).toBe("stand");
    expect(fehlerText({ message: "Could not find the function public.x in the schema cache", code: "PGRST202" })).toMatch(/Datenbank ist nicht auf dem Stand/);
  });

  it("Unbekanntes aus der Datenbank: allgemeiner Satz, nie die rohe Meldung", () => {
    expect(fehlerText({ message: "invalid input syntax for type uuid", code: "22P02" })).toBe(ALLGEMEIN);
    expect(fehlerText(null)).toBe(ALLGEMEIN);
    expect(ALLGEMEIN).toBe("Das hat nicht geklappt. Bitte nochmals versuchen.");
  });

  it("eigene Texte der App bleiben, wie sie sind", () => {
    expect(fehlerText(new Error("Rezept «sugo» nicht gefunden."))).toBe("Rezept «sugo» nicht gefunden.");
    expect(fehlerText("Kein Anlass mit Menülinien gefunden.")).toBe("Kein Anlass mit Menülinien gefunden.");
  });

  it("deutsche Meldungen aus Funktionen der Datenbank bleiben, auch mit Code", () => {
    expect(fehlerText({ code: "42501", message: "Nur Administratoren dürfen Rezepte löschen." })).toBe("Nur Administratoren dürfen Rezepte löschen.");
    expect(fehlerText({ code: "23503", message: "Nicht gelöscht: «Sugo» wird noch verwendet (Gericht). Zuerst die Verknüpfung lösen." })).toMatch(/^Nicht gelöscht: «Sugo»/);
    expect(fehlerText({ code: "P0001", message: "Das Rezept braucht einen Namen." })).toBe("Das Rezept braucht einen Namen.");
  });

  it("merkt sich die technische Meldung zum angezeigten Text", () => {
    const text = fehlerText({ message: "invalid input syntax for type uuid", code: "22P02" });
    expect(fehlerDetail(`Anlass nicht angelegt: ${text}`)).toBe("22P02: invalid input syntax for type uuid");
    expect(fehlerDetail("Rezept «sugo» nicht gefunden.")).toBeUndefined();
    expect(fehlerDetail(undefined)).toBeUndefined();
  });

  it("meldet das Ende der Sitzung genau dann, wenn sie abgelaufen ist", () => {
    const ende = vi.fn();
    beiSitzungsende(ende);
    fehlerText({ message: "duplicate key", code: "23505" });
    expect(ende).not.toHaveBeenCalled();
    fehlerText({ message: "JWT expired", code: "PGRST303" });
    expect(ende).toHaveBeenCalledTimes(1);
  });
});
