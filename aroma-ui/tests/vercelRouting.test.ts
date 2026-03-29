import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const appRoot = resolve(import.meta.dirname, '..');

test('vercel.json rewrites deep links to index.html for the SPA router', async () => {
    const configPath = resolve(appRoot, 'vercel.json');
    const rawConfig = await readFile(configPath, 'utf8');
    const config = JSON.parse(rawConfig) as {
        rewrites?: Array<{ source?: string; destination?: string }>;
    };

    assert.ok(Array.isArray(config.rewrites), 'Expected vercel.json to define rewrites');
    assert.deepEqual(config.rewrites, [{ source: '/(.*)', destination: '/index.html' }]);
});
