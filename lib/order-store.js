const blob = require('@vercel/blob');
const ID = /^\d{13}-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const STATUSES = ['new', 'confirmed', 'dispatched', 'delivered', 'cancelled'];
function orderPath(id) {
  if (!ID.test(id)) throw new Error('invalid_id');
  return 'orders/' + String(9999999999999 - Number(id.slice(0, 13))).padStart(13, '0') + '-' + id + '.json';
}
function createStore(client = blob) {
  const read = async path => {
    const result = await client.get(path, { access: 'private', useCache: false });
    if (!result) return null;
    if (result.statusCode !== 200 || !result.stream) throw new Error('storage_read_failed');
    return JSON.parse(await new Response(result.stream).text());
  };
  const write = (path, data, overwrite = false) => client.put(path, JSON.stringify(data), {
    access: 'private', addRandomSuffix: false, allowOverwrite: overwrite,
    contentType: 'application/json', cacheControlMaxAge: 60
  });
  return {
    async save(order) {
      const path = orderPath(order.id);
      const previous = await read(path);
      if (previous) return previous;
      try { await write(path, order); } catch (error) {
        // Two retries may reach separate serverless instances at once.
        const existing = await read(path);
        if (existing) return existing;
        throw error;
      }
      return order;
    },
    async page(cursor) {
      const page = await client.list({ prefix: 'orders/', limit: 100, ...(cursor ? { cursor } : {}) });
      const orders = [];
      // Bound parallel private reads; a failed read fails the page instead of hiding an order.
      for (let i = 0; i < page.blobs.length; i += 10) {
        const batch = await Promise.all(page.blobs.slice(i, i + 10).map(async item => {
          const order = await read(item.pathname);
          if (!order) throw new Error('order_missing');
          const status = await read('order-status/' + order.id + '.json');
          return { ...order, status: status?.status || 'new', updatedAt: status?.updatedAt || order.createdAt };
        }));
        orders.push(...batch);
      }
      return { orders: orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)), cursor: page.hasMore ? page.cursor : null };
    },
    async update(id, status, updatedBy) {
      if (!STATUSES.includes(status)) throw new Error('invalid_status');
      if (!await read(orderPath(id))) return null;
      const value = { status, updatedBy, updatedAt: new Date().toISOString() };
      await write('order-status/' + id + '.json', value, true);
      return value;
    }
  };
}
module.exports = { ...createStore(), createStore, orderPath, ID, STATUSES };
