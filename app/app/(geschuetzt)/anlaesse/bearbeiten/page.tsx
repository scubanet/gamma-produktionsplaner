"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Notice, StatusPill } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { alleSeiten } from "@/lib/seiten";
import { formatDatum } from "@/lib/format";
import { ANLASS_SPALTEN, statusLabel, statusPill, zeitraum, type Anlass, type LinieGericht, type LinieKomponente, type Menuelinie, type Service } from "@/lib/anlass";
import { AnlassKopf, type Stamm } from "@/components/anlass/AnlassKopf";
import { Services } from "@/components/anlass/Services";
import { Geschirr } from "@/components/anlass/Geschirr";
import { Menuelinien, type KatalogGericht, type LinieGaeste } from "@/components/anlass/Menuelinien";
import { Karten, type Vorlage } from "@/components/anlass/Karten";

type Daten = {
  anlass: Anlass | null;
  services: Service[];
  linien: Menuelinie[];
  gaeste: LinieGaeste[];
  gerichte: LinieGericht[];
  komponenten: LinieKomponente[];
  karten: Vorlage[];
  vorlagen: Vorlage[];
};

const LEER = "00000000-0000-0000-0000-000000000000";

async function stammLaden(): Promise<Stamm & { katalog: KatalogGericht[] }> {
  const [s, b, a, g] = await Promise.all([
    supabase.from("saison").select("id, name").order("name"),
    supabase.from("betrieb").select("code, name, faktor_vk").order("name"),
    supabase.from("angebotsform").select("code, name").order("reihenfolge"),
    supabase.from("gericht_katalog").select("id, name, gang, kategorie").order("name"),
  ]);
  for (const x of [s, b, a, g]) if (x.error) throw x.error;
  return { saisons: s.data ?? [], betriebe: b.data ?? [], angebotsformen: a.data ?? [], katalog: g.data ?? [] };
}

async function laden(id: string): Promise<Daten> {
  const [a, sv, l, lg, v] = await Promise.all([
    supabase.from("anlass").select(ANLASS_SPALTEN).eq("id", id).maybeSingle(),
    supabase.from("service").select("*").eq("anlass_id", id),
    supabase.from("menuelinie").select("*").eq("anlass_id", id),
    supabase.from("menuelinie_gaeste").select("menuelinie_id, gaeste, herleitung, services").eq("anlass_id", id),
    supabase.from("karte_uebersicht").select("id, name, anlass_id, anlass, positionen").order("name"),
  ]);
  for (const x of [a, sv, l, lg, v]) if (x.error) throw x.error;
  const linienIds = (l.data ?? []).map((x) => x.id);
  const gerichte = await alleSeiten((von, bis) =>
    supabase.from("menuelinie_gericht").select("*").in("menuelinie_id", linienIds.length ? linienIds : [LEER]).order("id").range(von, bis),
  );
  const gerichtIds = gerichte.map((x) => x.id);
  // Grosse Anlässe haben Hunderte Komponentenzeilen (Spengler Cup 344): seitenweise laden.
  const komponenten = await alleSeiten((von, bis) =>
    supabase.from("menuelinie_komponente").select("*").in("linie_gericht_id", gerichtIds.length ? gerichtIds : [LEER]).order("id").range(von, bis),
  );
  const vorlagen = (v.data ?? []).map((x) => ({ id: x.id ?? "", name: x.name ?? "", anlassId: x.anlass_id, anlass: x.anlass, positionen: x.positionen ?? 0 }));
  return {
    anlass: a.data,
    services: sv.data ?? [],
    linien: l.data ?? [],
    gaeste: lg.data ?? [],
    gerichte,
    komponenten,
    karten: vorlagen.filter((x) => x.anlassId === id),
    vorlagen,
  };
}

function Bearbeiten() {
  const id = useSearchParams().get("id") ?? "";
  const [stamm, setStamm] = useState<(Stamm & { katalog: KatalogGericht[] }) | null>(null);
  const [daten, setDaten] = useState<Daten | null>(null);
  const [hinweis, setHinweis] = useState<{ titel: string; text: string } | null>(null);
  const [meldung, setMeldung] = useState("");
  const meldungRef = useRef<HTMLParagraphElement>(null);
  const anfrage = useRef(0);

  // Nur die jüngste Antwort zählt.
  const neuLaden = useCallback(() => {
    const nr = ++anfrage.current;
    return laden(id).then(
      (d) => {
        if (nr === anfrage.current) setDaten(d);
      },
      (e: Error) => {
        if (nr === anfrage.current) setHinweis({ titel: "Anlass nicht geladen", text: e.message });
      },
    );
  }, [id]);

  useEffect(() => {
    if (!id) return;
    stammLaden().then(setStamm, (e: Error) => setHinweis({ titel: "Stammdaten nicht geladen", text: e.message }));
    neuLaden();
  }, [id, neuLaden]);

  if (!id) return <Notice title="Kein Anlass gewählt">Bitte einen Anlass aus der Liste öffnen.</Notice>;
  if (daten && !daten.anlass) return <Notice title="Anlass nicht gefunden">Den Anlass gibt es nicht oder er wurde gelöscht.</Notice>;

  // Fokus auf die Meldung: der geklickte Button kann nach dem Neuladen verschwunden sein.
  const melden = (text: string) => {
    setHinweis(null);
    setMeldung(text);
    requestAnimationFrame(() => meldungRef.current?.focus());
  };
  const fehler = (titel: string, text: string) => {
    setHinweis({ titel, text });
    setMeldung("");
  };
  const a = daten?.anlass ?? null;

  return (
    <>
      <header className="pl-head">
        <div>
          <div className="pl-crumb">
            <a href="/anlaesse/">Anlässe</a> · {a ? `${a.nummer ?? "[Nummer]"} · ${zeitraum(a.datum, a.datum_bis, formatDatum)} · ${a.ort ?? "[Ort]"}` : "…"}
          </div>
          <h1 className="pl-h1">{a?.name ?? "Anlass"}</h1>
        </div>
        {a ? <StatusPill status={statusPill(a.status)}>{statusLabel(a.status)}</StatusPill> : null}
      </header>

      {hinweis ? <Notice role="alert" title={hinweis.titel}>{hinweis.text}</Notice> : null}
      {a?.status === "offerte" ? <Notice title="Das ist eine Offerte">Offerten werden unter Offerten bearbeitet und dort bestätigt.</Notice> : null}
      <p className="pl-small" role="status" tabIndex={-1} ref={meldungRef}>{meldung}</p>

      {daten && a && stamm ? (
        <>
          <AnlassKopf
            key={a.id}
            anlass={a}
            stamm={stamm}
            onFehler={(text) => setHinweis({ titel: "Nicht gespeichert", text })}
            onGespeichert={(neu) => {
              setHinweis(null);
              setDaten({ ...daten, anlass: neu });
              melden("Anlass gespeichert.");
            }}
          />
          <Services anlassId={a.id} services={daten.services} linien={daten.linien} onGeaendert={neuLaden} onMeldung={melden} onFehler={fehler} />
          <Menuelinien
            anlassId={a.id}
            linien={daten.linien}
            gaeste={daten.gaeste}
            gerichte={daten.gerichte}
            komponenten={daten.komponenten}
            katalog={stamm.katalog}
            onGeaendert={neuLaden}
            onMeldung={melden}
            onFehler={fehler}
          />
          <Geschirr
            anlassId={a.id}
            angebotsform={a.angebotsform}
            gaenge={[...new Set(daten.gerichte.map((g) => g.gang))]}
            onMeldung={melden}
            onFehler={fehler}
          />
          <Karten anlassId={a.id} karten={daten.karten} vorlagen={daten.vorlagen} onMeldung={melden} />
        </>
      ) : (
        <p className="pl-muted" role="status">{hinweis ? "Keine Daten." : "Anlass wird geladen …"}</p>
      )}
    </>
  );
}

export default function AnlassBearbeiten() {
  return (
    <Suspense>
      <Bearbeiten />
    </Suspense>
  );
}
