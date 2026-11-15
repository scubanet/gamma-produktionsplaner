"use client";
import { useEffect, useState } from "react";

/** Wahr, wenn das Fenster höchstens so breit ist (Standard 1000 px): dann gibt es keine Detailspalte, sondern den Dialog. Reagiert auf Drehen und Grössenänderung. */
export function useSchmal(maxBreite = 1000): boolean {
  const [schmal, setSchmal] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxBreite}px)`);
    const lesen = () => setSchmal(mq.matches);
    lesen();
    mq.addEventListener("change", lesen);
    return () => mq.removeEventListener("change", lesen);
  }, [maxBreite]);
  return schmal;
}
