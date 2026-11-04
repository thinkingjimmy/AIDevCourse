import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next'))('sharp');
const root = new URL('../../', import.meta.url);
const sourceDirectory = 'assets/logo-explorations/retro-mac-ascii-2026-11-04/';
const source = await readFile(new URL(`${sourceDirectory}vector/aidevcourse-retro-mac.svg`, root), 'utf8');
// Tighten the presentation canvas while preserving the approved artwork.
const logo = source
  .replace('width="1254" height="1254" viewBox="0 0 1254 1254"', 'width="256" height="256" viewBox="64 84 1126 1126"')
  .replace(/  <g id="background">[\s\S]*?<\/g>\n/, '').trimEnd() + '\n';
const brand = new URL('public/images/brand/', root);

await writeFile(new URL('logo.svg', brand), logo);
await writeFile(new URL('public/favicon.svg', root), logo.replace('width="256" height="256"', 'width="64" height="64"'));
await sharp(Buffer.from(logo)).resize(512, 512).png().toFile(new URL('logo.png', brand).pathname);
await sharp(Buffer.from(logo)).resize(180, 180).flatten({ background: '#fcfaf7' }).png().toFile(new URL('apple-touch-icon.png', brand).pathname);
await copyFile(new URL(`${sourceDirectory}04-lowercase-a.png`, root), new URL('logo-source.png', brand));
console.log('Updated the SVG logo, PNG logo, source image, favicon, and Apple touch icon.');
