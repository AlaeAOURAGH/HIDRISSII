// One-time (idempotent) image ingest.
//
// Source photos in /uploads are HEIC (many with a misleading .jpg extension)
// and multi-MB JPEGs at 3024x4032. This script converts each image ONCE into
// optimized WebP — a 1200px "display" and a 600px "thumbnail" at ~q75 — writes
// them to /img, and regenerates products.json (the client-facing data file).
//
// HEIC can't be decoded by sharp's prebuilt binary (no bundled HEVC plugin),
// so HEIC bytes go through heic-convert (pure-JS libheif) first, then sharp.
//
// Run:  npm run build:images        (skips already-converted files)
//       FORCE=1 npm run build:images (reconvert everything)

import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import heicConvert from 'heic-convert';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_HTML = path.join(ROOT, 'Catalog v2 -standalone-src-.dc.html');
const IMG_DIR = path.join(ROOT, 'img');
const ASSET_DIR = path.join(ROOT, 'assets');
const OUT_JSON = path.join(ROOT, 'products.json');

const DISPLAY_W = 1200;
const THUMB_W = 600;
const QUALITY = 75;
const FORCE = process.env.FORCE === '1';

const slug = (s) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// --- Pull PRODUCTS / CAT_OF / BRAND_OF / BRANDS / CATS straight out of the
// existing design-source file so this stays the single source of truth. ---
function loadComponentData(html) {
  const marker = html.indexOf('data-dc-script');
  if (marker === -1) throw new Error('no <script data-dc-script> found in source HTML');
  const open = html.indexOf('>', marker) + 1;
  const close = html.indexOf('</script>', open);
  const src = html.slice(open, close);
  const Base = class { constructor(p) { this.props = p || {}; } setState() {} };
  // eslint-disable-next-line no-new-func
  const factory = new Function('DCLogic', 'StreamableLogic', 'React', src + '\n;return Component;');
  const Component = factory(Base, Base, {});
  const inst = new Component({});
  return {
    PRODUCTS: inst.PRODUCTS,
    CAT_OF: inst.CAT_OF,
    BRAND_OF: inst.BRAND_OF,
    BRANDS: inst.BRANDS,
    CATS: inst.CATS,
    WA_NUMBER: inst.WA_NUMBER,
  };
}

// Decode any input (HEIC or JPEG/PNG) into a sharp instance.
async function toSharp(absPath) {
  const buf = await readFile(absPath);
  const isHeic = buf.length > 12 && buf.toString('latin1', 4, 8) === 'ftyp';
  if (isHeic) {
    const jpg = await heicConvert({ buffer: buf, format: 'JPEG', quality: 0.92 });
    return sharp(Buffer.from(jpg));
  }
  return sharp(buf);
}

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

async function convertOne(absSrc, outBase) {
  const displayPath = path.join(IMG_DIR, `${outBase}-${DISPLAY_W}.webp`);
  const thumbPath = path.join(IMG_DIR, `${outBase}-${THUMB_W}.webp`);

  // Idempotent: reuse existing outputs (read dims back) unless FORCE.
  if (!FORCE && (await fileExists(displayPath)) && (await fileExists(thumbPath))) {
    const meta = await sharp(displayPath).metadata();
    return { w: meta.width, h: meta.height, skipped: true };
  }

  const base = await toSharp(absSrc);
  const displayInfo = await base
    .clone()
    .rotate() // respect EXIF orientation
    .resize(DISPLAY_W, null, { withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(displayPath);
  await base
    .clone()
    .rotate()
    .resize(THUMB_W, null, { withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toFile(thumbPath);
  return { w: displayInfo.width, h: displayInfo.height, skipped: false };
}

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  await mkdir(ASSET_DIR, { recursive: true });

  const html = await readFile(SRC_HTML, 'utf8');
  const { PRODUCTS, CAT_OF, BRAND_OF, BRANDS, CATS, WA_NUMBER } = loadComponentData(html);

  console.log(`Ingesting images for ${PRODUCTS.length} products…`);
  const outProducts = [];
  let done = 0, skipped = 0, ogSource = null;

  for (const p of PRODUCTS) {
    const s = slug(p.name);
    const images = [];
    for (let i = 0; i < p.imagePaths.length; i++) {
      const rel = p.imagePaths[i];
      const absSrc = path.join(ROOT, rel);
      if (!existsSync(absSrc)) { console.warn(`  ! missing source: ${rel}`); continue; }
      const outBase = `${s}-${i + 1}`;
      const { w, h, skipped: sk } = await convertOne(absSrc, outBase);
      if (sk) skipped++; else done++;
      if (!ogSource) ogSource = absSrc;
      images.push({
        display: `img/${outBase}-${DISPLAY_W}.webp`,
        thumb: `img/${outBase}-${THUMB_W}.webp`,
        w, h,
      });
      process.stdout.write(`\r  ${p.name}: ${i + 1}/${p.imagePaths.length}   `);
    }
    console.log('');

    outProducts.push({
      name: p.name,
      cat: CAT_OF[p.name] || 'city',
      brand: BRAND_OF[p.name] || '',
      category: p.category,
      badge: p.badge,
      shortDesc: p.shortDesc,
      desc: p.desc,
      power: p.power,
      speed: p.speed,
      range: p.range,
      price: p.price,
      priceNum: p.priceNum,
      specs: p.specs,
      features: p.features,
      images,
    });
  }

  // Social share image (1200x630) from the first real photo.
  if (ogSource) {
    const og = await toSharp(ogSource);
    await og.rotate().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82 })
      .toFile(path.join(ASSET_DIR, 'og-cover.jpg'));
  }

  // Copy the brand logos out of /uploads (which is not deployed).
  for (const logo of ['logo-white.png', 'logo-dark.png']) {
    const from = path.join(ROOT, 'uploads', logo);
    if (existsSync(from)) await copyFile(from, path.join(ASSET_DIR, logo));
  }

  const data = {
    _generated: new Date().toISOString(),
    _note: 'Edit prices/specs/text here freely. Adding images requires re-running npm run build:images.',
    waNumberDefault: WA_NUMBER || '212602070099',
    cats: CATS,
    brands: BRANDS,
    products: outProducts,
  };
  await writeFile(OUT_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');

  console.log(`\nDone. Converted ${done}, reused ${skipped}. products.json written with ${outProducts.length} products.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
