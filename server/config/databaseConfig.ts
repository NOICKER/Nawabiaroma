import type { PoolConfig, QueryResult, QueryResultRow } from 'pg';
import { z } from 'zod';

export const REQUIRED_PUBLIC_TABLES = [
    'products',
    'product_variants',
    'carts',
    'orders',
    'order_items',
    'customers',
    'addresses',
    'payments',
    'promo_codes',
    'webhook_events',
    'schema_migrations',
] as const;

const databaseEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_MODE: z.enum(['LOCAL_DEV', 'PRODUCTION']).optional(),
    DATABASE_URL: z.string().trim().min(1).optional(),
    DATABASE_URL_POOLER: z.string().trim().min(1).optional(),
    DATABASE_URL_DIRECT: z.string().trim().min(1).optional(),
    DATABASE_SSL: z
        .string()
        .optional()
        .transform((value) => {
            if (value === undefined) {
                return undefined;
            }

            return value === 'true';
        }),
    DATABASE_SSL_REJECT_UNAUTHORIZED: z
        .string()
        .optional()
        .transform((value) => {
            if (value === undefined) {
                return undefined;
            }

            return value !== 'false';
        }),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30000),
    DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(5000),
});

type ParsedDatabaseEnv = z.infer<typeof databaseEnvSchema>;

export type DatabaseMode = 'LOCAL_DEV' | 'PRODUCTION';
export type DatabaseConnectionSource = 'DATABASE_URL' | 'DATABASE_URL_POOLER' | 'DATABASE_URL_DIRECT';

export interface SqlExecutor {
    query: <TRow extends QueryResultRow = QueryResultRow>(
        text: string,
        params?: unknown[],
    ) => Promise<QueryResult<TRow>>;
}

export interface DatabaseIdentity {
    currentDatabase: string;
    currentSchema: string;
}

export interface ResolvedDatabaseConfig {
    nodeEnv: ParsedDatabaseEnv['NODE_ENV'];
    databaseMode: DatabaseMode;
    connectionSource: DatabaseConnectionSource;
    connectionString: string;
    host: string;
    port: number;
    databaseName: string;
    usesSupabase: boolean;
    usesPooler: boolean;
    usesTransactionPooler: boolean;
    sslEnabled: boolean;
    sslRejectUnauthorized: boolean;
    poolConfig: PoolConfig;
}

function formatFieldErrors(error: z.ZodError) {
    const flattened = error.flatten().fieldErrors;
    return Object.entries(flattened)
        .map(([field, messages]) => {
            if (Array.isArray(messages) && messages.length > 0) {
                return `${field}: ${messages.join(', ')}`;
            }

            return `${field}: invalid value`;
        })
        .join('; ');
}

function resolveDatabaseMode(env: ParsedDatabaseEnv): DatabaseMode {
    if (env.DATABASE_MODE) {
        return env.DATABASE_MODE;
    }

    return env.NODE_ENV === 'production' ? 'PRODUCTION' : 'LOCAL_DEV';
}

function resolveConnectionCandidate(env: ParsedDatabaseEnv, databaseMode: DatabaseMode) {
    const candidates: Array<[DatabaseConnectionSource, string | undefined]> =
        databaseMode === 'LOCAL_DEV'
            ? [
                  ['DATABASE_URL_POOLER', env.DATABASE_URL_POOLER],
                  ['DATABASE_URL', env.DATABASE_URL],
              ]
            : [
                  ['DATABASE_URL_DIRECT', env.DATABASE_URL_DIRECT],
                  ['DATABASE_URL', env.DATABASE_URL],
              ];

    const selected = candidates.find(([, value]) => Boolean(value));

    if (!selected) {
        if (databaseMode === 'LOCAL_DEV') {
            throw new Error(
                'No database URL configured for LOCAL_DEV. Set DATABASE_URL_POOLER or DATABASE_URL to a Supabase pooler connection string.',
            );
        }

        throw new Error(
            'No database URL configured for PRODUCTION. Set DATABASE_URL_DIRECT or DATABASE_URL to a Supabase direct connection string.',
        );
    }

    return {
        connectionSource: selected[0],
        connectionString: selected[1]!.trim(),
    };
}

function hasEncodedNewlineInCredentials(connectionString: string) {
    const protocolSeparatorIndex = connectionString.indexOf('://');

    if (protocolSeparatorIndex === -1) {
        return false;
    }

    const remainder = connectionString.slice(protocolSeparatorIndex + 3);
    const atIndex = remainder.lastIndexOf('@');

    if (atIndex === -1) {
        return false;
    }

    const credentials = remainder.slice(0, atIndex);
    return /%0a|%0d/i.test(credentials);
}

function isSupabaseHost(host: string) {
    return host.includes('supabase.com') || host.includes('supabase.co');
}

function buildConnectionHint(errorMessage: string, config: ResolvedDatabaseConfig) {
    if (/ENOTFOUND/i.test(errorMessage)) {
        return `Check the hostname and make sure ${config.databaseMode} is using the correct Supabase ${config.databaseMode === 'LOCAL_DEV' ? 'pooler' : 'direct'} URL.`;
    }

    if (/tenant or user not found|password authentication failed/i.test(errorMessage)) {
        return 'Re-copy the Supabase connection string, remove any trailing whitespace/newlines from the password, and keep special characters URL-encoded.';
    }

    return undefined;
}

export function resolveDatabaseConfig(source: NodeJS.ProcessEnv = process.env): ResolvedDatabaseConfig {
    const parsed = databaseEnvSchema.safeParse(source);

    if (!parsed.success) {
        throw new Error(`Database environment validation failed: ${formatFieldErrors(parsed.error)}`);
    }

    const env = parsed.data;
    const databaseMode = resolveDatabaseMode(env);
    const { connectionSource, connectionString } = resolveConnectionCandidate(env, databaseMode);

    if (hasEncodedNewlineInCredentials(connectionString)) {
        throw new Error(
            `${connectionSource} contains an encoded newline in the credential section. Re-copy the Supabase password and URL-encode only reserved characters such as @ -> %40.`,
        );
    }

    let databaseUrl: URL;

    try {
        databaseUrl = new URL(connectionString);
    } catch {
        throw new Error(`${connectionSource} is not a valid Postgres connection string.`);
    }

    if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
        throw new Error(`${connectionSource} must start with postgres:// or postgresql://.`);
    }

    if (!databaseUrl.hostname) {
        throw new Error(`${connectionSource} is missing a hostname.`);
    }

    const usesSupabase = isSupabaseHost(databaseUrl.hostname);
    const usesPooler = databaseUrl.hostname.includes('pooler.supabase.com');
    const port = Number(databaseUrl.port || '5432');
    const usesTransactionPooler = usesPooler && port === 6543;

    if (databaseMode === 'LOCAL_DEV' && usesTransactionPooler) {
        throw new Error(
            `${connectionSource} is using the Supabase transaction pooler on port 6543. LOCAL_DEV must use the Supabase session pooler on port 5432 so advisory locks and multi-step migrations stay on the same session.`,
        );
    }

    const sslEnabled = env.DATABASE_SSL ?? usesSupabase;
    const sslRejectUnauthorized = usesSupabase
        ? false
        : env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? env.NODE_ENV === 'production';

    return {
        nodeEnv: env.NODE_ENV,
        databaseMode,
        connectionSource,
        connectionString,
        host: databaseUrl.hostname,
        port,
        databaseName: databaseUrl.pathname.replace(/^\//, '') || 'postgres',
        usesSupabase,
        usesPooler,
        usesTransactionPooler,
        sslEnabled,
        sslRejectUnauthorized,
        poolConfig: {
            connectionString,
            ssl: sslEnabled
                ? {
                      rejectUnauthorized: sslRejectUnauthorized,
                  }
                : undefined,
            max: env.DATABASE_POOL_MAX,
            idleTimeoutMillis: env.DATABASE_IDLE_TIMEOUT_MS,
            connectionTimeoutMillis: env.DATABASE_CONNECTION_TIMEOUT_MS,
        },
    };
}

export function formatDatabaseConnectionError(error: unknown, config: ResolvedDatabaseConfig) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = buildConnectionHint(message, config);
    const target = `${config.host}:${config.port}/${config.databaseName}`;
    const details = `mode=${config.databaseMode}, source=${config.connectionSource}, ssl=${config.sslEnabled ? 'on' : 'off'}`;

    if (hint) {
        return `Database connection failed for ${target} (${details}). ${message} ${hint}`;
    }

    return `Database connection failed for ${target} (${details}). ${message}`;
}

export async function readDatabaseIdentity(executor: SqlExecutor): Promise<DatabaseIdentity> {
    const result = await executor.query<{ current_database: string; current_schema: string }>(
        `
            SELECT
                current_database() AS current_database,
                current_schema() AS current_schema
        `,
    );

    return {
        currentDatabase: result.rows[0]?.current_database ?? '',
        currentSchema: result.rows[0]?.current_schema ?? '',
    };
}

export async function listPublicTables(executor: SqlExecutor) {
    const result = await executor.query<{ table_name: string }>(
        `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `,
    );

    return result.rows.map((row) => row.table_name);
}
