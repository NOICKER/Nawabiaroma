import 'dotenv/config';
import assert from 'node:assert/strict';
import test from 'node:test';
import { query, closeDatabase } from '../server/config/database.js';
import { ensureDatabaseSchemaCurrent } from '../server/config/databaseMigrations.js';

async function hasColumn(tableName: string, columnName: string) {
    const result = await query<{ count: string }>(
        `
            SELECT COUNT(*)::text AS count
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name = $2
        `,
        [tableName, columnName],
    );

    return Number(result.rows[0]?.count ?? 0) > 0;
}

test('ensureDatabaseSchemaCurrent applies runtime-required customer address columns', async () => {
    await ensureDatabaseSchemaCurrent();

    assert.equal(await hasColumn('customers', 'phone'), true);
    assert.equal(await hasColumn('addresses', 'label'), true);
});

test.after(async () => {
    await closeDatabase();
});
