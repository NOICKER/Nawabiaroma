import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getRequestLogContext, logger, serializeError } from '../services/logger.js';
import { createOrderFromCapturedWebhook } from '../services/orderService.js';
import { verifyRazorpayWebhook } from '../services/paymentService.js';
import { beginWebhookProcessing, completeWebhookProcessing, failWebhookProcessing } from '../services/webhookService.js';

interface RazorpayWebhookPaymentEntity {
    id: string;
    order_id: string;
    error_description?: string | null;
}

interface RazorpayWebhookEvent {
    event: string;
    created_at: number;
    payload?: {
        payment?: {
            entity: RazorpayWebhookPaymentEntity;
        };
    };
}

function getProviderEventId(event: RazorpayWebhookEvent) {
    const paymentId = event.payload?.payment?.entity?.id ?? 'unknown';
    return `${event.event}:${paymentId}:${event.created_at}`;
}

export const handlePaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'];
    const requestContext = getRequestLogContext(req);

    if (!Buffer.isBuffer(req.body)) {
        throw new HttpError(400, 'Webhook body must be provided as a raw buffer.');
    }

    verifyRazorpayWebhook(req.body, typeof signature === 'string' ? signature : undefined);

    let event: RazorpayWebhookEvent;

    try {
        event = JSON.parse(req.body.toString('utf8')) as RazorpayWebhookEvent;
    } catch {
        throw new HttpError(400, 'Invalid Razorpay webhook payload.');
    }

    if (typeof event.event !== 'string' || !Number.isInteger(event.created_at) || event.created_at <= 0) {
        throw new HttpError(400, 'Invalid Razorpay webhook payload.');
    }

    const providerEventId = getProviderEventId(event);
    logger.info({
        event_type: 'razorpay_webhook_received',
        outcome: 'success',
        ...requestContext,
        provider_event_id: providerEventId,
        webhook_event: event.event,
        payment_id: event.payload?.payment?.entity?.id,
    });
    const webhookState = await beginWebhookProcessing({
        provider: 'razorpay',
        providerEventId,
        eventType: event.event,
        payload: event,
    });

    if (webhookState.alreadyProcessed) {
        logger.info({
            event_type: 'razorpay_webhook_duplicate',
            outcome: 'success',
            ...requestContext,
            provider_event_id: providerEventId,
            webhook_event: event.event,
            status: webhookState.status,
        });
        res.status(200).json({ received: true, duplicate: true });
        return;
    }

    try {
        if (event.event === 'payment.captured') {
            const payment = event.payload?.payment?.entity;

            if (!payment?.id || !payment.order_id) {
                throw new HttpError(400, 'Invalid payment.captured webhook payload.');
            }

            const order = await createOrderFromCapturedWebhook({
                razorpayOrderId: payment.order_id,
                razorpayPaymentId: payment.id,
            });

            logger.info({
                event_type: 'razorpay_payment_captured',
                outcome: 'success',
                ...requestContext,
                order_id: order.orderId,
                provider_event_id: providerEventId,
                payment_id: payment.id,
            });
        } else if (event.event === 'payment.failed') {
            logger.warn({
                event_type: 'razorpay_payment_failed',
                outcome: 'failure',
                ...requestContext,
                provider_event_id: providerEventId,
                payment_id: event.payload?.payment?.entity?.id,
                reason: event.payload?.payment?.entity?.error_description ?? 'Payment failed',
            });
        }

        await completeWebhookProcessing(providerEventId);
        logger.info({
            event_type: 'razorpay_webhook_completed',
            outcome: 'success',
            ...requestContext,
            provider_event_id: providerEventId,
            webhook_event: event.event,
        });
    } catch (error) {
        await failWebhookProcessing(providerEventId, error instanceof Error ? error.message : 'Unknown webhook error');

        logger.error({
            event_type: 'razorpay_webhook_processing',
            outcome: 'failure',
            ...requestContext,
            provider_event_id: providerEventId,
            ...serializeError(error),
        });
        throw error;
    }

    res.status(200).json({ received: true });
});
