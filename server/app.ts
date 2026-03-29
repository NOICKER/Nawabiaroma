import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { addressesRouter } from '../routes/addresses.js';
import { accountRouter } from '../routes/account.js';
import { cartRouter } from '../routes/cart.js';
import { checkoutRouter } from '../routes/checkout.js';
import { contentRouter } from '../routes/content.js';
import { adminRouter } from '../routes/admin.js';
import { authRouter } from '../routes/auth.js';
import { ordersRouter } from '../routes/orders.js';
import { productsRouter } from '../routes/products.js';
import { webhooksRouter } from '../routes/webhooks.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { notFoundHandler } from '../middleware/notFound.js';
import { apiRateLimit, checkoutRateLimit, adminRateLimit } from '../middleware/rateLimit.js';
import { pool } from './config/database.js';
import { createCorsOriginConfig, parseCorsOrigins } from './config/cors.js';
import { env } from './config/env.js';

export function createApp() {
    const app = express();
    const configuredCorsOrigins = parseCorsOrigins(env.CORS_ORIGIN);

    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    app.use(helmet());

    if (env.NODE_ENV === 'production' && configuredCorsOrigins.length === 0) {
        throw new Error('CORS_ORIGIN must be configured explicitly in production.');
    }

    app.use(
        cors({
            origin: createCorsOriginConfig(configuredCorsOrigins),
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
    app.use('/api/auth', authRouter);

    app.use('/api/', apiRateLimit);

    app.use('/api/account', accountRouter);
    app.use('/api/addresses', addressesRouter);
    app.use('/api/cart', cartRouter);
    app.use('/api/orders', ordersRouter);
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
