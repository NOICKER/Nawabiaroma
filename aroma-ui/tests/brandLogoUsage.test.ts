import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const appRoot = resolve(import.meta.dirname, '..');
const heroSealPath = '/brand/nawabi-seal-1024.png';
const footerSealPath = '/brand/nawabi-seal-512.png';

async function readSource(relativePath: string) {
    return readFile(resolve(appRoot, relativePath), 'utf8');
}

test('home hero references the Nawabi Aroma seal artwork', async () => {
    const source = await readSource('src/pages/Home.tsx');

    assert.match(source, /Nawabi Aroma seal logo/);
    assert.match(source, new RegExp(heroSealPath.replace('/', '\\/')));
});

test('footer references the Nawabi Aroma seal artwork', async () => {
    const source = await readSource('src/components/Footer.tsx');

    assert.match(source, /Nawabi Aroma seal logo/);
    assert.match(source, new RegExp(footerSealPath.replace('/', '\\/')));
});
