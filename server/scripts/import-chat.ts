import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createPostgresConnection } from '../src/db/postgres/client.js';
import { importLegacyChat } from '../src/db/postgres/importLegacy.js';

const [file, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
if (!file || flags.some((flag) => flag !== '--apply')) {
  console.error('Usage: npm run db:import -- <SQLite backup or D1 export.sql> [--apply]');
  process.exit(2);
}

let source: DatabaseSync | undefined;
let connection: ReturnType<typeof createPostgresConnection> | undefined;
try {
  const dump = extname(file).toLowerCase() === '.sql';
  source = dump ? new DatabaseSync(':memory:', { enableForeignKeyConstraints: false }) : new DatabaseSync(file, { readOnly: true });
  if (dump) {
    // Only import an export produced by Wrangler or SQLite.
    source.exec(readFileSync(file, 'utf8'));
  }
  source.exec('PRAGMA query_only = ON; BEGIN');
  connection = createPostgresConnection();
  const dryRunRollback = new Error('Dry run');
  let counts: Record<string, number> | undefined;
  try {
    await connection.db.transaction(async (transaction) => {
      await transaction.execute('SET LOCAL lock_timeout = \'10s\'');
      counts = await importLegacyChat(source!, transaction);
      if (!apply) throw dryRunRollback;
    });
  } catch (error) {
    if (error !== dryRunRollback) throw error;
  }
  console.log(apply ? 'Import committed. Rows verified:' : 'Dry run passed. No changes committed. Rows verified:');
  console.table(counts);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Import failed');
  process.exitCode = 1;
} finally {
  source?.close();
  await connection?.close();
}
