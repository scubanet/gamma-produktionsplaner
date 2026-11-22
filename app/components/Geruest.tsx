"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BILDMARKE, BILDMARKE_MONO, Notice, Tabs, TopNav, UserMenu } from "@/lib/planer";
import { hauptnav, seitenTabs, unternav } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { sichtbar, stufeLabel } from "@/lib/stufe";
import { useSitzung, useStufe } from "./Anmeldung";

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
  const stufe = useStufe();
  useSeitentitel();
  const router = useRouter();
  // «Scannen» sieht den Leitstand nicht: ihre Startseite ist die Seite «Scannen».
  const zumScannen = stufe === "scannen" && pfad === "/";
  useEffect(() => {
    if (zumScannen) router.replace("/scannen/");
  }, [zumScannen, router]);
  // Scannen am Handy: eigene Fläche ohne die übrige Navigation (Design System, ScanFlaeche).
  if (sichtbar(stufe, pfad) && (pfad === "/scannen" || pfad.startsWith("/scannen/"))) return <div className="pl-root">{children}</div>;
  return (
    <div className="pl-app pl-app--top">
      {/* Auf jeder Seite: Bereiche, wer angemeldet ist, und abmelden. Nach dem Abmelden leitet <Anmeldung> zur Anmeldeseite. */}
      <TopNav
        brandSrc={BILDMARKE}
        brandMono={BILDMARKE_MONO}
        items={hauptnav(pfad, stufe)}
        actions={
          <UserMenu
            name={(sitzung?.user.user_metadata?.name as string | undefined) || undefined}
            email={sitzung?.user.email}
            onSignOut={() => supabase.auth.signOut()}
          />
        }
      />
      <Tabs label="Seiten des Bereichs" tone="sunken" items={unternav(pfad, stufe)} />
      <main className="pl-main">
        <Tabs label="Ansichten" items={seitenTabs(pfad, stufe)} />
        {/* Seiten ausserhalb der Stufe gar nicht laden (z.B. über ein Lesezeichen). Die Datenbank sperrt unabhängig davon. */}
        {sichtbar(stufe, pfad) ? children : (
          <>
            <header className="pl-head"><div><h1 className="pl-h1">Nicht freigegeben</h1></div></header>
            <Notice title={`Diese Seite gehört nicht zur Stufe «${stufeLabel(stufe)}»`}>
              Deine Stufe ändert ein Administrator in der Benutzerverwaltung.{" "}
              {stufe === "scannen" ? <Link href="/scannen/">Zum Scannen</Link> : <Link href="/">Zum Leitstand</Link>}
            </Notice>
          </>
        )}
      </main>
    </div>
  );
}
