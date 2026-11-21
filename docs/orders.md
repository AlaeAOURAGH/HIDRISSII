# Orders administration

The CMS has a **Mes commandes** link to `/admin/orders`. It uses the existing GitHub OAuth app and verifies repository write permission on every read and update. A public visitor cannot read orders.

Connect a **private** Vercel Blob store to this Vercel project, production environment, with `BLOB_READ_WRITE_TOKEN`. Never create a public store for orders or commit this token. The store keeps immutable order JSON records and separate status records outside the public Git repository and `dist`.

The order form waits for successful storage before opening WhatsApp. It retains entered values and displays an error if storage fails. An order records a website request, not proof that the customer sent the WhatsApp message or paid.

Saved fields: ID, server timestamp, customer name, phone, city, address, product name/ID, quantity, server-validated unit price, total MAD, note, language, source. Statuses: new, confirmed, dispatched, delivered, cancelled. Status updates also record their timestamp.

The dashboard loads 100 newest requests per page, with a button for older requests. Search, counts and CSV export concern loaded rows. CSV export uses French Excel separators, UTF-8 BOM, quotes and formula protection.

Existing orders that were never saved by the previous unconfigured Google Sheets integration cannot be recovered from this feature. There is no automatic access to WhatsApp chat history. Previous Google Sheet environment variables are not used by this order store.

Validation: `node --test tests/orders.test.cjs` and `npm run build`. The synthetic local preview harness lives outside this repository and must not be deployed.
