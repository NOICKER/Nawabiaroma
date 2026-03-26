import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { checkoutRequestSchema } from '../middleware/validateCheckout.js';
import { createCheckoutSession } from '../services/checkoutService.js';

export const createCheckout = asyncHandler(async (req: Request, res: Response) => {
    const parsed = checkoutRequestSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid checkout payload.', parsed.error.flatten());
    }

    const payload = parsed.data;
    const customerId = Number(req.customer?.sub);

    if (!Number.isInteger(customerId) || customerId <= 0) {
        throw new HttpError(401, 'Invalid customer session.');
    }

    const session = await createCheckoutSession(payload, customerId);

    res.status(201).json({
        data: session,
    });
});
