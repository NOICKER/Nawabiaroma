import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './errorHandler.js';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
    next(new HttpError(404, `Route ${req.originalUrl} was not found.`));
}
