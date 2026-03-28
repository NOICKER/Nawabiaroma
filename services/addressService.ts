import { HttpError } from '../middleware/errorHandler.js';
import type { SavedAddress } from '../models/types.js';
import { query, type Queryable, withTransaction } from '../server/config/database.js';

interface AddressRow {
    id: number | string;
    customer_id: number | string | null;
    session_id: string | null;
    label: string | null;
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

export interface CustomerAddressInput {
    customerId: number;
    label?: string;
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    setAsDefault?: boolean;
    sessionId?: string | null;
}

interface UpdateCustomerAddressInput {
    addressId: number;
    customerId: number;
    label?: string;
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    setAsDefault?: boolean;
}

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeLabel(value: string | undefined | null) {
    const nextValue = value?.trim();
    return nextValue ? nextValue : null;
}

function normalizeOptionalText(value: string | undefined | null) {
    const nextValue = value?.trim();
    return nextValue ? nextValue : null;
}

function mapAddress(row: AddressRow): SavedAddress {
    return {
        id: Number(row.id),
        customerId: row.customer_id === null ? null : Number(row.customer_id),
        sessionId: row.session_id,
        label: row.label,
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

async function countCustomerAddresses(customerId: number, executor: Queryable) {
    const result = await executor.query<{ count: string }>(
        `
            SELECT COUNT(*)::text AS count
            FROM addresses
            WHERE customer_id = $1
        `,
        [customerId],
    );

    return Number(result.rows[0]?.count ?? 0);
}

async function clearDefaultAddress(customerId: number, executor: Queryable) {
    await executor.query(
        `
            UPDATE addresses
            SET is_default = FALSE
            WHERE customer_id = $1
              AND is_default = TRUE
        `,
        [customerId],
    );
}

async function hydrateFallbackDefaultAddress(customerId: number, executor: Queryable) {
    await executor.query(
        `
            UPDATE addresses
            SET is_default = TRUE
            WHERE id = (
                SELECT id
                FROM addresses
                WHERE customer_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT 1
            )
        `,
        [customerId],
    );
}

async function getCustomerAddressRow(addressId: number, customerId: number, executor: Queryable, lockForUpdate = false) {
    const result = await executor.query<AddressRow>(
        `
            SELECT
                id,
                customer_id,
                session_id,
                label,
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
            WHERE id = $1
              AND customer_id = $2
            LIMIT 1
            ${lockForUpdate ? 'FOR UPDATE' : ''}
        `,
        [addressId, customerId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Address not found.');
    }

    return result.rows[0];
}

export async function createAddress(input: CreateAddressInput): Promise<SavedAddress> {
    const result = await query<AddressRow>(
        `
            INSERT INTO addresses (
                customer_id,
                session_id,
                label,
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE)
            RETURNING
                id,
                customer_id,
                session_id,
                label,
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
            null,
            input.name,
            input.addressLine1,
            normalizeOptionalText(input.addressLine2),
            input.city,
            input.state,
            input.postalCode,
            input.country,
            normalizeOptionalText(input.phone),
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
                label,
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

async function createCustomerAddressWithExecutor(input: CustomerAddressInput, executor: Queryable): Promise<SavedAddress> {
    const addressCount = await countCustomerAddresses(input.customerId, executor);
    const shouldSetDefault = input.setAsDefault === true || addressCount === 0;

    if (shouldSetDefault) {
        await clearDefaultAddress(input.customerId, executor);
    }

    const result = await executor.query<AddressRow>(
        `
            INSERT INTO addresses (
                customer_id,
                session_id,
                label,
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
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING
                id,
                customer_id,
                session_id,
                label,
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
            input.customerId,
            input.sessionId ?? null,
            normalizeLabel(input.label),
            input.name.trim(),
            input.addressLine1.trim(),
            normalizeOptionalText(input.addressLine2),
            input.city.trim(),
            input.state.trim(),
            input.postalCode.trim(),
            input.country.trim(),
            normalizeOptionalText(input.phone),
            shouldSetDefault,
        ],
    );

    return mapAddress(result.rows[0]);
}

export async function createCustomerAddress(input: CustomerAddressInput, executor?: Queryable): Promise<SavedAddress> {
    if (executor) {
        return createCustomerAddressWithExecutor(input, executor);
    }

    return withTransaction((client) => createCustomerAddressWithExecutor(input, client));
}

export async function listAddressesByCustomerId(customerId: number): Promise<SavedAddress[]> {
    const result = await query<AddressRow>(
        `
            SELECT
                id,
                customer_id,
                session_id,
                label,
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
            WHERE customer_id = $1
            ORDER BY is_default DESC, created_at DESC, id DESC
        `,
        [customerId],
    );

    return result.rows.map(mapAddress);
}

export async function updateCustomerAddress(input: UpdateCustomerAddressInput): Promise<SavedAddress> {
    return withTransaction(async (client) => {
        await getCustomerAddressRow(input.addressId, input.customerId, client, true);

        if (input.setAsDefault) {
            await clearDefaultAddress(input.customerId, client);
        }

        const result = await client.query<AddressRow>(
            `
                UPDATE addresses
                SET
                    label = $3,
                    full_name = $4,
                    line1 = $5,
                    line2 = $6,
                    city = $7,
                    state = $8,
                    postal_code = $9,
                    country = $10,
                    phone = $11,
                    is_default = CASE WHEN $12::boolean THEN TRUE ELSE is_default END
                WHERE id = $1
                  AND customer_id = $2
                RETURNING
                    id,
                    customer_id,
                    session_id,
                    label,
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
                input.addressId,
                input.customerId,
                normalizeLabel(input.label),
                input.name.trim(),
                input.addressLine1.trim(),
                normalizeOptionalText(input.addressLine2),
                input.city.trim(),
                input.state.trim(),
                input.postalCode.trim(),
                input.country.trim(),
                normalizeOptionalText(input.phone),
                input.setAsDefault === true,
            ],
        );

        return mapAddress(result.rows[0]);
    });
}

export async function deleteCustomerAddress(addressId: number, customerId: number) {
    return withTransaction(async (client) => {
        const existingAddress = await getCustomerAddressRow(addressId, customerId, client, true);

        await client.query(
            `
                DELETE FROM addresses
                WHERE id = $1
                  AND customer_id = $2
            `,
            [addressId, customerId],
        );

        if (existingAddress.is_default) {
            await hydrateFallbackDefaultAddress(customerId, client);
        }
    });
}

export async function setDefaultAddress(addressId: number, customerId: number): Promise<SavedAddress> {
    return withTransaction(async (client) => {
        await getCustomerAddressRow(addressId, customerId, client, true);
        await clearDefaultAddress(customerId, client);

        const result = await client.query<AddressRow>(
            `
                UPDATE addresses
                SET is_default = TRUE
                WHERE id = $1
                  AND customer_id = $2
                RETURNING
                    id,
                    customer_id,
                    session_id,
                    label,
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
            [addressId, customerId],
        );

        return mapAddress(result.rows[0]);
    });
}
