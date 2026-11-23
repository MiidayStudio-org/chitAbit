import { getTableColumns, getTableName, sql, type SQL } from 'drizzle-orm';
import type { DatabaseSync } from 'node:sqlite';
import { channels, channelReads, friendRequests, friends, messages, reactions, users } from './schema.js';

type Destination = { execute(query: SQL): Promise<{ rows: unknown[] }> };
const tables = [
  { table: users, key: ['id'], required: true },
  { table: channels, key: ['id'], required: true },
  { table: messages, key: ['id'], required: true },
  { table: reactions, key: ['id'] },
  { table: friends, key: ['user_id', 'friend_id'] },
  { table: friendRequests, key: ['id'] },
  { table: channelReads, key: ['user_id', 'channel_id'] },
];

export async function importLegacyChat(source: DatabaseSync, destination: Destination) {
  const counts: Record<string, number> = {};
  // This function runs inside a PostgreSQL transaction. Serialize imports and prevent
  // application writes to these tables while verifying the imported rows.
  await destination.execute(sql`
    LOCK TABLE ${sql.join(tables.map(({ table }) => sql`${table}`), sql`, `)}
    IN SHARE ROW EXCLUSIVE MODE
  `);

  for (const { table, key, required } of tables) {
    const name = getTableName(table);
    const columns = Object.values(getTableColumns(table)).map((column) => column.name);
    const sourceColumns = new Set(
      source.prepare('SELECT name FROM pragma_table_info(?)').all(name).map((row) => row.name),
    );
    if (!sourceColumns.size && !required) {
      counts[name] = 0;
      continue;
    }
    if (!key.every((column) => sourceColumns.has(column))) {
      throw new Error(`Source table ${name} is missing an import key`);
    }

    const sharedColumns = columns.filter((column) => sourceColumns.has(column));
    const identifiers = sharedColumns.map((column) => sql.identifier(column));
    const names = sql.join(identifiers, sql`, `);
    const updatedColumns = sharedColumns.filter((column) => !key.includes(column));
    // Count an identical existing row as imported, but never silently overwrite
    // conflicting user data. Startup's reserved defaults can take source metadata.
    const isSeed =
      name === 'channels'
        ? sql`OR (target.id IN ('general', 'javascript', 'python', 'devops', 'ai-ml', 'help')
            AND target.created_by = 'system' AND excluded.created_by = 'system'
            AND target.name = excluded.name)`
        : name === 'users'
          ? sql`OR (target.id = 'devbot' AND target.username = 'devbot' AND excluded.username = 'devbot'
              AND target.is_bot = 1 AND excluded.is_bot = 1)`
          : sql.empty();
    const targetRow = sql.join(identifiers.map((column) => sql`target.${column}`), sql`, `);
    const sourceRow = sql.join(identifiers.map((column) => sql`excluded.${column}`), sql`, `);
    const update = sql.join(
      (updatedColumns.length ? updatedColumns : key).map((column) => {
        const identifier = sql.identifier(column);
        return sql`${identifier} = excluded.${identifier}`;
      }),
      sql`, `,
    );

    counts[name] = 0;
    let batch: Record<string, unknown>[] = [];
    let batchSize = 0;
    const flush = async () => {
      if (!batch.length) return;
      let result;
      try {
        result = await destination.execute(sql`
          INSERT INTO ${table} AS target (${names})
          SELECT ${names} FROM jsonb_populate_recordset(NULL::${table}, ${JSON.stringify(batch)}::jsonb)
          ON CONFLICT (${sql.join(key.map((column) => sql.identifier(column)), sql`, `)}) DO UPDATE
          SET ${update}
          WHERE ROW(${targetRow}) IS NOT DISTINCT FROM ROW(${sourceRow}) ${isSeed}
          RETURNING 1
        `);
      } catch (error) {
        const cause = (error as { cause?: { code?: string }; code?: string });
        throw new Error(`Import failed for ${name} (${cause.cause?.code ?? cause.code ?? 'database error'})`);
      }
      if (result.rows.length !== batch.length) throw new Error(`Conflicting destination rows in ${name}`);
      counts[name] += batch.length;
      batch = [];
      batchSize = 0;
    };

    // Table and column names come from the Drizzle schema, independent of the dump.
    const columnList = sharedColumns.map((column) => `"${column}"`).join(', ');
    for (const row of source.prepare(`SELECT ${columnList} FROM "${name}"`).iterate()) {
      const size = Buffer.byteLength(JSON.stringify(row));
      if (batch.length >= 500 || batchSize + size > 1_000_000) await flush();
      batch.push(row);
      batchSize += size;
    }
    await flush();
  }

  return counts;
}
