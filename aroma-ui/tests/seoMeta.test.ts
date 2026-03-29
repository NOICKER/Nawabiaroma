import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildCanonicalUrl, getSeoMetadata } from '../src/seo.ts';

const appRoot = resolve(import.meta.dirname, '..');

test('index.html includes the essential SEO and social sharing tags', async () => {
    const html = await readFile(resolve(appRoot, 'index.html'), 'utf8');
    const normalizedHtml = html.replace(/\s+/g, ' ');

    assert.match(normalizedHtml, /<title>Nawabi Aroma \| Modern Perfume Atelier<\/title>/);
    assert.match(
        normalizedHtml,
        /<meta name="description" content="Nawabi Aroma composes modern perfume with memory, restraint, and a quiet sense of ceremony\. Explore luminous fragrances, discovery sets, and gifting across India\." \/>/,
    );
    assert.match(normalizedHtml, /<meta property="og:title" content="Nawabi Aroma \| Modern Perfume Atelier" \/>/);
    assert.match(normalizedHtml, /<meta property="og:description" content="Nawabi Aroma composes modern perfume with memory, restraint, and a quiet sense of ceremony\. Explore luminous fragrances, discovery sets, and gifting across India\." \/>/);
    assert.match(normalizedHtml, /<meta property="og:image" content="https:\/\/images\.unsplash\.com\/photo-1594913785121-667503fa0e98\?auto=format&fit=crop&q=80&w=1200" \/>/);
    assert.match(normalizedHtml, /<meta name="twitter:card" content="summary_large_image" \/>/);
    assert.match(normalizedHtml, /<link rel="canonical" href="https:\/\/www\.nawabiaroma\.com\/" \/>/);
    assert.match(normalizedHtml, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg" \/>/);
});

test('public storefront pages are indexable and use descriptive titles', () => {
    const home = getSeoMetadata('/');
    const shop = getSeoMetadata('/shop');
    const product = getSeoMetadata('/product/velvet-oud');

    assert.equal(home.title, 'Nawabi Aroma | Modern Perfume Atelier');
    assert.equal(home.robots, 'index, follow');
    assert.equal(shop.title, 'Shop Fragrances | Nawabi Aroma');
    assert.match(shop.description, /Explore Nawabi Aroma/);
    assert.equal(product.title, 'Velvet Oud | Nawabi Aroma');
    assert.match(product.description, /Explore Velvet Oud by Nawabi Aroma/);
});

test('utility and admin routes are marked noindex', () => {
    assert.equal(getSeoMetadata('/checkout').robots, 'noindex, nofollow');
    assert.equal(getSeoMetadata('/account/login').robots, 'noindex, nofollow');
    assert.equal(getSeoMetadata('/admin/orders').robots, 'noindex, nofollow');
});

test('canonical URLs are built from the production site URL', () => {
    assert.equal(buildCanonicalUrl('/'), 'https://www.nawabiaroma.com/');
    assert.equal(buildCanonicalUrl('/product/velvet-oud'), 'https://www.nawabiaroma.com/product/velvet-oud');
});
