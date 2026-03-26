import { HttpError } from '../middleware/errorHandler.js';
import type { CheckoutRequest, CheckoutSessionResponse, PricedCartItem } from '../models/types.js';
import { query } from '../server/config/database.js';
import { env } from '../server/config/env.js';
import { createRazorpayOrder } from './paymentService.js';

interface CartRow {
    id: number | string;
    customer_id: number | string | null;
}

interface AddressRow {
    id: number | string;
}

interface CartItemRow {
    variantId: number | string;
    productId: number | string;
    productName: string;
    productSlug: string;
    sku: string;
    sizeLabel: string;
    quantity: number | string;
    unitPrice: number | string;
    stockQuantity: number | string;
}

function buildReceipt(cartId: number) {
    return `cart-${cartId}-${Date.now()}`.slice(0, 40);
}

async function getActiveCart(sessionId: string) {
    const result = await query<CartRow>(
        `
            SELECT
                id,
                customer_id
            FROM carts
            WHERE session_id = $1
              AND status = 'active'
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
        `,
        [sessionId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Cart not found.');
    }

    return {
        id: Number(result.rows[0].id),
        customerId: result.rows[0].customer_id === null ? null : Number(result.rows[0].customer_id),
    };
}

async function assertAddressExists(sessionId: string, addressId: number) {
    const result = await query<AddressRow>(
        `
            SELECT id
            FROM addresses
            WHERE id = $1
              AND session_id = $2
            LIMIT 1
        `,
        [addressId, sessionId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Address not found.');
    }
}

async function getCartItems(cartId: number) {
    const result = await query<CartItemRow>(
        `
            SELECT
                pv.id AS "variantId",
                p.id AS "productId",
                p.name AS "productName",
                p.slug AS "productSlug",
                pv.sku,
                pv.size_label AS "sizeLabel",
                ci.quantity,
                COALESCE(pv.price_override, p.base_price) AS "unitPrice",
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

    return result.rows.map<PricedCartItem>((row) => {
        const quantity = Number(row.quantity);
        const stockQuantity = Number(row.stockQuantity);

        if (stockQuantity < quantity) {
            throw new HttpError(409, `Variant ${row.variantId} does not have enough inventory.`);
        }

        const unitPrice = Number(row.unitPrice);

        return {
            variantId: Number(row.variantId),
            productId: Number(row.productId),
            productName: row.productName,
            productSlug: row.productSlug,
            sku: row.sku,
            sizeLabel: row.sizeLabel,
            quantity,
            unitPrice,
            lineTotal: unitPrice * quantity,
        };
    });
}

export async function createCheckoutSession(payload: CheckoutRequest, customerId: number): Promise<CheckoutSessionResponse> {
    if (!env.RAZORPAY_KEY_ID) {
        throw new HttpError(503, 'Razorpay is not configured.');
    }

    const cart = await getActiveCart(payload.sessionId);
    await assertAddressExists(payload.sessionId, payload.addressId);

    const items = await getCartItems(cart.id);
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const shippingAmount = 0;
    const totalAmount = subtotal + shippingAmount;

    const razorpayOrder = await createRazorpayOrder({
        amount: totalAmount,
        receipt: buildReceipt(cart.id),
        notes: {
            sessionId: payload.sessionId,
            addressId: payload.addressId,
            customerId,
            cartId: cart.id,
        },
    });

    return {
        provider: 'razorpay',
        razorpayOrderId: razorpayOrder.id,
        amount: Number(razorpayOrder.amount),
        currency: razorpayOrder.currency,
        key: env.RAZORPAY_KEY_ID,
        subtotal,
        shippingAmount,
        totalAmount,
        items,
    };
}
