import '../../config/env.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

export function createPostgresConnection() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to PostgreSQL');
  }

  const pool = new Pool({ connectionString });
  return { db: drizzle(pool, { schema }), close: () => pool.end() };
}
