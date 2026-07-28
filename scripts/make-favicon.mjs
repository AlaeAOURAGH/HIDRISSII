// One-time: turn the gold HIDRISSI emblem (green placeholder background) into
// a proper favicon set — chroma-keys out the green, composites the emblem
// onto the site's dark navy rounded-square backdrop (matching the old inline
// SVG favicon's look), and writes PNGs at the sizes browsers actually use.
//
// Run: node scripts/make-favicon.mjs

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'C:\\Users\\Administrateur.PC\\Downloads\\ChatGPT Image Jul 28, 2026, 04_23_26 PM.png';
const OUT_DIR = path.join(ROOT, 'assets');

const NAVY = { r: 0x0e, g: 0x16, b: 0x21 };

async function chromaKeyToTransparent(inputPath) {
  const img = sharp(inputPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Green-screen style key: the whole backdrop (flat green + the lighter
  // green glow around the emblem) is "green" in the sense that G dominates
  // R and B. The gold emblem's G never exceeds R, and the dark outline
  // strokes are low-saturation, so neither gets caught by this.
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const greenness = g - Math.max(r, b);
    const t = 1 - Math.min(1, Math.max(0, (greenness + 4) / 10));
    data[i + 3] = Math.round(t * 255);
  }

  return sharp(data, { raw: { width, height, channels } }).png();
}

async function makeIcon(emblemBuffer, size, cornerRadiusRatio, padRatio) {
  const pad = Math.round(size * padRatio);
  const emblemSize = size - pad * 2;
  const emblem = await sharp(emblemBuffer)
    .resize(emblemSize, emblemSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const r = Math.round(size * cornerRadiusRatio);
  const roundedRectSvg = Buffer.from(
    `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${r}" ry="${r}" fill="rgb(${NAVY.r},${NAVY.g},${NAVY.b})"/></svg>`
  );

  return sharp(roundedRectSvg)
    .composite([{ input: emblem, left: pad, top: pad }])
    .png()
    .toBuffer();
}

async function main() {
  const keyed = await chromaKeyToTransparent(SRC);
  const emblemBuffer = await keyed.toBuffer();

  const sizes = [
    { size: 32, name: 'favicon-32.png' },
    { size: 180, name: 'apple-touch-icon.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 512, name: 'icon-512.png' },
  ];

  for (const { size, name } of sizes) {
    const buf = await makeIcon(emblemBuffer, size, 0.22, 0.12);
    await sharp(buf).toFile(path.join(OUT_DIR, name));
    console.log('wrote', name, size + 'x' + size);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
