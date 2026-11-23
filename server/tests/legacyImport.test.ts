import { pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { expect, it } from 'vitest';
import { importLegacyChat } from '../src/db/postgres/importLegacy.js';
import { verifyPassword } from '../src/utils/passwords.js';

const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');

it('imports legacy chat rows and credentials, and rolls back a conflicting import', async () => {
  const source = new DatabaseSync(':memory:');
  const postgres = new PGlite();
  try {
    const password = 'chat test passphrase';
    const salt = Buffer.alloc(16, 9);
    const hash = `pbkdf2:${salt.toString('hex')}:${pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex')}`;
    const now = 1_790_000_000_000;
    source.exec(readFileSync(new URL('../src/db/schema.sql', import.meta.url), 'utf8'));
    source.prepare("INSERT INTO users (id, username, password_hash, display_name, avatar_color, created_at) VALUES ('a', 'alice', ?, 'Alice', '#123456', ?)").run(hash, now);
    source.exec(`
      INSERT INTO users (id, username, display_name, avatar_color, created_at)
        VALUES ('b', 'bob', 'Bob', '#123456', ${now});
      INSERT INTO channels VALUES ('general', 'general', 'Old general', 'system', ${now});
      INSERT INTO messages (id, channel_id, sender_id, sender_username, content, created_at)
        VALUES ('m', 'general', 'a', 'alice', 'hello', ${now});
      INSERT INTO reactions VALUES ('r', 'm', 'b', '👍', ${now});
      INSERT INTO friends VALUES ('a', 'b', ${now});
      INSERT INTO friend_requests (id, sender_id, receiver_id, created_at) VALUES ('f', 'a', 'b', ${now});
      INSERT INTO channel_reads VALUES ('a', 'general', ${now});
    `);
    const target = drizzle(postgres);
    await migrate(target, { migrationsFolder: './drizzle' });
    await postgres.exec("INSERT INTO chitabit.channels VALUES ('general', 'general', 'Startup seed', 'system', 1)");
    const importRows = () => target.transaction((tx) => importLegacyChat(source, tx));
    const counts = { users: 2, channels: 1, messages: 1, reactions: 1, friends: 1, friend_requests: 1, channel_reads: 1 };
    expect(await importRows()).toEqual(counts);
    expect(await importRows()).toEqual(counts);
    const { rows: [account] } = await postgres.query<{ password_hash: string }>("SELECT password_hash FROM chitabit.users WHERE id = 'a'");
    expect(await verifyPassword(password, account.password_hash)).toBe(true);
    expect(await verifyPassword('incorrect', account.password_hash)).toBe(false);

    source.exec("UPDATE channels SET description = 'Incomplete update' WHERE id = 'general'; UPDATE messages SET content = 'conflict' WHERE id = 'm'");
    await expect(importRows()).rejects.toThrow('Conflicting destination rows in messages');
    const { rows } = await postgres.query("SELECT description FROM chitabit.channels WHERE id = 'general'");
    expect(rows).toEqual([{ description: 'Old general' }]);
  } finally {
    source.close();
    await postgres.close();
  }
});
