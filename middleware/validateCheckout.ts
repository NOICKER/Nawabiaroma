import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from './errorHandler.js';

export const checkoutRequestSchema = z.object({
    sessionId: z.string().trim().min(1),
    addressId: z.coerce.number().int().positive(),
    promoCode: z.string().trim().min(1).optional(),
});

export function validateCheckoutRequest(req: Request, _res: Response, next: NextFunction) {
    const parsed = checkoutRequestSchema.safeParse(req.body);

    if (!parsed.success) {
        next(new HttpError(400, 'Invalid checkout payload.', parsed.error.flatten()));
        return;
    }

    req.body = parsed.data;
    next();
}
