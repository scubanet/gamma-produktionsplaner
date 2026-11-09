"use client";

import { useEffect, useState } from "react";
import { Button, Card, KpiTile, Notice } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { useSitzung } from "@/components/Anmeldung";

const STATUS = [
  { wert: "ok", label: "Komponenten ok" },
  { wert: "offen", label: "Komponenten offen" },
  { wert: "Zukauf", label: "Komponenten Zukauf" },
] as const;

type Zaehlung = Record<(typeof STATUS)[number]["wert"], number | null>;

export default function Leitstand() {
  const sitzung = useSitzung();
  const [zahlen, setZahlen] = useState<Zaehlung | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(
      STATUS.map((s) =>
        supabase.from("komponente_zuteilung").select("id", { count: "exact", head: true }).eq("status", s.wert),
      ),
    ).then((antworten) => {
      const f = antworten.find((a) => a.error)?.error;
      if (f) return setFehler(f.message);
      setZahlen(Object.fromEntries(STATUS.map((s, i) => [s.wert, antworten[i].count])) as Zaehlung);
    });
  }, []);

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">GAMMA Catering · Winter Collection 2026/27</div>
          <h1 className="pl-h1">Leitstand</h1>
        </div>
        <div className="pl-actions">
          <span className="pl-small">{sitzung?.user.email}</span>
          <Button onClick={() => supabase.auth.signOut()}>Abmelden</Button>
        </div>
      </header>

      {fehler ? <Notice title="Daten nicht geladen">{fehler}</Notice> : null}

      <div className="pl-grid-3">
        {STATUS.map((s) => (
          <KpiTile
            key={s.wert}
            label={s.label}
            value={zahlen ? (zahlen[s.wert] ?? "–") : "…"}
            detail="Herleitung: Anzahl Zeilen in komponente_zuteilung mit diesem Status"
          />
        ))}
      </div>

      <Card title="Nächste Schritte" meta="Übergabe, Aufgabe 2">
        <p className="pl-muted">Produktionsliste Spengler Cup folgt als nächster Screen.</p>
      </Card>
    </>
  );
}
