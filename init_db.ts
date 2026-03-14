import fs from 'fs';
import path from 'path';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function init() {
    try {
        const schemaPath = path.join(process.cwd(), 'models', 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');
        const migrationsPath = path.join(process.cwd(), 'migrations');

        console.log('Applying schema from', schemaPath);
        await pool.query(sql);
        console.log('Schema applied successfully.');

        if (fs.existsSync(migrationsPath)) {
            const migrationFiles = fs
                .readdirSync(migrationsPath)
                .filter((file) => file.endsWith('.sql'))
                .sort((left, right) => left.localeCompare(right));

            for (const file of migrationFiles) {
                const migrationPath = path.join(migrationsPath, file);
                const migrationSql = fs.readFileSync(migrationPath, 'utf8');

                console.log('Applying migration from', migrationPath);
                await pool.query(migrationSql);
            }

            console.log('Migrations applied successfully.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Failed to apply schema:', err);
        process.exit(1);
    }
}

init();
