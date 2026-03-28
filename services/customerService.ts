import jwt from 'jsonwebtoken';
import { HttpError } from '../middleware/errorHandler.js';
import type { CustomerAuthResponse, CustomerProfile, AuthTokenPayload } from '../models/types.js';
import { query, withTransaction } from '../server/config/database.js';
import { env } from '../server/config/env.js';
import { createCustomerAddress } from './addressService.js';
import { hashPassword, verifyPassword } from './passwordService.js';

interface CustomerRow {
    id: number | string;
    name: string | null;
    email: string;
    phone: string | null;
    password_hash: string | null;
    created_at: Date | string;
}

interface CustomerRegisterInput {
    name: string;
    email: string;
    password: string;
    phone: string;
    addressLabel?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface CustomerLoginInput {
    email: string;
    password: string;
}

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapCustomerProfile(row: CustomerRow): CustomerProfile {
    return {
        id: Number(row.id),
        name: row.name,
        email: row.email,
        phone: row.phone,
        createdAt: toIsoString(row.created_at),
    };
}

function signCustomerToken(customer: CustomerProfile) {
    const payload: AuthTokenPayload = {
        sub: String(customer.id),
        email: customer.email,
        role: 'customer',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
        algorithm: 'HS256',
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expiresIn: '30d',
    });
}

async function getCustomerByEmail(email: string) {
    const result = await query<CustomerRow>(
        `
            SELECT
                id,
                name,
                email,
                phone,
                password_hash,
                created_at
            FROM customers
            WHERE email = $1
            LIMIT 1
        `,
        [email.toLowerCase()],
    );

    return result.rows[0] ?? null;
}

export async function registerCustomer(input: CustomerRegisterInput): Promise<CustomerAuthResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.name.trim();
    const normalizedPhone = input.phone.trim();
    const existingCustomer = await getCustomerByEmail(normalizedEmail);

    if (existingCustomer?.password_hash) {
        throw new HttpError(409, 'An account already exists for this email address.');
    }

    const passwordHash = await hashPassword(input.password);
    const customer = await withTransaction(async (client) => {
        const result = existingCustomer
            ? await client.query<CustomerRow>(
                  `
                      UPDATE customers
                      SET
                          name = COALESCE($2, name),
                          phone = $3,
                          password_hash = $4
                      WHERE id = $1
                      RETURNING
                          id,
                          name,
                          email,
                          phone,
                          password_hash,
                          created_at
                  `,
                  [Number(existingCustomer.id), normalizedName, normalizedPhone, passwordHash],
              )
            : await client.query<CustomerRow>(
                  `
                      INSERT INTO customers (
                          name,
                          email,
                          phone,
                          password_hash
                      )
                      VALUES ($1, $2, $3, $4)
                      RETURNING
                          id,
                          name,
                          email,
                          phone,
                          password_hash,
                          created_at
                  `,
                  [normalizedName, normalizedEmail, normalizedPhone, passwordHash],
              );

        const customerProfile = mapCustomerProfile(result.rows[0]);

        await createCustomerAddress(
            {
                customerId: customerProfile.id,
                label: input.addressLabel,
                name: normalizedName,
                phone: normalizedPhone,
                addressLine1: input.addressLine1,
                addressLine2: input.addressLine2,
                city: input.city,
                state: input.state,
                postalCode: input.postalCode,
                country: input.country,
                setAsDefault: true,
            },
            client,
        );

        return customerProfile;
    });

    return {
        token: signCustomerToken(customer),
        customer,
    };
}

export async function loginCustomer(input: CustomerLoginInput): Promise<CustomerAuthResponse> {
    const customer = await getCustomerByEmail(input.email.trim().toLowerCase());

    if (!customer?.password_hash) {
        throw new HttpError(401, 'Invalid credentials.');
    }

    const isValidPassword = await verifyPassword(input.password, customer.password_hash);

    if (!isValidPassword) {
        throw new HttpError(401, 'Invalid credentials.');
    }

    const customerProfile = mapCustomerProfile(customer);

    return {
        token: signCustomerToken(customerProfile),
        customer: customerProfile,
    };
}

export async function getCustomerProfile(customerId: number): Promise<CustomerProfile> {
    const result = await query<CustomerRow>(
        `
            SELECT
                id,
                name,
                email,
                phone,
                password_hash,
                created_at
            FROM customers
            WHERE id = $1
            LIMIT 1
        `,
        [customerId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Customer not found.');
    }

    return mapCustomerProfile(result.rows[0]);
}
