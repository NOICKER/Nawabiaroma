import { createApp } from './app.js';
import { closeDatabase } from './config/database.js';
import { env } from './config/env.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
    console.log(`Backend API listening on port ${env.PORT}`);
});

async function shutdown(signal: NodeJS.Signals) {
    console.log(`Received ${signal}. Shutting down gracefully.`);
    const forceExitTimer = setTimeout(() => {
        console.error('Graceful shutdown timed out. Forcing exit.');
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
