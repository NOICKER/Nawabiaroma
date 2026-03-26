import { Resend } from 'resend';
import { env } from '../server/config/env.js';
import { escapeHtml } from './htmlEscape.js';
import { logger } from './logger.js';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

interface OrderConfirmationPayload {
    customerEmail: string;
    orderReference: string;
    paymentMethod: 'online' | 'cod';
    items: Array<{
        productName: string;
        sizeLabel: string;
        quantity: number;
        lineTotal: number;
    }>;
    totalAmount: number;
}

export async function sendOrderConfirmationEmail(payload: OrderConfirmationPayload) {
    if (!resend || !env.ORDER_EMAIL_FROM) {
        logger.warn({
            event_type: 'order_confirmation_email_skipped',
            outcome: 'failure',
            reason: 'resend_not_configured',
        });
        return;
    }

    const itemMarkup = payload.items
        .map((item) => {
            const safeProductName = escapeHtml(item.productName);
            const safeSizeLabel = escapeHtml(item.sizeLabel);
            const safeQuantity = escapeHtml(item.quantity.toString());
            const safeLineTotal = escapeHtml(item.lineTotal.toLocaleString('en-IN'));

            return `<li>${safeProductName} (${safeSizeLabel}) x ${safeQuantity} - INR ${safeLineTotal}</li>`;
        })
        .join('');
    const safeOrderReference = escapeHtml(payload.orderReference);
    const safeTotalAmount = escapeHtml(payload.totalAmount.toLocaleString('en-IN'));
    const paymentSummary =
        payload.paymentMethod === 'cod' ? 'Payment method: Cash on Delivery.' : 'Payment received successfully.';

    await resend.emails.send({
        from: env.ORDER_EMAIL_FROM,
        to: payload.customerEmail,
        subject: `Nawabi order confirmation - ${payload.orderReference}`,
        html: `
            <h1>Thank you for your order.</h1>
            <p>Your Nawabi order reference is <strong>${safeOrderReference}</strong>.</p>
            <p>${paymentSummary}</p>
            <ul>${itemMarkup}</ul>
            <p>Order total: <strong>INR ${safeTotalAmount}</strong></p>
        `,
    });
}
