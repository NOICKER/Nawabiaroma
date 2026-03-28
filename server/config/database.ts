import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { logger } from '../../services/logger.js';
import { formatDatabaseConnectionError, resolveDatabaseConfig, type SqlExecutor } from './databaseConfig.js';

export interface Queryable extends SqlExecutor {}

const databaseConfig = resolveDatabaseConfig(process.env);
const pool = new Pool(databaseConfig.poolConfig);

pool.on('error', (error) => {
    logger.error({
        event_type: 'database_pool_error',
        outcome: 'failure',
        error: error.message,
        database_mode: databaseConfig.databaseMode,
        connection_source: databaseConfig.connectionSource,
        database_host: databaseConfig.host,
    });
});

export async function query<TRow extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
    return pool.query<TRow>(text, params);
}

export async function assertDatabaseConnection() {
    try {
        await pool.query('SELECT 1');
    } catch (error) {
        throw new Error(
            formatDatabaseConnectionError(error, databaseConfig),
            error instanceof Error ? { cause: error } : undefined,
        );
    }
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const result = await work(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function closeDatabase() {
    await pool.end();
}

export const databaseConnectionInfo = {
    databaseMode: databaseConfig.databaseMode,
    connectionSource: databaseConfig.connectionSource,
    host: databaseConfig.host,
    port: databaseConfig.port,
    databaseName: databaseConfig.databaseName,
    sslEnabled: databaseConfig.sslEnabled,
};

export { pool };
