import type { PoolClient } from 'pg';
import { pool } from '../../server/config/database.js';

const ADMIN_TEST_LOCK_KEY = 94216107;

let adminTestLockClient: PoolClient | null = null;

export async function acquireAdminTestLock() {
    if (adminTestLockClient) {
        return;
    }

    adminTestLockClient = await pool.connect();
    await adminTestLockClient.query('SELECT pg_advisory_lock($1)', [ADMIN_TEST_LOCK_KEY]);
}

export async function releaseAdminTestLock() {
    if (!adminTestLockClient) {
        return;
    }

    try {
        await adminTestLockClient.query('SELECT pg_advisory_unlock($1)', [ADMIN_TEST_LOCK_KEY]);
    } finally {
        adminTestLockClient.release();
        adminTestLockClient = null;
    }
}
