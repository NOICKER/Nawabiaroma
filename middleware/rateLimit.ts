import rateLimit from 'express-rate-limit';
import { env } from '../server/config/env.js';

function createLimiter(windowMs: number, limit: number) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
    });
}

export const apiRateLimit = createLimiter(env.API_RATE_LIMIT_WINDOW_MS, env.API_RATE_LIMIT_MAX);
export const checkoutRateLimit = createLimiter(
    env.CHECKOUT_RATE_LIMIT_WINDOW_MS,
    env.CHECKOUT_RATE_LIMIT_MAX,
);
export const adminRateLimit = createLimiter(env.ADMIN_RATE_LIMIT_WINDOW_MS, env.ADMIN_RATE_LIMIT_MAX);
