import assert from 'node:assert/strict';
import test from 'node:test';
import { readBootstrapSecretFromHash } from '../src/lib/adminAuth.ts';

test('readBootstrapSecretFromHash returns the setup secret and ignores extra hash params', () => {
    assert.equal(readBootstrapSecretFromHash('#setup=abc123'), 'abc123');
    assert.equal(readBootstrapSecretFromHash('#setup=abc123&mode=debug'), 'abc123');
});

test('readBootstrapSecretFromHash returns null when no usable setup secret exists', () => {
    assert.equal(readBootstrapSecretFromHash(''), null);
    assert.equal(readBootstrapSecretFromHash('#mode=debug'), null);
    assert.equal(readBootstrapSecretFromHash('#setup='), null);
});
