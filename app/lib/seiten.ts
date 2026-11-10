// PostgREST liefert pro Abfrage höchstens 1000 Zeilen. Für Listen, die grösser werden können,
// seitenweise laden, damit nichts still abgeschnitten wird.
const SEITE = 1000;

export async function alleSeiten<T>(
  abfrage: (von: number, bis: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const alle: T[] = [];
  for (let von = 0; ; von += SEITE) {
    const r = await abfrage(von, von + SEITE - 1);
    if (r.error) throw r.error;
    const zeilen = r.data ?? [];
    alle.push(...zeilen);
    if (zeilen.length < SEITE) return alle;
  }
}
