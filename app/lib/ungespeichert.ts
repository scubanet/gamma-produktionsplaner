"use client";
import { useEffect } from "react";

/** Vergleich über die Serialisierung: reicht für Formulare aus Text, Zahlen und Listen. */
export const istGeaendert = (jetzt: unknown, ausgang: unknown): boolean => JSON.stringify(jetzt) !== JSON.stringify(ausgang);

/**
 * Der Browser fragt nach, bevor die Seite verlassen oder neu geladen wird.
 * Navigation und Buttons des Design Systems sind echte Links, darum greift das auch innerhalb der App.
 * router.replace nach dem Speichern oder Löschen löst keine Frage aus.
 */
export function useUngespeichert(geaendert: boolean): void {
  useEffect(() => {
    if (!geaendert) return;
    const warnen = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warnen);
    return () => window.removeEventListener("beforeunload", warnen);
  }, [geaendert]);
}
