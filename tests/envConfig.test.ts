import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const REQUIRED_ENV_OVERRIDES = {
    NODE_ENV: 'development',
    DATABASE_MODE: 'LOCAL_DEV',
    DATABASE_URL_POOLER:
        'postgresql://postgres.example:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
    JWT_SECRET: 'replace-with-long-secret',
} as const;

async function importEnvModuleFresh() {
    const envModuleUrl = new URL('../server/config/env.ts', import.meta.url);
    envModuleUrl.searchParams.set('t', `${Date.now()}-${Math.random()}`);
    return import(envModuleUrl.href);
}

test('env accepts ADMIN_BOOTSTRAP_SECRET without ADMIN_EMAIL/ADMIN_PASSWORD_HASH', async () => {
    const originalValues = new Map<string, string | undefined>();
    const tempDir = mkdtempSync(path.join(tmpdir(), 'aroma-env-config-'));
    const emptyEnvPath = path.join(tempDir, '.env');

    writeFileSync(emptyEnvPath, '');

    const overrides: Record<string, string | undefined> = {
        ...REQUIRED_ENV_OVERRIDES,
        ADMIN_BOOTSTRAP_SECRET: 'bootstrap-secret',
        ADMIN_EMAIL: undefined,
        ADMIN_PASSWORD_HASH: undefined,
        DOTENV_CONFIG_PATH: emptyEnvPath,
    };

    for (const [key, value] of Object.entries(overrides)) {
        originalValues.set(key, process.env[key]);

        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }

    try {
        await assert.doesNotReject(importEnvModuleFresh());
    } finally {
        for (const [key, value] of originalValues.entries()) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }

        rmSync(tempDir, { recursive: true, force: true });
    }
});
