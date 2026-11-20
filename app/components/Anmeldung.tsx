"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Button, Notice, Skeleton } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { ANMELDEN } from "@/lib/navigation";
import { beiSitzungsende, fehlerText } from "@/lib/fehler";
import { stufeAus, type Stufe } from "@/lib/stufe";

const SitzungKontext = createContext<Session | null>(null);
export const useSitzung = () => useContext(SitzungKontext);

// Die Stufe steuert nur, was die App zeigt; was jemand darf, entscheidet die Datenbank.
const StufeKontext = createContext<Stufe>("kueche");
export const useStufe = () => useContext(StufeKontext);

// Zuletzt bekannte Stufe im Browser. Nur für die Anzeige; die Sperre liegt in der Datenbank.
const MERK = "planer.stufe";
function gemerkt(benutzerId: string): Stufe | null {
  try {
    const w = JSON.parse(localStorage.getItem(MERK) ?? "null") as { fuer?: string; stufe?: unknown } | null;
    return w?.fuer === benutzerId ? stufeAus(w.stufe) : null;
  } catch {
    return null;
  }
}
function merken(benutzerId: string, stufe: Stufe) {
  try {
    localStorage.setItem(MERK, JSON.stringify({ fuer: benutzerId, stufe }));
  } catch {
    // Ohne Speicher (privates Fenster) lädt die Stufe jedes Mal neu.
  }
}

// Geschützte Routen: ohne Sitzung zur Anmeldung. Statischer Export, darum Prüfung im Browser;
// die eigentliche Sperre ist Row Level Security in der Datenbank (anonym sieht nichts).
export function Anmeldung({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pfad = usePathname();
  const [sitzung, setSitzung] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSitzung(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSitzung(s));
    // Meldet die Datenbank «Sitzung abgelaufen»: zuerst das Token erneuern (oft genügt das, z.B. wenn die Uhr des Geräts nachgeht);
    // die Seite und ungespeicherte Eingaben bleiben dann stehen. Erst wenn das scheitert, lokal abmelden: der nächste Effekt
    // leitet zur Anmeldung und merkt sich die Seite.
    let erneuert = false;
    beiSitzungsende(() => {
      if (erneuert) return;
      erneuert = true;
      void supabase.auth.refreshSession().then(({ error }) => {
        erneuert = false;
        if (error) void supabase.auth.signOut({ scope: "local" });
      });
    });
    return () => {
      beiSitzungsende(null);
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (sitzung === null) router.replace(`${ANMELDEN}?weiter=${encodeURIComponent(pfad)}`);
  }, [sitzung, pfad, router]);

  // Stufe pro Benutzer: die zuletzt bekannte sofort (sonst wartet jede Seite auf eine Abfrage mehr), der Abgleich mit
  // der Datenbank läuft bei jedem Laden im Hintergrund. Ohne bekannte Stufe zeigt die App nichts, statt Preise oder
  // Knöpfe auf Verdacht.
  const benutzerId = sitzung?.user.id;
  const [stufe, setStufe] = useState<{ fuer: string; stufe: Stufe } | { fuer: string; fehler: string } | null>(null);
  const [versuch, setVersuch] = useState(0);
  const alt = useMemo(() => (benutzerId ? gemerkt(benutzerId) : null), [benutzerId]);
  useEffect(() => {
    if (!benutzerId) return;
    let aktuell = true;
    supabase.rpc("stufe").then((r) => {
      if (!aktuell) return;
      // Mit der gemerkten Stufe weiterarbeiten, wenn die Abfrage scheitert (z.B. kurz ohne Netz).
      if (r.error && alt) return;
      // PGRST202: Die Funktion gibt es noch nicht (Migration 43 nicht eingespielt). Dann gibt es auch keine Stufe «Küche».
      if (r.error) return setStufe(r.error.code === "PGRST202" ? { fuer: benutzerId, stufe: "benutzer" } : { fuer: benutzerId, fehler: fehlerText(r.error) });
      const neu = stufeAus(r.data);
      merken(benutzerId, neu);
      setStufe({ fuer: benutzerId, stufe: neu });
    });
    return () => {
      aktuell = false;
    };
  }, [benutzerId, versuch, alt]);

  if (!sitzung) return <div className="pl-main"><Skeleton variant="karte" label="Anmeldung wird geprüft" /></div>;
  const meine = stufe && stufe.fuer === benutzerId ? stufe : alt ? { fuer: benutzerId, stufe: alt } : null;
  if (!meine) return <div className="pl-main"><Skeleton variant="karte" label="Berechtigung wird geladen" /></div>;
  if ("fehler" in meine) {
    return (
      <div className="pl-main">
        <Notice role="alert" title="Berechtigung nicht geladen">{meine.fehler}</Notice>
        <div className="pl-actions">
          <Button variant="primary" onClick={() => { setStufe(null); setVersuch((v) => v + 1); }}>Nochmals versuchen</Button>
          <Button onClick={() => supabase.auth.signOut()}>Abmelden</Button>
        </div>
      </div>
    );
  }
  return (
    <SitzungKontext.Provider value={sitzung}>
      <StufeKontext.Provider value={meine.stufe}>{children}</StufeKontext.Provider>
    </SitzungKontext.Provider>
  );
}
