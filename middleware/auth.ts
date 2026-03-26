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
            customer?: AuthTokenPayload;
        }
    }
}

function getBearerToken(req: Request) {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        throw new HttpError(401, 'Missing bearer token.');
    }

    return authHeader.slice('Bearer '.length);
}

function verifyAuthToken(token: string) {
    const payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
    }) as JwtPayload & Partial<AuthTokenPayload>;

    if (typeof payload.exp !== 'number') {
        throw new HttpError(401, 'Invalid or expired token.');
    }

    if (typeof payload.sub !== 'string' || (payload.role !== 'admin' && payload.role !== 'customer')) {
        throw new HttpError(401, 'Invalid or expired token.');
    }

    return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        role: payload.role,
    } satisfies AuthTokenPayload;
}

function requireRole(role: AuthTokenPayload['role'], req: Request, next: NextFunction, requestKey: 'admin' | 'customer') {
    const requestContext = getRequestLogContext(req);

    try {
        const token = getBearerToken(req);
        const payload = verifyAuthToken(token);

        if (payload.role !== role) {
            throw new HttpError(403, `${role === 'admin' ? 'Admin' : 'Customer'} access is required.`);
        }

        req[requestKey] = payload;

        logger.info({
            event_type: `${role}_auth`,
            outcome: 'success',
            ...requestContext,
            user_id: payload.sub,
        });
        next();
    } catch (error) {
        logger.warn({
            event_type: `${role}_auth`,
            outcome: 'failure',
            ...requestContext,
            reason: error instanceof Error ? error.message : 'Unknown auth error',
        });
        next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired token.'));
    }
}

export function requireAdminAuth(req: Request, _res: Response, next: NextFunction) {
    requireRole('admin', req, next, 'admin');
}

export function requireCustomerAuth(req: Request, _res: Response, next: NextFunction) {
    requireRole('customer', req, next, 'customer');
}
