import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { env } from './env.js';

export interface Queryable {
    query: <TRow extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[],
    ) => Promise<QueryResult<TRow>>;
}

const ssl = env.DATABASE_SSL ? { rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED } : undefined;

const pool = new Pool({
    connectionString: env.DATABASE_URL,
    ssl,
    max: env.DATABASE_POOL_MAX,
    idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DATABASE_CONNECTION_TIMEOUT_MS,
});

export async function query<TRow extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
    return pool.query<TRow>(text, params);
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

export { pool };
