const store = require('../lib/order-store');
const { authorize } = require('../lib/admin-auth');
module.exports = async (req, res) => {
  if (!await authorize(req, res)) return;
  if (!['GET', 'PATCH'].includes(req.method)) { res.setHeader('Allow', 'GET, PATCH'); return res.status(405).json({ error: 'method_not_allowed' }); }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: 'storage_not_configured' });
  try {
    if (req.method === 'GET') {
      const cursor = new URL(req.url, 'https://www.hidrissi.com').searchParams.get('cursor');
      if (cursor && (cursor.length > 2000 || !/^[A-Za-z0-9+/=_-]+$/.test(cursor))) return res.status(400).json({ error: 'invalid_cursor' });
      return res.status(200).json(await store.page(cursor));
    }
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'invalid_body' }); } }
    if (!body || !store.ID.test(body.id || '') || !store.STATUSES.includes(body.status)) return res.status(400).json({ error: 'invalid_status' });
    const result = await store.update(body.id, body.status, 'catalog-editor');
    return result ? res.status(200).json(result) : res.status(404).json({ error: 'order_not_found' });
  } catch { return res.status(502).json({ error: 'storage_failed' }); }
};
