import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAdminRedirect } from '../src/components/admin/AdminRoute.tsx';

test('protected admin routes redirect to /admin/login when unauthenticated', () => {
    assert.equal(resolveAdminRedirect(false), '/admin/login');
    assert.equal(resolveAdminRedirect(true), null);
});
