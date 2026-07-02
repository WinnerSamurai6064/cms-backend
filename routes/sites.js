// routes/sites.js
// Backs the "My Sites" switcher sheet in the admin UI.
// GET /api/sites            -> list all sites the (eventual) logged-in user can manage
// GET /api/sites/current    -> the site resolved by resolveSite middleware for this request

const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// List sites — until auth exists, returns ALL sites (temporary).
// Once login is wired, this becomes:
//   SELECT sites.* FROM sites
//   JOIN site_users ON site_users.site_id = sites.id
//   WHERE site_users.user_id = req.user.id
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, slug, hostname, title, tagline, theme
       FROM sites ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// Returns whatever site resolveSite attached to this request.
// Useful for the admin app to confirm "which site am I currently editing."
router.get('/current', (req, res) => {
  res.json(req.site);
});

router.post('/', async (req, res, next) => {
  const { slug, hostname, title, ownerId } = req.body;
  if (!slug || !title || !ownerId) {
    return res.status(400).json({ error: 'slug, title, and ownerId are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO sites (owner_id, slug, hostname, title)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [ownerId, slug, hostname || null, title]
    );
    const site = rows[0];
    await pool.query(
      `INSERT INTO site_users (site_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [site.id, ownerId]
    );
    res.status(201).json(site);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
