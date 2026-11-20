"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Etikett, Notice, Skeleton, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { fehlerText } from "@/lib/fehler";
import { formatDatum, formatZahl } from "@/lib/format";
import {
  etikettEingabe, etikettFormular, vorschauDatum, vorschauFelder, vorschauZaehler, vorschlagHinweis,
  type EtikettFormular, type EtikettGrundlage, type EtikettVorschlag,
} from "@/lib/etikett";

type Props = {
  saisonId: string;
  komponenteId: string;
  komponente: string;
  welle: number;
  einheit: string | null;
  /** Stand der Zeile in der Checkliste: Tag des Abhakens und das daraus gerechnete Verbrauchsdatum. */
  grundlage: EtikettGrundlage;
  onClose: () => void;
  /** Nach dem Anlegen: die Seite lädt den Stand neu. */
  onErstellt: () => void;
};

type Ergebnis = { anzahl: number; produziert_am: string; verbrauchen_bis: string; seriennummern: string[] };
const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;

/**
 * Etiketten für eine abgehakte Zeile des Küchenpasses anlegen: Vorschlag aus der Datenbank, übersteuerbar, mit Vorschau.
 * «Anlegen» legt Charge und Beutel im Lager an und stellt die Etiketten in die Druckaufträge.
 */
export function EtikettenDialog({ saisonId, komponenteId, komponente, welle, einheit, grundlage, onClose, onErstellt }: Props) {
  const [offen, setOffen] = useState(true);
  // undefined = lädt, null = kein Vorschlag für diese Zeile.
  const [vorschlag, setVorschlag] = useState<EtikettVorschlag | null | undefined>(undefined);
  const [f, setF] = useState<EtikettFormular>(() => etikettFormular(null, grundlage));
  const [fehler, setFehler] = useState<string | null>(null);
  const [speichert, setSpeichert] = useState(false);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);

  useEffect(() => {
    let gilt = true;
    supabase
      .from("etikett_vorschlag")
      .select("*")
      .eq("saison_id", saisonId)
      .eq("komponente_id", komponenteId)
      .eq("welle_nr", welle)
      .then((r) => {
        if (!gilt) return;
        if (r.error) {
          setVorschlag(null);
          return setFehler(fehlerText(r.error));
        }
        // Eine Komponente kann in zwei Einheiten im Bedarf stehen: die Zeile der Einheit dieser Pass-Zeile.
        const v = (r.data ?? []).find((x) => x.einheit === einheit) ?? r.data?.[0] ?? null;
        setVorschlag(v);
        setF(etikettFormular(v, grundlage));
      });
    return () => {
      gilt = false;
    };
    // Der Dialog wird pro Zeile neu aufgebaut (key), die Angaben ändern sich während er offen ist nicht.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (teil: Partial<EtikettFormular>) => setF((alt) => ({ ...alt, ...teil }));
  const mengenEinheit = vorschlag?.einheit ?? einheit ?? "kg";

  async function anlegen() {
    const a = etikettEingabe(f, grundlage);
    if ("fehler" in a) return setFehler(a.fehler);
    setSpeichert(true);
    setFehler(null);
    const r = await supabase.rpc("etiketten_erstellen", { p_saison: saisonId, p_komponente: komponenteId, p_welle: welle, p_einheit: mengenEinheit, ...a });
    setSpeichert(false);
    if (r.error) return setFehler(fehlerText(r.error));
    setErgebnis(r.data as unknown as Ergebnis);
    onErstellt();
  }

  return (
    <Dialog
      open={offen}
      id="etiketten"
      title={`Etiketten: ${komponente}`}
      meta={`Welle ${welle} · abgehakt am ${grundlage.produziert_am ? formatDatum(grundlage.produziert_am) : "[Datum]"}`}
      onClose={onClose}
      onCancel={(e) => speichert && e.preventDefault()}
      actions={
        ergebnis ? (
          <Button variant="primary" onClick={() => setOffen(false)}>Schliessen</Button>
        ) : (
          <>
            <Button onClick={() => setOffen(false)} disabled={speichert}>Abbrechen</Button>
            <Button variant="primary" icon="print" onClick={anlegen} disabled={speichert || vorschlag === undefined}>
              {speichert ? "Wird angelegt …" : "Etiketten anlegen"}
            </Button>
          </>
        )
      }
    >
      {fehler ? <Notice role="alert" title="Nicht angelegt">{fehler}</Notice> : null}

      {ergebnis ? (
        <>
          <Notice role="status" title={`${formatZahl(ergebnis.anzahl)} Beutel im Lager angelegt`}>
            Produziert am {formatDatum(ergebnis.produziert_am)}, verbrauchen bis {formatDatum(ergebnis.verbrauchen_bis)}. Die Etiketten stehen in den
            Druckaufträgen; gedruckt wird, sobald der Drucker angeschlossen ist.
          </Notice>
          <div>
            <div className="pl-label">Seriennummern</div>
            <p className="pl-mono pl-small">{ergebnis.seriennummern.join(" · ")}</p>
          </div>
        </>
      ) : vorschlag === undefined ? (
        <Skeleton variant="zeile" label="Vorschlag wird geladen" />
      ) : (
        <>
          <p className="pl-small">
            {vorschlagHinweis(vorschlag)} {vorschlag?.herleitung ?? ""}
          </p>
          <div className="pl-grid-2">
            <TextField id="etikett-anzahl" label="Anzahl Beutel" numeric value={f.anzahl} onChange={(e) => set({ anzahl: wert(e) })} required />
            <TextField
              id="etikett-menge"
              label={`Menge pro Beutel in ${mengenEinheit}`}
              numeric
              value={f.menge}
              onChange={(e) => set({ menge: wert(e) })}
              hint={vorschlag?.liter_annahme ? "Annahme: 1 l = 1 kg" : undefined}
              required
            />
            <TextField
              id="etikett-produziert"
              type="date"
              label="Produziert am"
              value={f.produziert_am}
              onChange={(e) => set({ produziert_am: wert(e) })}
              hint="Tag des Abhakens; nur auf einen früheren Tag korrigierbar"
            />
            <TextField
              id="etikett-bis"
              type="date"
              label="Verbrauchen bis"
              value={f.verbrauchen_bis}
              onChange={(e) => set({ verbrauchen_bis: wert(e) })}
              hint={grundlage.haltbarkeit_tage === null ? "Haltbarkeit fehlt: von Hand setzen" : `leer = Produktionsdatum + ${grundlage.haltbarkeit_tage} Tage; nur kürzen möglich`}
              required={grundlage.haltbarkeit_tage === null}
            />
          </div>
          <div>
            <div className="pl-label">Vorschau (100 × 50 mm)</div>
            <Etikett
              kopf={vorschlag?.kategorie ?? "[Kategorie]"}
              zaehler={vorschauZaehler(f)}
              titel={vorschlag?.produkt ?? komponente}
              marke={vorschlag?.tk ? "TK" : undefined}
              felder={vorschauFelder(vorschlag, f, mengenEinheit)}
              datumLabel="Verbrauchen bis"
              datum={vorschauDatum(f, grundlage)}
              code={`${vorschlag?.produkt_code ?? "[Produkt]"} · Seriennummer`}
            />
            <p className="pl-small">Den QR-Code und die Seriennummer setzt die Datenbank beim Anlegen. Kein Anlass und keine Menülinie: diese stehen nur auf dem Kisten-Etikett.</p>
          </div>
        </>
      )}
    </Dialog>
  );
}
