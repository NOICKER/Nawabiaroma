import { createHmac, timingSafeEqual } from 'node:crypto';
import Razorpay from 'razorpay';
import { HttpError } from '../middleware/errorHandler.js';
import { env } from '../server/config/env.js';

const DEFAULT_CURRENCY = 'INR';

interface RazorpayNotes {
    [key: string]: string | number;
}

interface CreateRazorpayOrderInput {
    amount: number;
    currency?: string;
    receipt: string;
    notes?: RazorpayNotes;
}

function getRazorpayClient() {
    if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
        throw new HttpError(503, 'Razorpay is not configured.');
    }

    return new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
    });
}

function createSignature(payload: string, secret: string) {
    return createHmac('sha256', secret).update(payload).digest('hex');
}

function signaturesMatch(expected: string, actual: string) {
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(actual, 'utf8');

    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function createRazorpayOrder(input: CreateRazorpayOrderInput) {
    const razorpay = getRazorpayClient();

    return razorpay.orders.create({
        amount: Math.round(Number(input.amount) * 100),
        currency: input.currency ?? DEFAULT_CURRENCY,
        receipt: input.receipt,
        notes: input.notes,
    });
}

export function verifyRazorpayPayment(orderId: string, paymentId: string, signature: string) {
    if (!env.RAZORPAY_KEY_SECRET) {
        throw new HttpError(503, 'Razorpay is not configured.');
    }

    const expectedSignature = createSignature(`${orderId}|${paymentId}`, env.RAZORPAY_KEY_SECRET);

    if (!signaturesMatch(expectedSignature, signature)) {
        throw new HttpError(400, 'Payment signature verification failed.');
    }
}

export function verifyRazorpayWebhook(rawBody: Buffer, signature?: string) {
    if (!env.RAZORPAY_WEBHOOK_SECRET) {
        throw new HttpError(503, 'Razorpay webhook secret is not configured.');
    }

    if (!signature) {
        throw new HttpError(400, 'Missing Razorpay webhook signature.');
    }

    const expectedSignature = createSignature(rawBody.toString('utf8'), env.RAZORPAY_WEBHOOK_SECRET);

    if (!signaturesMatch(expectedSignature, signature)) {
        throw new HttpError(400, 'Webhook signature verification failed.');
    }
}

export async function fetchRazorpayPayment(paymentId: string) {
    const razorpay = getRazorpayClient();
    return razorpay.payments.fetch(paymentId);
}

export async function fetchRazorpayOrder(orderId: string) {
    const razorpay = getRazorpayClient();
    return razorpay.orders.fetch(orderId);
}
