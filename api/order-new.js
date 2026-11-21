// Validated public intake. No public endpoint returns customer details.
const { randomUUID } = require('node:crypto');
const store = require('../lib/order-store');
const products = require('../data/catalogue.json');
const hits = new Map();
const clean = (v, max) => typeof v === 'string' ? v.replace(/[\x00-\x1f\x7f]/g, ' ').trim().slice(0, max) : '';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'method_not_allowed' }); }
  if (req.headers.origin && req.headers.origin !== 'https://www.hidrissi.com' && req.headers.origin !== 'https://hidrissi.com') return res.status(403).json({ ok: false, error: 'forbidden' });
  let body = req.body;
  if (typeof body === 'string') { if (body.length > 10000) return res.status(413).json({ ok: false, error: 'too_large' }); try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ ok: false, error: 'invalid_body' });
  if (clean(body.hp, 100)) return res.status(200).json({ ok: true });
  const now = Date.now();
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const attempts = (hits.get(ip) || []).filter(ts => now - ts < 600000);
  if (attempts.length >= 10) return res.status(429).json({ ok: false, error: 'rate_limited' });
  attempts.push(now); if (hits.size > 5000) hits.clear(); hits.set(ip, attempts);
  const name = clean(body.name, 120), phone = clean(body.phone, 40);
  const qty = Number(body.qty);
  const product = products.find(p => p.name === body.product);
  if (!name || !/^[+\d][\d\s().-]{7,19}$/.test(phone) || !Number.isInteger(qty) || qty < 1 || qty > 3 || !product || !product.in_stock) return res.status(400).json({ ok: false, error: 'invalid_order' });
  const id = clean(body.orderId, 60) || now + '-' + randomUUID();
  if (!store.ID.test(id) || Number(id.slice(0, 13)) > now + 300000 || Number(id.slice(0, 13)) < now - 604800000) return res.status(400).json({ ok: false, error: 'invalid_id' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ ok: false, error: 'storage_not_configured' });
  const order = { id, createdAt: new Date(now).toISOString(), name, phone, city: clean(body.city, 80), address: clean(body.address, 300), note: clean(body.note, 500), product: product.name, productId: product.id, qty, unitPrice: product.price, total: product.price * qty, currency: 'MAD', lang: body.lang === 'ar' ? 'ar' : 'fr', source: 'website', status: 'new' };
  try { await store.save(order); return res.status(201).json({ ok: true, id }); }
  catch { return res.status(502).json({ ok: false, error: 'store_failed' }); }
};
