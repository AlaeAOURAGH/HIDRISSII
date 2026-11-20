// GitHub OAuth initiation for the production CMS. Secrets stay in Vercel.
const { randomBytes } = require('node:crypto');
const ORIGIN = 'https://www.hidrissi.com';
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');
  if (!process.env.CMS_GITHUB_CLIENT_ID || !process.env.CMS_GITHUB_CLIENT_SECRET) return res.status(503).send('La connexion GitHub est en cours de configuration.');
  const query = new URL(req.url, ORIGIN).searchParams;
  if (query.has('site_id') && query.get('site_id') !== 'www.hidrissi.com') return res.status(400).send('Invalid CMS site');
  if (query.has('provider') && query.get('provider') !== 'github') return res.status(400).send('Invalid provider');
  const state = randomBytes(32).toString('hex');
  res.setHeader('Set-Cookie', `__Host-cms_oauth=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
  const params = new URLSearchParams({ client_id: process.env.CMS_GITHUB_CLIENT_ID, redirect_uri: ORIGIN + '/api/callback', state, scope: 'public_repo', allow_signup: 'false' });
  return res.redirect(302, 'https://github.com/login/oauth/authorize?' + params);
};
