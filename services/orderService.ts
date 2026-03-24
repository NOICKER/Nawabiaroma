import type Stripe from 'stripe';
import { HttpError } from '../middleware/errorHandler.js';
import type { CreatedOrderItem, CreatedOrderResponse, OrderStatus, OrderSummaryResponse, SavedAddress } from '../models/types.js';
import { logger, serializeError } from './logger.js';
import { sendOrderConfirmationEmail } from './emailService.js';
import { parseCartSnapshotMetadata, parseShippingAddressMetadata } from './checkoutService.js';
import { query, withTransaction } from '../server/config/database.js';

interface CartOrderRow {
    id: number | string;
    customer_id: number | string | null;
    session_id: string;
}

interface CartOrderItemRow {
    variantId: number | string;
    productId: number | string;
    productName: string;
    variant: string;
    quantity: number | string;
    price: number | string;
    subtotal: number | string;
    stockQuantity: number | string;
}

interface AddressRow {
    id: number | string;
    customer_id: number | string | null;
    session_id: string | null;
    full_name: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    phone: string | null;
    is_default: boolean;
    created_at: Date | string;
}

interface OrderFulfillmentResult {
    orderId: number;
    orderReference: string;
    totalAmount: number;
    alreadyProcessed: boolean;
}

interface OrderRow {
    id: number | string;
    status: OrderStatus;
    subtotal_amount: number | string;
    total_amount: number | string;
    address_id: number | string | null;
    created_at: Date | string;
}

interface OrderItemRow {
    orderId: number | string;
    variantId: number | string;
    productId: number | string;
    productName: string;
    variant: string;
    quantity: number | string;
    price: number | string;
    subtotal: number | string;
}

function throwInsufficientStock(variantId: number): never {
    throw new HttpError(409, 'Insufficient stock', { variantId });
}

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapSavedAddress(row: AddressRow): SavedAddress {
    return {
        id: Number(row.id),
        customerId: row.customer_id === null ? null : Number(row.customer_id),
        sessionId: row.session_id,
        name: row.full_name,
        phone: row.phone,
        addressLine1: row.line1,
        addressLine2: row.line2,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country,
        isDefault: row.is_default,
        createdAt: toIsoString(row.created_at),
    };
}

function mapOrderItem(row: OrderItemRow): CreatedOrderItem {
    return {
        variantId: Number(row.variantId),
        productId: Number(row.productId),
        productName: row.productName,
        variant: row.variant,
        quantity: Number(row.quantity),
        price: Number(row.price),
        subtotal: Number(row.subtotal),
    };
}

function mapOrderSummary(
    row: OrderRow,
    itemsByOrderId: Map<number, CreatedOrderItem[]>,
    addressesById: Map<number, SavedAddress>,
): OrderSummaryResponse {
    const orderId = Number(row.id);
    const addressId = row.address_id === null ? null : Number(row.address_id);

    return {
        orderId,
        status: row.status,
        items: itemsByOrderId.get(orderId) ?? [],
        subtotal: Number(row.subtotal_amount),
        total: Number(row.total_amount),
        address: addressId === null ? null : (addressesById.get(addressId) ?? null),
        created_at: toIsoString(row.created_at),
    };
}

async function getOrderItemsByOrderIds(orderIds: number[]) {
    if (orderIds.length === 0) {
        return new Map<number, CreatedOrderItem[]>();
    }

    const result = await query<OrderItemRow>(
        `
            SELECT
                oi.order_id AS "orderId",
                oi.product_variant_id AS "variantId",
                pv.product_id AS "productId",
                p.name AS "productName",
                pv.size_label AS variant,
                oi.quantity,
                oi.price_at_purchase AS price,
                oi.price_at_purchase * oi.quantity AS subtotal
            FROM order_items oi
            INNER JOIN product_variants pv ON pv.id = oi.product_variant_id
            INNER JOIN products p ON p.id = pv.product_id
            WHERE oi.order_id = ANY($1::bigint[])
            ORDER BY oi.order_id DESC, oi.id ASC
        `,
        [orderIds],
    );

    const itemsByOrderId = new Map<number, CreatedOrderItem[]>();

    for (const row of result.rows) {
        const orderId = Number(row.orderId);
        const items = itemsByOrderId.get(orderId) ?? [];
        items.push(mapOrderItem(row));
        itemsByOrderId.set(orderId, items);
    }

    return itemsByOrderId;
}

async function getAddressesByIds(addressIds: number[]) {
    if (addressIds.length === 0) {
        return new Map<number, SavedAddress>();
    }

    const result = await query<AddressRow>(
        `
            SELECT
                id,
                customer_id,
                session_id,
                full_name,
                line1,
                line2,
                city,
                state,
                postal_code,
                country,
                phone,
                is_default,
                created_at
            FROM addresses
            WHERE id = ANY($1::bigint[])
        `,
        [addressIds],
    );

    return new Map(result.rows.map((row) => [Number(row.id), mapSavedAddress(row)]));
}

export async function getOrderById(orderId: number): Promise<OrderSummaryResponse> {
    const result = await query<OrderRow>(
        `
            SELECT
                id,
                status,
                subtotal_amount,
                total_amount,
                address_id,
                created_at
            FROM orders
            WHERE id = $1
            LIMIT 1
        `,
        [orderId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Order not found.');
    }

    const row = result.rows[0];
    const orderIds = [Number(row.id)];
    const addressIds = row.address_id === null ? [] : [Number(row.address_id)];
    const [itemsByOrderId, addressesById] = await Promise.all([
        getOrderItemsByOrderIds(orderIds),
        getAddressesByIds(addressIds),
    ]);

    return mapOrderSummary(row, itemsByOrderId, addressesById);
}

export async function listOrdersBySessionId(sessionId: string): Promise<OrderSummaryResponse[]> {
    const result = await query<OrderRow>(
        `
            SELECT
                id,
                status,
                subtotal_amount,
                total_amount,
                address_id,
                created_at
            FROM orders
            WHERE session_id = $1
            ORDER BY created_at DESC, id DESC
        `,
        [sessionId],
    );

    if (result.rowCount === 0) {
        return [];
    }

    const orderIds = result.rows.map((row) => Number(row.id));
    const addressIds = [...new Set(result.rows.flatMap((row) => (row.address_id === null ? [] : [Number(row.address_id)])))];
    const [itemsByOrderId, addressesById] = await Promise.all([
        getOrderItemsByOrderIds(orderIds),
        getAddressesByIds(addressIds),
    ]);

    return result.rows.map((row) => mapOrderSummary(row, itemsByOrderId, addressesById));
}

export async function updateOrderStatus(orderId: number, status: OrderStatus): Promise<OrderSummaryResponse> {
    const result = await query<{ id: number | string }>(
        `
            UPDATE orders
            SET status = $2
            WHERE id = $1
            RETURNING id
        `,
        [orderId, status],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Order not found.');
    }

    return getOrderById(orderId);
}

export async function createOrderFromCartSession(sessionId: string, addressId: number): Promise<CreatedOrderResponse> {
    return withTransaction(async (client) => {
        const cartResult = await client.query<CartOrderRow>(
            `
                SELECT
                    id,
                    customer_id,
                    session_id
                FROM carts
                WHERE session_id = $1
                  AND status = 'active'
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
            `,
            [sessionId],
        );

        if (cartResult.rowCount === 0) {
            throw new HttpError(404, 'Cart not found.');
        }

        const cart = cartResult.rows[0];
        const cartId = Number(cart.id);
        const customerId = cart.customer_id === null ? null : Number(cart.customer_id);
        const addressResult = await client.query<AddressRow>(
            `
                SELECT
                    id,
                    customer_id,
                    session_id,
                    full_name,
                    line1,
                    line2,
                    city,
                    state,
                    postal_code,
                    country,
                    phone,
                    is_default,
                    created_at
                FROM addresses
                WHERE id = $1
                  AND session_id = $2
                LIMIT 1
            `,
            [addressId, sessionId],
        );

        if (addressResult.rowCount === 0) {
            throw new HttpError(404, 'Address not found.');
        }

        const address = mapSavedAddress(addressResult.rows[0]);
        const shippingAddress = {
            fullName: address.name,
            line1: address.addressLine1,
            line2: address.addressLine2 ?? undefined,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.country,
            phone: address.phone ?? undefined,
        };

        const cartItemsResult = await client.query<CartOrderItemRow>(
            `
                SELECT
                    ci.product_variant_id AS "variantId",
                    pv.product_id AS "productId",
                    p.name AS "productName",
                    pv.size_label AS variant,
                    ci.quantity,
                    COALESCE(pv.price_override, p.base_price) AS price,
                    COALESCE(pv.price_override, p.base_price) * ci.quantity AS subtotal,
                    pv.stock_quantity AS "stockQuantity"
                FROM cart_items ci
                INNER JOIN product_variants pv ON pv.id = ci.product_variant_id
                INNER JOIN products p ON p.id = pv.product_id
                WHERE ci.cart_id = $1
                ORDER BY ci.created_at ASC, ci.id ASC
            `,
            [cartId],
        );

        if (cartItemsResult.rowCount === 0) {
            throw new HttpError(400, 'Cart has no items.');
        }

        for (const row of cartItemsResult.rows) {
            if (Number(row.stockQuantity) < Number(row.quantity)) {
                throwInsufficientStock(Number(row.variantId));
            }
        }

        const items = cartItemsResult.rows.map<CreatedOrderItem>((row) => ({
            variantId: Number(row.variantId),
            productId: Number(row.productId),
            productName: row.productName,
            variant: row.variant,
            quantity: Number(row.quantity),
            price: Number(row.price),
            subtotal: Number(row.subtotal),
        }));

        const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
        const total = Number(subtotal);

        const orderInsert = await client.query<{ id: number | string }>(
            `
                INSERT INTO orders (
                    customer_id,
                    session_id,
                    cart_id,
                    address_id,
                    subtotal_amount,
                    total_amount,
                    status,
                    shipping_address_json,
                    stripe_payment_intent_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_payment', $7::jsonb, NULL)
                RETURNING id
            `,
            [customerId, cart.session_id, cartId, address.id, subtotal, total, JSON.stringify(shippingAddress)],
        );

        const orderId = Number(orderInsert.rows[0].id);

        for (const item of items) {
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
                [orderId, item.variantId, item.quantity, item.price],
            );
        }

        return {
            orderId,
            items,
            subtotal,
            total,
            address,
        };
    });
}

export async function fulfillSuccessfulPaymentIntent(paymentIntent: Stripe.PaymentIntent): Promise<OrderFulfillmentResult> {
    const pricedCartItems = parseCartSnapshotMetadata(paymentIntent.metadata).map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
    }));
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
                totalAmount: Number(paymentIntent.amount_received ?? paymentIntent.amount) / 100,
                items: [],
                customerEmail,
                alreadyProcessed: true,
            };
        }

        const customerId = await upsertCustomer(client, customerEmail, paymentIntent.customer);
        const subtotalAmount = pricedCartItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
        const totalAmount = Number(paymentIntent.amount_received ?? paymentIntent.amount) / 100;
        const orderInsert = await client.query<{ id: number | string }>(
            `
                INSERT INTO orders (
                    customer_id,
                    subtotal_amount,
                    total_amount,
                    status,
                    shipping_address_json,
                    stripe_payment_intent_id
                )
                VALUES ($1, $2, $3, 'paid', $4::jsonb, $5)
                RETURNING id
            `,
            [customerId, subtotalAmount, totalAmount, JSON.stringify(shippingAddress), paymentIntent.id],
        );

        const orderId = Number(orderInsert.rows[0].id);

        for (const item of pricedCartItems) {
            const quantity = Number(item.quantity);
            const unitPrice = Number(item.unitPrice);
            const inventoryUpdate = await client.query(
                `
                    UPDATE product_variants
                    SET stock_quantity = stock_quantity - $1
                    WHERE id = $2
                      AND stock_quantity >= $1
                `,
                [quantity, item.variantId],
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
                [orderId, item.variantId, quantity, unitPrice],
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
            logger.error({
                event_type: 'order_confirmation_email_failed',
                outcome: 'failure',
                order_reference: fulfillment.orderReference,
                ...serializeError(error),
            });
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
