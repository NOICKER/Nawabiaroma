import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import test from 'node:test';
import { hashPassword } from '../services/passwordService.js';
import { query, closeDatabase } from '../server/config/database.js';
import { env } from '../server/config/env.js';
import { acquireAdminTestLock, releaseAdminTestLock } from './support/adminTestLock.js';

let server: Server;
let baseUrl = '';
const originalAdminRateLimitMax = env.ADMIN_RATE_LIMIT_MAX;
const originalAdminRateLimitWindowMs = env.ADMIN_RATE_LIMIT_WINDOW_MS;

async function importAppFresh() {
    const appModuleUrl = new URL('../server/app.ts', import.meta.url);
    appModuleUrl.searchParams.set('t', `${Date.now()}-${Math.random()}`);
    return import(appModuleUrl.href);
}

async function startServer() {
    if (server) {
        return;
    }

    const { createApp } = await importAppFresh();
    server = createApp().listen(0);
    await once(server, 'listening');

    const address = server.address();

    if (!address || typeof address === 'string') {
        throw new Error('Unable to determine admin rate limit test server address.');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stopServer() {
    if (!server) {
        return;
    }

    await new Promise<void>((resolve, reject) => {
        server.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

async function resetAdmins() {
    await query('TRUNCATE TABLE admins RESTART IDENTITY');
}

async function seedAdmin() {
    const passwordHash = await hashPassword('strongpass123');

    await query(
        `
            INSERT INTO admins (email, initials, password_hash, is_active)
            VALUES ($1, $2, $3, TRUE)
        `,
        ['owner@example.com', 'NA', passwordHash],
    );
}

async function postLoginAttempt(password: string) {
    const response = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            email: 'owner@example.com',
            password,
        }),
    });

    return response.status;
}

test.before(async () => {
    await acquireAdminTestLock();
    env.ADMIN_RATE_LIMIT_MAX = 2;
    env.ADMIN_RATE_LIMIT_WINDOW_MS = 60_000;
    await startServer();
});

test.beforeEach(async () => {
    await resetAdmins();
    await seedAdmin();
});

test.after(async () => {
    env.ADMIN_RATE_LIMIT_MAX = originalAdminRateLimitMax;
    env.ADMIN_RATE_LIMIT_WINDOW_MS = originalAdminRateLimitWindowMs;
    await stopServer();
    await releaseAdminTestLock();
    await closeDatabase();
});

test('admin login route is protected by a dedicated limiter', async () => {
    assert.equal(await postLoginAttempt('wrongpass123'), 401);
    assert.equal(await postLoginAttempt('wrongpass123'), 401);
    assert.equal(await postLoginAttempt('wrongpass123'), 429);
});
