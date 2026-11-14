"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Button, SideNav } from "@/lib/planer";
import { navEintraege } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useSitzung } from "./Anmeldung";

export function Geruest({ children }: { children: ReactNode }) {
  const pfad = usePathname();
  const sitzung = useSitzung();
  return (
    <div className="pl-app">
      <SideNav items={navEintraege(pfad)} />
      <main className="pl-main">
        {/* Auf jeder Seite: wer angemeldet ist, und abmelden. Nach dem Abmelden leitet <Anmeldung> zur Anmeldeseite. */}
        <div className="pl-actions pl-print-hide" style={{ justifyContent: "flex-end" }}>
          <span className="pl-small">{sitzung?.user.email}</span>
          <Button onClick={() => supabase.auth.signOut()}>Abmelden</Button>
        </div>
        {children}
      </main>
    </div>
  );
}
