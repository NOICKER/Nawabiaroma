import type { NextFunction, Request, Response } from 'express';
import { getRequestLogContext, logger, serializeError } from '../services/logger.js';

export class HttpError extends Error {
    public readonly statusCode: number;
    public readonly details?: unknown;

    constructor(statusCode: number, message: string, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
    const requestContext = getRequestLogContext(req);

    if (error instanceof HttpError) {
        const logEntry = {
            event_type: 'http_error',
            outcome: 'failure' as const,
            ...requestContext,
            status_code: error.statusCode,
            details: error.details ?? undefined,
            ...serializeError(error),
        };

        if (error.statusCode >= 500) {
            logger.error(logEntry);
        } else {
            logger.warn(logEntry);
        }

        return res.status(error.statusCode).json({
            error: error.message,
            details: error.details ?? null,
        });
    }

    logger.error({
        event_type: 'unhandled_exception',
        outcome: 'failure',
        ...requestContext,
        ...serializeError(error),
    });

    return res.status(500).json({
        error: 'Internal server error',
    });
}
