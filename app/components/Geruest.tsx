"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SideNav } from "@/lib/planer";
import { navEintraege } from "@/lib/navigation";

export function Geruest({ children }: { children: ReactNode }) {
  const pfad = usePathname();
  return (
    <div className="pl-app">
      <SideNav items={navEintraege(pfad)} />
      <main className="pl-main">{children}</main>
    </div>
  );
}
