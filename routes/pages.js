// routes/pages.js — same site-scoping pattern as posts.js

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM pages WHERE site_id = $1 ORDER BY updated_at DESC',
      [req.site.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { title, slug, content_md, is_homepage, status, author_id } = req.body;
  if (!title || !slug) {
    return res.status(400).json({ error: 'title and slug are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO pages (site_id, author_id, title, slug, content_md, is_homepage, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.site.id, author_id || null, title, slug, content_md || '', !!is_homepage, status || 'draft']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A page with this slug already exists on this site' });
    }
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  const { title, slug, content_md, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE pages SET
         title = COALESCE($1, title), slug = COALESCE($2, slug),
         content_md = COALESCE($3, content_md), status = COALESCE($4, status),
         updated_at = now()
       WHERE id = $5 AND site_id = $6 RETURNING *`,
      [title, slug, content_md, status, req.params.id, req.site.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Page not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM pages WHERE id = $1 AND site_id = $2 RETURNING id',
      [req.params.id, req.site.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Page not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
