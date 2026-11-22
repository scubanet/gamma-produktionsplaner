"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, EmptyState, Notice, QrBild, Skeleton, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { fehlerText } from "@/lib/fehler";
import { formatDatum, formatMenge } from "@/lib/format";
import { kisteTitel, kistenZustand } from "@/lib/packliste";
import { qrMatrix } from "@/lib/qr";

// Codes der Kisten und Beutel eines Spiels am Bildschirm, zum Scannen mit dem Handy. Gedacht für Proben, solange
// der Etikettendruck (Etappe 3) fehlt, und als Notweg, wenn ein Etikett unlesbar ist. Der Text des Codes kommt
// aus der Datenbank (qr_text), genau wie er aufs Etikett gedruckt wird.
type Kiste = { kiste_id: string; code: string; laufnummer: number; kisten_im_spiel: number; zustand: string; produkt: string | null; beutel: number; qr_text: string };
type Beutel = { lagereinheit_id: string; seriennummer: string; produkt_id: string; imBedarf: boolean; produkt: string; produkt_code: string; menge: number; einheit: string; verbrauchen_bis: string; qr_text: string };
type Daten = { titel: string; kisten: Kiste[]; beutel: Beutel[] };

const HOECHSTENS = 60;

async function laden(service: string): Promise<Daten> {
  const [spiel, kisten, soll, beutel] = await Promise.all([
    supabase.from("service").select("name, datum, anlass(name)").eq("id", service).maybeSingle(),
    supabase.from("etikett_kiste").select("kiste_id, code, laufnummer, kisten_im_spiel, zustand, produkt, beutel, qr_text").eq("service_id", service).neq("zustand", "aufgeloest").order("laufnummer"),
    supabase.from("packliste").select("produkt_id").eq("service_id", service),
    // Alle Beutel im Lager, auch für Produkte ausserhalb des Bedarfs: so lässt sich auch «nicht im Bedarf» proben.
    supabase.from("etikett_beutel").select("lagereinheit_id, seriennummer, produkt_id, produkt, produkt_code, menge, einheit, verbrauchen_bis, qr_text").eq("zustand", "im_lager").order("verbrauchen_bis").order("produkt").order("seriennummer").limit(HOECHSTENS),
  ]);
  if (spiel.error || kisten.error || soll.error || beutel.error) throw spiel.error ?? kisten.error ?? soll.error ?? beutel.error;
  const imBedarf = new Set((soll.data ?? []).map((z) => z.produkt_id));
  const s = spiel.data as unknown as { name: string; datum: string | null; anlass: { name: string } | null } | null;
  return {
    titel: s ? `${s.anlass?.name ?? "[Anlass]"} · ${s.name}${s.datum ? ` · ${formatDatum(s.datum)}` : ""}` : "[Spiel]",
    kisten: (kisten.data ?? []) as unknown as Kiste[],
    // Produkte aus dem Bedarf des Spiels zuerst.
    beutel: ((beutel.data ?? []) as unknown as Beutel[]).map((b) => ({ ...b, imBedarf: imBedarf.has(b.produkt_id) })).sort((a, b) => Number(b.imBedarf) - Number(a.imBedarf)),
  };
}

function Seite() {
  const service = useSearchParams().get("service") ?? "";
  const [daten, setDaten] = useState<Daten | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  useEffect(() => {
    if (!service) return;
    let gilt = true;
    laden(service).then(
      (d) => gilt && setDaten(d),
      (e: Error) => gilt && setFehler(fehlerText(e)),
    );
    return () => {
      gilt = false;
    };
  }, [service]);

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb"><a href={`/packliste/?service=${service}`}>Packliste</a></div>
          <h1 className="pl-h1">Codes zum Scannen</h1>
          <div className="pl-sub">{daten?.titel ?? "QR-Codes der Kisten und der Beutel im Lager, zum Scannen vom Bildschirm."}</div>
        </div>
        <div className="pl-actions pl-print-hide">
          <Button icon="print" onClick={() => window.print()}>Drucken</Button>
        </div>
      </header>

      <Notice title="Für Proben, solange der Etikettendruck fehlt">
        Die Codes sind dieselben wie auf den Etiketten. Ein Scan auf der Seite «Scannen» bucht wirklich: Der Beutel liegt danach in der Kiste.
      </Notice>
      {fehler ? <Notice role="alert" title="Codes nicht geladen">{fehler}</Notice> : null}

      {!service ? (
        <EmptyState title="Kein Spiel gewählt" text="Die Seite öffnet sich von der Packliste eines Spiels aus." href="/packliste/" actionLabel="Zur Packliste" />
      ) : !daten ? (
        fehler ? null : <Skeleton variant="karte" label="Codes werden geladen" />
      ) : (
        <>
          <Card title="Kisten" meta={`${daten.kisten.length} ${daten.kisten.length === 1 ? "Kiste" : "Kisten"} dieses Spiels`}>
            {daten.kisten.length ? (
              <div className="pl-grid-3">
                {daten.kisten.map((k) => (
                  <div key={k.kiste_id} className="pl-stack">
                    <QrBild matrix={qrMatrix(k.qr_text)} label={`QR-Code ${kisteTitel(k)}`} size="lg" />
                    <div>
                      <strong>{kisteTitel(k)}</strong> <StatusPill status={kistenZustand(k.zustand).pill}>{kistenZustand(k.zustand).text}</StatusPill>
                      <div className="pl-mono">{k.code}</div>
                      <div className="pl-small">{k.produkt ? `${k.produkt} · ${k.beutel} Beutel` : "leer"}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pl-muted">Noch keine Kiste. Auf der Packliste oder beim Scannen eine anlegen.</p>
            )}
          </Card>
          <Card title="Beutel im Lager" meta={`Zuerst die Produkte aus dem Bedarf dieses Spiels, darin die zuerst ablaufenden${daten.beutel.length >= HOECHSTENS ? `; die ersten ${HOECHSTENS}` : ""}`}>
            {daten.beutel.length ? (
              <div className="pl-grid-3">
                {daten.beutel.map((b) => (
                  <div key={b.lagereinheit_id} className="pl-stack">
                    <QrBild matrix={qrMatrix(b.qr_text)} label={`QR-Code Beutel ${b.seriennummer}`} size="lg" />
                    <div>
                      <strong>{b.produkt}</strong>{b.imBedarf ? null : <> <StatusPill status="neutral">nicht im Bedarf dieses Spiels</StatusPill></>}
                      <div className="pl-mono">{b.produkt_code} · {b.seriennummer}</div>
                      <div className="pl-small">{formatMenge(b.menge, b.einheit)} · verbrauchen bis {formatDatum(b.verbrauchen_bis)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="pl-muted">Im Lager liegt kein Beutel. Unter «Lager» ein Produkt einlagern oder im Küchenpass Etiketten anlegen.</p>
            )}
          </Card>
        </>
      )}
    </>
  );
}

export default function Codes() {
  return (
    <Suspense>
      <Seite />
    </Suspense>
  );
}
