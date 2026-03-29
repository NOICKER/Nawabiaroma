import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ADMIN_TOKEN_STORAGE_KEY,
    persistAdminToken,
    readStoredAdminToken,
    resolveAdminAuthStorage,
    type StorageLike,
} from '../src/lib/adminAuth.ts';

class MemoryStorage implements StorageLike {
    private values = new Map<string, string>();

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    removeItem(key: string) {
        this.values.delete(key);
    }

    setItem(key: string, value: string) {
        this.values.set(key, value);
    }
}

test('admin auth storage uses sessionStorage instead of localStorage', () => {
    const sessionStorage = new MemoryStorage();
    const localStorage = new MemoryStorage();
    const storage = resolveAdminAuthStorage({
        sessionStorage,
        localStorage,
    });

    persistAdminToken(storage, 'admin-token');

    assert.equal(readStoredAdminToken(storage), 'admin-token');
    assert.equal(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY), 'admin-token');
    assert.equal(localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY), null);

    persistAdminToken(storage, null);

    assert.equal(readStoredAdminToken(storage), null);
    assert.equal(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY), null);
});
