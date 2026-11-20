"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Skeleton } from "@/lib/planer";
import { supabase } from "@/lib/supabase";
import { ANMELDEN } from "@/lib/navigation";
import { beiSitzungsende } from "@/lib/fehler";

const SitzungKontext = createContext<Session | null>(null);
export const useSitzung = () => useContext(SitzungKontext);

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

  if (!sitzung) return <div className="pl-main"><Skeleton variant="karte" label="Anmeldung wird geprüft" /></div>;
  return <SitzungKontext.Provider value={sitzung}>{children}</SitzungKontext.Provider>;
}
