import 'dotenv/config';
import { z } from 'zod';
import { logger } from '../../services/logger.js';

const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: z
        .string()
        .optional()
        .transform((value) => value === 'true'),
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
    CORS_ORIGIN: z.string().optional(),
    API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    CHECKOUT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    CHECKOUT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD_HASH: z.string().min(1),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_CURRENCY: z.string().default('inr'),
    JWT_SECRET: z.string().min(1),
    JWT_ISSUER: z.string().min(1).default('nawabi-aroma'),
    JWT_AUDIENCE: z.string().min(1).default('nawabi-admin'),
    RESEND_API_KEY: z.string().optional(),
    ORDER_EMAIL_FROM: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_NAME: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_PUBLIC_BASE_URL: z.string().optional(),
    S3_UPLOAD_PREFIX: z.string().default('products'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    logger.error({
        event_type: 'env_validation',
        outcome: 'failure',
        field_errors: parsed.error.flatten().fieldErrors,
    });
    throw new Error('Backend environment validation failed.');
}

export const env = {
    ...parsed.data,
    DATABASE_SSL_REJECT_UNAUTHORIZED:
        parsed.data.DATABASE_SSL_REJECT_UNAUTHORIZED ?? parsed.data.NODE_ENV === 'production',
};
