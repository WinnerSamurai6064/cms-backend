// scripts/seed.js
// Run with: node scripts/seed.js
// Creates a test user + two sites (matching the admin UI demo data:
// vktbusiness and golazo) so resolveSite has real rows to find.

require('dotenv').config();
const pool = require('../db/pool');

async function seed() {
  console.log('Seeding database...');

  const { rows: [user] } = await pool.query(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ('treyvon@example.com', 'placeholder-hash', 'Treyvon Devante')
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING *`
  );

  const sites = [
    { slug: 'vktbusiness', hostname: 'vkt.business.blog', title: 'vktbusiness', theme: 'rockfield' },
    { slug: 'golazo', hostname: 'golazo.blue.blog', title: 'Golazo', theme: 'golazo' },
  ];

  for (const s of sites) {
    const { rows: [site] } = await pool.query(
      `INSERT INTO sites (owner_id, slug, hostname, title, theme)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
       RETURNING *`,
      [user.id, s.slug, s.hostname, s.title, s.theme]
    );
    await pool.query(
      `INSERT INTO site_users (site_id, user_id, role)
       VALUES ($1, $2, 'owner') ON CONFLICT DO NOTHING`,
      [site.id, user.id]
    );
    console.log(`  ✓ site "${site.slug}" ready (id=${site.id})`);
  }

  console.log('Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
