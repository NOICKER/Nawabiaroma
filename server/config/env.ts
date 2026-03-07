import 'dotenv/config';
import { z } from 'zod';

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
        .transform((value) => value !== 'false'),
    DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
    DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(30000),
    DATABASE_CONNECTION_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(5000),
    CORS_ORIGIN: z.string().optional(),
    API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    CHECKOUT_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    CHECKOUT_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    ADMIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
    ADMIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
    STRIPE_SECRET_KEY: z.string().min(1),
    STRIPE_WEBHOOK_SECRET: z.string().min(1),
    STRIPE_CURRENCY: z.string().default('inr'),
    JWT_SECRET: z.string().min(1),
    RESEND_API_KEY: z.string().optional(),
    ORDER_EMAIL_FROM: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_NAME: z.string().optional(),
    S3_PUBLIC_BASE_URL: z.string().optional(),
    S3_UPLOAD_PREFIX: z.string().default('products'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid backend environment configuration.');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Backend environment validation failed.');
}

export const env = parsed.data;
