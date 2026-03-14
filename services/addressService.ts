import type { SavedAddress } from '../models/types.js';
import { query } from '../server/config/database.js';

interface AddressRow {
    id: number | string;
    customer_id: number | string | null;
    session_id: string | null;
    full_name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string | null;
    is_default: boolean;
    created_at: Date | string;
}

export interface CreateAddressInput {
    sessionId: string;
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAddress(row: AddressRow): SavedAddress {
    return {
        id: Number(row.id),
        customerId: row.customer_id === null ? null : Number(row.customer_id),
        sessionId: row.session_id,
        name: row.full_name,
        phone: row.phone,
        addressLine1: row.line1,
        addressLine2: row.line2,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country,
        isDefault: row.is_default,
        createdAt: toIsoString(row.created_at),
    };
}

export async function createAddress(input: CreateAddressInput): Promise<SavedAddress> {
    const result = await query<AddressRow>(
        `
            INSERT INTO addresses (
                customer_id,
                session_id,
                full_name,
                line1,
                line2,
                city,
                state,
                postal_code,
                country,
                phone,
                is_default
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE)
            RETURNING
                id,
                customer_id,
                session_id,
                full_name,
                line1,
                line2,
                city,
                state,
                postal_code,
                country,
                phone,
                is_default,
                created_at
        `,
        [
            null,
            input.sessionId,
            input.name,
            input.addressLine1,
            input.addressLine2?.trim() ? input.addressLine2.trim() : null,
            input.city,
            input.state,
            input.postalCode,
            input.country,
            input.phone,
        ],
    );

    return mapAddress(result.rows[0]);
}

export async function listAddressesBySessionId(sessionId: string): Promise<SavedAddress[]> {
    const result = await query<AddressRow>(
        `
            SELECT
                id,
                customer_id,
                session_id,
                full_name,
                line1,
                line2,
                city,
                state,
                postal_code,
                country,
                phone,
                is_default,
                created_at
            FROM addresses
            WHERE session_id = $1
            ORDER BY is_default DESC, created_at DESC, id DESC
        `,
        [sessionId],
    );

    return result.rows.map(mapAddress);
}
