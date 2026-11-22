import './src/config/env.js';
import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL?.trim();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/postgres/schema.ts',
  out: './drizzle',
  schemaFilter: ['chitabit'],
  ...(url ? { dbCredentials: { url } } : {}),
});
