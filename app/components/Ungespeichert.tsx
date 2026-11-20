"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Dialog } from "@/lib/planer";
import { faengtAb } from "@/lib/ungespeichert";

/**
 * Schützt ungespeicherte Änderungen. Klicks auf Links der App fängt der eigene Dialog ab; für Tab schliessen
 * und Neuladen fragt der Browser (dort ist kein eigener Dialog möglich). router.replace nach dem Speichern
 * oder Löschen löst keine Frage aus.
 */
export function Ungespeichert({ geaendert }: { geaendert: boolean }) {
  const [ziel, setZiel] = useState<string | null>(null);
  const frei = useRef(false);

  useEffect(() => {
    if (!geaendert) return;
    const warnen = (e: BeforeUnloadEvent) => {
      if (!frei.current) e.preventDefault();
    };
    const klick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || e.defaultPrevented) return;
      const k = { href: a.href, ziel: a.target, download: a.hasAttribute("download"), taste: e.button, mitZusatztaste: e.metaKey || e.ctrlKey || e.shiftKey || e.altKey };
      if (!faengtAb(k, window.location.href)) return;
      e.preventDefault();
      setZiel(a.href);
    };
    window.addEventListener("beforeunload", warnen);
    document.addEventListener("click", klick, true);
    return () => {
      window.removeEventListener("beforeunload", warnen);
      document.removeEventListener("click", klick, true);
    };
  }, [geaendert]);

  return (
    <Dialog
      open={ziel !== null}
      title="Änderungen verwerfen?"
      onClose={() => setZiel(null)}
      actions={
        <>
          <Button
            onClick={() => {
              frei.current = true;
              window.location.assign(ziel!);
            }}
          >
            Verwerfen
          </Button>
          <Button variant="primary" onClick={() => setZiel(null)}>Weiter bearbeiten</Button>
        </>
      }
    >
      <p>Auf dieser Seite gibt es ungespeicherte Änderungen. Beim Verlassen gehen sie verloren.</p>
    </Dialog>
  );
}
