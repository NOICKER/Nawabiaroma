/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CustomerProfile } from './types';

const CUSTOMER_TOKEN_STORAGE_KEY = 'nawabi_customer_token';
const CUSTOMER_PROFILE_STORAGE_KEY = 'nawabi_customer_profile';

interface CustomerAuthContextValue {
    token: string | null;
    customer: CustomerProfile | null;
    isLoggedIn: boolean;
    login: (input: { token: string; customer: CustomerProfile }) => void;
    logout: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | undefined>(undefined);

let cachedCustomerToken: string | null | undefined;
let cachedCustomerProfile: CustomerProfile | null | undefined;

function normalizeToken(token: string | null) {
    return typeof token === 'string' && token.trim().length > 0 ? token : null;
}

function readStoredToken() {
    if (cachedCustomerToken !== undefined) {
        return cachedCustomerToken;
    }

    if (typeof window === 'undefined') {
        cachedCustomerToken = null;
        return cachedCustomerToken;
    }

    try {
        cachedCustomerToken = normalizeToken(window.localStorage.getItem(CUSTOMER_TOKEN_STORAGE_KEY));
        return cachedCustomerToken;
    } catch {
        cachedCustomerToken = null;
        return cachedCustomerToken;
    }
}

function readStoredProfile() {
    if (cachedCustomerProfile !== undefined) {
        return cachedCustomerProfile;
    }

    if (typeof window === 'undefined') {
        cachedCustomerProfile = null;
        return cachedCustomerProfile;
    }

    try {
        const rawProfile = window.localStorage.getItem(CUSTOMER_PROFILE_STORAGE_KEY);
        cachedCustomerProfile = rawProfile ? (JSON.parse(rawProfile) as CustomerProfile) : null;
        return cachedCustomerProfile;
    } catch {
        cachedCustomerProfile = null;
        return cachedCustomerProfile;
    }
}

function persistAuthState(token: string | null, customer: CustomerProfile | null) {
    cachedCustomerToken = token;
    cachedCustomerProfile = customer;

    if (typeof window === 'undefined') {
        return;
    }

    try {
        if (token && customer) {
            window.localStorage.setItem(CUSTOMER_TOKEN_STORAGE_KEY, token);
            window.localStorage.setItem(CUSTOMER_PROFILE_STORAGE_KEY, JSON.stringify(customer));
            return;
        }

        window.localStorage.removeItem(CUSTOMER_TOKEN_STORAGE_KEY);
        window.localStorage.removeItem(CUSTOMER_PROFILE_STORAGE_KEY);
    } catch {
        return;
    }
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(() => readStoredToken());
    const [customer, setCustomer] = useState<CustomerProfile | null>(() => readStoredProfile());

    const login = (input: { token: string; customer: CustomerProfile }) => {
        const nextToken = normalizeToken(input.token);
        const nextCustomer = nextToken ? input.customer : null;
        persistAuthState(nextToken, nextCustomer);
        setToken(nextToken);
        setCustomer(nextCustomer);
    };

    const logout = () => {
        persistAuthState(null, null);
        setToken(null);
        setCustomer(null);
    };

    return (
        <CustomerAuthContext.Provider
            value={{
                token,
                customer,
                isLoggedIn: token !== null,
                login,
                logout,
            }}
        >
            {children}
        </CustomerAuthContext.Provider>
    );
}

export function useCustomerAuth() {
    const context = useContext(CustomerAuthContext);

    if (!context) {
        throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
    }

    return context;
}
