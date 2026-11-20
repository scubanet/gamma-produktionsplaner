"use client";

import { useCallback, useRef, type ReactNode } from "react";
import { useBestaetigen } from "./Bestaetigen";

/**
 * Schutz für Eingaben in einer Bearbeiten-Spalte: bevor eine andere Zeile gewählt oder die Spalte geschlossen wird,
 * fragt die Seite nach, wenn es ungespeicherte Eingaben gibt. Das Formular meldet seinen Stand mit melden(...).
 */
export function useEingabenSchutz(): { melden: (geaendert: boolean) => void; mitSchutz: (weiter: () => void) => void; dialog: ReactNode } {
  const geaendert = useRef(false);
  const [fragen, dialog] = useBestaetigen();
  const melden = useCallback((g: boolean) => {
    geaendert.current = g;
  }, []);
  const mitSchutz = useCallback(
    (weiter: () => void) => {
      if (!geaendert.current) return weiter();
      fragen({
        titel: "Änderungen verwerfen?",
        text: "Die Eingaben zu dieser Komponente sind nicht gespeichert und gehen verloren.",
        bestaetigen: "Verwerfen",
        aktion: () => {
          geaendert.current = false;
          weiter();
        },
      });
    },
    [fragen],
  );
  return { melden, mitSchutz, dialog };
}
