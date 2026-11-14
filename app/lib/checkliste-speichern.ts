// Schreibt Zuständig oder Erledigt für eine oder mehrere Wellen einer Komponente.
// Es werden nur die übergebenen Felder geschrieben; Zeitpunkt und Person des Häkchens setzt die Datenbank.
import { supabase } from "./supabase";
import type { Aufgabe } from "./checkliste";

export async function checklisteSpeichern(
  saisonId: string,
  komponenteId: string,
  wellen: number[],
  teil: { zustaendig: string | null } | { erledigt_am: string | null },
): Promise<{ zeilen: Aufgabe[] } | { fehler: string }> {
  const r = await supabase
    .from("produktion_aufgabe")
    .upsert(wellen.map((welle_nr) => ({ saison_id: saisonId, komponente_id: komponenteId, welle_nr, ...teil })))
    .select("komponente_id, welle_nr, zustaendig, erledigt_am");
  return r.error ? { fehler: r.error.message } : { zeilen: r.data };
}
