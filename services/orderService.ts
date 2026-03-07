import type Stripe from 'stripe';
import { HttpError } from '../middleware/errorHandler.js';
import { sendOrderConfirmationEmail } from './emailService.js';
import { parseCartSnapshotMetadata, parseShippingAddressMetadata } from './checkoutService.js';
import { withTransaction } from '../server/config/database.js';

interface OrderFulfillmentResult {
    orderId: number;
    orderReference: string;
    totalAmount: number;
    alreadyProcessed: boolean;
}

export async function fulfillSuccessfulPaymentIntent(paymentIntent: Stripe.PaymentIntent): Promise<OrderFulfillmentResult> {
    const pricedCartItems = parseCartSnapshotMetadata(paymentIntent.metadata);
    const shippingAddress = parseShippingAddressMetadata(paymentIntent.metadata);
    const customerEmail = paymentIntent.metadata.customer_email || paymentIntent.receipt_email || undefined;
    const orderReference = paymentIntent.metadata.order_reference || paymentIntent.id;

    const fulfillment = await withTransaction(async (client) => {
        const existingOrder = await client.query<{ id: number | string }>(
            `
                SELECT id
                FROM orders
                WHERE stripe_payment_intent_id = $1
                LIMIT 1
            `,
            [paymentIntent.id],
        );

        if (existingOrder.rowCount && existingOrder.rows[0]) {
            return {
                orderId: Number(existingOrder.rows[0].id),
                orderReference,
                totalAmount: Number(paymentIntent.amount_received || paymentIntent.amount) / 100,
                items: [],
                customerEmail,
                alreadyProcessed: true,
            };
        }

        const customerId = await upsertCustomer(client, customerEmail, paymentIntent.customer);
        const totalAmount = Number(paymentIntent.amount_received || paymentIntent.amount) / 100;
        const orderInsert = await client.query<{ id: number | string }>(
            `
                INSERT INTO orders (
                    customer_id,
                    total_amount,
                    status,
                    shipping_address_json,
                    stripe_payment_intent_id
                )
                VALUES ($1, $2, 'paid', $3::jsonb, $4)
                RETURNING id
            `,
            [customerId, totalAmount, JSON.stringify(shippingAddress), paymentIntent.id],
        );

        const orderId = Number(orderInsert.rows[0].id);

        for (const item of pricedCartItems) {
            const inventoryUpdate = await client.query(
                `
                    UPDATE product_variants
                    SET stock_quantity = stock_quantity - $1
                    WHERE id = $2
                      AND stock_quantity >= $1
                `,
                [item.quantity, item.variantId],
            );

            if (inventoryUpdate.rowCount === 0) {
                throw new HttpError(409, `Variant ${item.variantId} no longer has enough inventory.`);
            }

            await client.query(
                `
                    INSERT INTO order_items (
                        order_id,
                        product_variant_id,
                        quantity,
                        price_at_purchase
                    )
                    VALUES ($1, $2, $3, $4)
                `,
                [orderId, item.variantId, item.quantity, item.unitPrice],
            );
        }

        await client.query(
            `
                INSERT INTO payments (
                    order_id,
                    stripe_charge_id,
                    amount,
                    status
                )
                VALUES ($1, $2, $3, 'succeeded')
            `,
            [
                orderId,
                typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : null,
                totalAmount,
            ],
        );

        return {
            orderId,
            orderReference,
            totalAmount,
            items: pricedCartItems,
            customerEmail,
            alreadyProcessed: false,
        };
    });

    if (!fulfillment.alreadyProcessed && fulfillment.customerEmail) {
        try {
            await sendOrderConfirmationEmail({
                customerEmail: fulfillment.customerEmail,
                orderReference: fulfillment.orderReference,
                items: fulfillment.items,
                totalAmount: fulfillment.totalAmount,
            });
        } catch (error) {
            console.error('Failed to send order confirmation email.', error);
        }
    }

    return {
        orderId: fulfillment.orderId,
        orderReference: fulfillment.orderReference,
        totalAmount: fulfillment.totalAmount,
        alreadyProcessed: fulfillment.alreadyProcessed,
    };
}

async function upsertCustomer(
    client: {
        query: (text: string, params?: unknown[]) => Promise<{ rowCount: number; rows: Array<{ id: number | string }> }>;
    },
    email: string | undefined,
    stripeCustomer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
) {
    if (!email) {
        return null;
    }

    const stripeCustomerId =
        typeof stripeCustomer === 'string'
            ? stripeCustomer
            : stripeCustomer && 'id' in stripeCustomer
              ? stripeCustomer.id
              : null;
    const result = await client.query(
        `
            INSERT INTO customers (
                email,
                stripe_customer_id
            )
            VALUES ($1, $2)
            ON CONFLICT (email)
            DO UPDATE
            SET stripe_customer_id = COALESCE(customers.stripe_customer_id, EXCLUDED.stripe_customer_id)
            RETURNING id
        `,
        [email, stripeCustomerId],
    );

    return Number(result.rows[0].id);
}
