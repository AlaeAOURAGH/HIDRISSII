// Exercises the real api/order.js handler against the configured Google Sheet,
// loading env from .env.local. Verifies: a valid order is stored, the honeypot
// silently drops bots, and missing fields are rejected.
// Usage: node scripts/test-order.mjs

import { readFileSync } from 'node:fs';
import { google } from 'googleapis';

// --- load .env.local into process.env ---
const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}

const handler = (await import('../api/order.js')).default;

function mockRes() {
  return {
    _status: 200, _json: null,
    setHeader() {}, status(c) { this._status = c; return this; }, json(o) { this._json = o; return this; },
  };
}
async function post(body) {
  const req = { method: 'POST', headers: { 'x-forwarded-for': '203.0.113.9' }, socket: { remoteAddress: '203.0.113.9' }, body };
  const res = mockRes();
  await handler(req, res);
  return res;
}
async function rowCount() {
  const key = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, null, key, ['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });
  const r = await sheets.spreadsheets.values.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID, range: 'Orders!A:J' });
  return (r.data.values || []).length;
}

const before = await rowCount();
console.log('rows before:', before);

const good = await post({
  name: 'Client Test', phone: '0641451387', city: 'Rabat', qty: '1',
  product: 'KEPOW MAX', price: 3990, address: 'Hay Riad', note: 'test commande', lang: 'fr', hp: '',
  ts: new Date().toISOString(),
});
console.log('valid order    ->', good._status, JSON.stringify(good._json));

const bot = await post({ name: 'Bot', phone: '000', hp: 'i-am-a-bot' });
console.log('honeypot order ->', bot._status, JSON.stringify(bot._json), '(should be 200 + NOT stored)');

const bad = await post({ name: '', phone: '' });
console.log('missing fields ->', bad._status, JSON.stringify(bad._json), '(should be 400)');

const after = await rowCount();
console.log('rows after:', after, '(expect +1 from the valid order only)');
console.log(after === before + 1 ? 'PASS ✅  the valid lead was stored, bot + invalid were not.' : 'CHECK ⚠️  unexpected row delta');
