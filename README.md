# HIDRISSI — Catalogue trottinettes électriques (FR / AR)

Bilingual (French / Arabic, RTL) electric-scooter catalog for HIDRISSI (Morocco).
No online payment: orders go through WhatsApp with cash on delivery. Every order
is also captured server-side (Google Sheet) so no lead is lost.

## What ships

```
index.html            Production single-page catalog (static; boots React from CDN)
support.js            Design-component runtime (unchanged)
products.json         Catalog data — prices/specs/text, bilingual { fr, ar }  ← edit this
img/                  Pre-optimized WebP (1200px display + 600px thumbnail, q75)
assets/               Logos + og-cover.jpg (social share)
api/order.js          POST /api/order → validates + honeypot + rate-limit → Google Sheet
api/config.js         GET  /api/config → { waNumber } from env
robots.txt, sitemap.xml
vercel.json           cleanUrls + long-lived cache headers for /img and /assets
scripts/              Local build tooling (NOT deployed — see .vercelignore)
```

The design source (`*.dc.html`) and raw photos (`uploads/`) stay local; they are
excluded from deploys via `.vercelignore` / `.gitignore`.

## Image pipeline

Source photos are HEIC (many with a misleading `.jpg` extension) and multi-MB
JPEGs at 3024×4032. They are converted **once, at ingest** — never in the browser
(libheif was removed). 293 MB → ~16 MB.

```bash
npm install
npm run build:images        # convert uploads/ → img/*.webp, regenerate products.json
FORCE=1 npm run build:images # force reconvert everything
```

`sharp` can't decode HEIC (its prebuilt binary omits the HEVC plugin), so HEIC
bytes go through `heic-convert` first, then `sharp` for the resize + WebP encode.
Every `<img>` gets explicit `width`/`height` + `loading="lazy"` to prevent layout
shift; the aspect-ratio wrappers keep the grid stable.

### Editing the catalog

- **Change a price / spec / description:** edit `products.json` and redeploy.
  Bilingual fields are `{ "fr": "...", "ar": "..." }`.
- **Add a product or photo:** put the source photo in `uploads/`, add the product
  (with `imagePaths`) to the `<script data-dc-script>` block in
  `Catalog v2 -standalone-src-.dc.html`, then run `npm run build:images` (rebuilds
  `products.json`) and `node scripts/build-html.mjs` (rebuilds `index.html`).

## Order capture

On submit the client fires `POST /api/order` (fire-and-forget, `keepalive`) **then**
opens the pre-filled `wa.me` link. The lead is stored even if the customer never
hits send in WhatsApp.

`/api/order` appends a row to a Google Sheet: `timestamp, name, phone, city,
product, qty, price, address, note, lang`. Spam protection: a hidden honeypot
field + a per-IP rate limit (6 / 10 min).

### Google Sheet setup

1. Google Cloud Console → new project → enable **Google Sheets API**.
2. Create a **Service Account**, add a **JSON key**.
3. Create a Google Sheet, tab named **Orders**, header row:
   `timestamp | name | phone | city | product | qty | price | address | note | lang`.
4. Share the sheet with the service account's `client_email` (Editor).
5. Set env vars (below) from the JSON key + the sheet ID.

If the Google env vars are absent, `/api/order` logs the lead to the function
console and returns without crashing — the WhatsApp hand-off still works.

## Environment variables

See `.env.example`. Set these in **Vercel → Settings → Environment Variables**
(and in `.env.local` for `vercel dev`):

| Var | Purpose |
|-----|---------|
| `WA_NUMBER` | WhatsApp number (country code, no `+`). Served via `/api/config`. |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account `client_email`. |
| `GOOGLE_PRIVATE_KEY` | Service account private key (keep the `\n`). |
| `GOOGLE_SHEET_ID` | ID from the sheet URL. |
| `GOOGLE_SHEET_RANGE` | Optional, default `Orders!A:J`. |

## Deploy (Vercel)

```bash
npm i -g vercel
vercel            # first run links the project
vercel --prod
```

Zero-config: static files serve from the repo root, `api/*.js` become serverless
functions. Then add a **custom domain** (e.g. `hidrissi.ma`) in the Vercel
dashboard — SSL is automatic.

## SEO / Analytics

- `<title>`, meta description, canonical, Open Graph + Twitter cards, `Store`
  JSON-LD, and `og-cover.jpg` are in `index.html` / `assets/`.
- `robots.txt` + `sitemap.xml` reference `https://hidrissi.ma` — update if the
  domain differs.
- Analytics are inert until configured: edit the IDs in the
  `window.HIDRISSI_ANALYTICS = { ga4: 'G-XXXX…', metaPixel: 'XXXX…' }` line near
  the top of `index.html`. They only load once the `X` placeholders are replaced.

## Local preview

```bash
vercel dev                 # full stack incl. /api routes  (needs env in .env.local)
# or static-only:
npx serve .                # then open http://localhost:3000
```
