import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getRequestLogContext, logger, serializeError } from '../services/logger.js';
import { fulfillSuccessfulPaymentIntent } from '../services/orderService.js';
import { refundPaymentIntent, verifyStripeWebhook } from '../services/paymentService.js';

export const handlePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];
    const requestContext = getRequestLogContext(req);

    if (!Buffer.isBuffer(req.body)) {
        throw new HttpError(400, 'Stripe webhook body must be provided as a raw buffer.');
    }

    let event: Stripe.Event;

    try {
        event = verifyStripeWebhook(req.body, typeof signature === 'string' ? signature : undefined);
    } catch (error) {
        logger.warn({
            event_type: 'stripe_webhook_signature_verification',
            outcome: 'failure',
            ...requestContext,
            ...serializeError(error),
        });
        throw error;
    }

    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderReference = paymentIntent.metadata.order_reference || paymentIntent.id;

        try {
            const fulfillment = await fulfillSuccessfulPaymentIntent(paymentIntent);

            logger.info({
                event_type: 'stripe_payment_intent_succeeded',
                outcome: 'success',
                ...requestContext,
                order_reference: fulfillment.orderReference,
                payment_intent_id: paymentIntent.id,
                amount: fulfillment.totalAmount,
                already_processed: fulfillment.alreadyProcessed,
            });
        } catch (error) {
            if (error instanceof HttpError && error.statusCode === 409) {
                await refundPaymentIntent(paymentIntent.id);
                logger.warn({
                    event_type: 'stripe_payment_intent_refunded',
                    outcome: 'failure',
                    ...requestContext,
                    order_reference: orderReference,
                    payment_intent_id: paymentIntent.id,
                    reason: error.message,
                });
                res.status(200).json({ received: true, refunded: true });
                return;
            }

            throw error;
        }
    }

    res.status(200).json({ received: true });
});
