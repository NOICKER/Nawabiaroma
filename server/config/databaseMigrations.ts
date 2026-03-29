import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { PoolClient } from 'pg';
import { logger } from '../../services/logger.js';
import { pool } from './database.js';

const MIGRATION_TABLE_NAME = 'schema_migrations';
const SCHEMA_MIGRATION_NAME = '000_schema.sql';
const REQUIRED_MIGRATIONS = [
    '06_customer_auth_and_razorpay.sql',
    '07_remove_stripe_columns.sql',
    '08_customer_address_book.sql',
    '09_admin_bootstrap.sql',
];
const ADVISORY_LOCK_KEY_PARTS = [9421, 6107] as const;

export interface DatabaseMigrationResult {
    applied: string[];
    skipped: string[];
}

function readSqlFile(filePath: string) {
    return readFileSync(filePath, 'utf8');
}

function getSchemaPath() {
    return path.join(process.cwd(), 'models', 'schema.sql');
}

function getMigrationsPath() {
    return path.join(process.cwd(), 'migrations');
}

function getMigrationFiles(migrationsPath: string) {
    if (!existsSync(migrationsPath)) {
        return [];
    }

    const migrationFiles = readdirSync(migrationsPath)
        .filter((file) => file.endsWith('.sql'))
        .sort((left, right) => left.localeCompare(right));

    for (const requiredMigration of REQUIRED_MIGRATIONS) {
        if (!migrationFiles.includes(requiredMigration)) {
            throw new Error(`Required migration is missing: ${requiredMigration}`);
        }
    }

    return migrationFiles;
}

async function ensureMigrationTable(client: PoolClient) {
    await client.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE_NAME} (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
}

async function hasMigrationRun(client: PoolClient, name: string) {
    const result = await client.query<{ name: string }>(
        `
            SELECT name
            FROM ${MIGRATION_TABLE_NAME}
            WHERE name = $1
            LIMIT 1
        `,
        [name],
    );

    return result.rowCount !== 0;
}

async function markMigrationApplied(client: PoolClient, name: string) {
    await client.query(
        `
            INSERT INTO ${MIGRATION_TABLE_NAME} (name)
            VALUES ($1)
            ON CONFLICT (name) DO NOTHING
        `,
        [name],
    );
}

async function applySqlStep(client: PoolClient, name: string, sql: string, applied: string[]) {
    logger.info({
        event_type: 'database_migration_applying',
        outcome: 'success',
        migration_name: name,
    });

    await client.query('BEGIN');

    try {
        await client.query(sql);
        await markMigrationApplied(client, name);
        await client.query('COMMIT');
        applied.push(name);
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
}

async function acquireAdvisoryLock(client: PoolClient) {
    await client.query('SELECT pg_advisory_lock($1, $2)', [ADVISORY_LOCK_KEY_PARTS[0], ADVISORY_LOCK_KEY_PARTS[1]]);
}

async function releaseAdvisoryLock(client: PoolClient) {
    await client.query('SELECT pg_advisory_unlock($1, $2)', [ADVISORY_LOCK_KEY_PARTS[0], ADVISORY_LOCK_KEY_PARTS[1]]);
}

export async function ensureDatabaseSchemaCurrent(): Promise<DatabaseMigrationResult> {
    const client = await pool.connect();
    const applied: string[] = [];
    const skipped: string[] = [];

    try {
        await acquireAdvisoryLock(client);
        await ensureMigrationTable(client);

        const schemaPath = getSchemaPath();

        if (!(await hasMigrationRun(client, SCHEMA_MIGRATION_NAME))) {
            await applySqlStep(client, SCHEMA_MIGRATION_NAME, readSqlFile(schemaPath), applied);
        } else {
            skipped.push(SCHEMA_MIGRATION_NAME);
        }

        for (const fileName of getMigrationFiles(getMigrationsPath())) {
            if (await hasMigrationRun(client, fileName)) {
                skipped.push(fileName);
                continue;
            }

            const migrationPath = path.join(getMigrationsPath(), fileName);
            await applySqlStep(client, fileName, readSqlFile(migrationPath), applied);
        }

        logger.info({
            event_type: 'database_migrations_complete',
            outcome: 'success',
            applied_count: applied.length,
            skipped_count: skipped.length,
        });

        return {
            applied,
            skipped,
        };
    } catch (error) {
        logger.error({
            event_type: 'database_migrations_failed',
            outcome: 'failure',
            error: error instanceof Error ? error.message : String(error),
        });
        throw error;
    } finally {
        try {
            await releaseAdvisoryLock(client);
        } catch {
            // Ignore advisory unlock failures when the connection is closing.
        }

        client.release();
    }
}
