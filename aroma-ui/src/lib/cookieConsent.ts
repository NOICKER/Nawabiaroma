export const COOKIE_CONSENT_STORAGE_KEY = 'cookie_consent_status';

export type CookieConsentStatus = 'accepted' | 'declined';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

function getBrowserStorage(): Storage | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

export function readCookieConsent(storage: ReadableStorage | null = getBrowserStorage()): CookieConsentStatus | null {
    if (!storage) {
        return null;
    }

    try {
        const storedValue = storage.getItem(COOKIE_CONSENT_STORAGE_KEY);

        if (storedValue === 'accepted' || storedValue === 'declined') {
            return storedValue;
        }
    } catch {
        return null;
    }

    return null;
}

export function saveCookieConsent(
    status: CookieConsentStatus,
    storage: WritableStorage | null = getBrowserStorage(),
) {
    if (!storage) {
        return;
    }

    try {
        storage.setItem(COOKIE_CONSENT_STORAGE_KEY, status);
    } catch {
        // Ignore storage write failures and continue without persistence.
    }
}
