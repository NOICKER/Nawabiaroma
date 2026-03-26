import jwt from 'jsonwebtoken';
import { HttpError } from '../middleware/errorHandler.js';
import type { CustomerAuthResponse, CustomerProfile, AuthTokenPayload } from '../models/types.js';
import { query } from '../server/config/database.js';
import { env } from '../server/config/env.js';
import { hashPassword, verifyPassword } from './passwordService.js';

interface CustomerRow {
    id: number | string;
    name: string | null;
    email: string;
    password_hash: string | null;
    created_at: Date | string;
}

interface CustomerAuthInput {
    name?: string;
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

export async function registerCustomer(input: CustomerAuthInput): Promise<CustomerAuthResponse> {
    const normalizedEmail = input.email.trim().toLowerCase();
    const normalizedName = input.name?.trim() || null;
    const existingCustomer = await getCustomerByEmail(normalizedEmail);

    if (existingCustomer?.password_hash) {
        throw new HttpError(409, 'An account already exists for this email address.');
    }

    const passwordHash = await hashPassword(input.password);

    const result = existingCustomer
        ? await query<CustomerRow>(
              `
                  UPDATE customers
                  SET
                      name = COALESCE($2, name),
                      password_hash = $3
                  WHERE id = $1
                  RETURNING
                      id,
                      name,
                      email,
                      password_hash,
                      created_at
              `,
              [Number(existingCustomer.id), normalizedName, passwordHash],
          )
        : await query<CustomerRow>(
              `
                  INSERT INTO customers (
                      name,
                      email,
                      password_hash
                  )
                  VALUES ($1, $2, $3)
                  RETURNING
                      id,
                      name,
                      email,
                      password_hash,
                      created_at
              `,
              [normalizedName, normalizedEmail, passwordHash],
          );

    const customer = mapCustomerProfile(result.rows[0]);

    return {
        token: signCustomerToken(customer),
        customer,
    };
}

export async function loginCustomer(input: CustomerAuthInput): Promise<CustomerAuthResponse> {
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
