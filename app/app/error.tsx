"use client";

import { useEffect } from "react";
import { Button, Notice } from "@/lib/planer";

// Fängt unerwartete Fehler einer Seite ab, damit nicht ein leerer Bildschirm bleibt.
// Die Eingaben anderer Seiten und die Sitzung bleiben erhalten; «Nochmals versuchen» lädt nur diesen Bereich neu.
export default function Fehler({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="pl-main">
      <header className="pl-head">
        <div>
          <div className="pl-crumb">GAMMA Catering</div>
          <h1 className="pl-h1">Produktionsplaner</h1>
        </div>
      </header>
      <Notice title="Die Seite konnte nicht angezeigt werden">
        Es ist ein unerwarteter Fehler aufgetreten. Gespeicherte Daten sind nicht betroffen. Bleibt der Fehler, bitte bei Dominik
        Weckherlin melden.
      </Notice>
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
        <Button variant="primary" onClick={() => retry()}>
          Nochmals versuchen
        </Button>
        <Button href="/">Zum Leitstand</Button>
      </div>
    </main>
  );
}
