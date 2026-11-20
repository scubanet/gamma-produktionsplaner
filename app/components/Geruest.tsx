"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BILDMARKE, Button, Tabs, TopNav } from "@/lib/planer";
import { hauptnav, seitenTabs, unternav } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useSitzung } from "./Anmeldung";

export function Geruest({ children }: { children: ReactNode }) {
  const pfad = usePathname();
  const sitzung = useSitzung();
  return (
    <div className="pl-app pl-app--top">
      {/* Auf jeder Seite: Bereiche, wer angemeldet ist, und abmelden. Nach dem Abmelden leitet <Anmeldung> zur Anmeldeseite. */}
      <TopNav
        brandSrc={BILDMARKE}
        items={hauptnav(pfad)}
        actions={
          <>
            <span className="pl-small">{sitzung?.user.email}</span>
            <Button onClick={() => supabase.auth.signOut()}>Abmelden</Button>
          </>
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
