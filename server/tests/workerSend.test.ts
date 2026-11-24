import { createRequire } from 'node:module';
import type { SQLInputValue } from 'node:sqlite';
import jwt from 'jsonwebtoken';
import { expect, it } from 'vitest';
import worker, { type D1Database, type D1PreparedStatement } from '../src/worker.js';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

it('acknowledges and deduplicates HTTP sends on a legacy D1 schema', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, display_name TEXT, avatar_color TEXT);
      INSERT INTO users VALUES ('sender', 'Sender', '#123456');
      CREATE TABLE messages (
        id TEXT PRIMARY KEY, channel_id TEXT, dm_recipient_id TEXT, sender_id TEXT,
        sender_username TEXT, message_language TEXT, content TEXT, attachment_url TEXT,
        attachment_type TEXT, attachment_name TEXT, attachment_size INTEGER, created_at INTEGER
      );
    `);
    const db: D1Database = {
      prepare(query) {
        const statement = sqlite.prepare(query);
        const bind = (...values: SQLInputValue[]): D1PreparedStatement => ({
          bind: (...params) => bind(...params as SQLInputValue[]),
          first: async <T>() => (statement.get(...values) ?? null) as T | null,
          run: async () => { statement.run(...values); return { success: true }; },
          all: async <T>() => ({ success: true, results: statement.all(...values) as T[] }),
        });
        return bind();
      },
      batch: async () => { throw new Error('Unexpected batch operation'); },
      exec: async () => { throw new Error('Unexpected exec operation'); },
    };
    const secret = 'worker-test-secret';
    const token = jwt.sign({ id: 'sender', username: 'test_sender' }, secret, { expiresIn: '1h' });
    const send = (channelId = 'javascript') => worker.fetch(new Request('https://example.test/api/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, content: 'hello', localTempId: 'temp_test' }),
    }), { chitabit_db: db, JWT_SECRET: secret });

    const first = await send();
    expect(first.status).toBe(201);
    const retry = await send();
    expect(retry.status).toBe(201);
    const original = await first.json();
    expect(original).toMatchObject({ success: true, message: { content: 'hello', localTempId: 'temp_test' } });
    expect(await retry.json()).toEqual(original);
    expect((await send('general')).status).toBe(409);
    expect(sqlite.prepare('SELECT count(*) AS count FROM messages').get()?.count).toBe(1);
  } finally {
    sqlite.close();
  }
});
