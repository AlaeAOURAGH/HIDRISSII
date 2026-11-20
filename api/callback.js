const { timingSafeEqual, randomBytes } = require('node:crypto');
const ORIGIN = 'https://www.hidrissi.com';
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  const query = new URL(req.url, ORIGIN).searchParams;
  const state = query.get('state') || '';
  const cookie = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('__Host-cms_oauth='));
  const saved = cookie ? cookie.slice('__Host-cms_oauth='.length) : '';
  res.setHeader('Set-Cookie', '__Host-cms_oauth=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax');
  if (!/^[a-f0-9]{64}$/.test(state) || !/^[a-f0-9]{64}$/.test(saved) || !timingSafeEqual(Buffer.from(state), Buffer.from(saved))) return res.status(400).send('Invalid or expired login. Please sign in again.');
  if (!query.get('code') || query.has('error')) return res.status(400).send('GitHub authorization was not completed.');
  if (!process.env.CMS_GITHUB_CLIENT_ID || !process.env.CMS_GITHUB_CLIENT_SECRET) return res.status(503).send('CMS login is not configured.');
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.CMS_GITHUB_CLIENT_ID, client_secret: process.env.CMS_GITHUB_CLIENT_SECRET, code: query.get('code'), redirect_uri: ORIGIN + '/api/callback' }),
      signal: AbortSignal.timeout(15000)
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token || token.error) return res.status(401).send('GitHub login failed. Please try again.');
    // Only release tokens belonging to an editor of the configured repository.
    const repoResponse = await fetch('https://api.github.com/repos/AlaeAOURAGH/HIDRISSII', { headers: { Authorization: 'Bearer ' + token.access_token, Accept: 'application/vnd.github+json', 'User-Agent': 'HIDRISSI-CMS' }, signal: AbortSignal.timeout(15000) });
    const repo = await repoResponse.json();
    if (!repoResponse.ok || !repo.permissions?.push) return res.status(403).send('This GitHub account does not have permission to edit the HIDRISSI catalog.');
    const nonce = randomBytes(16).toString('base64');
    res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; frame-ancestors 'none'; base-uri 'none'`);
    const payload = JSON.stringify('authorization:github:success:' + JSON.stringify({ token: token.access_token, provider: 'github' })).replace(/</g, '\\u003c');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Connexion HIDRISSI</title><p>Connexion réussie. Cette fenêtre peut être fermée.</p><script nonce="${nonce}">if(window.opener){const receive=e=>{if(e.origin!==${JSON.stringify(ORIGIN)}||e.source!==window.opener)return;window.opener.postMessage(${payload},${JSON.stringify(ORIGIN)});window.removeEventListener('message',receive);window.close();};window.addEventListener('message',receive);window.opener.postMessage('authorizing:github',${JSON.stringify(ORIGIN)});}</script></html>`);
  } catch {
    return res.status(502).send('GitHub could not be reached. Please try again.');
  }
};
