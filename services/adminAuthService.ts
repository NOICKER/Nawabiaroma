import jwt from 'jsonwebtoken';
import { HttpError } from '../middleware/errorHandler.js';
import type { AdminProfile, AuthTokenPayload } from '../models/types.js';
import { query, withTransaction } from '../server/config/database.js';
import { env } from '../server/config/env.js';
import { hashPassword, verifyPassword } from './passwordService.js';

const POSTGRES_UNIQUE_VIOLATION = '23505';

interface AdminRow {
    id: number | string;
    email: string;
    initials: string | null;
    password_hash: string;
    is_active: boolean;
    created_at: Date | string;
    last_login_at: Date | string | null;
}

export interface CreateAdminInput {
    email: string;
    initials?: string | null;
    password: string;
    requireEmpty?: boolean;
}

export interface AdminLoginInput {
    email: string;
    password: string;
}

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeEmail(email: string) {
    return email.trim().toLowerCase();
}

function normalizeInitials(initials?: string | null) {
    const trimmedInitials = initials?.trim();
    return trimmedInitials ? trimmedInitials : null;
}

function mapAdminProfile(row: AdminRow): AdminProfile {
    return {
        id: Number(row.id),
        email: row.email,
        initials: row.initials,
        isActive: row.is_active,
        createdAt: toIsoString(row.created_at),
        lastLoginAt: row.last_login_at === null ? null : toIsoString(row.last_login_at),
    };
}

function signAdminToken(admin: AdminProfile) {
    const payload: AuthTokenPayload = {
        sub: String(admin.id),
        email: admin.email,
        role: 'admin',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
        algorithm: 'HS256',
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expiresIn: '12h',
    });
}

export function signSecretAdminToken(): string {
    const payload: AuthTokenPayload = {
        sub: 'secret-admin',
        email: 'admin@nawabiaroma.com',
        role: 'admin',
    };

    return jwt.sign(payload, env.JWT_SECRET, {
        algorithm: 'HS256',
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expiresIn: '12h',
    });
}

function isAdminEmailConflict(error: unknown) {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const databaseError = error as { code?: string; constraint?: string };

    return databaseError.code === POSTGRES_UNIQUE_VIOLATION && databaseError.constraint === 'admins_email_key';
}

async function getAdminByEmail(email: string) {
    const result = await query<AdminRow>(
        `
            SELECT
                id,
                email,
                initials,
                password_hash,
                is_active,
                created_at,
                last_login_at
            FROM admins
            WHERE email = $1
            LIMIT 1
        `,
        [normalizeEmail(email)],
    );

    return result.rows[0] ?? null;
}

export async function countAdmins(): Promise<number> {
    const result = await query<{ count: string }>('SELECT COUNT(*)::text AS count FROM admins');
    return Number(result.rows[0]?.count ?? 0);
}

export async function createAdmin(input: CreateAdminInput): Promise<AdminProfile> {
    const normalizedEmail = normalizeEmail(input.email);
    const normalizedInitials = normalizeInitials(input.initials);
    const passwordHash = await hashPassword(input.password);

    try {
        return await withTransaction(async (client) => {
            if (input.requireEmpty) {
                await client.query('LOCK TABLE admins IN ACCESS EXCLUSIVE MODE');

                const adminCountResult = await client.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM admins');

                if (Number(adminCountResult.rows[0]?.count ?? 0) !== 0) {
                    throw new HttpError(409, 'Admin setup is unavailable.');
                }
            }

            const result = await client.query<AdminRow>(
                `
                    INSERT INTO admins (
                        email,
                        initials,
                        password_hash
                    )
                    VALUES ($1, $2, $3)
                    RETURNING
                        id,
                        email,
                        initials,
                        password_hash,
                        is_active,
                        created_at,
                        last_login_at
                `,
                [normalizedEmail, normalizedInitials, passwordHash],
            );

            return mapAdminProfile(result.rows[0]);
        });
    } catch (error) {
        if (isAdminEmailConflict(error)) {
            throw new HttpError(409, 'An admin already exists for this email address.');
        }

        throw error;
    }
}

export async function loginAdmin(input: AdminLoginInput): Promise<string> {
    const admin = await getAdminByEmail(input.email);

    if (!admin?.is_active) {
        throw new HttpError(401, 'Invalid credentials.');
    }

    const isValidPassword = await verifyPassword(input.password, admin.password_hash);

    if (!isValidPassword) {
        throw new HttpError(401, 'Invalid credentials.');
    }

    await query(
        `
            UPDATE admins
            SET last_login_at = NOW()
            WHERE id = $1
        `,
        [Number(admin.id)],
    );

    return signAdminToken(mapAdminProfile({ ...admin, last_login_at: new Date().toISOString() }));
}

export async function listAdmins(): Promise<AdminProfile[]> {
    const result = await query<AdminRow>(
        `
            SELECT
                id,
                email,
                initials,
                password_hash,
                is_active,
                created_at,
                last_login_at
            FROM admins
            WHERE is_active = TRUE
            ORDER BY created_at ASC, id ASC
        `,
    );

    return result.rows.map(mapAdminProfile);
}

export async function purgeAdmins(): Promise<number> {
    const result = await query<{ count: string }>('DELETE FROM admins RETURNING id');
    return result.rowCount ?? 0;
}
