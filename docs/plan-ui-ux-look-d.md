# UI/UX nach Variante D – Umsetzungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Ziel:** Die Befunde der UI/UX-Prüfung vom 15.11.2026 beheben und die Struktur der Variante D (Look von A, Funktion von C) in die App bringen.

**Architektur:** Logik als reine Funktionen in `app/lib/` mit Vitest-Tests, Bausteine im Design System (`design-system/components/bundle.js`, `bundle.css`, `index.d.ts`), Screens setzen nur zusammen. Rechenwerte kommen aus Views in der Datenbank, nie aus der App. Kein neuer Server, statischer Export bleibt.

**Tech Stack:** Next.js 16 (App Router, statischer Export), React 19, TypeScript, Vitest, Supabase (Postgres, RLS), Design System «Planer» 0.9.

**Entwürfe:** https://claude.ai/artifact/9oRxkkj7mkt1hXZqqNEkAx (Artboards «D · Kombination», «D · Leitstand», «D · Rezepte»). Die Entwürfe zeigen das Ziel, massgebend sind die Tokens und Komponenten im Repo.

**Vor dem Start lesen:** `CLAUDE.md`, `docs/uebergabe-claude-code.md`, `design-system/README.md`.

**Für jede Aufgabe gilt:**

- Tests: `cd app && npm test`. Typen: `cd app && npm run typecheck`. Beides vor jedem Commit. Auf Node 22 schlagen 6 ältere Tests wegen des Tausender-Apostrophs fehl (siehe Übergabe); neue Fehler sind das nicht. Mit Node 24 arbeiten.
- Jede Änderung in `design-system/`: Zeile in `design-system/CHANGELOG.md` (nächste Version, Datum TT.MM.JJJJ), `index.d.ts` nachführen, `README.md` und `preview.html` der Komponente, danach das Artifact https://claude.ai/artifact/NdcHNeGLn5AuyF27KjoHRC mit denselben Dateien aktualisieren.
- Keine Hex-Werte in Screens. Bedienelemente mindestens 44 px hoch. Schweizer Hochdeutsch ohne ß.
- Ein Commit pro Aufgabe, Nachricht auf Deutsch.

## Reihenfolge und Befund

**Stand 15.11.2026:** Aufgaben 1 bis 5 sind gebaut und ausgeliefert (Design System 0.11). Zu Aufgabe 4: Systemzuteilung und Katalog hatten bereits eine Suche (in der Prüfung übersehen); neu ist sie in Produktionsliste und Rezepten. Weiter mit Aufgabe 6.

| Nr. | Aufgabe | Befund | Schwere |
| --- | --- | --- | --- |
| 1 | Warnung bei ungespeicherten Änderungen | Editor verliert Eingaben beim Wegklicken | kritisch |
| 2 | Navigation in sechs Bereichen (Logik) | zwölf gleichwertige Einträge | kritisch |
| 3 | TopNav und Tabs im Design System, Gerüst umbauen | Handy unbrauchbar, Abmelden-Zeile auf jeder Seite | kritisch |
| 4 | Suche in Listen | keine Suche bei 251 Komponenten | kritisch |
| 5 | Sortierbare Spaltenköpfe | Sortieren über zwei Auswahlfelder | mittel |
| 6 | Erfolg bestätigen | «gespeichert» nur im Wellenplan | mittel |
| 7 | Leitstand «Zu erledigen» | technische Sprache, zeigt nicht, was ansteht | mittel |
| 8 | Namen in Normalschrift | lange Titel in Grossbuchstaben brechen um | mittel |
| 9 | Detailspalte statt Dialog | Dialog verdeckt die Liste | mittel |
| 10 | Kontextzeile Saison / Anlass / Spiel | jeder Screen wählt den Anlass selbst | mittel |
| 11 | Küchenansicht fürs Handy und Tablet | Abhaken in der Küche | mittel |

Aufgaben 1 bis 6 sind unabhängig voneinander. 7 braucht 2 und 3. 9 und 10 brauchen 3. 11 braucht 3.

---

### Aufgabe 1: Warnung bei ungespeicherten Änderungen

**Dateien:**
- Neu: `app/lib/ungespeichert.ts`
- Neu: `app/tests/ungespeichert.test.ts`
- Ändern: `app/app/(geschuetzt)/rezepte/bearbeiten/page.tsx` (Zustand `f`, Zeile 58; Speichern-Buttons bei Zeile 160 und 372)
- Ändern: `app/components/anlass/AnlassKopf.tsx` (Zustand `k`, Zeile 23)

- [ ] **Schritt 1: Test schreiben**

```ts
// app/tests/ungespeichert.test.ts
import { describe, expect, it } from "vitest";
import { istGeaendert } from "../lib/ungespeichert";

describe("Ungespeicherte Änderungen", () => {
  it("gleiche Inhalte gelten als unverändert, auch als neue Objekte", () => {
    expect(istGeaendert({ name: "Sugo", gruppen: [{ zutaten: ["Tomate"] }] }, { name: "Sugo", gruppen: [{ zutaten: ["Tomate"] }] })).toBe(false);
  });
  it("ein geändertes Feld gilt als geändert", () => {
    expect(istGeaendert({ name: "Sugo" }, { name: "Sugo rot" })).toBe(true);
  });
  it("ohne Ausgangsstand gibt es nichts zu verlieren", () => {
    expect(istGeaendert(null, null)).toBe(false);
  });
});
```

- [ ] **Schritt 2: Test laufen lassen, er muss fehlschlagen**

`cd app && npx vitest run tests/ungespeichert.test.ts` → FAIL, Modul `../lib/ungespeichert` fehlt.

- [ ] **Schritt 3: Umsetzen**

```ts
// app/lib/ungespeichert.ts
"use client";
import { useEffect } from "react";

/** Vergleich über die Serialisierung: reicht für Formulare aus Text, Zahlen und Listen. */
export const istGeaendert = (jetzt: unknown, ausgang: unknown): boolean => JSON.stringify(jetzt) !== JSON.stringify(ausgang);

/** Der Browser fragt nach, bevor die Seite verlassen oder neu geladen wird. Navigation und Buttons des Design Systems sind echte Links, darum greift das auch innerhalb der App. */
export function useUngespeichert(geaendert: boolean): void {
  useEffect(() => {
    if (!geaendert) return;
    const warnen = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warnen);
    return () => window.removeEventListener("beforeunload", warnen);
  }, [geaendert]);
}
```

- [ ] **Schritt 4: Test läuft durch** (`npx vitest run tests/ungespeichert.test.ts` → 3 passed)

- [ ] **Schritt 5: Rezept bearbeiten anschliessen**

In `rezepte/bearbeiten/page.tsx`: neben `f` einen Ausgangsstand halten.

```tsx
const [ausgang, setAusgang] = useState<RezeptFormular | null>(null);
const geaendert = f !== null && ausgang !== null && istGeaendert(f, ausgang);
useUngespeichert(geaendert && !speichert && !loeschen.laeuft);
```

Überall, wo nach dem Laden `setF(x)` aufgerufen wird, direkt danach `setAusgang(x)`. Nach erfolgreichem Speichern, vor `router.replace(...)` (Zeilen 138 und 146), `setAusgang(f)`, sonst fragt der Browser beim Weiterleiten. Neben beiden Speichern-Buttons:

```tsx
{geaendert ? <span className="pl-small" role="status">Ungespeicherte Änderungen</span> : null}
```

- [ ] **Schritt 6: Anlass-Kopf anschliessen**

In `AnlassKopf.tsx`: `useUngespeichert(istGeaendert(k, kopfAus(anlass)) && !speichert);` und derselbe Hinweis neben dem Speichern-Button. Die übrigen Karten des Anlasses speichern pro Dialog und brauchen nichts.

- [ ] **Schritt 7: Von Hand prüfen**

`npm run dev`, Rezept öffnen, ein Feld ändern, in der Navigation auf «Leitstand» klicken: Der Browser fragt nach. Speichern, wieder klicken: keine Frage.

- [ ] **Schritt 8: Commit** `Warnung bei ungespeicherten Änderungen in Rezept und Anlass`

---

### Aufgabe 2: Navigation in sechs Bereichen (Logik)

**Dateien:**
- Ändern: `app/lib/navigation.ts`
- Ändern: `app/tests/navigation.test.ts`

- [ ] **Schritt 1: Tests ergänzen** (bestehende Tests bleiben)

```ts
import { GRUPPEN, hauptnav, unternav, seitenTabs } from "../lib/navigation";

describe("Navigation in Bereichen", () => {
  it("hat sechs Bereiche in dieser Reihenfolge", () => {
    expect(GRUPPEN.map((g) => g.label)).toEqual(["Leitstand", "Verkauf", "Produktion", "Küche", "Auswertung", "Verwaltung"]);
  });
  it("jede bisherige Seite gehört zu genau einem Bereich", () => {
    const alle = GRUPPEN.flatMap((g) => g.bereiche.map((b) => b.href));
    expect(alle.sort()).toEqual(["/", "/anlaesse/", "/benutzer/", "/einkauf/", "/katalog/", "/offerten/", "/produktion/", "/rentabilitaet/", "/ressourcen/", "/rezepte/", "/stammdaten/", "/systemzuteilung/"].sort());
  });
  it("markiert den Bereich der aktuellen Seite und verlinkt auf dessen erste Seite", () => {
    const n = hauptnav("/katalog/");
    expect(n.find((x) => x.current)).toEqual({ label: "Küche", href: "/rezepte/", current: true });
  });
  it("Unterseiten zählen zum Bereich", () => {
    expect(hauptnav("/produktion/wellen").find((x) => x.current)?.label).toBe("Produktion");
  });
  it("zeigt die Seiten des Bereichs, ausser er hat nur eine", () => {
    expect(unternav("/einkauf/lieferanten/").map((x) => [x.label, x.current])).toEqual([["Produktionsplan", false], ["Ressourcen", false], ["Einkauf", true]]);
    expect(unternav("/")).toEqual([]);
    expect(unternav("/rentabilitaet/")).toEqual([]);
  });
  it("Ansichten einer Seite: genau eine ist aktiv", () => {
    expect(seitenTabs("/produktion/wellen/").filter((x) => x.current).map((x) => x.label)).toEqual(["Wellen"]);
    expect(seitenTabs("/produktion/").filter((x) => x.current).map((x) => x.label)).toEqual(["Liste"]);
    expect(seitenTabs("/rezepte/")).toEqual([]);
  });
});
```

- [ ] **Schritt 2: Tests schlagen fehl** (`GRUPPEN` nicht exportiert)

- [ ] **Schritt 3: Umsetzen.** In `navigation.ts` die Konstante `BEREICHE` ersetzen und drei Funktionen ergänzen; `navEintraege`, `ANMELDEN`, `istOeffentlich` bleiben.

```ts
export type Bereich = { label: string; href: string };
export type Gruppe = { label: string; bereiche: Bereich[] };
export type NavEintrag = { label: string; href: string; current: boolean };

export const GRUPPEN: Gruppe[] = [
  { label: "Leitstand", bereiche: [{ label: "Leitstand", href: "/" }] },
  { label: "Verkauf", bereiche: [{ label: "Offerten", href: "/offerten/" }, { label: "Anlässe", href: "/anlaesse/" }] },
  { label: "Produktion", bereiche: [{ label: "Produktionsplan", href: "/produktion/" }, { label: "Ressourcen", href: "/ressourcen/" }, { label: "Einkauf", href: "/einkauf/" }] },
  { label: "Küche", bereiche: [{ label: "Rezepte", href: "/rezepte/" }, { label: "Katalog", href: "/katalog/" }, { label: "Systemzuteilung", href: "/systemzuteilung/" }] },
  { label: "Auswertung", bereiche: [{ label: "Rentabilität", href: "/rentabilitaet/" }] },
  { label: "Verwaltung", bereiche: [{ label: "Stammdaten", href: "/stammdaten/" }, { label: "Benutzer", href: "/benutzer/" }] },
];

/** Flache Liste für navEintraege (alte SideNav) und für die Suche. */
export const BEREICHE: { label: string; href?: string }[] = GRUPPEN.flatMap((g) => g.bereiche);

/** Ansichten innerhalb einer Seite. Hier zählt der genaue Pfad, nicht «liegt darunter». */
const ANSICHTEN: Record<string, Bereich[]> = {
  "/produktion": [
    { label: "Liste", href: "/produktion/" },
    { label: "Wellen", href: "/produktion/wellen/" },
    { label: "Aufwand aus Rezepten", href: "/produktion/aufwand/" },
  ],
  "/einkauf": [
    { label: "Einkaufsliste", href: "/einkauf/" },
    { label: "Lieferanten", href: "/einkauf/lieferanten/" },
    { label: "Artikel zuordnen", href: "/einkauf/zuordnen/" },
  ],
};

const gruppeVon = (aktuell: string) => GRUPPEN.find((g) => g.bereiche.some((b) => aktiv(b.href, aktuell)));

export function hauptnav(pfad: string): NavEintrag[] {
  const g = gruppeVon(ohneSchraegstrich(pfad));
  return GRUPPEN.map((x) => ({ label: x.label, href: x.bereiche[0].href, current: x === g }));
}

export function unternav(pfad: string): NavEintrag[] {
  const aktuell = ohneSchraegstrich(pfad);
  const g = gruppeVon(aktuell);
  if (!g || g.bereiche.length < 2) return [];
  return g.bereiche.map((b) => ({ label: b.label, href: b.href, current: aktiv(b.href, aktuell) }));
}

export function seitenTabs(pfad: string): NavEintrag[] {
  const aktuell = ohneSchraegstrich(pfad);
  const wurzel = Object.keys(ANSICHTEN).find((w) => aktuell === w || aktuell.startsWith(`${w}/`));
  if (!wurzel) return [];
  return ANSICHTEN[wurzel].map((a) => ({ label: a.label, href: a.href, current: ohneSchraegstrich(a.href) === aktuell }));
}
```

- [ ] **Schritt 4: Alle Navigationstests laufen durch** (`npx vitest run tests/navigation.test.ts`)

- [ ] **Schritt 5: Commit** `Navigation: sechs Bereiche mit Unterseiten und Ansichten`

---

### Aufgabe 3: TopNav und Tabs im Design System, Gerüst umbauen

**Dateien:**
- Ändern: `design-system/components/bundle.js` (zwei neue Komponenten vor `root.Planer = …`, dort und im Kopfkommentar `@ds-bundle` eintragen)
- Ändern: `design-system/components/bundle.css`, `index.d.ts`
- Neu: `design-system/components/TopNav/README.md`, `preview.html`; `design-system/components/Tabs/README.md`, `preview.html` (Aufbau wie `SideNav/`)
- Ändern: `app/lib/planer.ts` (Export `TopNav`, `Tabs`)
- Ändern: `app/components/Geruest.tsx`
- Ändern: `app/app/(geschuetzt)/produktion/page.tsx` (Buttons «Produktionswellen» und «Aufwand aus Rezepten» im Seitenkopf entfernen, Zeilen 260–261)

- [ ] **Schritt 1: Komponenten in `bundle.js`**

```js
  function TopNav(p) {
    var st = React.useState(false), offen = st[0], setOffen = st[1];
    return h('header', { className: 'pl-top' },
      h('a', { className: 'pl-top__brand', href: '/' }, p.company || 'GAMMACATERING'),
      h('button', { type: 'button', className: 'pl-top__toggle', 'aria-expanded': offen, 'aria-controls': 'pl-top-menu', onClick: function () { setOffen(!offen); } }, 'Menü'),
      h('nav', { id: 'pl-top-menu', className: cx('pl-top__nav', offen && 'pl-top__nav--offen'), 'aria-label': 'Hauptnavigation' },
        p.items.map(function (it) {
          return h('a', { key: it.label, className: 'pl-top__item', href: it.href, 'aria-current': it.current ? 'page' : undefined }, it.label);
        })),
      p.actions ? h('div', { className: 'pl-top__actions' }, p.actions) : null);
  }

  function Tabs(p) {
    if (!p.items || !p.items.length) return null;
    return h('nav', { className: cx('pl-tabs', p.tone === 'sunken' && 'pl-tabs--sunken'), 'aria-label': p.label },
      p.items.map(function (it) {
        return h('a', { key: it.label, className: 'pl-tabs__item', href: it.href, 'aria-current': it.current ? 'page' : undefined }, it.label);
      }));
  }
```

- [ ] **Schritt 2: Typen in `index.d.ts`**

```ts
export interface NavLink { label: string; href: string; current?: boolean; }
export interface TopNavProps { company?: string; items: NavLink[]; actions?: ReactNode; }
export interface TabsProps { label: string; items: NavLink[]; tone?: 'default' | 'sunken'; }
export declare const TopNav: (p: TopNavProps) => JSX.Element;
export declare const Tabs: (p: TabsProps) => JSX.Element | null;
```

- [ ] **Schritt 3: Stil in `bundle.css`** (nach dem Block `.pl-nav…`)

```css
.pl-app--top { flex-direction: column; flex-wrap: nowrap; background: var(--ground); }
.pl-app--top .pl-main { flex: 1 1 auto; }
.pl-top { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-1) var(--space-6); min-height: 60px; padding: 0 var(--space-10); border-bottom: 1px solid var(--border); background: var(--surface); }
.pl-top__brand { font-size: 18px; font-weight: 600; letter-spacing: -0.02em; color: var(--ink); text-decoration: none; min-height: var(--control-height); display: inline-flex; align-items: center; }
.pl-top__nav { display: flex; flex-wrap: wrap; gap: 0 var(--space-6); flex: 1; }
.pl-top__item, .pl-tabs__item { min-height: var(--control-height); display: inline-flex; align-items: center; color: var(--ink); text-decoration: none; }
.pl-top__item { font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
.pl-top__item:hover, .pl-tabs__item:hover { color: var(--accent); }
.pl-top__item[aria-current=page] { color: var(--accent); box-shadow: inset 0 -2px 0 var(--accent); }
.pl-top__item:focus-visible, .pl-tabs__item:focus-visible, .pl-top__toggle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.pl-top__actions { display: flex; align-items: center; gap: var(--space-3); margin-left: auto; }
.pl-top__toggle { display: none; min-height: var(--control-height); padding: 0 var(--space-4); border: 1px solid var(--border-control); border-radius: var(--radius-md); background: var(--surface); font: inherit; font-family: var(--font-sans); color: var(--ink); cursor: pointer; margin-left: auto; }
.pl-tabs { display: flex; flex-wrap: wrap; gap: 0 var(--space-6); padding: 0 var(--space-10); border-bottom: 1px solid var(--border); font-size: 15px; }
.pl-tabs--sunken { background: var(--surface-sunken); }
.pl-tabs__item { color: var(--ink-muted); }
.pl-tabs__item[aria-current=page] { color: var(--ink); font-weight: 600; box-shadow: inset 0 -2px 0 var(--ink); }
.pl-main .pl-tabs { padding: 0; }
@media (max-width: 760px) {
  .pl-top { padding: 0 var(--space-4); }
  .pl-top__toggle { display: inline-flex; align-items: center; }
  .pl-top__nav { display: none; flex-basis: 100%; flex-direction: column; padding-bottom: var(--space-3); }
  .pl-top__nav--offen { display: flex; }
  .pl-top__actions { margin-left: 0; flex-basis: 100%; padding-bottom: var(--space-3); display: none; }
  .pl-top__nav--offen + .pl-top__actions { display: flex; }
  .pl-tabs { padding: 0 var(--space-4); overflow-x: auto; flex-wrap: nowrap; white-space: nowrap; }
}
@media print { .pl-top, .pl-tabs { display: none !important; } }
```

- [ ] **Schritt 4: Gerüst**

```tsx
// app/components/Geruest.tsx
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Button, Tabs, TopNav } from "@/lib/planer";
import { hauptnav, seitenTabs, unternav } from "@/lib/navigation";
import { supabase } from "@/lib/supabase";
import { useSitzung } from "./Anmeldung";

export function Geruest({ children }: { children: ReactNode }) {
  const pfad = usePathname();
  const sitzung = useSitzung();
  return (
    <div className="pl-app pl-app--top">
      <TopNav
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
```

In `app/lib/planer.ts` `TopNav, Tabs` in die Destrukturierung aufnehmen. `SideNav` bleibt im Design System (Mockups), die App nutzt sie nicht mehr.

- [ ] **Schritt 5: Von Hand prüfen** bei 1280 px, 768 px und 375 px Breite (Browser-Werkzeuge): Bereich und Unterseite sind markiert; unter 760 px steht nur «GAMMACATERING» und «Menü», das Menü öffnet und schliesst, Abmelden steht im geöffneten Menü; Tastatur: Tab erreicht jeden Eintrag, Fokusrahmen sichtbar. Druckansicht der Produktionsliste zeigt keine Navigation.

- [ ] **Schritt 6: Changelog 0.10, READMEs, Previews, Artifact; Commit** `Navigation oben mit sechs Bereichen, Tabs, auf dem Handy einklappbar`

---

### Aufgabe 4: Suche in Listen

**Dateien:**
- Neu: `app/lib/suche.ts`, `app/tests/suche.test.ts`
- Ändern: `app/app/(geschuetzt)/produktion/page.tsx`, `rezepte/page.tsx`, `systemzuteilung/page.tsx`, `katalog/page.tsx`

- [ ] **Schritt 1: Test**

```ts
// app/tests/suche.test.ts
import { describe, expect, it } from "vitest";
import { suchen } from "../lib/suche";

const zeilen = [
  { komponente: "Bündner Trockenfleisch", kategorie: "Basiskomponenten" },
  { komponente: "braune Butter", kategorie: "Basiskomponenten" },
  { komponente: "Focaccia", kategorie: "Brot" },
];
const felder = (z: (typeof zeilen)[number]) => [z.komponente, z.kategorie];

describe("Suche", () => {
  it("leere Suche gibt alles zurück", () => {
    expect(suchen(zeilen, "  ", felder)).toHaveLength(3);
  });
  it("findet ohne Umlaut und ohne Grossschreibung", () => {
    expect(suchen(zeilen, "bundner", felder).map((z) => z.komponente)).toEqual(["Bündner Trockenfleisch"]);
  });
  it("mehrere Wörter in beliebiger Reihenfolge, alle müssen vorkommen", () => {
    expect(suchen(zeilen, "butter braun", felder).map((z) => z.komponente)).toEqual(["braune Butter"]);
    expect(suchen(zeilen, "butter focaccia", felder)).toEqual([]);
  });
  it("sucht in allen genannten Feldern", () => {
    expect(suchen(zeilen, "brot", felder).map((z) => z.komponente)).toEqual(["Focaccia"]);
  });
});
```

- [ ] **Schritt 2: Test schlägt fehl** (Modul fehlt)

- [ ] **Schritt 3: Umsetzen**

```ts
// app/lib/suche.ts
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtert Zeilen: jedes Wort der Suche muss in einem der Felder vorkommen. Umlaute und Gross-/Kleinschreibung spielen keine Rolle. */
export function suchen<T>(zeilen: T[], suche: string, felder: (z: T) => (string | null | undefined)[]): T[] {
  const woerter = norm(suche).split(/\s+/).filter(Boolean);
  if (!woerter.length) return zeilen;
  return zeilen.filter((z) => {
    const text = norm(felder(z).filter(Boolean).join(" "));
    return woerter.every((w) => text.includes(w));
  });
}
```

- [ ] **Schritt 4: Test läuft durch**

- [ ] **Schritt 5: Produktionsliste.** Zustand `const [suche, setSuche] = useState("");`, in der Filterzeile als erstes Feld:

```tsx
<TextField id="suche" type="search" label="Suchen" placeholder="Komponente oder Gericht" value={suche} onChange={(e) => setSuche((e as { target: HTMLInputElement }).target.value)} />
```

und `zeilen` erweitern:

```tsx
const zeilen = useMemo(
  () => suchen(filtern(alle, { kategorie, status, erledigt, zustaendig }), suche, (z) => [z.komponente, z.kategorie, z.gericht, z.zustaendig]),
  [alle, kategorie, status, erledigt, zustaendig, suche],
);
```

- [ ] **Schritt 6: Rezepte, Systemzuteilung, Katalog** gleich: ein Suchfeld über der Liste, `suchen(liste, suche, (r) => [r.name, r.kategorie])` vor dem Rendern. Bei Rezepten über der `ItemList`, die Gruppen danach bilden.

- [ ] **Schritt 7: Leerer Zustand.** Wo die Liste nach der Suche leer ist: `<p className="pl-muted">Nichts gefunden für «{suche}».</p>`.

- [ ] **Schritt 8: Commit** `Suche in Produktionsliste, Rezepten, Systemzuteilung und Katalog`

---

### Aufgabe 5: Sortierbare Spaltenköpfe

**Dateien:**
- Ändern: `design-system/components/bundle.js` (Funktion `DataTable`, Zeile 186), `bundle.css`, `index.d.ts`, `DataTable/README.md`
- Ändern: `app/lib/produktionsliste.ts`, `app/tests/produktionsliste.test.ts`
- Ändern: `app/app/(geschuetzt)/produktion/page.tsx` (Felder «Sortieren nach» und «Reihenfolge» entfernen, Zeilen 300–316)

- [ ] **Schritt 1: Test** (in `produktionsliste.test.ts` ergänzen)

```ts
import { naechsteSortierung } from "../lib/produktionsliste";

describe("Sortierung per Spaltenkopf", () => {
  it("neue Spalte beginnt aufsteigend", () => {
    expect(naechsteSortierung({ feld: "kategorie", richtung: "ab" }, "menge")).toEqual({ feld: "menge", richtung: "auf" });
  });
  it("dieselbe Spalte wechselt die Richtung", () => {
    expect(naechsteSortierung({ feld: "menge", richtung: "auf" }, "menge")).toEqual({ feld: "menge", richtung: "ab" });
    expect(naechsteSortierung({ feld: "menge", richtung: "ab" }, "menge")).toEqual({ feld: "menge", richtung: "auf" });
  });
});
```

- [ ] **Schritt 2: Test schlägt fehl**

- [ ] **Schritt 3: Funktion in `produktionsliste.ts`**

```ts
export type Sortierung = { feld: SortFeld; richtung: Richtung };
export function naechsteSortierung(jetzt: Sortierung, feld: SortFeld): Sortierung {
  return jetzt.feld === feld ? { feld, richtung: jetzt.richtung === "auf" ? "ab" : "auf" } : { feld, richtung: "auf" };
}
```

- [ ] **Schritt 4: DataTable** – Kopfzeile in `bundle.js` ersetzen:

```js
        h('thead', null, h('tr', null, p.columns.map(function (c) {
          var kann = c.sortable && p.onSort;
          var ist = p.sort && p.sort.key === c.key;
          return h('th', { key: c.key, scope: 'col', className: cx(c.numeric && 'pl-num', c.printHidden && 'pl-print-hide') || undefined,
            'aria-sort': kann ? (ist ? (p.sort.dir === 'ab' ? 'descending' : 'ascending') : 'none') : undefined },
            kann ? h('button', { type: 'button', className: 'pl-table__sort', onClick: function () { p.onSort(c.key); } },
              c.label, h('span', { 'aria-hidden': 'true' }, ist ? (p.sort.dir === 'ab' ? ' ↓' : ' ↑') : '')) : c.label);
        }))),
```

`index.d.ts`: `DataTableColumn` um `sortable?: boolean`, `DataTableProps` um `sort?: { key: string; dir: 'auf' | 'ab' }; onSort?: (key: string) => void;`.

```css
.pl-table__sort { min-height: var(--control-height); padding: 0; border: 0; background: none; font: inherit; letter-spacing: inherit; text-transform: inherit; color: inherit; cursor: pointer; }
.pl-table__sort:hover, .pl-table th[aria-sort=ascending] .pl-table__sort, .pl-table th[aria-sort=descending] .pl-table__sort { color: var(--ink); }
.pl-table__sort:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media print { .pl-table__sort { min-height: 0; } }
```

- [ ] **Schritt 5: Produktionsliste.** Spalten mit `sortable: true` versehen, wo der `key` ein `SortFeld` ist (`komponente`, `zustaendig`, `menge`, `wellen`, `startAb`, `erledigt`; die Spalte `haltbarkeitTage` bekommt den Schlüssel über eine Zuordnung `{ haltbarkeitTage: "haltbarkeit" }`). Übergabe:

```tsx
<DataTable columns={spalten} rows={tabelle} sort={{ key: sortFeld === "haltbarkeit" ? "haltbarkeitTage" : sortFeld, dir: richtung }}
  onSort={(k) => { const n = naechsteSortierung({ feld: sortFeld, richtung }, (k === "haltbarkeitTage" ? "haltbarkeit" : k) as SortFeld); setSortFeld(n.feld); setRichtung(n.richtung); }} />
```

Die Sortierung nach Kategorie bleibt Standard beim Öffnen; dafür eine Spalte «Kategorie» vor «Komponente» einfügen (`key: "kategorie"`, `sortable: true`). `SORTIERUNGEN` und die beiden Felder im Filterbereich löschen.

- [ ] **Schritt 6: Changelog, README, Artifact; Commit** `Tabellen per Spaltenkopf sortieren`

---

### Aufgabe 6: Erfolg bestätigen

**Dateien:**
- Neu: `app/lib/meldung.ts`, `app/tests/meldung.test.ts`
- Ändern: `rezepte/bearbeiten/page.tsx`, `components/anlass/AnlassKopf.tsx`, `benutzer/page.tsx`, `produktion/page.tsx`, `systemzuteilung/page.tsx`

Muster wie im Wellenplan (`produktion/wellen/page.tsx`, Funktion `melden`): eine Zeile mit `role="status"`, die sagt, was gespeichert wurde und wann.

- [ ] **Schritt 1: Test**

```ts
// app/tests/meldung.test.ts
import { describe, expect, it } from "vitest";
import { gespeichertText } from "../lib/meldung";

describe("Meldung nach dem Speichern", () => {
  it("nennt Gegenstand und Uhrzeit", () => {
    expect(gespeichertText("Rezept «Sugo»", new Date(2026, 10, 15, 9, 5))).toBe("Rezept «Sugo» gespeichert um 09:05.");
  });
});
```

- [ ] **Schritt 2: Umsetzen**

```ts
// app/lib/meldung.ts
const zwei = (n: number) => String(n).padStart(2, "0");
export function gespeichertText(was: string, wann: Date = new Date()): string {
  return `${was} gespeichert um ${zwei(wann.getHours())}:${zwei(wann.getMinutes())}.`;
}
```

- [ ] **Schritt 3: Anschliessen.** Pro Datei ein Zustand `const [meldung, setMeldung] = useState("");`, nach jedem erfolgreichen Speichern `setMeldung(gespeichertText(…))`, bei Fehler `setMeldung("")`, und unter dem Seitenkopf:

```tsx
<p className="pl-small" role="status" aria-live="polite">{meldung}</p>
```

Der Absatz steht immer im DOM (auch leer), sonst lesen Screenreader die Meldung nicht vor. Gegenstände: `Rezept «${f.name}»`, `Anlass «${k.name}»`, `Benutzer ${b.name || b.email}`, `Zuständig für ${z.komponente}`, `Zuteilung ${zeile.komponente}`.

- [ ] **Schritt 4: Commit** `Speichern wird auf jeder Pflegeseite bestätigt`

---

### Aufgabe 7: Leitstand «Zu erledigen»

**Dateien:**
- Neu: `supabase/migrations/20261116000029_leitstand.sql`
- Ändern: `app/lib/database.types.ts` (über `npm run types` nach `supabase db push`)
- Neu: `app/lib/leitstand.ts`, `app/tests/leitstand.test.ts`
- Ändern: `app/app/(geschuetzt)/page.tsx`, `design-system/components/bundle.css`

- [ ] **Schritt 1: View**

```sql
-- Leitstand: Stand der Checkliste pro Saison und Welle. welle_nr 0 = Komponenten ohne Welle (Zukauf, offen, nur vor Ort).
create view public.leitstand_wellen with (security_invoker = true) as
select saison_id, welle_nr, count(*)::int as aufgaben, count(erledigt_am)::int as erledigt
from public.produktion_checkliste
group by saison_id, welle_nr;

comment on view public.leitstand_wellen is 'Leitstand: Anzahl Aufgaben und erledigte Aufgaben pro Saison und Welle.';
```

Kontrollwert am 15.11.2026: Welle 0 = 172, Welle 1 = 77, Welle 2 = 3, erledigt überall 0.

- [ ] **Schritt 2: Test**

```ts
// app/tests/leitstand.test.ts
import { describe, expect, it } from "vitest";
import { tageBis, wellenName, summe } from "../lib/leitstand";

describe("Leitstand", () => {
  it("zählt die Tage bis zum Anlass in ganzen Tagen", () => {
    expect(tageBis("2026-12-26", new Date(2026, 10, 15, 9, 0))).toBe(41);
    expect(tageBis("2026-11-15", new Date(2026, 10, 15, 23, 0))).toBe(0);
  });
  it("Welle 0 heisst «Ohne Welle»", () => {
    expect(wellenName(0)).toBe("Ohne Welle");
    expect(wellenName(2)).toBe("Welle 2");
  });
  it("summiert Aufgaben und Erledigte", () => {
    expect(summe([{ aufgaben: 172, erledigt: 0 }, { aufgaben: 77, erledigt: 5 }])).toEqual({ aufgaben: 249, erledigt: 5 });
  });
});
```

- [ ] **Schritt 3: Umsetzen**

```ts
// app/lib/leitstand.ts
export function tageBis(datum: string, heute: Date = new Date()): number {
  const [j, m, t] = datum.split("-").map(Number);
  const ziel = Date.UTC(j, m - 1, t);
  const start = Date.UTC(heute.getFullYear(), heute.getMonth(), heute.getDate());
  return Math.round((ziel - start) / 86_400_000);
}
export const wellenName = (nr: number) => (nr === 0 ? "Ohne Welle" : `Welle ${nr}`);
export function summe(z: { aufgaben: number; erledigt: number }[]) {
  return z.reduce((s, x) => ({ aufgaben: s.aufgaben + x.aufgaben, erledigt: s.erledigt + x.erledigt }), { aufgaben: 0, erledigt: 0 });
}
```

- [ ] **Schritt 4: Stil**

```css
.pl-todo { display: flex; align-items: center; gap: var(--space-4); min-height: 72px; border-bottom: 1px solid var(--border); color: var(--ink); text-decoration: none; }
.pl-todo:hover { background: var(--surface-sunken); }
.pl-todo:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.pl-todo__zahl { min-width: 76px; font-size: 32px; font-weight: 500; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.pl-todo__titel { display: block; font-size: 16px; font-weight: 600; }
.pl-todo__ziel { margin-left: auto; font-size: 12px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
.pl-section-title { margin: 0; padding-bottom: 10px; border-bottom: 1px solid var(--ink); font-size: 11px; line-height: 16px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-muted); }
```

- [ ] **Schritt 5: Seite.** `app/(geschuetzt)/page.tsx` neu aufbauen nach Artboard «D · Leitstand». Abfragen (alle parallel):

```ts
supabase.from("komponente_zuteilung").select("id", { count: "exact", head: true }).eq("status", "offen")
supabase.from("komponente_zuteilung").select("id", { count: "exact", head: true }).eq("status", "Zukauf")
supabase.from("komponente_pruefhinweis").select("komponente_id", { count: "exact", head: true })
supabase.from("anlass").select("id, name, datum, datum_bis, saison_id").order("datum")
supabase.from("leitstand_wellen").select("*").order("welle_nr")
```

Aufbau: Seitenkopf «Leitstand», rechts «Nächster Anlass: {name} · in {tageBis} Tagen» (erster Anlass mit `datum >= heute`). Links Liste «Zu erledigen» mit vier Zeilen `<a className="pl-todo" href=…>`:

| Zahl | Titel | Unterzeile | Ziel |
| --- | --- | --- | --- |
| offen | Komponenten ohne Systemzuteilung | Ohne Zuteilung keine Haltbarkeit, keine Welle, kein Startdatum | `/systemzuteilung/` «Zuteilen» |
| Prüfhinweise | Prüfhinweise | Plausibilitätsregeln rot oder gelb, sperren nichts | `/systemzuteilung/` «Prüfen» |
| erledigt / aufgaben | Aufgaben in der Checkliste erledigt | Eine Aufgabe pro Komponente und Welle | `/produktion/` «Produktion» |
| Zukauf | Komponenten im Zukauf | CF-Stufe 4 oder 5, gehen in den Einkauf | `/einkauf/` «Einkauf» |

Darunter «Produktionswellen» (eine Zeile pro Zeile der View der Saison des nächsten Anlasses: `wellenName`, Fortschrittsbalken mit `role="progressbar"`, `erledigt / aufgaben`). Rechts «Anlässe der Saison» als Liste mit Datum. Eine Zeile mit Zahl 0 wird nicht ausgeblendet, sondern zeigt «0». Die Herleitung «Anzahl Zeilen in komponente_zuteilung» entfällt im Text und steht als `title` am Wert.

- [ ] **Schritt 6: Reihenfolge beim Ausliefern** wie in der Übergabe: `supabase db push --remote`, `cd app && npm run types`, Typen committen, dann pushen.

- [ ] **Schritt 7: Commit** `Leitstand zeigt, was zu erledigen ist (Migration 29)`

---

### Aufgabe 8: Namen in Normalschrift

**Dateien:** `design-system/components/bundle.css`, `design-system/README.md`, `app/app/(geschuetzt)/rezepte/page.tsx`, `rezepte/bearbeiten/page.tsx`, `anlaesse/bearbeiten/page.tsx`, `offerten/bearbeiten/page.tsx`, `katalog/page.tsx`

Regel: Grossbuchstaben nur für Bereichstitel («PRODUKTION», «LEITSTAND»). Ein Titel, der ein Name ist (Rezept, Anlass, Gericht, Offerte), steht in Normalschrift.

- [ ] **Schritt 1:** `.pl-h1--name { text-transform: none; font-size: 36px; line-height: 40px; }` nach `.pl-h1`, dazu im `@media (max-width: 560px)` `.pl-h1--name { font-size: 28px; line-height: 32px; }`.
- [ ] **Schritt 2:** In den genannten Seiten jedes `<h1 className="pl-h1">`, dessen Inhalt ein Name aus den Daten ist, auf `className="pl-h1 pl-h1--name"` stellen. Mit `grep -n 'pl-h1' app/app -r` alle Stellen durchgehen.
- [ ] **Schritt 3:** Regel in `design-system/README.md` unter «Typografie» ergänzen, Changelog.
- [ ] **Schritt 4: Commit** `Namen als Seitentitel in Normalschrift`

---

### Aufgabe 9: Detailspalte statt Dialog in der Produktionsliste

**Dateien:** `app/components/KomponenteBearbeiten.tsx`, `app/app/(geschuetzt)/produktion/page.tsx`, `systemzuteilung/page.tsx`, `design-system/components/bundle.css`

- [ ] **Schritt 1:** `KomponenteBearbeiten.tsx` lesen. Den Inhalt des Dialogs (Felder, Prüfhinweise, Speichern) in eine eigene Komponente `KomponenteFormular` in derselben Datei auslagern, mit denselben Props ohne `onClose`. `KomponenteBearbeiten` bleibt als Dialog, der `KomponenteFormular` enthält. Tests und Typprüfung müssen unverändert durchlaufen.
- [ ] **Schritt 2: Stil**

```css
.pl-split { display: flex; gap: var(--space-10); align-items: flex-start; }
.pl-split__liste { flex: 999 1 520px; min-width: 0; }
.pl-split__detail { flex: 1 1 360px; min-width: 0; position: sticky; top: var(--space-4); max-height: calc(100vh - 2 * var(--space-4)); overflow: auto; border-top: 1px solid var(--ink); padding-top: var(--space-4); }
.pl-table tr[aria-selected=true] { background: var(--surface-sunken); box-shadow: inset 3px 0 0 var(--accent); }
@media (max-width: 1000px) { .pl-split__detail { display: none; } }
```

- [ ] **Schritt 3:** In `produktion/page.tsx` die Zeile mit `pl-row` / `pl-col-main` / `pl-col-side` durch `pl-split` ersetzen. Rechts steht `KomponenteFormular`, wenn `bearbeiten` gesetzt ist, sonst der Hinweis «Komponente wählen, um Zuteilung, Herleitung und Wellen zu sehen.». Der Dialog `KomponenteBearbeiten` wird nur noch unter 1000 px gerendert:

```tsx
const schmal = typeof window !== "undefined" && window.matchMedia("(max-width: 1000px)").matches;
```

(als Zustand mit `useEffect` und `change`-Listener, damit es beim Drehen des Tablets stimmt). `DataTable` bekommt keine Auswahl-Prop: die gewählte Zeile über `rows` mit einem Feld `gewaehlt` kennzeichnen und in der Spalte «Komponente» fett darstellen.
- [ ] **Schritt 4:** Die Karte «Abgleich mit der Excel» aus der Seitenspalte nehmen und als eigene Ansicht `/produktion/abgleich/` anlegen (neue `page.tsx`, lädt dieselben Kontrollwerte über `lib/kontrollwerte.ts`); in `ANSICHTEN["/produktion"]` von Aufgabe 2 ergänzen und den Navigationstest anpassen. Auf der Liste bleibt eine Zeile «Abgleich Excel: {n} Abweichung(en)» mit Link.
- [ ] **Schritt 5:** Dasselbe Muster in `systemzuteilung/page.tsx`.
- [ ] **Schritt 6: Commit** `Detailspalte in Produktionsliste und Systemzuteilung, Abgleich als eigene Ansicht`

---

### Aufgabe 10: Kontextzeile Saison / Anlass / Spiel

**Dateien:** Neu `app/lib/kontext.ts`, `app/tests/kontext.test.ts`, `app/components/Kontext.tsx`; ändern `app/components/Geruest.tsx`, `produktion/page.tsx`, `produktion/wellen/page.tsx`, `produktion/aufwand/page.tsx`, `ressourcen/page.tsx`, `einkauf/page.tsx`

Heute sucht jede Seite selbst den «ersten Anlass mit Menülinien». Neu wählt der Benutzer Saison und Anlass einmal; die Wahl gilt auf allen Seiten und überlebt das Neuladen.

- [ ] **Schritt 1: Test**

```ts
// app/tests/kontext.test.ts
import { describe, expect, it } from "vitest";
import { gueltigerKontext, type Anlass } from "../lib/kontext";

const anlaesse: Anlass[] = [
  { id: "a1", name: "Spengler Cup", saison_id: "s1", datum: "2026-12-26" },
  { id: "a2", name: "WEF 2027", saison_id: "s1", datum: "2027-01-18" },
  { id: "a3", name: "Sommerfest", saison_id: "s2", datum: "2027-06-12" },
];

describe("Kontext", () => {
  it("ohne gespeicherte Wahl: nächster Anlass ab heute", () => {
    expect(gueltigerKontext(null, anlaesse, "2027-01-01")).toEqual({ saisonId: "s1", anlassId: "a2" });
  });
  it("gespeicherte Wahl bleibt, wenn es den Anlass noch gibt", () => {
    expect(gueltigerKontext({ saisonId: "s2", anlassId: "a3" }, anlaesse, "2026-11-15")).toEqual({ saisonId: "s2", anlassId: "a3" });
  });
  it("gelöschter Anlass fällt auf den nächsten zurück", () => {
    expect(gueltigerKontext({ saisonId: "s1", anlassId: "weg" }, anlaesse, "2026-11-15")).toEqual({ saisonId: "s1", anlassId: "a1" });
  });
  it("ohne Anlässe gibt es keinen Kontext", () => {
    expect(gueltigerKontext(null, [], "2026-11-15")).toBeNull();
  });
});
```

- [ ] **Schritt 2: Umsetzen**

```ts
// app/lib/kontext.ts
export type Anlass = { id: string; name: string; saison_id: string | null; datum: string | null };
export type Kontext = { saisonId: string | null; anlassId: string };
export const SCHLUESSEL = "planer.kontext";

export function gueltigerKontext(gespeichert: Kontext | null, anlaesse: Anlass[], heute: string): Kontext | null {
  if (!anlaesse.length) return null;
  const da = gespeichert && anlaesse.find((a) => a.id === gespeichert.anlassId);
  if (da) return { saisonId: da.saison_id, anlassId: da.id };
  const sortiert = [...anlaesse].sort((a, b) => String(a.datum).localeCompare(String(b.datum)));
  const naechster = sortiert.find((a) => a.datum !== null && a.datum >= heute) ?? sortiert[sortiert.length - 1];
  return { saisonId: naechster.saison_id, anlassId: naechster.id };
}
```

- [ ] **Schritt 3:** `components/Kontext.tsx`: React-Kontext `KontextProvider` lädt `anlass` (id, name, saison_id, datum, saison(name)) einmal, liest `localStorage[SCHLUESSEL]` in einem `try/catch`, ruft `gueltigerKontext`, schreibt bei Änderung zurück. Hook `useKontext()` gibt `{ anlass, saisonId, setAnlass, anlaesse }`. Darstellung `Kontextzeile`: zwei `Select` (Saison, Anlass) in einer Zeile mit Klasse `pl-tabs pl-tabs--sunken`-Abstand; im `Geruest` unter der `TopNav`, nur auf Seiten der Bereiche Produktion und Auswertung (über `hauptnav(pfad)`).
- [ ] **Schritt 4:** In den genannten Seiten die eigene Suche nach dem Anlass durch `useKontext()` ersetzen (in `produktion/page.tsx` die Zeile `const anlass = (…).find((x) => x.menuelinie.length > 0)`). Das Spiel bleibt Filter der jeweiligen Seite. Die Kontrollwerte aus der Excel müssen für den Spengler Cup gleich herauskommen wie vorher.
- [ ] **Schritt 5: Commit** `Saison und Anlass einmal wählen, gilt auf allen Seiten`

---

### Aufgabe 11: Küchenansicht fürs Handy und Tablet

**Dateien:** Neu `app/app/(geschuetzt)/kueche/page.tsx`, `app/public/manifest.webmanifest`; ändern `app/app/layout.tsx`, `app/lib/navigation.ts`, `design-system/components/bundle.css`

Entwurf: Artboard «B · Küchenpass». Eine Seite für die Arbeit am Posten: eine Welle, grosse Zeilen zum Abhaken, Fortschritt. Kein eigenes Projekt, dieselbe Datenbank und dieselben Funktionen wie der Wellenplan.

- [ ] **Schritt 1:** Seite `/kueche/` lädt `produktion_checkliste` der Saison aus `useKontext()` (wie `produktion/page.tsx`, über `alleSeiten`), gruppiert nach `welle_nr`, zeigt oben die Wellen als `SegmentedControl` (`wellenName` aus Aufgabe 7) und den Fortschritt, darunter pro Komponente eine Zeile:

```css
.pl-pass { display: flex; align-items: center; gap: var(--space-4); min-height: 72px; padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--border); }
.pl-pass input[type=checkbox] { width: 32px; height: 32px; accent-color: var(--accent); flex: none; margin: 0; }
.pl-pass__name { flex: 1; min-width: 0; font-size: 18px; font-weight: 600; }
.pl-pass--erledigt .pl-pass__name { text-decoration: line-through; color: var(--ink-muted); }
.pl-pass__menge { font-family: var(--font-mono); font-size: 18px; white-space: nowrap; }
```

Abhaken ruft `checklisteSpeichern` aus `lib/checkliste-speichern.ts` mit `{ erledigt_am }` für genau diese Welle, optimistisch wie in `produktion/page.tsx` (`aufgabeSpeichern`), bei Fehler zurücksetzen und `Notice role="alert"`.
- [ ] **Schritt 2:** Filter «Noch offen», «Erledigt», «Meine» als `SegmentedControl`; «Meine» vergleicht `zustaendig` mit dem Namen des angemeldeten Benutzers.
- [ ] **Schritt 3:** In `GRUPPEN` unter «Produktion» den Eintrag `{ label: "Küche heute", href: "/kueche/" }` ergänzen und die Tests aus Aufgabe 2 anpassen.
- [ ] **Schritt 4: Auf den Home-Bildschirm.** `public/manifest.webmanifest`:

```json
{ "name": "Produktionsplaner GAMMA Catering", "short_name": "Planer", "start_url": "/kueche/", "display": "standalone", "background_color": "#FFFFFF", "theme_color": "#4C0C14", "icons": [] }
```

In `app/layout.tsx` `metadata` um `manifest: "/manifest.webmanifest"` und `appleWebApp: { capable: true, title: "Planer" }` ergänzen. Icons (192 und 512 px) erst einfügen, wenn das GAMMA-Logo vorliegt; bis dahin bleibt die Liste leer und das Gerät nimmt ein Bildschirmfoto.
- [ ] **Schritt 5: Von Hand prüfen** auf einem iPhone und einem iPad im WLAN der Küche: Abhaken mit einem Finger, Lesbarkeit auf Armlänge, Verhalten bei kurzem Funkloch (Fehlermeldung statt stillem Verlust).
- [ ] **Schritt 6: Commit** `Küchenansicht zum Abhaken pro Welle, als Web-App auf dem Home-Bildschirm`

---

## Nicht in diesem Plan

- **Native App in Swift.** Erst prüfen, wenn die Küchenansicht im Pilot (White Turf, Februar 2027) an Grenzen stösst: Arbeiten ohne Netz im Kühlraum, Scannen von Etiketten, Push-Meldungen. Die Datenbank bleibt dieselbe.
- **Globale Suche mit ⌘K.** Die Suche pro Liste (Aufgabe 4) deckt den Bedarf im Pilot.
- **Hausschrift PP Neue Montreal und GAMMA-Logo.** Hängen an der Lizenz und am Asset von GAMMA; im Changelog unter «Offen».
- **Vertikaler Schriftzug am linken Rand.** Schmuck aus dem Entwurf; kommt mit dem Logo.

## Selbstprüfung

- Jeder Befund der Prüfung hat eine Aufgabe (Tabelle oben). «Welle 0» ist in Aufgabe 7 und 11 als «Ohne Welle» beschriftet.
- Namen über Aufgaben hinweg: `hauptnav`, `unternav`, `seitenTabs` (2, 3, 9); `wellenName` (7, 11); `useKontext` (10, 11); `suchen` (4); `naechsteSortierung` (5); `gespeichertText` (6); `istGeaendert`, `useUngespeichert` (1).
- Aufgaben 9, 10 und 11 beschreiben Umbauten in Dateien, die beim Schreiben des Plans nicht vollständig gelesen wurden (`KomponenteBearbeiten.tsx`, Wellen-, Aufwand-, Ressourcen- und Einkaufsseite). Dort zuerst lesen, dann das beschriebene Muster anwenden; bei Abweichung Dominik fragen.
