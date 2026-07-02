// middleware/resolveSite.js
//
// This is the core of the multi-tenant engine. Every request — whether it's
// hitting the public renderer or the admin API — passes through here first.
// It figures out WHICH site the request is for and attaches it to req.site.
// Every downstream query then filters by req.site.id. No route should ever
// query posts/pages/media without going through req.site — that's the whole
// tenant-isolation contract.
//
// Resolution order:
//   1. Custom/subdomain hostname match (production: vkt.business.blog)
//   2. Path-based fallback for local dev (localhost:3000/site/vktbusiness/...)
//   3. Explicit X-Site-Slug header (used by the admin app when calling the API,
//      since the admin app itself doesn't live on a per-site hostname)
//
// This keeps ONE Express process serving unlimited sites without spinning up
// separate ports or processes per site — the thing we ruled out for the 2GB box.

const pool = require('../db/pool');

async function resolveSite(req, res, next) {
  try {
    let site = null;

    // 1. Hostname match (strip port if present, e.g. "vkt.business.blog:3000")
    const hostname = (req.hostname || req.headers.host || '').split(':')[0];
    if (hostname && hostname !== 'localhost') {
      const { rows } = await pool.query(
        'SELECT * FROM sites WHERE hostname = $1 LIMIT 1',
        [hostname]
      );
      if (rows[0]) site = rows[0];
    }

    // 2. Path-based fallback: /site/:slug/...
    if (!site && req.params.siteSlug) {
      const { rows } = await pool.query(
        'SELECT * FROM sites WHERE slug = $1 LIMIT 1',
        [req.params.siteSlug]
      );
      if (rows[0]) site = rows[0];
    }

    // 3. Explicit header — how the admin app tells the API which site
    //    it's currently managing (paired with the site switcher sheet).
    if (!site && req.headers['x-site-slug']) {
      const { rows } = await pool.query(
        'SELECT * FROM sites WHERE slug = $1 LIMIT 1',
        [req.headers['x-site-slug']]
      );
      if (rows[0]) site = rows[0];
    }

    if (!site) {
      return res.status(404).json({ error: 'Site not found for this request' });
    }

    req.site = site; // <-- every downstream handler reads from this
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = resolveSite;
