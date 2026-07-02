-- ============================================================
-- Multi-tenant CMS schema for Neon (Postgres serverless)
-- Every content table is scoped by site_id. There is no
-- separate database per tenant — isolation is enforced at the
-- query layer (see middleware/resolveSite.js and db/withSite.js).
-- ============================================================

-- Users can own/manage multiple sites (maps to the "My Sites" switcher)
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per hosted site/tenant
CREATE TABLE IF NOT EXISTS sites (
  id            SERIAL PRIMARY KEY,
  owner_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL UNIQUE,          -- e.g. "vktbusiness"
  hostname      TEXT UNIQUE,                    -- e.g. "vkt.business.blog" (custom domain or subdomain)
  title         TEXT NOT NULL,
  tagline       TEXT,
  theme         TEXT NOT NULL DEFAULT 'rockfield',
  privacy       TEXT NOT NULL DEFAULT 'public', -- public | private | hidden
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  language      TEXT NOT NULL DEFAULT 'en',
  posts_per_page INTEGER NOT NULL DEFAULT 10,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Many-to-many: lets a site have multiple collaborators later,
-- without changing the schema. owner is also a row here with role='owner'.
CREATE TABLE IF NOT EXISTS site_users (
  site_id  INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL DEFAULT 'owner', -- owner | admin | editor
  PRIMARY KEY (site_id, user_id)
);

CREATE TABLE IF NOT EXISTS categories (
  id       SERIAL PRIMARY KEY,
  site_id  INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  slug     TEXT NOT NULL,
  UNIQUE (site_id, slug)
);

CREATE TABLE IF NOT EXISTS posts (
  id            SERIAL PRIMARY KEY,
  site_id       INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  author_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  content_md    TEXT NOT NULL DEFAULT '',
  excerpt       TEXT,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | published | scheduled | trashed
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE TABLE IF NOT EXISTS pages (
  id            SERIAL PRIMARY KEY,
  site_id       INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  author_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  slug          TEXT NOT NULL,
  content_md    TEXT NOT NULL DEFAULT '',
  is_homepage   BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'draft', -- draft | published | scheduled | trashed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE TABLE IF NOT EXISTS media (
  id            SERIAL PRIMARY KEY,
  site_id       INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  uploader_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  url           TEXT NOT NULL,          -- HF bucket URL
  mime_type     TEXT,
  size_bytes    INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes: every content table is queried by site_id constantly,
-- this is the index that matters most for tenant isolation perf.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_site      ON posts(site_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_pages_site       ON pages(site_id, status);
CREATE INDEX IF NOT EXISTS idx_media_site       ON media(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categories_site   ON categories(site_id);
CREATE INDEX IF NOT EXISTS idx_sites_hostname    ON sites(hostname);
CREATE INDEX IF NOT EXISTS idx_sites_slug        ON sites(slug);
CREATE INDEX IF NOT EXISTS idx_site_users_user    ON site_users(user_id);
