"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button, Dialog } from "@/lib/planer";

export type Rueckfrage = {
  titel: string;
  /** Was gelöscht wird und was mitgeht. */
  text: ReactNode;
  /** Beschriftung des Knopfs, z.B. «Löschen». Ohne aktion zeigt der Dialog nur «Schliessen» (z.B. wenn zuerst etwas anderes zu tun ist). */
  bestaetigen?: string;
  aktion?: () => Promise<unknown> | unknown;
};

/**
 * Rückfrage vor dem Löschen oder Entfernen. fragen(...) öffnet den Dialog; erst «Löschen» führt die Aktion aus.
 * «Abbrechen» ist primär und steht zuerst: der Dialog setzt den Fokus darauf, Enter löscht also nichts.
 */
export function useBestaetigen(): [(r: Rueckfrage) => void, ReactNode] {
  const [frage, setFrage] = useState<Rueckfrage | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const ausgefuehrt = useRef(false);

  async function ausfuehren() {
    if (!frage?.aktion || laeuft) return;
    setLaeuft(true);
    try {
      await frage.aktion();
      ausgefuehrt.current = true;
    } finally {
      setLaeuft(false);
      setFrage(null);
    }
  }

  const dialog = (
    <Dialog
      open={frage !== null}
      id="bestaetigen"
      title={frage?.titel ?? ""}
      onClose={() => {
        if (!laeuft) setFrage(null);
        // Nach dem Löschen gibt es den auslösenden Knopf oft nicht mehr: der Fokus geht dann auf die Meldung der Seite.
        if (!ausgefuehrt.current) return;
        ausgefuehrt.current = false;
        requestAnimationFrame(() => {
          if (document.activeElement === document.body) document.querySelector<HTMLElement>('[role="status"][tabindex="-1"]')?.focus();
        });
      }}
      onCancel={(e) => laeuft && e.preventDefault()}
      actions={
        frage?.aktion ? (
          <>
            <Button variant="primary" onClick={() => setFrage(null)} disabled={laeuft}>Abbrechen</Button>
            <Button onClick={ausfuehren} disabled={laeuft}>{laeuft ? "Einen Moment …" : frage.bestaetigen ?? "Löschen"}</Button>
          </>
        ) : (
          <Button variant="primary" onClick={() => setFrage(null)}>Schliessen</Button>
        )
      }
    >
      <p>{frage?.text}</p>
    </Dialog>
  );
  return [setFrage, dialog];
}
