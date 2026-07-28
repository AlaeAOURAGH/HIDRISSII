// POST /api/order — capture a lead before the WhatsApp hand-off.
//
// Stores { name, phone, city, qty, product, price, address, note, lang, ts }
// as a new row in a Google Sheet. Spam protection: honeypot field + a
// best-effort in-memory rate limit per IP.
//
// Env (see .env.example):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_SHEET_ID,
//   GOOGLE_SHEET_RANGE (optional, default "Orders!A:J")

const { google } = require('googleapis');

// Warm-instance rate limiter: max N submissions per IP per window.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
const hits = new Map(); // ip -> number[] (timestamps)

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear(); // crude memory cap
  return arr.length > MAX_PER_WINDOW;
}

// Strip control characters, trim, and cap length.
const clean = (v, max = 500) =>
  String(v == null ? '' : v).replace(/[\x00-\x1F\x7F]/g, ' ').trim().slice(0, max);

async function appendToSheet(row) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!email || !key || !sheetId) {
    console.warn('[order] Google Sheet env not configured - lead NOT persisted:', row);
    return false;
  }
  const auth = new google.auth.JWT(email, null, key, ['https://www.googleapis.com/auth/spreadsheets']);
  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: process.env.GOOGLE_SHEET_RANGE || 'Orders!A:J',
    // RAW (not USER_ENTERED) so Sheets stores values verbatim — otherwise a phone
    // like "0641451387" is parsed as a number and loses its leading zero.
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  return true;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  // Honeypot: real users never fill this. Pretend success so bots don't retry.
  if (clean(body.hp, 100)) return res.status(200).json({ ok: true });

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';
  if (rateLimited(ip)) return res.status(429).json({ ok: false, error: 'rate_limited' });

  const name = clean(body.name, 120);
  const phone = clean(body.phone, 40);
  if (!name || !phone) return res.status(400).json({ ok: false, error: 'missing_name_or_phone' });

  const ts = clean(body.ts, 40) || new Date().toISOString();
  const row = [
    ts,
    name,
    phone,
    clean(body.city, 80),
    clean(body.product, 120),
    clean(body.qty, 10),
    clean(body.price, 20),
    clean(body.address, 300),
    clean(body.note, 500),
    clean(body.lang, 5),
  ];

  try {
    await appendToSheet(row);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[order] sheet append failed:', e && e.message);
    // Lead is logged above; surface 502 but the client still opens WhatsApp.
    return res.status(502).json({ ok: false, error: 'store_failed' });
  }
};
