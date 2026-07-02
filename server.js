// server.js
// Single Express process serving unlimited sites. No per-site ports,
// no per-site child processes — tenant isolation happens entirely at
// the middleware + query layer.

require('dotenv').config();
const express = require('express');
const resolveSite = require('./middleware/resolveSite');
const requireSiteAccess = require('./middleware/requireSiteAccess');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ---- Global routes (not site-scoped) ----
app.use('/api/sites', require('./routes/sites'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---- Site-scoped API (admin app calls these with X-Site-Slug header) ----
// Everything mounted after resolveSite has req.site available.
app.use('/api/posts', resolveSite, requireSiteAccess, require('./routes/posts'));
app.use('/api/pages', resolveSite, requireSiteAccess, require('./routes/pages'));

// ---- Path-based dev routing: /site/:siteSlug/... ----
// Lets you test multi-tenancy locally without configuring real subdomains.
// e.g. GET /site/vktbusiness/api/posts
app.use(
  '/site/:siteSlug/api/posts',
  resolveSite,
  requireSiteAccess,
  require('./routes/posts')
);
app.use(
  '/site/:siteSlug/api/pages',
  resolveSite,
  requireSiteAccess,
  require('./routes/pages')
);

// ---- Public site renderer placeholder ----
// This is where hostname-resolved requests would render the actual
// public-facing site (EJS templates per theme). Not built yet —
// today it just proves resolveSite works end-to-end.
app.get('/', resolveSite, (req, res) => {
  res.json({
    message: 'Resolved site for this hostname/request:',
    site: req.site,
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`CMS backend running on port ${PORT}`);
});
