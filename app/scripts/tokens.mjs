// Erzeugt app/tokens.css aus design-system/tokens.json (einzige Quelle der Werte).
// Aufruf: npm run tokens (läuft auch vor dev und build).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const quelle = new URL('../../design-system/tokens.json', import.meta.url);
const ziel = new URL('../app/tokens.css', import.meta.url);

export function tokensCss(t) {
  const hell = [], dunkel = [];
  for (const c of t.color.tokens) {
    hell.push(`  --${c.name}: ${c.value.light};`);
    dunkel.push(`  --${c.name}: ${c.value.dark};`);
  }
  const rest = [
    `  --font-sans: ${t.type.families.sans};`,
    `  --font-mono: ${t.type.families.mono};`,
    ...['spacing', 'radius', 'shadow', 'size'].flatMap((g) => t[g].tokens.map((x) => `  --${x.name}: ${x.value};`)),
  ];
  return [
    '/* Generiert aus design-system/tokens.json durch scripts/tokens.mjs. Nicht von Hand ändern. */',
    ':root {', ...hell, ...rest, '  color-scheme: light dark;', '}',
    '@media screen and (prefers-color-scheme: dark) {', '  :root {', ...dunkel.map((l) => '  ' + l), '  }', '}',
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(ziel, tokensCss(JSON.parse(readFileSync(quelle, 'utf8'))));
  console.log('tokens.css geschrieben');
}
