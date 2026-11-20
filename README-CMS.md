# Developer setup

Canonical content: `data/products.json`. Root `products.json` and `index.html` are generated compatibility/build output. Run `npm run build` after edits; publish `dist/`. Do not run the old image ingest script against the canonical catalog: it regenerates the legacy catalog from the design source. Existing design files remain visual source for `scripts/build-html.mjs`.

## GitHub and CMS

Replace `YOUR_USER/YOUR_REPO` in `admin/config.yml` with `AlaeAOURAGH/HIDRISSII`. Keep branch `main`. Invite the owner as a repository collaborator with write access. Start with Sveltia's token login (a repository-scoped token with Contents read/write); never commit tokens. For a nontechnical owner's production login, configure a GitHub OAuth app and Sveltia CMS Authenticator, then set its `base_url` in the backend config. OAuth credentials and authorization require account setup; they are not included here.

Official references: https://sveltiacms.app/en/docs/backends/github and https://sveltiacms.app/en/docs/workflows/local.

The CMS includes hidden legacy metadata so editing existing entries retains specs, bilingual labels, and thumbnail sizes. New products use their selected category, power/speed/range and uploaded image paths. `uploads/` is intentionally tracked now. Keep private/raw photo libraries outside this folder.

## Hosting

Cloudflare Pages: connect the repository, production branch `main`, build command `npm run build`, output directory `dist`, Node 22 or newer. Every CMS commit triggers a build. DNS and hosting connections must be configured in the owner's accounts. Netlify uses the included `netlify.toml` with the same build/output.

The current Vercel functions (`api/config.js`, `api/order.js`) remain in source. Static Pages/Netlify output sends orders to WhatsApp using the existing fallback number; Google Sheets capture requires separately hosting or porting those API routes. Keeping Vercel is also possible: include build scripts and uploaded CMS media in its deployment, run `npm run build`, and serve the generated root site alongside `api/`.

## Checks and local preview

Run `npm run build`, then serve `dist/` over HTTP (for example `npx serve dist`). Verify FR/AR, filters, product details, stock restrictions and order links. Open `/admin/` and use Sveltia's local repository workflow for a disposable create/edit/delete test before connecting production. A successful build validates unique IDs, finite nonnegative prices and local image existence. It regenerates the no-JS list between PRODUCTS_START/PRODUCTS_END and Product JSON-LD.

Photos are compressed manually before upload: max 1600px, below 500KB, JPEG/PNG/WebP. Existing WebP assets and thumbnail metadata remain intact. Do not delete old media merely because an entry is removed.
