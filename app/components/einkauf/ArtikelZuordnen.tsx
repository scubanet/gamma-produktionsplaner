"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, ItemList, Notice, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { formatChf } from "@/lib/offerte";

type Artikel = { id: string; name: string; einheit: string | null; preis_pro_einheit: number | null; artikelnummer: string | null };
export type Ziel = { komponenteId: string; komponente: string; einheit: string | null; artikel: string | null };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

/** Hauptartikel einer Komponente von Hand zuordnen (Verknüpfung Komponente → Artikel). */
export function ArtikelZuordnen({ ziel, offen, onClose, onGespeichert }: {
  ziel: Ziel | null;
  offen: boolean;
  onClose: () => void;
  onGespeichert: (text: string) => void;
}) {
  const [suche, setSuche] = useState("");
  const [treffer, setTreffer] = useState<Artikel[] | null>(null);
  const [fehler, setFehler] = useState<{ titel: string; text: string } | null>(null);
  const [speichert, setSpeichert] = useState(false);
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
        if (r.error) return setFehler({ titel: "Suche fehlgeschlagen", text: r.error.message });
        setFehler(null);
        setTreffer(r.data);
      });
    return () => {
      gilt = false;
    };
  }, [offen, begriff]);

  async function setzen(artikelId: string | null) {
    if (!ziel || speichert) return;
    // Name vor dem Speichern festhalten: die Trefferliste kann sich während des Wartens ändern.
    const name = treffer?.find((a) => a.id === artikelId)?.name ?? "[Artikel]";
    setSpeichert(true);
    setFehler(null);
    const r = await supabase.from("komponente").update({ hauptartikel_id: artikelId }).eq("id", ziel.komponenteId).select("id");
    setSpeichert(false);
    if (r.error || !r.data?.length) return setFehler({ titel: "Nicht gespeichert", text: r.error?.message ?? "Komponente nicht gefunden oder keine Berechtigung." });
    onGespeichert(artikelId ? `${ziel.komponente}: Hauptartikel ${name} zugeordnet.` : `${ziel.komponente}: Zuordnung entfernt.`);
  }

  const liste = begriff.length >= 2 ? treffer : null;

  return (
    <Dialog
      open={offen}
      id="artikel-zuordnen"
      title={ziel ? `Hauptartikel für ${ziel.komponente}` : "Hauptartikel"}
      meta={ziel?.artikel ? `heute: ${ziel.artikel}` : "noch kein Artikel"}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        <>
          {ziel?.artikel ? <Button onClick={() => setzen(null)} disabled={speichert}>Zuordnung entfernen</Button> : null}
          <Button onClick={onClose} disabled={speichert}>Schliessen</Button>
        </>
      }
    >
      <TextField id="artikel-suche" type="search" label="Artikel suchen" value={suche} onChange={(e) => setSuche(wert(e))} hint={`Mindestens 2 Zeichen. Die Menge der Komponente (${ziel?.einheit ?? "[Einheit]"}) wird nur umgerechnet, wenn der Artikel dieselbe Einheit hat.`} />
      {liste ? (
        liste.length ? (
          <ItemList
            label="Artikel"
            onSelect={setzen}
            groups={[{ items: liste.map((a) => ({ id: a.id, label: a.name, sub: `${a.artikelnummer ?? "[Artikelnummer]"} · ${a.preis_pro_einheit === null ? "[Preis]" : formatChf(a.preis_pro_einheit)} / ${a.einheit ?? "[Einheit]"}` })) }]}
          />
        ) : (
          <p className="pl-muted">Kein Artikel gefunden.</p>
        )
      ) : null}
      {liste?.length === 30 ? <p className="pl-small">Es werden die ersten 30 Treffer gezeigt. Suche eingrenzen.</p> : null}
      {fehler ? <Notice role="alert" title={fehler.titel}>{fehler.text}</Notice> : null}
    </Dialog>
  );
}
