// routes/posts.js
// Mounted behind resolveSite, so req.site is always available here.
// Every single query below is scoped by req.site.id — this is the pattern
// every content route in the app must follow.

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');

// GET /api/posts?status=published
router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status;
    const params = [req.site.id];
    let query = 'SELECT * FROM posts WHERE site_id = $1';
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    query += ' ORDER BY updated_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/posts/:id  (still site-scoped — a post ID from another site 404s, not leaks)
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM posts WHERE id = $1 AND site_id = $2',
      [req.params.id, req.site.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/posts
router.post('/', async (req, res, next) => {
  const { title, slug, content_md, excerpt, status, author_id } = req.body;
  if (!title || !slug) {
    return res.status(400).json({ error: 'title and slug are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO posts (site_id, author_id, title, slug, content_md, excerpt, status, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 = 'published' THEN now() ELSE NULL END)
       RETURNING *`,
      [req.site.id, author_id || null, title, slug, content_md || '', excerpt || null, status || 'draft']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A post with this slug already exists on this site' });
    }
    next(err);
  }
});

// PUT /api/posts/:id
router.put('/:id', async (req, res, next) => {
  const { title, slug, content_md, excerpt, status } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE posts SET
         title = COALESCE($1, title),
         slug = COALESCE($2, slug),
         content_md = COALESCE($3, content_md),
         excerpt = COALESCE($4, excerpt),
         status = COALESCE($5, status),
         published_at = CASE WHEN $5 = 'published' AND published_at IS NULL THEN now() ELSE published_at END,
         updated_at = now()
       WHERE id = $6 AND site_id = $7
       RETURNING *`,
      [title, slug, content_md, excerpt, status, req.params.id, req.site.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/posts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM posts WHERE id = $1 AND site_id = $2 RETURNING id',
      [req.params.id, req.site.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Post not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
