// db/pool.js
// Single shared connection to Neon serverless Postgres.
// Uses the @neondatabase/serverless driver, which works over HTTP/websockets
// and is designed for exactly this kind of low-memory, always-on Express server.

const { Pool } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Add it to your .env — get it from your Neon project dashboard.'
  );
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

module.exports = pool;
