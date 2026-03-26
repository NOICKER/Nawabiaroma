import { HttpError } from '../middleware/errorHandler.js';
import type {
    CreatedOrderItem,
    CreatedOrderResponse,
    OrderStatus,
    OrderSummaryResponse,
    PaymentMethod,
    PaymentStatus,
    SavedAddress,
} from '../models/types.js';
import { query, type Queryable, withTransaction } from '../server/config/database.js';
import { sendOrderConfirmationEmail } from './emailService.js';
import { fetchRazorpayOrder, fetchRazorpayPayment, verifyRazorpayPayment } from './paymentService.js';

interface CartRow {
    id: number | string;
    customer_id: number | string | null;
    session_id: string;
}

interface CartItemRow {
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

interface OrderRow {
    id: number | string;
    customer_id: number | string | null;
    status: OrderStatus;
    subtotal_amount: number | string;
    total_amount: number | string;
    address_id: number | string | null;
    tracking_number: string | null;
    payment_method: PaymentMethod | null;
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

interface ExistingOrderRow {
    id: number | string;
}

interface RazorpayOrderRecord {
    id: string;
    amount: number | string;
    currency: string;
    notes?: Record<string, string | number>;
}

interface RazorpayPaymentRecord {
    id: string;
    order_id: string;
    amount: number | string;
    status: string;
    captured: boolean;
    method: string;
    email?: string;
    error_description?: string | null;
}

interface ResolvedPaidOrderContext {
    sessionId: string;
    addressId: number;
    customerId: number;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature?: string;
    payment: RazorpayPaymentRecord;
    order: RazorpayOrderRecord;
}

interface CreateCodOrderInput {
    sessionId: string;
    addressId: number;
    customerId: number;
}

interface CreatePaidOrderInput extends CreateCodOrderInput {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
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

function normalizePaymentMethod(value: PaymentMethod | null, status: OrderStatus): PaymentMethod {
    if (value === 'online' || value === 'cod') {
        return value;
    }

    return status === 'processing' ? 'cod' : 'online';
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
        paymentMethod: normalizePaymentMethod(row.payment_method, row.status),
        items: itemsByOrderId.get(orderId) ?? [],
        subtotal: Number(row.subtotal_amount),
        total: Number(row.total_amount),
        address: addressId === null ? null : (addressesById.get(addressId) ?? null),
        trackingNumber: row.tracking_number,
        createdAt: toIsoString(row.created_at),
    };
}

async function getCartForUpdate(sessionId: string, executor: Queryable) {
    const result = await executor.query<CartRow>(
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
            FOR UPDATE
        `,
        [sessionId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Cart not found.');
    }

    return result.rows[0];
}

async function getAddressForOrder(sessionId: string, addressId: number, executor: Queryable) {
    const result = await executor.query<AddressRow>(
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
            FOR UPDATE
        `,
        [addressId, sessionId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Address not found.');
    }

    return mapSavedAddress(result.rows[0]);
}

async function getCartItemsForOrder(cartId: number, executor: Queryable) {
    const result = await executor.query<CartItemRow>(
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

    if (result.rowCount === 0) {
        throw new HttpError(400, 'Cart has no items.');
    }

    return result.rows.map<CreatedOrderItem>((row) => ({
        variantId: Number(row.variantId),
        productId: Number(row.productId),
        productName: row.productName,
        variant: row.variant,
        quantity: Number(row.quantity),
        price: Number(row.price),
        subtotal: Number(row.subtotal),
    }));
}

async function assertSufficientStock(items: CreatedOrderItem[], executor: Queryable) {
    for (const item of items) {
        const result = await executor.query<{ stock_quantity: number | string }>(
            `
                SELECT stock_quantity
                FROM product_variants
                WHERE id = $1
                LIMIT 1
                FOR UPDATE
            `,
            [item.variantId],
        );

        if (result.rowCount === 0 || Number(result.rows[0].stock_quantity) < item.quantity) {
            throw new HttpError(409, 'Insufficient stock', { variantId: item.variantId });
        }
    }
}

async function decrementStock(items: CreatedOrderItem[], executor: Queryable) {
    for (const item of items) {
        const updateResult = await executor.query(
            `
                UPDATE product_variants
                SET stock_quantity = stock_quantity - $1
                WHERE id = $2
                  AND stock_quantity >= $1
            `,
            [item.quantity, item.variantId],
        );

        if (updateResult.rowCount === 0) {
            throw new HttpError(409, 'Insufficient stock', { variantId: item.variantId });
        }
    }
}

async function findExistingOrder(executor: Queryable, input: { razorpayOrderId?: string; razorpayPaymentId?: string }) {
    const result = await executor.query<ExistingOrderRow>(
        `
            SELECT DISTINCT o.id
            FROM orders o
            LEFT JOIN payments p ON p.order_id = o.id
            WHERE ($1::text IS NOT NULL AND o.razorpay_order_id = $1)
               OR ($2::text IS NOT NULL AND p.provider_payment_id = $2)
            LIMIT 1
        `,
        [input.razorpayOrderId ?? null, input.razorpayPaymentId ?? null],
    );

    return result.rowCount === 0 ? null : Number(result.rows[0].id);
}

async function finalizeCart(cartId: number, executor: Queryable) {
    await executor.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cartId]);
    await executor.query(
        `
            UPDATE carts
            SET status = 'converted',
                updated_at = NOW()
            WHERE id = $1
        `,
        [cartId],
    );
}

async function insertOrderItems(orderId: number, items: CreatedOrderItem[], executor: Queryable) {
    for (const item of items) {
        await executor.query(
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
}

async function sendOrderEmail(order: CreatedOrderResponse, email?: string) {
    if (!email) {
        return;
    }

    await sendOrderConfirmationEmail({
        customerEmail: email,
        orderReference: String(order.orderId),
        paymentMethod: order.paymentMethod,
        items: order.items.map((item) => ({
            productName: item.productName,
            sizeLabel: item.variant,
            quantity: item.quantity,
            lineTotal: item.subtotal,
        })),
        totalAmount: order.total,
    });
}

function mapSummaryToCreatedOrder(summary: OrderSummaryResponse): CreatedOrderResponse {
    if (!summary.address) {
        throw new HttpError(500, 'Existing order is missing a saved address.');
    }

    return {
        orderId: summary.orderId,
        status: summary.status,
        paymentMethod: summary.paymentMethod,
        items: summary.items,
        subtotal: summary.subtotal,
        total: summary.total,
        address: summary.address,
        trackingNumber: summary.trackingNumber,
        createdAt: summary.createdAt,
    };
}

function getNumericNote(notes: Record<string, string | number> | undefined, key: string) {
    const rawValue = notes?.[key];
    const parsedValue = Number(rawValue);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
}

function getStringNote(notes: Record<string, string | number> | undefined, key: string) {
    const rawValue = notes?.[key];
    return typeof rawValue === 'string' && rawValue.trim().length > 0 ? rawValue.trim() : null;
}

async function resolvePaidOrderContext(
    input: Partial<CreatePaidOrderInput> & { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature?: string },
    options: { verifySignature: boolean },
): Promise<ResolvedPaidOrderContext> {
    const [payment, order] = await Promise.all([
        fetchRazorpayPayment(input.razorpayPaymentId),
        fetchRazorpayOrder(input.razorpayOrderId),
    ]);

    const razorpayPayment = payment as RazorpayPaymentRecord;
    const razorpayOrder = order as RazorpayOrderRecord;

    if (options.verifySignature) {
        if (!input.razorpaySignature) {
            throw new HttpError(400, 'Missing Razorpay payment signature.');
        }

        verifyRazorpayPayment(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);
    }

    if (razorpayPayment.order_id !== input.razorpayOrderId) {
        throw new HttpError(400, 'Payment does not belong to the provided Razorpay order.');
    }

    if (!razorpayPayment.captured || razorpayPayment.status !== 'captured') {
        throw new HttpError(409, 'Payment is not captured yet.');
    }

    const sessionId = input.sessionId ?? getStringNote(razorpayOrder.notes, 'sessionId');
    const addressId = input.addressId ?? getNumericNote(razorpayOrder.notes, 'addressId');
    const customerId = input.customerId ?? getNumericNote(razorpayOrder.notes, 'customerId');

    if (!sessionId || !addressId || !customerId) {
        throw new HttpError(400, 'Missing checkout context for paid order creation.');
    }

    return {
        sessionId,
        addressId,
        customerId,
        razorpayOrderId: input.razorpayOrderId,
        razorpayPaymentId: input.razorpayPaymentId,
        razorpaySignature: input.razorpaySignature,
        payment: razorpayPayment,
        order: razorpayOrder,
    };
}

async function createOrderRecord(input: {
    sessionId: string;
    customerId: number;
    address: SavedAddress;
    cartId: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    subtotal: number;
    total: number;
    razorpayOrderId?: string;
    paymentVerifiedAt?: boolean;
    executor: Queryable;
}) {
    const result = await input.executor.query<{ id: number | string }>(
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
                stripe_payment_intent_id,
                payment_method,
                razorpay_order_id,
                payment_verified_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NULL, $9, $10, $11)
            RETURNING id
        `,
        [
            input.customerId,
            input.sessionId,
            input.cartId,
            input.address.id,
            input.subtotal,
            input.total,
            input.status,
            JSON.stringify({
                fullName: input.address.name,
                line1: input.address.addressLine1,
                line2: input.address.addressLine2,
                city: input.address.city,
                state: input.address.state,
                postalCode: input.address.postalCode,
                country: input.address.country,
                phone: input.address.phone,
            }),
            input.paymentMethod,
            input.razorpayOrderId ?? null,
            input.paymentVerifiedAt ? new Date() : null,
        ],
    );

    return Number(result.rows[0].id);
}

async function completeOrderCreation(input: {
    sessionId: string;
    addressId: number;
    customerId: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    razorpayOrderId?: string;
    payment?: {
        providerPaymentId: string;
        providerOrderId: string;
        method: string;
        signature?: string;
        status: PaymentStatus;
        email?: string;
        amount: number;
    };
}) {
    const transactionResult = await withTransaction(async (client) => {
        const existingOrderId = await findExistingOrder(client, {
            razorpayOrderId: input.razorpayOrderId,
            razorpayPaymentId: input.payment?.providerPaymentId,
        });

        if (existingOrderId) {
            const existingOrder = await getCustomerOrderById(input.customerId, existingOrderId);
            return {
                order: mapSummaryToCreatedOrder(existingOrder),
                isNew: false,
            };
        }

        const cart = await getCartForUpdate(input.sessionId, client);
        const address = await getAddressForOrder(input.sessionId, input.addressId, client);
        const items = await getCartItemsForOrder(Number(cart.id), client);

        await assertSufficientStock(items, client);
        await decrementStock(items, client);

        const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        const total = subtotal;
        const orderId = await createOrderRecord({
            sessionId: input.sessionId,
            customerId: input.customerId,
            address,
            cartId: Number(cart.id),
            status: input.status,
            paymentMethod: input.paymentMethod,
            subtotal,
            total,
            razorpayOrderId: input.razorpayOrderId,
            paymentVerifiedAt: Boolean(input.payment),
            executor: client,
        });

        await insertOrderItems(orderId, items, client);

        if (input.payment) {
            await client.query(
                `
                    INSERT INTO payments (
                        order_id,
                        stripe_charge_id,
                        amount,
                        status,
                        provider,
                        provider_order_id,
                        provider_payment_id,
                        signature,
                        method
                    )
                    VALUES ($1, NULL, $2, $3, 'razorpay', $4, $5, $6, $7)
                `,
                [
                    orderId,
                    input.payment.amount,
                    input.payment.status,
                    input.payment.providerOrderId,
                    input.payment.providerPaymentId,
                    input.payment.signature ?? null,
                    input.payment.method,
                ],
            );
        }

        await finalizeCart(Number(cart.id), client);

        return {
            order: {
                orderId,
                status: input.status,
                paymentMethod: input.paymentMethod,
                items,
                subtotal,
                total,
                address,
                trackingNumber: null,
                createdAt: new Date().toISOString(),
            } satisfies CreatedOrderResponse,
            isNew: true,
        };
    });

    if (transactionResult.isNew) {
        await sendOrderEmail(transactionResult.order, input.payment?.email);
    }

    return transactionResult.order;
}

export async function createPaidOrder(input: CreatePaidOrderInput): Promise<CreatedOrderResponse> {
    const context = await resolvePaidOrderContext(input, { verifySignature: true });

    return completeOrderCreation({
        sessionId: context.sessionId,
        addressId: context.addressId,
        customerId: context.customerId,
        status: 'paid',
        paymentMethod: 'online',
        razorpayOrderId: context.razorpayOrderId,
        payment: {
            providerPaymentId: context.razorpayPaymentId,
            providerOrderId: context.razorpayOrderId,
            method: context.payment.method,
            signature: context.razorpaySignature,
            status: 'succeeded',
            email: context.payment.email,
            amount: Number(context.payment.amount) / 100,
        },
    });
}

export async function createOrderFromCapturedWebhook(input: { razorpayOrderId: string; razorpayPaymentId: string }) {
    const context = await resolvePaidOrderContext(input, { verifySignature: false });

    return completeOrderCreation({
        sessionId: context.sessionId,
        addressId: context.addressId,
        customerId: context.customerId,
        status: 'paid',
        paymentMethod: 'online',
        razorpayOrderId: context.razorpayOrderId,
        payment: {
            providerPaymentId: context.razorpayPaymentId,
            providerOrderId: context.razorpayOrderId,
            method: context.payment.method,
            status: 'succeeded',
            email: context.payment.email,
            amount: Number(context.payment.amount) / 100,
        },
    });
}

export async function createCodOrder(input: CreateCodOrderInput): Promise<CreatedOrderResponse> {
    return completeOrderCreation({
        sessionId: input.sessionId,
        addressId: input.addressId,
        customerId: input.customerId,
        status: 'processing',
        paymentMethod: 'cod',
    });
}

export async function getCustomerOrderById(customerId: number, orderId: number): Promise<OrderSummaryResponse> {
    const result = await query<OrderRow>(
        `
            SELECT
                id,
                customer_id,
                status,
                subtotal_amount,
                total_amount,
                address_id,
                tracking_number,
                payment_method,
                created_at
            FROM orders
            WHERE id = $1
              AND customer_id = $2
            LIMIT 1
        `,
        [orderId, customerId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Order not found.');
    }

    const row = result.rows[0];
    const [itemsByOrderId, addressesById] = await Promise.all([
        getOrderItemsByOrderIds([Number(row.id)]),
        getAddressesByIds(row.address_id === null ? [] : [Number(row.address_id)]),
    ]);

    return mapOrderSummary(row, itemsByOrderId, addressesById);
}

export async function getOrderById(orderId: number): Promise<OrderSummaryResponse> {
    const result = await query<OrderRow>(
        `
            SELECT
                id,
                customer_id,
                status,
                subtotal_amount,
                total_amount,
                address_id,
                tracking_number,
                payment_method,
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
    const [itemsByOrderId, addressesById] = await Promise.all([
        getOrderItemsByOrderIds([Number(row.id)]),
        getAddressesByIds(row.address_id === null ? [] : [Number(row.address_id)]),
    ]);

    return mapOrderSummary(row, itemsByOrderId, addressesById);
}

export async function listOrdersByCustomerId(customerId: number): Promise<OrderSummaryResponse[]> {
    const result = await query<OrderRow>(
        `
            SELECT
                id,
                customer_id,
                status,
                subtotal_amount,
                total_amount,
                address_id,
                tracking_number,
                payment_method,
                created_at
            FROM orders
            WHERE customer_id = $1
            ORDER BY created_at DESC, id DESC
        `,
        [customerId],
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

export async function listOrdersBySessionId(sessionId: string): Promise<OrderSummaryResponse[]> {
    const result = await query<OrderRow>(
        `
            SELECT
                id,
                customer_id,
                status,
                subtotal_amount,
                total_amount,
                address_id,
                tracking_number,
                payment_method,
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
    await withTransaction(async (client) => {
        const currentOrderResult = await client.query<{ status: OrderStatus }>(
            `
                SELECT status
                FROM orders
                WHERE id = $1
                LIMIT 1
            `,
            [orderId],
        );

        if (currentOrderResult.rowCount === 0) {
            throw new HttpError(404, 'Order not found.');
        }

        await client.query(
            `
                UPDATE orders
                SET status = $2
                WHERE id = $1
            `,
            [orderId, status],
        );

        await client.query(
            `
                INSERT INTO order_state_transitions (
                    order_id,
                    from_status,
                    to_status,
                    changed_by_user_id
                )
                VALUES ($1, $2, $3, 'system')
            `,
            [orderId, currentOrderResult.rows[0].status, status],
        );

    });

    return getOrderById(orderId);
}
