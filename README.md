# CMS Backend — Multi-tenant Engine

Single Express process, single Neon Postgres database, unlimited sites.
No per-site ports, no per-site processes — isolation happens at the
middleware + query layer.

## How tenant resolution works

Every request hits `resolveSite` middleware first (`middleware/resolveSite.js`).
It figures out which site the request belongs to, in this order:

1. **Hostname** — `vkt.business.blog` → looks up `sites.hostname`
2. **Path** — `/site/vktbusiness/...` → looks up `sites.slug` (for local dev without real domains)
3. **Header** — `X-Site-Slug: vktbusiness` → same lookup (how the admin app will call the API)

Whatever it finds gets attached as `req.site`. Every route file downstream
(`routes/posts.js`, `routes/pages.js`) filters every single query by
`req.site.id`. That's the entire tenant-isolation contract — one Postgres
database, `site_id` on every table, always filtered.

## Setup

```bash
npm install
cp .env.example .env
# paste your Neon connection string into .env

# create tables
psql "$DATABASE_URL" -f db/schema.sql
# or, if you don't have psql locally, paste schema.sql into the Neon SQL editor

# seed a test user + two sites (vktbusiness, golazo)
node scripts/seed.js

# run it
node server.js
```

## Try it

```bash
# path-based (local dev, no domain needed)
curl http://localhost:3000/site/vktbusiness/api/posts \
  -H "Content-Type: application/json"

# create a post on vktbusiness
curl -X POST http://localhost:3000/site/vktbusiness/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","slug":"hello","content_md":"# Hi","status":"published"}'

# create a DIFFERENT post on golazo — proves isolation
curl -X POST http://localhost:3000/site/golazo/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"Golazo post","slug":"golazo-post","status":"draft"}'

# confirm vktbusiness only sees its own post
curl http://localhost:3000/site/vktbusiness/api/posts

# via header instead of path (how the admin app will call it)
curl http://localhost:3000/api/posts -H "X-Site-Slug: vktbusiness"
```

## Not built yet

- Real auth/sessions (`requireSiteAccess` is a stub — currently just checks
  *a* user is linked to the site, not *which* user is logged in)
- Public site renderer (EJS templates per theme, serving actual HTML to visitors)
- Media upload → HF bucket wiring
- Admin app → this API connection (the mobile UI still uses hardcoded demo data)
