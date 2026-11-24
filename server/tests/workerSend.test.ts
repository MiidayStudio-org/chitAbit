import { createRequire } from 'node:module';
import type { SQLInputValue } from 'node:sqlite';
import jwt from 'jsonwebtoken';
import { expect, it } from 'vitest';
import worker, { type D1Database, type D1PreparedStatement } from '../src/worker.js';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

it('sends, retries and polls channel messages and private DMs on a legacy D1 schema', async () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    sqlite.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY, display_name TEXT, avatar_color TEXT);
      INSERT INTO users VALUES ('sender', 'Sender', '#123456'), ('recipient', 'Recipient', '#abcdef'), ('outsider', 'Outsider', '#123456');
      ALTER TABLE users ADD COLUMN avatar_url TEXT;
      ALTER TABLE users ADD COLUMN file_icon TEXT;
      CREATE TABLE channels (id TEXT PRIMARY KEY, name TEXT UNIQUE, description TEXT, created_by TEXT, created_at INTEGER);
      CREATE TABLE messages (
        id TEXT PRIMARY KEY, channel_id TEXT REFERENCES channels(id), dm_recipient_id TEXT, sender_id TEXT REFERENCES users(id),
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
    const send = (channelId = 'javascript', session = token) => worker.fetch(new Request('https://example.test/api/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session}`, 'Content-Type': 'application/json' },
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
    expect((await send('unknown')).status).toBe(404);
    const staleToken = jwt.sign({ id: 'missing', username: 'removed_user' }, secret, { expiresIn: '1h' });
    expect((await send('javascript', staleToken)).status).toBe(401);
    const channels = await worker.fetch(new Request('https://example.test/api/channels'), { chitabit_db: db, JWT_SECRET: secret });
    expect((await channels.json()).map(({ id }: { id: string }) => id)).toContain('general');
    expect(sqlite.prepare('SELECT count(*) AS count FROM channels').get()?.count).toBe(6);
    expect(sqlite.prepare('SELECT count(*) AS count FROM messages').get()?.count).toBe(1);

    const recipientToken = jwt.sign({ id: 'recipient', username: 'recipient' }, secret, { expiresIn: '1h' });
    const outsiderToken = jwt.sign({ id: 'outsider', username: 'outsider' }, secret, { expiresIn: '1h' });
    const call = (path: string, authorization: string, body?: object) =>
      worker.fetch(new Request(`https://example.test${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${authorization}`, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      }), { chitabit_db: db, JWT_SECRET: secret });

    const base = '/api/messages/dm/sender/recipient';
    const channelPath = '/api/channels/javascript/messages';
    const channelPage = await call(channelPath, recipientToken);
    expect((await channelPage.json()).messages).toHaveLength(1);
    const newChannelMessage = await call('/api/messages/send', token, {
      channelId: 'javascript', content: 'new channel message', localTempId: 'temp_channel_poll',
    });
    expect(newChannelMessage.status).toBe(201);
    const channelCursor = new URLSearchParams({
      after: String(original.message.created_at), afterId: original.message.id,
    });
    const channelDelta = await call(`${channelPath}?${channelCursor}`, recipientToken);
    expect((await channelDelta.json()).messages.map(({ content }: { content: string }) => content))
      .toEqual(['new channel message']);

    for (const content of ['first DM', 'second DM']) {
      const response = await call('/api/messages/send', token, {
        dmRecipientId: 'recipient', content, localTempId: content.replace(' ', '-'),
      });
      expect(response.status).toBe(201);
    }
    sqlite.exec("UPDATE messages SET created_at = 100 WHERE dm_recipient_id = 'recipient'");
    const initial = await call(base, recipientToken);
    const { messages: dms } = await initial.json();
    expect(dms).toHaveLength(2);
    const cursor = new URLSearchParams({ after: String(dms[0].created_at), afterId: dms[0].id });
    const delta = await call(`${base}?${cursor}`, recipientToken);
    expect((await delta.json()).messages).toEqual([dms[1]]);
    expect((await call(`${base}?${cursor}`, outsiderToken)).status).toBe(403);

  } finally {
    sqlite.close();
  }
});
