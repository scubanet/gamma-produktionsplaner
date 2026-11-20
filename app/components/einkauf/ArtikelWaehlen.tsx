"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, EmptyState, ItemList, Notice, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatChf } from "@/lib/offerte";
import { fehlerText } from "@/lib/fehler";

export type GewaehlterArtikel = { id: string; name: string };
type Artikel = GewaehlterArtikel & { einheit: string | null; preis_pro_einheit: number | null; artikelnummer: string | null };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

/** Artikel in der Preisliste suchen und einen wählen. Gespeichert wird beim Aufrufer (onWahl). */
export function ArtikelWaehlen({ titel, meta, offen, gesperrt, fehler, onClose, onWahl }: {
  titel: string;
  meta?: string;
  offen: boolean;
  gesperrt: boolean;
  fehler: string | null;
  onClose: () => void;
  onWahl: (a: GewaehlterArtikel) => void;
}) {
  const [suche, setSuche] = useState("");
  const [treffer, setTreffer] = useState<Artikel[] | null>(null);
  const [suchFehler, setSuchFehler] = useState<string | null>(null);
  const begriff = suche.trim();

  useEffect(() => {
    if (!offen || begriff.length < 2) return;
    let gilt = true;
    // Platzhalter % und _ der Suche entschärfen.
    const muster = `%${begriff.replace(/[%_\\]/g, "\\$&")}%`;
    supabase
      .from("artikel")
      .select("id, name, einheit, preis_pro_einheit, artikelnummer")
      .eq("aktiv", true)
      .ilike("name", muster)
      .order("name")
      .limit(30)
      .then((r) => {
        if (!gilt) return;
        if (r.error) return setSuchFehler(fehlerText(r.error));
        setSuchFehler(null);
        setTreffer(r.data);
      });
    return () => {
      gilt = false;
    };
  }, [offen, begriff]);

  const liste = begriff.length >= 2 ? treffer : null;

  return (
    <Dialog
      open={offen}
      id="artikel-waehlen"
      title={titel}
      meta={meta}
      onClose={onClose}
      onCancel={(e) => gesperrt && e.preventDefault()}
      actions={<Button onClick={onClose} disabled={gesperrt}>Schliessen</Button>}
    >
      <TextField id="artikel-waehlen-suche" type="search" label="Artikel suchen" value={suche} onChange={(e) => setSuche(wert(e))} hint="Mindestens 2 Zeichen." />
      {liste ? (
        liste.length ? (
          <ItemList
            label="Artikel"
            onSelect={(id) => {
              const a = liste.find((x) => x.id === id);
              if (a && !gesperrt) onWahl({ id: a.id, name: a.name });
            }}
            groups={[{ items: liste.map((a) => ({ id: a.id, label: a.name, sub: `${a.artikelnummer ?? "[Artikelnummer]"} · ${a.preis_pro_einheit === null ? "[Preis]" : formatChf(a.preis_pro_einheit)} / ${a.einheit ?? "[Einheit]"}` })) }]}
          />
        ) : (
          <EmptyState title="Kein Artikel gefunden" />
        )
      ) : null}
      {liste?.length === 30 ? <p className="pl-small">Es werden die ersten 30 Treffer gezeigt. Suche eingrenzen.</p> : null}
      {suchFehler ? <Notice role="alert" title="Suche fehlgeschlagen">{suchFehler}</Notice> : null}
      {fehler ? <Notice role="alert" title="Nicht gespeichert">{fehler}</Notice> : null}
    </Dialog>
  );
}
