import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

let server: Server | undefined;
let baseUrl = '';
let databaseModule: typeof import('../server/config/database.js') | undefined;
let tempDir: string | undefined;
const originalCorsOrigin = process.env.CORS_ORIGIN;
const originalDotenvConfigPath = process.env.DOTENV_CONFIG_PATH;
const originalEnvValues = new Map<string, string | undefined>();

const REQUIRED_ENV_OVERRIDES = {
    NODE_ENV: 'development',
    DATABASE_MODE: 'LOCAL_DEV',
    DATABASE_URL_POOLER:
        'postgresql://postgres.example:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
    JWT_SECRET: 'replace-with-long-secret',
} as const;

async function importServerModulesFresh(corsOrigin: string) {
    const envFileDir = mkdtempSync(path.join(tmpdir(), 'aroma-cors-config-'));
    const envFilePath = path.join(envFileDir, '.env');

    writeFileSync(envFilePath, '');
    tempDir = envFileDir;

    process.env.DOTENV_CONFIG_PATH = envFilePath;
    process.env.CORS_ORIGIN = corsOrigin;

    for (const [key, value] of Object.entries(REQUIRED_ENV_OVERRIDES)) {
        originalEnvValues.set(key, process.env[key]);
        process.env[key] = value;
    }

    const timestamp = `${Date.now()}-${Math.random()}`;
    const appModuleUrl = new URL('../server/app.ts', import.meta.url);
    const databaseModuleUrl = new URL('../server/config/database.ts', import.meta.url);

    appModuleUrl.searchParams.set('t', timestamp);
    databaseModuleUrl.searchParams.set('t', timestamp);

    const [appModule, importedDatabaseModule] = await Promise.all([
        import(appModuleUrl.href),
        import(databaseModuleUrl.href),
    ]);

    databaseModule = importedDatabaseModule;

    return {
        createApp: appModule.createApp,
    };
}

async function startServer(createApp: typeof import('../server/app.js').createApp) {
    server = createApp().listen(0);
    await once(server, 'listening');

    const address = server.address();

    if (!address || typeof address === 'string') {
        throw new Error('Unable to determine CORS test server address.');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopServer() {
    if (!server) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });

    server = undefined;
}

async function sendPreflight(origin: string) {
    const response = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: 'OPTIONS',
        headers: {
            origin,
            'access-control-request-method': 'POST',
        },
    });

    return {
        status: response.status,
        allowOrigin: response.headers.get('access-control-allow-origin'),
    };
}

test.after(async () => {
    await stopServer();

    if (databaseModule) {
        await databaseModule.closeDatabase();
    }

    if (tempDir) {
        rmSync(tempDir, { recursive: true, force: true });
    }

    if (originalDotenvConfigPath === undefined) {
        delete process.env.DOTENV_CONFIG_PATH;
    } else {
        process.env.DOTENV_CONFIG_PATH = originalDotenvConfigPath;
    }

    if (originalCorsOrigin === undefined) {
        delete process.env.CORS_ORIGIN;
    } else {
        process.env.CORS_ORIGIN = originalCorsOrigin;
    }

    for (const [key, value] of originalEnvValues.entries()) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

test('cors allows Nawabi Aroma production origins from normalized CORS_ORIGIN values', async () => {
    const { createApp } = await importServerModulesFresh(
        ' https://www.nawabiaroma.com/,\n"https://nawabiaroma.com" ',
    );
    await startServer(createApp);

    const wwwOrigin = await sendPreflight('https://www.nawabiaroma.com');
    const apexOrigin = await sendPreflight('https://nawabiaroma.com');
    const unknownOrigin = await sendPreflight('https://evil.example.com');

    assert.equal(wwwOrigin.status, 204);
    assert.equal(wwwOrigin.allowOrigin, 'https://www.nawabiaroma.com');
    assert.equal(apexOrigin.status, 204);
    assert.equal(apexOrigin.allowOrigin, 'https://nawabiaroma.com');
    assert.equal(unknownOrigin.allowOrigin, null);
});
