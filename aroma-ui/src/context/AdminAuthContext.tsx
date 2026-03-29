/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import {
    persistAdminToken as writeStoredAdminToken,
    readStoredAdminToken,
    resolveAdminAuthStorage,
} from '../lib/adminAuth.ts';

interface AdminAuthContextValue {
    token: string | null;
    isAuthenticated: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

let cachedAdminToken: string | null | undefined;

function readStoredToken() {
    if (cachedAdminToken !== undefined) {
        return cachedAdminToken;
    }

    const storage = typeof window === 'undefined' ? null : resolveAdminAuthStorage(window);
    cachedAdminToken = readStoredAdminToken(storage);
    return cachedAdminToken;
}

function persistToken(token: string | null) {
    const storage = typeof window === 'undefined' ? null : resolveAdminAuthStorage(window);
    cachedAdminToken = writeStoredAdminToken(storage, token);
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => readStoredToken());

    const login = (nextToken: string) => {
        persistToken(nextToken);
        setToken(cachedAdminToken ?? null);
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
