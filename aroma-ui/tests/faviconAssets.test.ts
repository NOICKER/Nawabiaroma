import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = resolve(import.meta.dirname, '..');

async function readProjectFile(relativePath: string) {
    return readFile(resolve(appRoot, relativePath), 'utf8');
}

test('index.html links the favicon asset set', async () => {
    const html = (await readProjectFile('index.html')).replace(/\s+/g, ' ');

    assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/);
    assert.match(html, /<link rel="icon" type="image\/png" sizes="32x32" href="\/favicon-32x32\.png" \/>/);
    assert.match(html, /<link rel="icon" type="image\/png" sizes="16x16" href="\/favicon-16x16\.png" \/>/);
    assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png" \/>/);
});

test('favicon svg is the simplified monochrome Nawabi Aroma monogram', async () => {
    const svg = await readProjectFile('public/favicon.svg');

    assert.match(svg, /<title>Nawabi Aroma favicon<\/title>/);
    assert.match(svg, /stroke="#F5F1EA"/);
    assert.doesNotMatch(svg, /1289A1/);
});

test('png favicon assets exist for browser and touch icons', async () => {
    const iconPaths = ['public/favicon-32x32.png', 'public/favicon-16x16.png', 'public/apple-touch-icon.png'];

    await Promise.all(
        iconPaths.map(async (relativePath) => {
            await access(resolve(appRoot, relativePath), fsConstants.F_OK);
        }),
    );
});
