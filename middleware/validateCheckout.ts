import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from './errorHandler.js';

export const checkoutRequestSchema = z.object({
    customerEmail: z.string().email(),
    items: z
        .array(
            z.object({
                variantId: z.coerce.number().int().positive(),
                quantity: z.coerce.number().int().positive(),
            }),
        )
        .min(1),
    shippingAddress: z.object({
        fullName: z.string().min(1),
        line1: z.string().min(1),
        line2: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        postalCode: z.string().min(1),
        country: z.string().min(1),
        phone: z.string().optional(),
    }),
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
