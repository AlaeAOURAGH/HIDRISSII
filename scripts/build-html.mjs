// Regenerate the production index.html from the design-source .dc.html.
//
// The .dc.html file is the visual/markup source of truth (kept as-is so the
// design tool still opens it). This script derives the deployable index.html:
//   - removes the client-side libheif decoder (images are pre-converted WebP)
//   - rewrites <img ref=…> bindings to plain src + width/height + lazy-load
//   - swaps the inline PRODUCTS/logic for the runtime version (scripts/app-logic.js)
//     that fetches products.json and POSTs leads to /api/order
//   - injects SEO / Open Graph / analytics / honeypot
//
// Run:  node scripts/build-html.mjs

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'Catalog v2 -standalone-src-.dc.html');
const LOGIC = path.join(ROOT, 'scripts', 'app-logic.js');
const OUT = path.join(ROOT, 'index.html');

const SITE_URL = 'https://hidrissi.ma';

// Search copy. Two rules drove the wording:
//   - "scooter" AND "trottinette" both appear: Moroccan buyers search both words
//     for the same object, and the page used to contain only "trottinette"
//     (Google was reporting "Missing: scooters" on our own result).
//   - every claim below is one the site already makes elsewhere — 16 models,
//     2 490-8 990 dh, livraison offerte, paiement à la livraison, garantie
//     12 mois, SAV atelier. Nothing invented; a description Google can't
//     corroborate on the page gets rewritten by Google.
function fmtDh(n) {
  return n.toLocaleString('fr-FR').replace(/,/g, ' ');
}

function buildSeo(modelCount, priceMin, priceMax) {
  const minDh = fmtDh(priceMin);
  const maxDh = fmtDh(priceMax);
  return `
<title>Scooter &amp; trottinette électrique Maroc — dès ${minDh} dh | HIDRISSI</title>
<meta name="description" content="${modelCount} scooters et trottinettes électriques de ${minDh} à ${maxDh} dh. Livraison offerte partout au Maroc, paiement à la livraison, garantie 12 mois et SAV atelier.">
<meta name="keywords" content="scooter électrique Maroc, trottinette électrique Maroc, acheter scooter électrique Casablanca, trottinette électrique Rabat, trottinette électrique Marrakech, scooter électrique prix Maroc, paiement à la livraison, WATHIUM, KEPOW, SEGWAY, HEZZO, NXRIDE">
<link rel="canonical" href="${SITE_URL}/">
<meta name="theme-color" content="#FAF7F2">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="assets/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="HIDRISSI">
<meta property="og:title" content="Scooters &amp; trottinettes électriques au Maroc — dès ${minDh} dh">
<meta property="og:description" content="${modelCount} modèles homologués pour la ville et le tout-terrain. Livraison offerte partout au Maroc · Paiement à la livraison · Garantie 12 mois · SAV atelier.">
<meta property="og:image" content="${SITE_URL}/assets/og-cover.jpg">
<meta property="og:url" content="${SITE_URL}/">
<meta property="og:locale" content="fr_MA">
<meta property="og:locale:alternate" content="ar_MA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Scooters &amp; trottinettes électriques au Maroc — dès ${minDh} dh">
<meta name="twitter:description" content="${modelCount} modèles en stock · Livraison offerte partout au Maroc · Paiement à la livraison · Garantie 12 mois.">
<meta name="twitter:image" content="${SITE_URL}/assets/og-cover.jpg">
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Store","name":"HIDRISSI","description":"Vente de scooters et trottinettes électriques au Maroc. Livraison partout au Maroc, paiement à la livraison, garantie 12 mois.","image":"${SITE_URL}/assets/og-cover.jpg","url":"${SITE_URL}/","email":"contact@hidrissi.ma","telephone":"+212606555567","sameAs":["https://www.instagram.com/h.idrissielectro","https://wa.me/212606555567"],"address":{"@type":"PostalAddress","addressLocality":"Aïn Aouda","addressRegion":"Rabat","addressCountry":"MA"},"areaServed":[{"@type":"Country","name":"Maroc"},{"@type":"City","name":"Casablanca"},{"@type":"City","name":"Rabat"},{"@type":"City","name":"Marrakech"},{"@type":"City","name":"Tanger"},{"@type":"City","name":"Fès"},{"@type":"City","name":"Agadir"}],"priceRange":"${priceMin}-${priceMax} MAD","currenciesAccepted":"MAD","paymentAccepted":"Cash on delivery"}
</script>
<!-- Analytics: put your real GA4 + Meta Pixel IDs here; they stay inert until the X placeholders are replaced. -->
<script>window.HIDRISSI_ANALYTICS = { ga4: 'G-XXXXXXXXXX', metaPixel: 'XXXXXXXXXXXXXXX' };</script>
<script>(function(){var a=window.HIDRISSI_ANALYTICS||{};
if(a.ga4&&a.ga4.indexOf('X')<0){var s=document.createElement('script');s.async=1;s.src='https://www.googletagmanager.com/gtag/js?id='+a.ga4;document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',a.ga4);}
if(a.metaPixel&&a.metaPixel.indexOf('X')<0){!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',a.metaPixel);fbq('track','PageView');}
})();</script>
`;
}

// Crawlable fallback. The whole catalogue is client-rendered (React from a CDN,
// every heading is a {{ }} binding), so the raw HTML a crawler downloads has no
// product words in it at all. Googlebot does run JS, but on a second, slower
// pass — and non-JS readers (social scrapers, some bots) never get there.
// This block puts the real model names and prices in the served HTML. It is a
// genuine no-JS fallback, and it says the same thing the rendered page says.
function buildNoscript(products, priceMin, priceMax) {
  const rows = products
    .map((p) => {
      const inStock = p.inStock !== false;
      const pricePart = inStock ? `${p.price} dh · ` : 'Rupture de stock · ';
      return `<li>${p.name} — ${pricePart}${p.power} · ${p.range.fr}</li>`;
    })
    .join('\n        ');
  return `
  <noscript>
    <div style="max-width:900px; margin:0 auto; padding:40px 24px; background:#FAF7F2; color:#0E1621; font-family:system-ui,sans-serif; line-height:1.6;">
      <h1>Scooters et trottinettes électriques au Maroc — HIDRISSI</h1>
      <p>HIDRISSI vend des scooters et trottinettes électriques homologués pour la ville
      et le tout-terrain, avec livraison offerte partout au Maroc : Casablanca, Rabat,
      Marrakech, Tanger, Fès, Agadir et toutes les autres villes. Vous payez à la livraison,
      après vérification. Garantie 12 mois et SAV assuré par notre propre atelier.
      Showroom à Aïn Aouda, Rabat.</p>
      <h2>Nos ${products.length} modèles, de ${fmtDh(priceMin)} à ${fmtDh(priceMax)} dh</h2>
      <ul>
        ${rows}
      </ul>
      <p>Commander ou demander conseil sur WhatsApp :
      <a href="https://wa.me/212606555567" style="color:#0E1621;">+212 606-555567</a>.</p>
      <p><strong>Activez JavaScript pour voir le catalogue complet avec photos et fiches techniques.</strong></p>
    </div>
  </noscript>`;
}

const HONEYPOT = `
            <label aria-hidden="true" tabindex="-1" style="position:absolute; left:-9999px; top:auto; width:1px; height:1px; overflow:hidden;">
              Ne pas remplir
              <input type="text" tabindex="-1" autocomplete="off" value="{{ form.hp }}" onChange="{{ updateField }}" data-field="hp">
            </label>`;

// Extract the whole `T = { … }` statement from the source via brace matching.
function extractT(src) {
  const kw = src.indexOf('  T = {');
  if (kw === -1) throw new Error('could not find T block in source');
  const braceStart = src.indexOf('{', kw);
  let depth = 0, j = braceStart;
  for (; j < src.length; j++) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) break; }
  }
  return src.slice(kw, j + 1) + ';';
}

function replaceOnce(s, find, repl, label) {
  const i = s.indexOf(find);
  if (i === -1) throw new Error('build-html: could not find ' + (label || find.slice(0, 60)));
  return s.slice(0, i) + repl + s.slice(i + find.length);
}

async function main() {
  let html = await readFile(SRC, 'utf8');
  const tBlock = extractT(html);
  let logic = await readFile(LOGIC, 'utf8');
  logic = logic.replace('  // __T_BLOCK__', tBlock);

  const catalog = JSON.parse(await readFile(path.join(ROOT, 'products.json'), 'utf8'));
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const priceNums = products.map((p) => p.priceNum).filter((n) => typeof n === 'number');
  const priceMin = priceNums.length ? Math.min(...priceNums) : 2490;
  const priceMax = priceNums.length ? Math.max(...priceNums) : 8990;
  const seo = buildSeo(products.length, priceMin, priceMax);

  const THEME_FLASH = `<script>(function(){try{var t=localStorage.getItem('hidrissi-theme')||'light';document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');}catch(e){document.documentElement.setAttribute('data-theme','light');}})();</script>`;

  // 1. <html> lang + theme flash (before paint)
  html = replaceOnce(html, '<html>', '<html lang="fr">', '<html>');
  if (!html.includes("localStorage.getItem('hidrissi-theme')")) {
    html = replaceOnce(html, '<meta charset="utf-8">', '<meta charset="utf-8">\n' + THEME_FLASH, 'theme flash');
  }

  // 2. SEO / OG / analytics after the viewport meta
  const vp = '<meta name="viewport" content="width=device-width, initial-scale=1">';
  html = replaceOnce(html, vp, vp + seo, 'viewport meta');

  // 3. Remove the libheif client decoder
  html = html.replace(
    '<script src="https://cdn.jsdelivr.net/npm/libheif-js@1.18.2/libheif-wasm/libheif-bundle.js"></script>\n',
    ''
  );

  // 4. Logos out of the (undeployed) uploads/ folder
  html = html.split('uploads/logo-white.png').join('assets/logo-white.png');

  // 5. <img ref=…> bindings -> src + intrinsic dimensions + lazy-load
  html = replaceOnce(html,
    '<img ref="{{ heroRef }}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center;" alt="HIDRISSI">',
    '<img src="{{ heroImage }}" width="{{ heroW }}" height="{{ heroH }}" decoding="async" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:center;" alt="HIDRISSI">',
    'hero img');
  html = replaceOnce(html,
    '<img ref="{{ currentImageRef }}" alt="{{ currentProduct.name }}">',
    '<img src="{{ currentImage }}" width="{{ currentImageW }}" height="{{ currentImageH }}" decoding="async" alt="{{ currentProduct.name }}">',
    'detail main img');
  html = replaceOnce(html,
    '<img ref="{{ img.srcRef }}" style="width:100%; height:100%; object-fit:cover;" alt="">',
    '<img src="{{ img.thumb }}" width="{{ img.w }}" height="{{ img.h }}" loading="lazy" decoding="async" style="width:100%; height:100%; object-fit:cover;" alt="">',
    'detail thumb img');
  html = replaceOnce(html,
    '<img ref="{{ p.thumbRef }}" class="pcard-img" alt="{{ p.name }}">',
    '<img src="{{ p.thumb }}" width="{{ p.thumbW }}" height="{{ p.thumbH }}" loading="lazy" decoding="async" class="pcard-img" alt="{{ p.name }}">',
    'card img');

  // 6. Card click carries the product name (robust under filtering) not a filtered index
  html = replaceOnce(html,
    '<article onClick="{{ openProduct }}" data-idx="{{ $index }}"',
    '<article onClick="{{ openProduct }}" data-name="{{ p.name }}"',
    'card article data attr');

  // 6b. No-JS / crawler fallback right after <body>
  if (products.length) {
    html = replaceOnce(html, '<body>', '<body>' + buildNoscript(products, priceMin, priceMax), '<body>');
  }

  // 7. Honeypot field after the note input
  const noteIdx = html.indexOf('data-field="note"');
  if (noteIdx === -1) throw new Error('build-html: note field not found');
  const labelClose = html.indexOf('</label>', noteIdx) + '</label>'.length;
  html = html.slice(0, labelClose) + HONEYPOT + html.slice(labelClose);

  // 8. Swap the inline logic block for the runtime version
  html = html.replace(
    /(<script type="text\/x-dc" data-dc-script[^>]*>)[\s\S]*?(<\/script>)/,
    (_m, open, close) => open + '\n' + logic.trimEnd() + '\n' + close
  );

  await writeFile(OUT, html, 'utf8');
  console.log('Wrote index.html (' + html.length + ' bytes).');
}

main().catch((e) => { console.error(e); process.exit(1); });
