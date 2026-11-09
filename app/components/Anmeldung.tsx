"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ANMELDEN } from "@/lib/navigation";

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
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (sitzung === null) router.replace(`${ANMELDEN}?weiter=${encodeURIComponent(pfad)}`);
  }, [sitzung, pfad, router]);

  if (!sitzung) return <p className="pl-main pl-muted" role="status">Anmeldung wird geprüft …</p>;
  return <SitzungKontext.Provider value={sitzung}>{children}</SitzungKontext.Provider>;
}
