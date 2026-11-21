const ORIGIN = 'https://www.hidrissi.com';
function privateHeaders(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
}
async function authorize(req, res) {
  privateHeaders(res);
  if (req.headers.origin && req.headers.origin !== ORIGIN) {
    res.status(403).json({ error: 'forbidden' }); return null;
  }
  const match = /^Bearer ([A-Za-z0-9_]+)$/.exec(req.headers.authorization || '');
  if (!match || match[1].length > 300) { res.status(401).json({ error: 'login_required' }); return null; }
  const headers = { Authorization: 'Bearer ' + match[1], Accept: 'application/vnd.github+json', 'User-Agent': 'HIDRISSI-Orders' };
  try {
    const response = await fetch('https://api.github.com/repos/AlaeAOURAGH/HIDRISSII', { headers, signal: AbortSignal.timeout(10000) });
    if (response.status === 401) { res.status(401).json({ error: 'login_required' }); return null; }
    if (!response.ok) { res.status(response.status === 404 ? 403 : 503).json({ error: 'authorization_unavailable' }); return null; }
    const repo = await response.json();
    if (!repo.permissions?.push) { res.status(403).json({ error: 'editor_required' }); return null; }
    return { editor: 'catalog-editor' };
  } catch { res.status(503).json({ error: 'authorization_unavailable' }); return null; }
}
module.exports = { authorize, privateHeaders };
