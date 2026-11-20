// One-time lossless migration of published products. Local owner edits are preserved.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
if (fs.existsSync('data/catalogue.json') && !process.argv.includes('--refresh')) throw new Error('Migration already completed; --refresh explicitly refreshes from origin/main');
const catalog = JSON.parse(execFileSync('git', ['show', 'origin/main:data/products.json'], { encoding: 'utf8' }));
fs.writeFileSync('data/catalogue.json', JSON.stringify(catalog.products, null, 2) + '\n');
console.log('Preserved', catalog.products.length, 'published products in data/catalogue.json');
