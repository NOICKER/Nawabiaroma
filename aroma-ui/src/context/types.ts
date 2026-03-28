export interface CustomerProfile {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    createdAt: string;
}

export interface SavedAddress {
    id: number;
    customerId: number | null;
    sessionId: string | null;
    label: string | null;
    name: string;
    phone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
}
