import 'dotenv/config';
import { closeDatabase } from './server/config/database.js';
import { ensureDatabaseSchemaCurrent } from './server/config/databaseMigrations.js';

async function init() {
    try {
        const result = await ensureDatabaseSchemaCurrent();
        console.log('Database initialization completed successfully.');
        console.log(`Applied migrations: ${result.applied.length > 0 ? result.applied.join(', ') : '<none>'}`);
        console.log(`Skipped migrations: ${result.skipped.length > 0 ? result.skipped.join(', ') : '<none>'}`);
    } finally {
        await closeDatabase();
    }
}

void init().catch((error) => {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
});
