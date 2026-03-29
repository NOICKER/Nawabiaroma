import 'dotenv/config';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { hashPassword } from '../services/passwordService.js';
import { createApp } from '../server/app.js';
import { query, closeDatabase } from '../server/config/database.js';
import { env } from '../server/config/env.js';
import { acquireAdminTestLock, releaseAdminTestLock } from './support/adminTestLock.js';

let server: Server;
let baseUrl = '';

async function startServer() {
    if (server) {
        return;
    }

    server = createApp().listen(0);
    await once(server, 'listening');

    const address = server.address();

    if (!address || typeof address === 'string') {
        throw new Error('Unable to determine admin users test server address.');
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

async function seedAdmin(options: { email: string; initials?: string | null; password: string; isActive?: boolean }) {
    const passwordHash = await hashPassword(options.password);

    const result = await query<{ id: number | string; email: string }>(
        `
            INSERT INTO admins (email, initials, password_hash, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email
        `,
        [options.email, options.initials ?? null, passwordHash, options.isActive ?? true],
    );

    return {
        id: Number(result.rows[0].id),
        email: result.rows[0].email,
    };
}

function createAdminToken(admin: { id: number; email: string }) {
    return jwt.sign(
        {
            sub: String(admin.id),
            email: admin.email,
            role: 'admin',
        },
        env.JWT_SECRET,
        {
            algorithm: 'HS256',
            issuer: env.JWT_ISSUER,
            audience: env.JWT_AUDIENCE,
            expiresIn: '12h',
        },
    );
}

async function requestJson(pathname: string, options?: { method?: string; body?: unknown; token?: string }) {
    const response = await fetch(`${baseUrl}${pathname}`, {
        method: options?.method ?? 'GET',
        headers: {
            ...(options?.body ? { 'content-type': 'application/json' } : {}),
            ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const payload = await response.json();

    return {
        status: response.status,
        body: payload,
    };
}

test.before(async () => {
    await acquireAdminTestLock();
    await startServer();
});

test.beforeEach(async () => {
    await resetAdmins();
});

test.after(async () => {
    await stopServer();
    await releaseAdminTestLock();
    await closeDatabase();
});

test('POST /api/admin/users requires an authenticated admin', async () => {
    const result = await requestJson('/api/admin/users', {
        method: 'POST',
        body: {
            email: 'second@example.com',
            initials: 'SA',
            password: 'strongpass123',
        },
    });

    assert.equal(result.status, 401);
});

test('authenticated admins can create and list admin users', async () => {
    const owner = await seedAdmin({
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
    });
    const token = createAdminToken(owner);

    const createResult = await requestJson('/api/admin/users', {
        method: 'POST',
        token,
        body: {
            email: 'second@example.com',
            initials: 'SA',
            password: 'strongpass123',
        },
    });

    assert.equal(createResult.status, 201);
    assert.equal(createResult.body?.data?.email, 'second@example.com');
    assert.equal(createResult.body?.data?.initials, 'SA');
    assert.equal('passwordHash' in (createResult.body?.data ?? {}), false);

    const listResult = await requestJson('/api/admin/users', {
        token,
    });

    assert.equal(listResult.status, 200);
    assert.equal(Array.isArray(listResult.body?.data), true);
    assert.equal(listResult.body.data.length, 2);
    assert.equal(listResult.body.data.every((admin: Record<string, unknown>) => !('passwordHash' in admin)), true);
});

test('creating an admin user rejects duplicate emails', async () => {
    const owner = await seedAdmin({
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
    });
    await seedAdmin({
        email: 'second@example.com',
        initials: 'SA',
        password: 'strongpass123',
    });

    const token = createAdminToken(owner);
    const result = await requestJson('/api/admin/users', {
        method: 'POST',
        token,
        body: {
            email: 'second@example.com',
            initials: 'SA',
            password: 'strongpass123',
        },
    });

    assert.equal(result.status, 409);
});
