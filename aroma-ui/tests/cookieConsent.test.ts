import test from 'node:test';
import assert from 'node:assert/strict';
import {
    COOKIE_CONSENT_STORAGE_KEY,
    readCookieConsent,
    saveCookieConsent,
    type CookieConsentStatus,
} from '../src/lib/cookieConsent.ts';
import { createAnalyticsController, isStorefrontPath } from '../src/lib/analytics.ts';

class MemoryStorage implements Storage {
    private values = new Map<string, string>();

    get length() {
        return this.values.size;
    }

    clear() {
        this.values.clear();
    }

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    key(index: number) {
        return Array.from(this.values.keys())[index] ?? null;
    }

    removeItem(key: string) {
        this.values.delete(key);
    }

    setItem(key: string, value: string) {
        this.values.set(key, value);
    }
}

function createAnalyticsAdapter() {
    return {
        initializeCalls: [] as string[],
        pageViews: [] as Array<{ hitType: string; page: string; title?: string }>,
        initialize(measurementId: string) {
            this.initializeCalls.push(measurementId);
        },
        send(payload: { hitType: string; page: string; title?: string }) {
            this.pageViews.push(payload);
        },
    };
}

test('cookie consent is persisted and restored from storage', () => {
    const storage = new MemoryStorage();

    assert.equal(readCookieConsent(storage), null);

    saveCookieConsent('accepted', storage);
    assert.equal(storage.getItem(COOKIE_CONSENT_STORAGE_KEY), 'accepted');
    assert.equal(readCookieConsent(storage), 'accepted');

    saveCookieConsent('declined', storage);
    assert.equal(readCookieConsent(storage), 'declined');
});

test('cookie consent ignores unexpected stored values', () => {
    const storage = new MemoryStorage();
    storage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'maybe-later');

    assert.equal(readCookieConsent(storage), null);
});

test('analytics controller only initializes once and only tracks after initialization', () => {
    const analyticsAdapter = createAnalyticsAdapter();
    const analytics = createAnalyticsController({
        measurementId: 'G-TEST12345',
        adapter: analyticsAdapter,
    });

    assert.equal(analytics.trackPageView('/shop', 'Shop'), false);
    assert.deepEqual(analyticsAdapter.pageViews, []);

    assert.equal(analytics.initialize(), true);
    assert.equal(analytics.initialize(), false);
    assert.deepEqual(analyticsAdapter.initializeCalls, ['G-TEST12345']);

    assert.equal(analytics.trackPageView('/shop', 'Shop'), true);
    assert.deepEqual(analyticsAdapter.pageViews, [{ hitType: 'pageview', page: '/shop', title: 'Shop' }]);
});

test('analytics stays disabled when the measurement id is missing', () => {
    const analyticsAdapter = createAnalyticsAdapter();
    const analytics = createAnalyticsController({
        measurementId: '',
        adapter: analyticsAdapter,
    });

    assert.equal(analytics.initialize(), false);
    assert.equal(analytics.trackPageView('/', 'Home'), false);
    assert.deepEqual(analyticsAdapter.initializeCalls, []);
    assert.deepEqual(analyticsAdapter.pageViews, []);
});

test('storefront path detection excludes admin routes', () => {
    assert.equal(isStorefrontPath('/'), true);
    assert.equal(isStorefrontPath('/shop'), true);
    assert.equal(isStorefrontPath('/admin'), false);
    assert.equal(isStorefrontPath('/admin/orders'), false);
});
