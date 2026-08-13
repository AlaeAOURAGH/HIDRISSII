// Exposes non-secret runtime config to the static client.
// Currently just the WhatsApp number, so it lives in an env var (WA_NUMBER)
// instead of being hard-coded in the page.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).json({ waNumber: process.env.WA_NUMBER || '212606555567' });
};
