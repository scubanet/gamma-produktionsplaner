const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtert Zeilen: jedes Wort der Suche muss in einem der Felder vorkommen. Umlaute, Akzente und Gross-/Kleinschreibung spielen keine Rolle. */
export function suchen<T>(zeilen: T[], suche: string, felder: (z: T) => (string | null | undefined)[]): T[] {
  const woerter = norm(suche).split(/\s+/).filter(Boolean);
  if (!woerter.length) return zeilen;
  return zeilen.filter((z) => {
    const text = norm(felder(z).filter(Boolean).join(" "));
    return woerter.every((w) => text.includes(w));
  });
}
