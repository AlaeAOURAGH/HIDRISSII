import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = 'C:\\Users\\Administrateur.PC\\Downloads\\ChatGPT Image Jul 28, 2026, 12_52_53 PM.png';
const out = path.join(ROOT, 'assets', 'hero-1600.webp');

const meta = await sharp(src).metadata();
console.log('source', meta.width, meta.height);

const info = await sharp(src).rotate().resize(1600, null, { withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
console.log('display', info.width, info.height);
