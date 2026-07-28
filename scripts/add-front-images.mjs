// One-time: convert the HIDRISSI-branded promo renders (Music/HIDRISSIIMAGES)
// into WebP display/thumb pairs and prepend each as images[0] on its matching
// product in products.json (front/hero image), pushing existing photos after it.
//
// Run: node scripts/add-front-images.mjs

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = path.join(ROOT, 'img');
const OUT_JSON = path.join(ROOT, 'products.json');
const SRC_DIR = 'C:\\Users\\Administrateur.PC\\Music\\HIDRISSIIMAGES';

const DISPLAY_W = 1200;
const THUMB_W = 600;
const QUALITY = 75;

const slug = (s) =>
  s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// filename (in SRC_DIR) -> exact product name (as it appears in products.json)
const MAP = {
  'ChatGPT Image Jul 21, 2026, 12_24_23 PM.png': 'MAX WHEEL E9 PRO',
  'ChatGPT Image Jul 21, 2026, 12_27_42 PM.png': 'MAX WHEEL GT4',
  'ChatGPT Image Jul 21, 2026, 12_30_38 PM.png': 'NANROBOT N6',
  'ChatGPT Image Jul 21, 2026, 12_35_26 PM (1).png': 'Bison GT 1000W',
  'ChatGPT Image Jul 21, 2026, 12_39_45 PM.png': 'NXRIDE',
  'ChatGPT Image Jul 21, 2026, 12_46_38 PM.png': 'KEPOW K2 MASTER',
  'ChatGPT Image Jul 21, 2026, 12_50_26 PM.png': 'WATHIUM BLADE',
  'ChatGPT Image Jul 21, 2026, 12_53_32 PM.png': 'HEZZO GT06 PRO',
  'ChatGPT Image Jul 21, 2026, 06_17_20 PM.png': 'WATHIUM RS-2',
  'ChatGPT Image Jul 21, 2026, 06_20_49 PM.png': 'ATHRUM CITY',
  'ChatGPT Image Jul 21, 2026, 06_23_36 PM.png': 'TEKNES K-PRO',
  'ChatGPT Image Jul 21, 2026, 06_26_24 PM.png': 'TEKNES KCITY',
  'ChatGPT Image Jul 21, 2026, 06_31_36 PM.png': 'SEGWAY E2 PLUS',
  'ChatGPT Image Jul 21, 2026, 06_34_08 PM.png': 'KEPOW MAX',
  'ChatGPT Image Jul 21, 2026, 06_37_06 PM.png': 'PUCK by EcoXtrem',
  'ChatGPT Image Jul 22, 2026, 07_24_48 PM.png': 'MAX WHEEL FORZA',
};

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  const data = JSON.parse(await readFile(OUT_JSON, 'utf8'));

  const byName = new Map(data.products.map((p) => [p.name, p]));
  const seen = new Set();

  for (const [file, productName] of Object.entries(MAP)) {
    const product = byName.get(productName);
    if (!product) { console.warn(`! no product named "${productName}" — skipping ${file}`); continue; }
    seen.add(productName);

    const srcPath = path.join(SRC_DIR, file);
    const s = slug(product.name);
    const outBase = `${s}-front`;
    const displayPath = path.join(IMG_DIR, `${outBase}-${DISPLAY_W}.webp`);
    const thumbPath = path.join(IMG_DIR, `${outBase}-${THUMB_W}.webp`);

    const base = sharp(srcPath);
    const displayInfo = await base.clone().rotate()
      .resize(DISPLAY_W, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(displayPath);
    await base.clone().rotate()
      .resize(THUMB_W, null, { withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(thumbPath);

    const entry = {
      display: `img/${outBase}-${DISPLAY_W}.webp`,
      thumb: `img/${outBase}-${THUMB_W}.webp`,
      w: displayInfo.width,
      h: displayInfo.height,
    };

    // Idempotent: replace an existing front image (by suffix) instead of stacking dupes.
    product.images = (product.images || []).filter((im) => !im.display.includes('-front-'));
    product.images.unshift(entry);

    console.log(`  ${product.name} <- ${file}`);
  }

  const missing = Object.values(MAP).filter((n) => !seen.has(n));
  if (missing.length) console.warn('! products in MAP not found in products.json:', missing);

  await writeFile(OUT_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`\nDone. products.json updated.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
