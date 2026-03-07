import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { AuthTokenPayload } from '../models/types.js';
import { env } from '../server/config/env.js';
import { getRequestLogContext, logger } from '../services/logger.js';
import { HttpError } from './errorHandler.js';

declare global {
    namespace Express {
        interface Request {
            admin?: AuthTokenPayload;
        }
    }
}

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    const requestContext = getRequestLogContext(req);

    if (!authHeader?.startsWith('Bearer ')) {
        logger.warn({
            event_type: 'admin_auth',
            outcome: 'failure',
            ...requestContext,
            reason: 'missing_bearer_token',
        });
        next(new HttpError(401, 'Missing bearer token.'));
        return;
    }

    try {
        const token = authHeader.slice('Bearer '.length);
        const payload = jwt.verify(token, env.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: env.JWT_ISSUER,
            audience: env.JWT_AUDIENCE,
        }) as JwtPayload & Partial<AuthTokenPayload>;

        if (typeof payload.exp !== 'number') {
            throw new HttpError(401, 'Invalid or expired token.');
        }

        if (payload.role !== 'admin' || typeof payload.sub !== 'string') {
            throw new HttpError(403, 'Admin access is required.');
        }

        req.admin = {
            sub: payload.sub,
            email: typeof payload.email === 'string' ? payload.email : undefined,
            role: 'admin',
        };

        logger.info({
            event_type: 'admin_auth',
            outcome: 'success',
            ...requestContext,
            user_id: req.admin.sub,
        });
        next();
    } catch (error) {
        logger.warn({
            event_type: 'admin_auth',
            outcome: 'failure',
            ...requestContext,
            reason: error instanceof Error ? error.message : 'Unknown auth error',
        });
        next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired token.'));
    }
}
