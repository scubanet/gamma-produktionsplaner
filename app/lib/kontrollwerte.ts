// Kontrollwerte aus der GAMMA-Excel (docs/uebergabe-claude-code.md). Die App vergleicht nur und meldet
// Abweichungen; angepasst wird nichts.
import type { BedarfZeile, ListeZeile } from "./produktionsliste";

export type Kontrolle = { label: string; excel: string; app: string | null; ok: boolean | null };

const gleich = (a: number | null | undefined, b: number) => (a === null || a === undefined ? null : Math.abs(a - b) < 1e-9);

function saisonMenge(liste: ListeZeile[], komponente: string) {
  const treffer = liste.filter((l) => l.komponente === komponente);
  return treffer.length === 1 ? treffer[0].menge_total : null;
}

function linienMenge(bedarf: BedarfZeile[], komponente: string, linie: string) {
  const treffer = bedarf.filter((b) => b.komponente === komponente && b.menuelinie === linie);
  return treffer.length === 1 ? treffer[0].menge_total : null;
}

const kg = (x: number | null) => (x === null ? null : `${x} kg`);

export function mengenKontrollen(liste: ListeZeile[], bedarf: BedarfZeile[]): Kontrolle[] {
  const tf = saisonMenge(liste, "Bündner Trockenfleisch");
  const re = linienMenge(bedarf, "Rindsentrecote", "Spiel 1 und 6");
  const bs = linienMenge(bedarf, "Bunter Blattsalat", "Spiel 1 und 6");
  return [
    { label: "Bündner Trockenfleisch, Spengler Cup gesamt", excel: "181.5 kg", app: kg(tf), ok: gleich(tf, 181.5) },
    { label: "Rindsentrecote, Spiel 1 und 6", excel: "79.2 kg", app: kg(re), ok: gleich(re, 79.2) },
    { label: "Bunter Blattsalat, Spiel 1 und 6", excel: "27.5 kg", app: kg(bs), ok: gleich(bs, 27.5) },
  ];
}

/** Haltbarkeit in Tagen → erwartete Wellen in der Saison Winter 2026/27. */
export const WELLEN_ERWARTET: [number, number][] = [
  [21, 3],
  [3, 8],
  [180, 1],
];

export function wellenKontrolle(tage: number, erwartet: number, app: number | null): Kontrolle {
  return {
    label: `Wellen bei ${tage} Tagen Haltbarkeit`,
    excel: String(erwartet),
    app: app === null ? null : String(app),
    ok: app === null ? null : app === erwartet,
  };
}

export const STATUS_ERWARTET = { ok: 310, offen: 130, Zukauf: 53 } as const;

/** Komponenten-Status über alle Komponenten der Systemzuteilung (nicht nur Spengler Cup). */
export function statusKontrolle(app: Record<keyof typeof STATUS_ERWARTET, number | null>): Kontrolle {
  const werte = [app.ok, app.offen, app.Zukauf];
  const fehlt = werte.some((w) => w === null);
  return {
    label: "Komponenten-Status ok / offen / Zukauf",
    excel: `${STATUS_ERWARTET.ok} / ${STATUS_ERWARTET.offen} / ${STATUS_ERWARTET.Zukauf}`,
    app: fehlt ? null : werte.join(" / "),
    ok: fehlt ? null : app.ok === STATUS_ERWARTET.ok && app.offen === STATUS_ERWARTET.offen && app.Zukauf === STATUS_ERWARTET.Zukauf,
  };
}
