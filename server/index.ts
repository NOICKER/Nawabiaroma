import 'dotenv/config';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { assertDatabaseConnection, closeDatabase, databaseConnectionInfo } from './config/database.js';
import { ensureDatabaseSchemaCurrent } from './config/databaseMigrations.js';
import { env } from './config/env.js';
import { logger } from '../services/logger.js';

const app = createApp();
let server: Server | undefined;

async function shutdown(signal: NodeJS.Signals) {
    logger.info({
        event_type: 'server_shutdown_requested',
        outcome: 'success',
        signal,
    });

    if (!server) {
        await closeDatabase();
        process.exit(0);
    }

    const forceExitTimer = setTimeout(() => {
        logger.error({
            event_type: 'server_shutdown_timeout',
            outcome: 'failure',
            signal,
        });
        process.exit(1);
    }, 10_000);

    const currentServer = server;
    server = undefined;

    currentServer.close(async () => {
        clearTimeout(forceExitTimer);
        await closeDatabase();
        process.exit(0);
    });
}

process.on('SIGINT', () => {
    void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});

async function start() {
    logger.info({
        event_type: 'server_env_loaded',
        outcome: 'success',
        database_mode: process.env.DATABASE_MODE ?? null,
        database_url_pooler_present: Boolean(process.env.DATABASE_URL_POOLER),
        database_url_present: Boolean(process.env.DATABASE_URL),
        database_ssl_present: Boolean(process.env.DATABASE_SSL),
        jwt_secret_present: Boolean(process.env.JWT_SECRET),
        razorpay_key_id_present: Boolean(process.env.RAZORPAY_KEY_ID),
        resend_api_key_present: Boolean(process.env.RESEND_API_KEY),
    });

    const migrationResult = await ensureDatabaseSchemaCurrent();
    await assertDatabaseConnection();

    server = app.listen(env.PORT, () => {
        logger.info({
            event_type: 'server_started',
            outcome: 'success',
            port: env.PORT,
            node_env: env.NODE_ENV,
            database_mode: databaseConnectionInfo.databaseMode,
            connection_source: databaseConnectionInfo.connectionSource,
            database_host: databaseConnectionInfo.host,
            applied_migrations: migrationResult.applied,
        });
    });
}

void start().catch(async (error) => {
    logger.error({
        event_type: 'server_start_failed',
        outcome: 'failure',
        error: error instanceof Error ? error.message : String(error),
        database_mode: databaseConnectionInfo.databaseMode,
        connection_source: databaseConnectionInfo.connectionSource,
        database_host: databaseConnectionInfo.host,
    });

    await closeDatabase().catch(() => undefined);
    process.exit(1);
});
