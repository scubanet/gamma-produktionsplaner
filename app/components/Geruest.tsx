"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BILDMARKE, BILDMARKE_MONO, Tabs, TopNav, UserMenu } from "@/lib/planer";
import { hauptnav, seitenTabs, unternav } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useSitzung } from "./Anmeldung";

const PRODUKT = "Produktionsplaner";

/**
 * Titel im Browser-Tab aus der Überschrift der Seite: «Produktionsliste – Produktionsplaner», beim Rezept dessen Name.
 * Rezepte öffnen in neuen Tabs; ohne das heissen alle Tabs, der Verlauf und Lesezeichen gleich.
 */
function useSeitentitel() {
  useEffect(() => {
    const setzen = () => {
      const h1 = document.querySelector("main h1");
      // Solange die Überschrift lädt (Skelett), bleibt der bisherige Titel.
      if (!h1 || h1.querySelector(".pl-skel")) return;
      // Leerzeichen zusammenziehen wie der Browser beim Lesen von document.title: sonst gälte der Titel nie als gesetzt (Endlosschleife).
      const text = h1.textContent?.replace(/\s+/g, " ").trim();
      const titel = text ? `${text} – ${PRODUKT}` : `${PRODUKT} – GAMMA Catering`;
      if (document.title !== titel) document.title = titel;
    };
    setzen();
    // Die Überschrift ändert sich beim Seitenwechsel und nach dem Laden; Next setzt den Titel beim Wechsel zurück.
    const beobachter = new MutationObserver(setzen);
    beobachter.observe(document.body, { childList: true, subtree: true, characterData: true });
    const kopf = new MutationObserver(setzen);
    kopf.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      beobachter.disconnect();
      kopf.disconnect();
    };
  }, []);
}

export function Geruest({ children }: { children: ReactNode }) {
  const pfad = usePathname();
  const sitzung = useSitzung();
  useSeitentitel();
  return (
    <div className="pl-app pl-app--top">
      {/* Auf jeder Seite: Bereiche, wer angemeldet ist, und abmelden. Nach dem Abmelden leitet <Anmeldung> zur Anmeldeseite. */}
      <TopNav
        brandSrc={BILDMARKE}
        brandMono={BILDMARKE_MONO}
        items={hauptnav(pfad)}
        actions={
          <UserMenu
            name={(sitzung?.user.user_metadata?.name as string | undefined) || undefined}
            email={sitzung?.user.email}
            onSignOut={() => supabase.auth.signOut()}
          />
        }
      />
      <Tabs label="Seiten des Bereichs" tone="sunken" items={unternav(pfad)} />
      <main className="pl-main">
        <Tabs label="Ansichten" items={seitenTabs(pfad)} />
        {children}
      </main>
    </div>
  );
}
