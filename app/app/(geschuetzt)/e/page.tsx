"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, DataTable, EmptyState, Notice, Skeleton, StatusPill, TextField } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { fehlerText } from "@/lib/fehler";
import { formatDatum, formatMenge, formatZahl } from "@/lib/format";
import { ablaufStatus, ablaufText, herkunftText, type Einheit } from "@/lib/lager";
import { kisteGewichtText, kisteTitel, kistenZustand, type Kiste, type KisteGewicht } from "@/lib/packliste";
import { nachschlagenPfad, scanCodeLesen } from "@/lib/scan-code";

type InKiste = { kiste: { code: string; laufnummer: number; service: { name: string; datum: string | null; anlass: { name: string } } } | null; klaeren: string | null };
type BeutelInKiste = { id: string; seriennummer: string; menge: number; einheit: string; zustand: string; klaeren: string | null; charge: { verbrauchen_bis: string } | null };
type Fund =
  | { art: "beutel"; einheit: Einheit; regeneration: string | null; in: InKiste | null }
  | { art: "kiste"; kiste: Kiste; gewicht: KisteGewicht | null; beutel: BeutelInKiste[] }
  | { art: "nichts" };

const wert = (e: unknown) => (e as { target: HTMLInputElement }).target.value;
const ZUSTAND: Record<string, { text: string; pill: "ok" | "info" | "neutral" | "critical" }> = {
  im_lager: { text: "im Lager", pill: "ok" },
  in_kiste: { text: "in Kiste", pill: "info" },
  verbraucht: { text: "verbraucht", pill: "neutral" },
  entsorgt: { text: "entsorgt", pill: "critical" },
};

async function suchen(serie: string | null, kiste: string | null): Promise<Fund> {
  if (kiste) {
    const [k, g, b] = await Promise.all([
      supabase.from("etikett_kiste").select("*").eq("code", kiste).maybeSingle(),
      supabase.from("kiste_gewicht").select("*").eq("code", kiste).maybeSingle(),
      supabase.from("lagereinheit").select("id, seriennummer, menge, einheit, zustand, klaeren, charge(verbrauchen_bis), kiste!inner(code)").eq("kiste.code", kiste).order("seriennummer"),
    ]);
    if (k.error || g.error || b.error) throw k.error ?? g.error ?? b.error;
    return k.data ? { art: "kiste", kiste: k.data, gewicht: g.data, beutel: (b.data ?? []) as unknown as BeutelInKiste[] } : { art: "nichts" };
  }
  if (serie) {
    const [e, r, i] = await Promise.all([
      supabase.from("lager_einheit").select("*").eq("seriennummer", serie).maybeSingle(),
      supabase.from("etikett_beutel").select("regeneration").eq("seriennummer", serie).maybeSingle(),
      supabase.from("lagereinheit").select("klaeren, kiste(code, laufnummer, service(name, datum, anlass(name)))").eq("seriennummer", serie).maybeSingle(),
    ]);
    if (e.error || r.error || i.error) throw e.error ?? r.error ?? i.error;
    return e.data ? { art: "beutel", einheit: e.data, regeneration: r.data?.regeneration ?? null, in: i.data as unknown as InKiste | null } : { art: "nichts" };
  }
  return { art: "nichts" };
}

const Feld = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <div className="pl-label">{label}</div>
    <div>{children}</div>
  </div>
);

function Seite() {
  const router = useRouter();
  const parameter = useSearchParams();
  // Massgebend ist die Seriennummer; die Produktnummer im Code dient nur der Scan-App ohne Netz.
  const code = scanCodeLesen(parameter.get("k") ?? parameter.get("s") ?? "");
  const serie = code.art === "beutel" ? code.seriennummer : null;
  const kiste = code.art === "kiste" ? code.code : null;
  const gefragt = parameter.get("k") ?? parameter.get("s");
  const schluessel = `${serie ?? ""}|${kiste ?? ""}`;
  const [fund, setFund] = useState<{ fuer: string; f: Fund } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [eingabe, setEingabe] = useState("");
  const [eingabeFehler, setEingabeFehler] = useState(false);

  useEffect(() => {
    if (!serie && !kiste) return;
    let gilt = true;
    suchen(serie, kiste).then(
      (f) => {
        if (!gilt) return;
        setFund({ fuer: schluessel, f });
        setFehler(null);
      },
      (e: Error) => gilt && setFehler(fehlerText(e)),
    );
    return () => {
      gilt = false;
    };
  }, [serie, kiste, schluessel]);

  const f = fund && fund.fuer === schluessel ? fund.f : null;
  const laedt = (serie || kiste) && !f && !fehler;

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">Etikett</div>
          <h1 className="pl-h1">{f?.art === "beutel" ? f.einheit.produkt : f?.art === "kiste" ? `${kisteTitel(f.kiste)} · ${f.kiste.service}` : "Nachschlagen"}</h1>
          <div className="pl-sub">{f?.art === "beutel" ? `Beutel ${f.einheit.seriennummer} · ${f.einheit.produkt_code}` : f?.art === "kiste" ? `${f.kiste.anlass} · ${f.kiste.code}` : "Angaben zu einem Beutel oder einer Kiste."}</div>
        </div>
      </header>

      {fehler ? <Notice role="alert" title="Nicht geladen">{fehler}</Notice> : null}

      <div className="pl-print-hide">
        <Card title="Code eingeben" meta="Seriennummer unter dem QR-Code eines Beutels oder Code einer Kiste">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const pfad = nachschlagenPfad(scanCodeLesen(eingabe));
              setEingabeFehler(!pfad);
              if (pfad) {
                setEingabe("");
                router.push(pfad);
              }
            }}
          >
            <div className="pl-grid-2">
              <TextField id="e-code" label="Code" code value={eingabe} invalid={eingabeFehler} onChange={(e) => setEingabe(wert(e))} autoComplete="off" hint={eingabeFehler ? "Unbekannte Form. Beispiel: K7M4X2PA oder K-7BMHPP" : "z.B. K7M4X2PA oder K-7BMHPP"} />
              <div className="pl-actions pl-actions--unten">
                <Button variant="primary" type="submit" icon="search" disabled={!eingabe.trim()}>Nachschlagen</Button>
              </div>
            </div>
          </form>
        </Card>
      </div>

      {gefragt && code.art === "unbekannt" ? <Notice role="alert" title="Unbekannter Code">«{gefragt}» hat nicht die Form einer Seriennummer oder eines Kistencodes.</Notice> : null}
      {laedt ? <Skeleton variant="karte" label="Wird nachgeschlagen" /> : null}
      {f?.art === "nichts" ? <EmptyState title="Nichts gefunden" text={`Zu ${serie ?? kiste} gibt es keinen Beutel und keine Kiste.`} /> : null}

      {f?.art === "beutel" ? (
        <Card title="Beutel" meta={`${f.einheit.kategorie ?? "[Kategorie]"} · ${herkunftText(f.einheit)}`}>
          <div className="pl-grid-3">
            <Feld label="Zustand">
              <StatusPill status={ZUSTAND[f.einheit.zustand ?? ""]?.pill ?? "neutral"}>{ZUSTAND[f.einheit.zustand ?? ""]?.text ?? "[Zustand]"}</StatusPill>
              {f.einheit.zustand === "entsorgt" && f.einheit.entsorgt_grund ? ` (${f.einheit.entsorgt_grund})` : null}
              {f.in?.klaeren ? <> <StatusPill status="warn">zu klären</StatusPill></> : null}
            </Feld>
            <Feld label="Menge">{formatMenge(f.einheit.menge, f.einheit.einheit)}</Feld>
            <Feld label="Seriennummer"><span className="pl-mono">{f.einheit.seriennummer}</span></Feld>
            <Feld label="Produziert am"><span className={f.einheit.datum_annahme ? "pl-assumed" : undefined}>{formatDatum(f.einheit.produziert_am)}</span></Feld>
            <Feld label="Verbrauchen bis">
              {formatDatum(f.einheit.verbrauchen_bis)}{" "}
              {f.einheit.zustand === "im_lager" || f.einheit.zustand === "in_kiste" ? <StatusPill status={ablaufStatus(f.einheit.tage_bis_ablauf)}>{ablaufText(f.einheit.tage_bis_ablauf)}</StatusPill> : null}
            </Feld>
            <Feld label="Lagerung">{f.einheit.lagerung ?? "[Lagerung]"}</Feld>
            <Feld label="Regeneration">{f.regeneration ?? "[Regeneration]"}</Feld>
            <Feld label="Kiste">
              {f.in?.kiste ? (
                <a className="pl-link" href={nachschlagenPfad({ art: "kiste", code: f.in.kiste.code }) ?? undefined}>
                  Kiste {f.in.kiste.laufnummer} · {f.in.kiste.code}
                </a>
              ) : (
                "–"
              )}
            </Feld>
            <Feld label="Spiel">{f.in?.kiste ? `${f.in.kiste.service.anlass.name} · ${f.in.kiste.service.name}${f.in.kiste.service.datum ? ` · ${formatDatum(f.in.kiste.service.datum)}` : ""}` : "noch keinem Spiel zugeteilt"}</Feld>
          </div>
          <p className="pl-small"><span className="pl-assumed">Produziert am</span> gestrichelt: Datum von Hand gesetzt (Annahme). Allergene: siehe Rezept.</p>
        </Card>
      ) : null}

      {f?.art === "kiste" ? (
        <>
          <Card title="Kiste" meta={f.kiste.menuelinie ? `Menülinie ${f.kiste.menuelinie}` : undefined}>
            <div className="pl-grid-3">
              <Feld label="Zustand">
                <StatusPill status={kistenZustand(f.kiste.zustand).pill}>{kistenZustand(f.kiste.zustand).text}</StatusPill>
                {(f.kiste.zu_klaeren ?? 0) > 0 ? <> <StatusPill status="warn">{`${formatZahl(f.kiste.zu_klaeren ?? 0)} zu klären`}</StatusPill></> : null}
              </Feld>
              <Feld label="Spiel">{`${f.kiste.service}${f.kiste.datum ? ` · ${formatDatum(f.kiste.datum)}` : ""}`}</Feld>
              <Feld label="Code"><span className="pl-mono">{f.kiste.code}</span></Feld>
              <Feld label="Inhalt">{f.kiste.produkt ? `${f.kiste.produkt} · ${f.kiste.produkt_code}` : "leer"}</Feld>
              <Feld label="Beutel und Menge">{`${formatZahl(f.kiste.beutel ?? 0)} Beutel${f.kiste.menge_text ? ` · ${f.kiste.menge_text}` : ""}`}</Feld>
              <Feld label="Frühestes Verbrauchsdatum">{formatDatum(f.kiste.fruehestes_datum)}</Feld>
              <Feld label="Lagerung">{f.kiste.lagerung ?? ((f.kiste.beutel ?? 0) > 0 ? "[Lagerung]" : "–")}</Feld>
              <Feld label="Gebinde">{f.gewicht?.gebinde ?? "[Gebinde]"}</Feld>
              <Feld label="Gewicht"><span className={f.gewicht?.liter_annahme ? "pl-assumed" : undefined}>{kisteGewichtText(f.gewicht ?? undefined)}</span></Feld>
            </div>
            {f.gewicht?.herleitung ? <p className="pl-small">Gewicht: {f.gewicht.herleitung}</p> : null}
          </Card>
          <Card title="Beutel in der Kiste" meta={`${formatZahl(f.beutel.length)} Beutel`}>
            {f.beutel.length ? (
              <DataTable
                columns={[
                  { key: "seriennummer", label: "Seriennummer", render: (r) => <a className="pl-link pl-mono" href={nachschlagenPfad({ art: "beutel", seriennummer: r.seriennummer as string, produktNr: null }) ?? undefined}>{r.seriennummer as string}</a> },
                  { key: "menge", label: "Menge", numeric: true, render: (r) => formatMenge(r.menge as number, r.einheit as string) },
                  { key: "bis", label: "Verbrauchen bis", numeric: true, render: (r) => formatDatum((r.charge as BeutelInKiste["charge"])?.verbrauchen_bis ?? null) },
                  { key: "zustand", label: "Zustand", render: (r) => <>{ZUSTAND[r.zustand as string]?.text ?? "[Zustand]"}{r.klaeren ? <> <StatusPill status="warn">zu klären</StatusPill></> : null}</> },
                ]}
                rows={f.beutel}
              />
            ) : (
              <p className="pl-muted">Die Kiste ist leer.</p>
            )}
          </Card>
        </>
      ) : null}
    </>
  );
}

export default function Nachschlagen() {
  return (
    <Suspense>
      <Seite />
    </Suspense>
  );
}
