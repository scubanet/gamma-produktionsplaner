// Excel-Export der sichtbaren Zeilen. Zahlen bleiben Zahlen (volle Genauigkeit aus der Datenbank).
import { leerwert, type Zeile } from "./produktionsliste";

export async function excelExport(zeilen: Zeile[], dateiname: string, mitLinie: boolean) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const kopf = [
    "Kategorie", "Komponente", ...(mitLinie ? ["Menülinie", "Gang", "Gericht"] : []), "Status",
    "Menge", "Einheit", "Haltbarkeit (Tage, Annahme)", "Wellen", "Start ab", "Herleitung",
  ].map((value) => ({ value, fontWeight: "bold" as const }));
  const daten = zeilen.map((z) => [
    { value: z.kategorie },
    { value: z.komponente },
    ...(mitLinie ? [{ value: z.menuelinie ?? "" }, { value: z.gang ?? "" }, { value: z.gericht ?? "" }] : []),
    { value: z.status },
    z.menge === null ? { value: "[Menge]" } : { value: z.menge, format: z.einheit === "Stk" ? "0" : "0.00" },
    { value: z.einheit ?? "" },
    z.haltbarkeitTage === null ? { value: leerwert(z.status, "Haltbarkeit") } : { value: z.haltbarkeitTage },
    z.wellen === null ? { value: leerwert(z.status, "Wellen") } : { value: z.wellen },
    z.startAb === null ? { value: leerwert(z.status, "Start") } : { value: new Date(`${z.startAb}T00:00:00Z`), format: "dd.mm.yyyy" },
    { value: z.herleitung },
  ]);
  const breiten = [18, 34, ...(mitLinie ? [16, 12, 34] : []), 9, 10, 8, 14, 8, 11, 80];
  await writeXlsxFile([kopf, ...daten], {
    sheet: "Produktionsliste",
    columns: breiten.map((width) => ({ width })),
    stickyRowsCount: 1,
  }).toFile(dateiname);
}
