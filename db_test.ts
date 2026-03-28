import 'dotenv/config';
import { Pool, type PoolClient } from 'pg';
import {
    REQUIRED_PUBLIC_TABLES,
    formatDatabaseConnectionError,
    listPublicTables,
    readDatabaseIdentity,
    resolveDatabaseConfig,
} from './server/config/databaseConfig.js';

const databaseConfig = resolveDatabaseConfig(process.env);
const pool = new Pool(databaseConfig.poolConfig);

async function connectToDatabase() {
    try {
        return await pool.connect();
    } catch (error) {
        throw new Error(
            formatDatabaseConnectionError(error, databaseConfig),
            error instanceof Error ? { cause: error } : undefined,
        );
    }
}

function printTables(tables: string[]) {
    if (tables.length === 0) {
        console.log('public tables: <none>');
        return;
    }

    console.log('public tables:');
    for (const table of tables) {
        console.log(`- ${table}`);
    }
}

async function verifyRequiredTables(client: PoolClient) {
    const tables = await listPublicTables(client);
    const missingTables = REQUIRED_PUBLIC_TABLES.filter((tableName) => !tables.includes(tableName));

    if (missingTables.length > 0) {
        throw new Error(`Missing required tables in public schema: ${missingTables.join(', ')}`);
    }

    return tables;
}

async function main() {
    console.log(
        `Testing ${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.databaseName} using ${databaseConfig.connectionSource} [${databaseConfig.databaseMode}] (ssl=${databaseConfig.sslEnabled ? 'on' : 'off'}).`,
    );

    const client = await connectToDatabase();

    try {
        const identity = await readDatabaseIdentity(client);
        const tables = await verifyRequiredTables(client);

        console.log(`current_database(): ${identity.currentDatabase}`);
        console.log(`current_schema(): ${identity.currentSchema}`);
        printTables(tables);
        console.log(`Verified required tables: ${REQUIRED_PUBLIC_TABLES.join(', ')}`);
    } finally {
        client.release();
        await pool.end();
    }
}

void main().catch((error) => {
    console.error('Database connection test failed.');
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
