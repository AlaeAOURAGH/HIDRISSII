// Canonical catalog -> compatibility data -> existing visual build -> static hosting output.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
process.chdir(root);
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const format = n => n.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
if (process.argv.includes('--migrate')) {
  if (fs.existsSync('data/products.json')) throw new Error('Canonical catalog already exists');
  const old = read('products.json');
  old.products = old.products.map(p => ({
    id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name: p.name, category: p.cat, category_label: p.category, brand: p.brand,
    badge: p.badge, price: p.priceNum, in_stock: p.inStock !== false,
    power: p.power, speed: p.speed.fr || p.speed, range: p.range.fr || p.range,
    speed_i18n: p.speed, range_i18n: p.range, short_desc: p.shortDesc,
    desc: p.desc, features: p.features, specs: p.specs,
    images: p.images.map(im => '/' + im.display.replace(/^\//, '')),
    image_meta: Object.fromEntries(p.images.map(im => ['/' + im.display.replace(/^\//, ''), im]))
  }));
  delete old._generated; delete old._note;
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync('data/products.json', JSON.stringify(old, null, 2) + '\n');
  console.log('Migrated', old.products.length, 'products, preserving translations/specifications/image metadata');
  process.exit(0);
}
const catalog = read('data/products.json');
// The CMS edits individual entries in this array; the public API keeps its shape.
if (fs.existsSync('data/catalogue.json')) {
  const entries = read('data/catalogue.json');
  if (!Array.isArray(entries)) throw new Error('data/catalogue.json must be an array');
  catalog.products = entries;
}
const ids = new Set();
for (const p of catalog.products) {
  if (!p.id || ids.has(p.id) || !p.name || !Number.isFinite(p.price) || p.price < 0 || typeof p.in_stock !== 'boolean' || !Array.isArray(p.images)) throw new Error('Invalid product: ' + p.name);
  ids.add(p.id);
  for (const src of p.images) {
    if (!/^\/(img|uploads)\/[^<>]+$/.test(src) || src.includes('..') || !fs.existsSync('.' + src)) throw new Error('Missing/invalid image: ' + src);
  }
}
// Root products.json remains generated for older scripts; edit data/products.json only.
const legacy = { ...catalog, products: catalog.products.map(p => ({ ...p,
  cat: p.category, category: p.category_label || p.category,
  priceNum: p.price, price: format(p.price), inStock: p.in_stock, shortDesc: p.short_desc,
  speed: p.speed_i18n || { fr: p.speed }, range: { fr: p.range },
  images: p.images.map(src => ({ display: src, thumb: src, ...(p.image_meta || {})[src] }))
})) };
fs.writeFileSync('products.json', JSON.stringify(legacy, null, 2) + '\n');
execFileSync(process.execPath, ['scripts/build-html.mjs'], { stdio: 'inherit' });
let html = fs.readFileSync('index.html', 'utf8');
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const rows = catalog.products.map(p => `<li>${esc(p.name)} — ${p.in_stock ? format(p.price) + ' dh' : 'Rupture de stock'} · ${esc(p.power)} · ${esc(p.range)}</li>`).join('\n');
html = html.replace(/(<noscript>[\s\S]*?<ul>)[\s\S]*?(<\/ul>)/, '$1\n<!-- PRODUCTS_START -->\n' + rows + '\n<!-- PRODUCTS_END -->\n$2');
const graph = catalog.products.map(p => ({ '@type':'Product', '@id':'https://hidrissi.ma/#' + p.id, name:p.name, description:p.desc?.fr || p.short_desc?.fr || '', image:p.images.map(src => 'https://hidrissi.ma' + src), brand:{ '@type':'Brand', name:p.brand }, offers:{ '@type':'Offer', priceCurrency:'MAD', price:p.price, availability:'https://schema.org/' + (p.in_stock ? 'InStock' : 'OutOfStock'), url:'https://hidrissi.ma/' } }));
html = html.replace('</head>', '<script type="application/ld+json">' + JSON.stringify({ '@context':'https://schema.org', '@graph':graph }).replace(/</g, '\\u003c') + '</script>\n</head>');
html = html.replace('<sc-if value="{{ noResults }}"', '<div role="status"><sc-if value="{{ loading }}"><p>{{ catalogStatus }}</p></sc-if><sc-if value="{{ loadError }}"><p>{{ catalogStatus }}</p></sc-if></div><sc-if value="{{ noResults }}"');
fs.writeFileSync('index.html', html);
fs.mkdirSync('dist', { recursive: true });
for (const item of ['index.html','support.js','storefront.css','premium.css','mobile.css','footer.css','product.css','data','admin','img','assets','robots.txt','sitemap.xml']) fs.cpSync(item, path.join('dist', item), { recursive: true });
fs.writeFileSync('dist/data/products.json', JSON.stringify(catalog, null, 2) + '\n');
if (fs.existsSync('uploads')) fs.cpSync('uploads', 'dist/uploads', { recursive: true });
console.log('Built', catalog.products.length, 'products into dist/');
