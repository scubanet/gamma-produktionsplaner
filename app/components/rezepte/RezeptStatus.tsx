"use client";

import { useState } from "react";
import { Button, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { statusPill, statusSchritte, statusText, type Rezept } from "@/lib/rezepte";
import { fehlerText } from "@/lib/fehler";
import { useStufe } from "@/components/Anmeldung";
import { darf } from "@/lib/stufe";

/** Status des Rezepts als Pill mit den Knöpfen «Geprüft», «Freigeben», «Zurück auf Entwurf». Die Datenbank prüft Stand und Recht. */
export function RezeptStatus({ rezept, admin, onGesetzt }: {
  rezept: Pick<Rezept, "id" | "status" | "geaendert_am">;
  admin: boolean;
  onGesetzt: (status: string, geaendertAm: string) => void;
}) {
  const planen = darf(useStufe(), "planen");
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  async function setzen(status: string) {
    setLaeuft(true);
    setFehler(null);
    const q = await supabase.rpc("rezept_status_setzen", { p_rezept: rezept.id, p_status: status, p_geaendert_am: rezept.geaendert_am });
    setLaeuft(false);
    if (q.error) return setFehler(fehlerText(q.error));
    const neu = q.data as { status: string; geaendert_am: string };
    onGesetzt(neu.status, neu.geaendert_am);
  }

  return (
    <>
      <StatusPill status={statusPill(rezept.status)}>{statusText(rezept.status)}</StatusPill>
      {(planen ? statusSchritte(rezept.status, admin) : []).map((s) => (
        <Button key={s.status} onClick={() => setzen(s.status)} disabled={laeuft}>{s.label}</Button>
      ))}
      {fehler ? <span className="pl-small" role="alert">{fehler}</span> : null}
    </>
  );
}
