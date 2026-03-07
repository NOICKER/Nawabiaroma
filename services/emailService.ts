import { Resend } from 'resend';
import type { PricedCartItem } from '../models/types.js';
import { env } from '../server/config/env.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface OrderConfirmationPayload {
    customerEmail: string;
    orderReference: string;
    items: PricedCartItem[];
    totalAmount: number;
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export async function sendOrderConfirmationEmail(payload: OrderConfirmationPayload) {
    if (!resend || !env.ORDER_EMAIL_FROM) {
        console.warn('Skipping order confirmation email because Resend is not configured.');
        return;
    }

    const itemMarkup = payload.items
        .map(
            (item) =>
                `<li>${escapeHtml(item.productName)} (${escapeHtml(item.sizeLabel)}) x ${item.quantity} - INR ${item.lineTotal.toLocaleString('en-IN')}</li>`,
        )
        .join('');
    const safeOrderReference = escapeHtml(payload.orderReference);

    await resend.emails.send({
        from: env.ORDER_EMAIL_FROM,
        to: payload.customerEmail,
        subject: `Nawabi order confirmation - ${payload.orderReference}`,
        html: `
            <h1>Thank you for your order.</h1>
            <p>Your Nawabi order reference is <strong>${safeOrderReference}</strong>.</p>
            <ul>${itemMarkup}</ul>
            <p>Total paid: <strong>INR ${payload.totalAmount.toLocaleString('en-IN')}</strong></p>
        `,
    });
}
