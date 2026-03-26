import 'dotenv/config';
import { z } from 'zod';
import { logger } from '../../services/logger.js';

const PRODUCTION_MIN_JWT_SECRET_LENGTH = 32;

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
    RAZORPAY_KEY_ID: z.string().optional(),
    RAZORPAY_KEY_SECRET: z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
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

const hasAnyRazorpayConfig =
    Boolean(parsed.data.RAZORPAY_KEY_ID) ||
    Boolean(parsed.data.RAZORPAY_KEY_SECRET) ||
    Boolean(parsed.data.RAZORPAY_WEBHOOK_SECRET);

if (
    hasAnyRazorpayConfig &&
    (!parsed.data.RAZORPAY_KEY_ID || !parsed.data.RAZORPAY_KEY_SECRET || !parsed.data.RAZORPAY_WEBHOOK_SECRET)
) {
    throw new Error('RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, and RAZORPAY_WEBHOOK_SECRET must be configured together.');
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET.length < PRODUCTION_MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be at least ${PRODUCTION_MIN_JWT_SECRET_LENGTH} characters in production.`);
}

if (parsed.data.RESEND_API_KEY && !parsed.data.ORDER_EMAIL_FROM) {
    throw new Error('ORDER_EMAIL_FROM must be configured when RESEND_API_KEY is set.');
}

export const env = {
    ...parsed.data,
    DATABASE_SSL_REJECT_UNAUTHORIZED:
        parsed.data.DATABASE_SSL_REJECT_UNAUTHORIZED ?? parsed.data.NODE_ENV === 'production',
};
