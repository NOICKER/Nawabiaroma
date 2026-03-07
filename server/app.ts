import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { checkoutRouter } from '../routes/checkout.js';
import { contentRouter } from '../routes/content.js';
import { adminRouter } from '../routes/admin.js';
import { productsRouter } from '../routes/products.js';
import { webhooksRouter } from '../routes/webhooks.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { notFoundHandler } from '../middleware/notFound.js';
import { apiRateLimit, checkoutRateLimit, adminRateLimit } from '../middleware/rateLimit.js';
import { pool } from './config/database.js';
import { env } from './config/env.js';

export function createApp() {
    const app = express();
    const configuredCorsOrigins = env.CORS_ORIGIN
        ? env.CORS_ORIGIN.split(',').map((value) => value.trim()).filter(Boolean)
        : [];

    app.disable('x-powered-by');

    app.use(helmet());

    if (env.NODE_ENV === 'production' && configuredCorsOrigins.length === 0) {
        throw new Error('CORS_ORIGIN must be configured explicitly in production.');
    }

    app.use(
        cors({
            origin: configuredCorsOrigins.length > 0 ? configuredCorsOrigins : true,
            credentials: true,
        }),
    );

    app.get('/health', async (_req, res) => {
        try {
            await pool.query('SELECT 1');
            res.status(200).json({ status: 'ok' });
        } catch {
            res.status(503).json({ status: 'error', details: 'Database connection failed' });
        }
    });

    app.use('/api/webhooks', webhooksRouter);
    app.use(express.json({ limit: '1mb' }));

    app.use('/api/', apiRateLimit);

    app.use('/api/products', productsRouter);
    app.use('/api', contentRouter);

    app.use('/api/checkout', checkoutRateLimit);
    app.use('/api/checkout', checkoutRouter);

    app.use('/api/admin', adminRateLimit);
    app.use('/api/admin', adminRouter);

    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
}
