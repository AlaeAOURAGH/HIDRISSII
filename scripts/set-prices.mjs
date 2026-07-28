// Update product prices in BOTH products.json (the live catalog the site reads)
// and the .dc.html design source (so a future rebuild keeps the new prices).
// Keyed by exact product name, so shared price values can't collide.
//
// Usage: node scripts/set-prices.mjs '{"WATHIUM RS-2":6300,"NXRIDE":3100}'

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_PATH = path.join(ROOT, 'products.json');
const SRC_PATH = path.join(ROOT, 'Catalog v2 -standalone-src-.dc.html');

const map = JSON.parse(process.argv[2] || '{}');
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); // 6300 -> "6 300"

// --- products.json ---
const data = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
const changed = [];
for (const p of data.products) {
  if (Object.prototype.hasOwnProperty.call(map, p.name)) {
    const n = map[p.name];
    changed.push(`${p.name}: ${p.price} -> ${fmt(n)}`);
    p.price = fmt(n);
    p.priceNum = n;
  }
}
writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');

// --- source .dc.html (line-based, tracking the current product block) ---
const lines = readFileSync(SRC_PATH, 'utf8').split('\n');
let current = null;
for (let i = 0; i < lines.length; i++) {
  const nm = lines[i].match(/^\s*name: '(.+?)',\s*$/);
  if (nm) { current = nm[1]; continue; }
  if (current && Object.prototype.hasOwnProperty.call(map, current)) {
    const pr = lines[i].match(/^(\s*)price: '[^']*', priceNum: \d+,/);
    if (pr) {
      const n = map[current];
      lines[i] = `${pr[1]}price: '${fmt(n)}', priceNum: ${n},`;
      current = null; // done with this product's price
    }
  }
}
writeFileSync(SRC_PATH, lines.join('\n'), 'utf8');

console.log('Updated ' + changed.length + ' product(s):');
for (const c of changed) console.log('  ' + c);
const missing = Object.keys(map).filter((k) => !data.products.some((p) => p.name === k));
if (missing.length) console.log('WARNING - name not found: ' + missing.join(', '));
