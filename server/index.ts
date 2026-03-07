import { createApp } from './app.js';
import { closeDatabase } from './config/database.js';
import { env } from './config/env.js';
import { logger } from '../services/logger.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
    logger.info({
        event_type: 'server_started',
        outcome: 'success',
        port: env.PORT,
        node_env: env.NODE_ENV,
    });
});

async function shutdown(signal: NodeJS.Signals) {
    logger.info({
        event_type: 'server_shutdown_requested',
        outcome: 'success',
        signal,
    });
    const forceExitTimer = setTimeout(() => {
        logger.error({
            event_type: 'server_shutdown_timeout',
            outcome: 'failure',
            signal,
        });
        process.exit(1);
    }, 10_000);

    server.close(async () => {
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
