import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
    public readonly statusCode: number;
    public readonly details?: unknown;

    constructor(statusCode: number, message: string, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.details = details;
    }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (error instanceof HttpError) {
        return res.status(error.statusCode).json({
            error: error.message,
            details: error.details ?? null,
        });
    }

    console.error(error);

    return res.status(500).json({
        error: 'Internal server error',
    });
}
