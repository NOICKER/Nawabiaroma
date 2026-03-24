import Stripe from 'stripe';
import { HttpError } from '../middleware/errorHandler.js';
import { env } from '../server/config/env.js';

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export interface CreatePaymentIntentInput {
    amount: number;
    customerEmail: string;
    metadata: Record<string, string>;
}

export async function createPaymentIntent(input: CreatePaymentIntentInput) {
    const totalAmount = Number(input.amount);

    return stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100),
        currency: env.STRIPE_CURRENCY,
        receipt_email: input.customerEmail,
        automatic_payment_methods: {
            enabled: true,
        },
        metadata: input.metadata,
    });
}

export async function refundPaymentIntent(paymentIntentId: string) {
    return stripe.refunds.create({
        payment_intent: paymentIntentId,
        reason: 'requested_by_customer',
    });
}

export function verifyStripeWebhook(rawBody: Buffer, signature?: string) {
    if (!signature) {
        throw new HttpError(400, 'Missing Stripe signature.');
    }

    return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}
