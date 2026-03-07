import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { fulfillSuccessfulPaymentIntent } from '../services/orderService.js';
import { refundPaymentIntent, verifyStripeWebhook } from '../services/paymentService.js';

export const handlePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];

    if (!Buffer.isBuffer(req.body)) {
        throw new HttpError(400, 'Stripe webhook body must be provided as a raw buffer.');
    }

    const event = verifyStripeWebhook(req.body, typeof signature === 'string' ? signature : undefined);

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        try {
            await fulfillSuccessfulPaymentIntent(paymentIntent);
        } catch (error) {
            if (error instanceof HttpError && error.statusCode === 409) {
                await refundPaymentIntent(paymentIntent.id);
                res.status(200).json({ received: true, refunded: true });
                return;
            }

            throw error;
        }
    }

    res.status(200).json({ received: true });
});
