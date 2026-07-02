// middleware/requireSiteAccess.js
//
// Placeholder for the auth pass we haven't built yet. Once real sessions
// exist, this checks that req.user has a row in site_users for req.site.id
// before allowing admin API writes. Public GET routes for rendering sites
// don't need this — only admin routes (create/edit/delete posts, settings, etc).
//
// Wiring this in now (even as a stub) so route files are written against
// the final shape and don't need rewiring later.

const pool = require('../db/pool');

async function requireSiteAccess(req, res, next) {
  // TEMP: no real auth yet. Replace req.user with real session data
  // once login is built. For now this just checks site_users has ANY
  // row for this site so the multi-tenant query pattern is exercised.
  if (!req.site) {
    return res.status(500).json({ error: 'requireSiteAccess ran before resolveSite' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT user_id, role FROM site_users WHERE site_id = $1 LIMIT 1',
      [req.site.id]
    );
    if (!rows[0]) {
      return res.status(403).json({ error: 'No user is associated with this site yet' });
    }
    req.siteRole = rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireSiteAccess;
