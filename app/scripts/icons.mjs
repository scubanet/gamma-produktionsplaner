// Erzeugt Favicon und App-Icons aus design-system/assets/bildmarke.svg (einzige Quelle der Bildmarke).
// Aufruf: npm run icons. Nur nötig, wenn die Bildmarke getauscht wird; die erzeugten Dateien sind im Repo.
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const pfad = (p) => new URL(p, import.meta.url);
const quelle = pfad('../../design-system/assets/bildmarke.svg');
const svg = readFileSync(quelle);
const grund = JSON.parse(readFileSync(pfad('../public/manifest.webmanifest'), 'utf8')).background_color;

// Bildmarke mittig auf einer Fläche; anteil = Breite der Marke im Verhältnis zur Fläche.
// Maskierbare Icons brauchen die Marke im mittleren Bereich (höchstens 80 %), sonst schneidet das Gerät sie an.
async function icon(groesse, anteil, hintergrund) {
  const marke = await sharp(svg, { density: 1200 }).resize(Math.round(groesse * anteil)).png().toBuffer();
  return sharp({ create: { width: groesse, height: groesse, channels: 4, background: hintergrund } })
    .composite([{ input: marke, gravity: 'centre' }]).png().toBuffer();
}

// ICO-Datei mit eingebetteten PNG (32 und 48 px).
function ico(bilder) {
  const kopf = Buffer.alloc(6 + 16 * bilder.length);
  kopf.writeUInt16LE(1, 2);
  kopf.writeUInt16LE(bilder.length, 4);
  let ab = kopf.length;
  bilder.forEach(({ groesse, png }, i) => {
    const e = 6 + 16 * i;
    kopf.writeUInt8(groesse, e);
    kopf.writeUInt8(groesse, e + 1);
    kopf.writeUInt16LE(1, e + 4);
    kopf.writeUInt16LE(32, e + 6);
    kopf.writeUInt32LE(png.length, e + 8);
    kopf.writeUInt32LE(ab, e + 12);
    ab += png.length;
  });
  return Buffer.concat([kopf, ...bilder.map((b) => b.png)]);
}

const klar = { r: 0, g: 0, b: 0, alpha: 0 };
copyFileSync(quelle, pfad('../public/brand/bildmarke.svg'));
// Bildmarke von der GAMMA-Website (74 px, einfarbig dunkel): reicht für Kopfzeile und Anmeldung, nicht für die App-Icons.
copyFileSync(pfad('../../design-system/assets/bildmarke-web.png'), pfad('../public/brand/bildmarke-web.png'));
copyFileSync(quelle, pfad('../app/icon.svg'));
writeFileSync(pfad('../app/favicon.ico'), ico([{ groesse: 32, png: await icon(32, 1, klar) }, { groesse: 48, png: await icon(48, 1, klar) }]));
writeFileSync(pfad('../app/apple-icon.png'), await icon(180, 0.64, grund));
for (const g of [192, 512]) {
  writeFileSync(pfad(`../public/icons/icon-${g}.png`), await icon(g, 0.72, grund));
  writeFileSync(pfad(`../public/icons/icon-maskierbar-${g}.png`), await icon(g, 0.5, grund));
}
console.log('Icons geschrieben');
