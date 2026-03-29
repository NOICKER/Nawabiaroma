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
const originalBootstrapSecret = env.ADMIN_BOOTSTRAP_SECRET;

async function startServer() {
    if (server) {
        return;
    }

    server = createApp().listen(0);
    await once(server, 'listening');

    const address = server.address();

    if (!address || typeof address === 'string') {
        throw new Error('Unable to determine admin auth test server address.');
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

async function countAdmins() {
    const result = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM admins');
    return Number(result.rows[0]?.count ?? 0);
}

async function insertAdmin(options: {
    email: string;
    initials?: string | null;
    password: string;
    isActive?: boolean;
}) {
    const passwordHash = await hashPassword(options.password);

    const result = await query<{
        id: number | string;
        email: string;
        initials: string | null;
        is_active: boolean;
        last_login_at: string | null;
    }>(
        `
            INSERT INTO admins (email, initials, password_hash, is_active)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, initials, is_active, last_login_at
        `,
        [options.email, options.initials ?? null, passwordHash, options.isActive ?? true],
    );

    return result.rows[0];
}

async function postJson(pathname: string, body: unknown) {
    const response = await fetch(`${baseUrl}${pathname}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
        },
        body: JSON.stringify(body),
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
    env.ADMIN_BOOTSTRAP_SECRET = undefined;
});

test.after(async () => {
    env.ADMIN_BOOTSTRAP_SECRET = originalBootstrapSecret;
    await stopServer();
    await releaseAdminTestLock();
    await closeDatabase();
});

test('bootstrap creates the first admin exactly once', async () => {
    env.ADMIN_BOOTSTRAP_SECRET = 'bootstrap-secret';

    const result = await postJson('/api/auth/admin/bootstrap', {
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
        bootstrapSecret: 'bootstrap-secret',
    });

    assert.equal(result.status, 200);
    assert.equal(typeof result.body?.data?.token, 'string');
    assert.equal(await countAdmins(), 1);
});

test('bootstrap is unavailable after an admin already exists', async () => {
    env.ADMIN_BOOTSTRAP_SECRET = 'bootstrap-secret';
    await insertAdmin({
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
    });

    const result = await postJson('/api/auth/admin/bootstrap', {
        email: 'second@example.com',
        initials: 'SA',
        password: 'strongpass123',
        bootstrapSecret: 'bootstrap-secret',
    });

    assert.equal(result.status, 409);
    assert.equal(await countAdmins(), 1);
});

test('bootstrap rejects requests with a missing or wrong bootstrap secret', async () => {
    env.ADMIN_BOOTSTRAP_SECRET = 'bootstrap-secret';

    const missingSecret = await postJson('/api/auth/admin/bootstrap', {
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
    });

    assert.equal(missingSecret.status, 400);
    assert.equal(await countAdmins(), 0);

    const wrongSecret = await postJson('/api/auth/admin/bootstrap', {
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
        bootstrapSecret: 'wrong-secret',
    });

    assert.equal(wrongSecret.status, 403);
    assert.equal(await countAdmins(), 0);
});

test('login authenticates an existing admin from the database', async () => {
    await insertAdmin({
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
    });

    const result = await postJson('/api/auth/admin/login', {
        email: 'owner@example.com',
        password: 'strongpass123',
    });

    assert.equal(result.status, 200);
    assert.equal(typeof result.body?.data?.token, 'string');

    const payload = jwt.verify(result.body.data.token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
    }) as jwt.JwtPayload;

    assert.equal(payload.role, 'admin');
    assert.equal(payload.email, 'owner@example.com');

    const adminResult = await query<{ last_login_at: string | null }>(
        `
            SELECT last_login_at
            FROM admins
            WHERE email = $1
        `,
        ['owner@example.com'],
    );

    assert.notEqual(adminResult.rows[0]?.last_login_at ?? null, null);
});

test('login rejects an invalid password', async () => {
    await insertAdmin({
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
    });

    const result = await postJson('/api/auth/admin/login', {
        email: 'owner@example.com',
        password: 'wrongpass123',
    });

    assert.equal(result.status, 401);
});

test('login rejects inactive admins', async () => {
    await insertAdmin({
        email: 'owner@example.com',
        initials: 'NA',
        password: 'strongpass123',
        isActive: false,
    });

    const result = await postJson('/api/auth/admin/login', {
        email: 'owner@example.com',
        password: 'strongpass123',
    });

    assert.equal(result.status, 401);
});
