import { buildApiUrl } from './api.ts';

export const ADMIN_TOKEN_STORAGE_KEY = 'nawabi_admin_token';

export interface StorageLike {
    getItem(key: string): string | null;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
}

export interface WindowStorageLike {
    sessionStorage: StorageLike;
    localStorage?: StorageLike;
}

interface LoginResponse {
    data?: {
        token?: string;
    };
    error?: string;
}

export interface AdminBootstrapInput {
    email: string;
    initials: string;
    password: string;
    bootstrapSecret: string;
}

export class AdminAuthRequestError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.name = 'AdminAuthRequestError';
        this.status = status;
    }
}

function normalizeToken(token: string | null) {
    return typeof token === 'string' && token.length > 0 ? token : null;
}

async function submitAdminTokenRequest(url: string, body: unknown, fallbackMessage: string) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    let payload: LoginResponse | null = null;

    try {
        payload = (await response.json()) as LoginResponse;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new AdminAuthRequestError(response.status, payload?.error ?? fallbackMessage);
    }

    if (typeof payload?.data?.token !== 'string' || payload.data.token.length === 0) {
        throw new AdminAuthRequestError(response.status, fallbackMessage);
    }

    return payload.data.token;
}

export function readBootstrapSecretFromHash(hash: string): string | null {
    const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;

    if (!normalizedHash) {
        return null;
    }

    const params = new URLSearchParams(normalizedHash);
    const setupSecret = params.get('setup');

    return setupSecret && setupSecret.length > 0 ? setupSecret : null;
}

export function resolveAdminAuthStorage(windowLike: WindowStorageLike | null | undefined): StorageLike | null {
    return windowLike?.sessionStorage ?? null;
}

export function readStoredAdminToken(storage: StorageLike | null): string | null {
    if (!storage) {
        return null;
    }

    try {
        return normalizeToken(storage.getItem(ADMIN_TOKEN_STORAGE_KEY));
    } catch {
        return null;
    }
}

export function persistAdminToken(storage: StorageLike | null, token: string | null) {
    const normalizedToken = normalizeToken(token);

    if (!storage) {
        return normalizedToken;
    }

    try {
        if (normalizedToken) {
            storage.setItem(ADMIN_TOKEN_STORAGE_KEY, normalizedToken);
        } else {
            storage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
        }
    } catch {
        return normalizedToken;
    }

    return normalizedToken;
}

export async function submitAdminLogin(email: string, password: string): Promise<string> {
    return submitAdminTokenRequest(buildApiUrl('/api/auth/admin/login'), { email, password }, 'Unable to log in.');
}

export async function submitAdminBootstrap(input: AdminBootstrapInput): Promise<string> {
    return submitAdminTokenRequest(
        buildApiUrl('/api/auth/admin/bootstrap'),
        input,
        'Unable to complete admin setup.',
    );
}

export function isAdminSetupUnavailableError(error: unknown) {
    return error instanceof AdminAuthRequestError && error.status === 409;
}
