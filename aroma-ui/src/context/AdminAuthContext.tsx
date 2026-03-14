/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

const ADMIN_TOKEN_STORAGE_KEY = 'nawabi_admin_token';

interface AdminAuthContextValue {
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

let cachedAdminToken: string | null | undefined;

function normalizeToken(token: string | null) {
    return typeof token === 'string' && token.length > 0 ? token : null;
}

function readStoredToken() {
    if (cachedAdminToken !== undefined) {
        return cachedAdminToken;
    }

    if (typeof window === 'undefined') {
        cachedAdminToken = null;
        return cachedAdminToken;
    }

    try {
        cachedAdminToken = normalizeToken(window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY));
        return cachedAdminToken;
    } catch {
        cachedAdminToken = null;
        return cachedAdminToken;
    }
}

function persistToken(token: string | null) {
    cachedAdminToken = token;

    if (typeof window === 'undefined') {
        return;
    }

    try {
        if (token) {
            window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
            return;
        }

        window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
        return;
    }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => readStoredToken());

    const login = (nextToken: string) => {
        const storedToken = normalizeToken(nextToken);
        persistToken(storedToken);
        setToken(storedToken);
    };

    const logout = () => {
        persistToken(null);
        setToken(null);
    };

    return (
        <AdminAuthContext.Provider
            value={{
                token,
                isAuthenticated: token !== null,
                login,
                logout,
            }}
        >
            {children}
        </AdminAuthContext.Provider>
    );
}

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);

    if (!context) {
        throw new Error('useAdminAuth must be used within an AdminAuthProvider');
    }

    return context;
}
