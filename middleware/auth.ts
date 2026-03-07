import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { AuthTokenPayload } from '../models/types.js';
import { env } from '../server/config/env.js';
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

    if (!authHeader?.startsWith('Bearer ')) {
        next(new HttpError(401, 'Missing bearer token.'));
        return;
    }

    try {
        const token = authHeader.slice('Bearer '.length);
        const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload & Partial<AuthTokenPayload>;

        if (payload.role !== 'admin' || typeof payload.sub !== 'string') {
            throw new HttpError(403, 'Admin access is required.');
        }

        req.admin = {
            sub: payload.sub,
            email: typeof payload.email === 'string' ? payload.email : undefined,
            role: 'admin',
        };

        next();
    } catch (error) {
        next(error instanceof HttpError ? error : new HttpError(401, 'Invalid or expired token.'));
    }
}
