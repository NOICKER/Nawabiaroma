import { randomUUID } from 'node:crypto';
import type { QueryResult } from 'pg';
import { HttpError } from '../middleware/errorHandler.js';
import type {
    CheckoutItemInput,
    CheckoutRequest,
    CheckoutSessionResponse,
    PricedCartItem,
    ShippingAddress,
} from '../models/types.js';
import type { Queryable } from '../server/config/database.js';
import { query } from '../server/config/database.js';
import { env } from '../server/config/env.js';
import { createPaymentIntent } from './paymentService.js';

interface PricingRow {
    id: number | string;
    product_id: number | string;
    sku: string;
    size_label: string;
    stock_quantity: number | string;
    price_override: string | null;
    name: string;
    slug: string;
    base_price: string;
    is_active: boolean;
}

interface PricedCart {
    items: PricedCartItem[];
    subtotal: number;
    shippingAmount: number;
    totalAmount: number;
}

interface CartSnapshotMetadataItem {
    v: number;
    p: number;
    n: string;
    s: string;
    k: string;
    z: string;
    q: number;
    u: number;
    l: number;
}

const METADATA_CHUNK_SIZE = 450;

function calculateShipping(subtotal: number) {
    return Number(subtotal) >= 999 ? 0 : 99;
}

function serializeCartItems(items: PricedCartItem[]) {
    return items.map((item) => `${item.variantId}:${item.quantity}`).join(',');
}

function chunkString(value: string, size: number) {
    const chunks: string[] = [];

    for (let index = 0; index < value.length; index += size) {
        chunks.push(value.slice(index, index + size));
    }

    return chunks;
}

export function encodeCartSnapshotMetadata(items: PricedCartItem[]) {
    const serialized = JSON.stringify(
        items.map<CartSnapshotMetadataItem>((item) => ({
            v: item.variantId,
            p: item.productId,
            n: item.productName,
            s: item.productSlug,
            k: item.sku,
            z: item.sizeLabel,
            q: item.quantity,
            u: item.unitPrice,
            l: item.lineTotal,
        })),
    );
    const chunks = chunkString(serialized, METADATA_CHUNK_SIZE);

    if (chunks.length > 10) {
        throw new HttpError(400, 'Cart payload is too large to encode for checkout.');
    }

    return Object.fromEntries(chunks.map((chunk, index) => [`cart_snapshot_${index}`, chunk]));
}

export function parseCartItemsMetadata(value: string | undefined): CheckoutItemInput[] {
    if (!value) {
        throw new HttpError(400, 'Missing cart metadata in payment intent.');
    }

    return value.split(',').filter(Boolean).map((segment) => {
        const [variantId, quantity] = segment.split(':');
        const parsedVariantId = Number(variantId);
        const parsedQuantity = Number(quantity);

        if (!Number.isInteger(parsedVariantId) || parsedVariantId <= 0) {
            throw new HttpError(400, `Invalid variant id in metadata segment "${segment}".`);
        }

        if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
            throw new HttpError(400, `Invalid quantity in metadata segment "${segment}".`);
        }

        return {
            variantId: parsedVariantId,
            quantity: parsedQuantity,
        };
    });
}

export function parseCartSnapshotMetadata(metadata: Record<string, string | undefined>): PricedCartItem[] {
    const serialized = Object.entries(metadata)
        .filter(([key, value]) => key.startsWith('cart_snapshot_') && typeof value === 'string')
        .sort(([left], [right]) => {
            const leftIndex = Number(left.split('_').pop());
            const rightIndex = Number(right.split('_').pop());
            return leftIndex - rightIndex;
        })
        .map(([, value]) => value ?? '')
        .join('');

    if (!serialized) {
        throw new HttpError(400, 'Missing cart snapshot metadata in payment intent.');
    }

    let parsed: unknown;

    try {
        parsed = JSON.parse(serialized);
    } catch {
        throw new HttpError(400, 'Invalid cart snapshot metadata in payment intent.');
    }

    if (!Array.isArray(parsed)) {
        throw new HttpError(400, 'Invalid cart snapshot metadata in payment intent.');
    }

    return parsed.map((item) => {
        if (
            !item ||
            typeof item !== 'object' ||
            !('v' in item) ||
            !('p' in item) ||
            !('n' in item) ||
            !('s' in item) ||
            !('k' in item) ||
            !('z' in item) ||
            !('q' in item) ||
            !('u' in item) ||
            !('l' in item)
        ) {
            throw new HttpError(400, 'Invalid cart snapshot metadata in payment intent.');
        }

        const snapshot = item as CartSnapshotMetadataItem;

        return {
            variantId: Number(snapshot.v),
            productId: Number(snapshot.p),
            productName: String(snapshot.n),
            productSlug: String(snapshot.s),
            sku: String(snapshot.k),
            sizeLabel: String(snapshot.z),
            quantity: Number(snapshot.q),
            unitPrice: Number(snapshot.u),
            lineTotal: Number(snapshot.l),
        };
    });
}

export function parseShippingAddressMetadata(metadata: Record<string, string | undefined>): ShippingAddress {
    const fullName = metadata.customer_name;
    const line1 = metadata.shipping_line1;
    const city = metadata.shipping_city;
    const state = metadata.shipping_state;
    const postalCode = metadata.shipping_postal_code;
    const country = metadata.shipping_country;

    if (!fullName || !line1 || !city || !state || !postalCode || !country) {
        throw new HttpError(400, 'Missing shipping address metadata in payment intent.');
    }

    return {
        fullName,
        line1,
        line2: metadata.shipping_line2,
        city,
        state,
        postalCode,
        country,
        phone: metadata.shipping_phone,
    };
}

export async function validateCheckoutCart(items: CheckoutItemInput[], executor: Queryable = { query }): Promise<PricedCart> {
    const variantIds = [...new Set(items.map((item) => item.variantId))];

    if (variantIds.length === 0) {
        throw new HttpError(400, 'Checkout requires at least one item.');
    }

    const result: QueryResult<PricingRow> = await executor.query(
        `
            SELECT
                v.id,
                v.product_id,
                v.sku,
                v.size_label,
                v.stock_quantity,
                v.price_override,
                p.name,
                p.slug,
                p.base_price,
                p.is_active
            FROM product_variants v
            INNER JOIN products p ON p.id = v.product_id
            WHERE v.id = ANY($1::bigint[])
        `,
        [variantIds],
    );

    const pricingByVariantId = new Map<number, PricingRow>();

    for (const row of result.rows) {
        pricingByVariantId.set(Number(row.id), row);
    }

    const pricedItems = items.map<PricedCartItem>((item) => {
        const row = pricingByVariantId.get(item.variantId);

        if (!row || !row.is_active) {
            throw new HttpError(400, `Variant ${item.variantId} is not available.`);
        }

        if (Number(row.stock_quantity) < Number(item.quantity)) {
            throw new HttpError(409, `Variant ${item.variantId} does not have enough inventory.`);
        }

        const unitPrice = Number(row.price_override ?? row.base_price);

        return {
            variantId: Number(row.id),
            productId: Number(row.product_id),
            productName: row.name,
            productSlug: row.slug,
            sku: row.sku,
            sizeLabel: row.size_label,
            quantity: Number(item.quantity),
            unitPrice,
            lineTotal: unitPrice * Number(item.quantity),
        };
    });

    const subtotal = pricedItems.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    const shippingAmount = Number(calculateShipping(subtotal));

    return {
        items: pricedItems,
        subtotal,
        shippingAmount,
        totalAmount: Number(subtotal) + shippingAmount,
    };
}

export async function createCheckoutSession(payload: CheckoutRequest): Promise<CheckoutSessionResponse> {
    const pricedCart = await validateCheckoutCart(payload.items);
    const orderReference = randomUUID();
    const subtotal = Number(pricedCart.subtotal);
    const shippingAmount = Number(pricedCart.shippingAmount);
    const totalAmount = Number(pricedCart.totalAmount);
    const normalizedItems = pricedCart.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
    }));

    const paymentIntent = await createPaymentIntent({
        amount: totalAmount,
        customerEmail: payload.customerEmail,
        metadata: {
            order_reference: orderReference,
            customer_email: payload.customerEmail,
            customer_name: payload.shippingAddress.fullName,
            shipping_line1: payload.shippingAddress.line1,
            shipping_line2: payload.shippingAddress.line2 ?? '',
            shipping_city: payload.shippingAddress.city,
            shipping_state: payload.shippingAddress.state,
            shipping_postal_code: payload.shippingAddress.postalCode,
            shipping_country: payload.shippingAddress.country,
            shipping_phone: payload.shippingAddress.phone ?? '',
            cart_items: serializeCartItems(normalizedItems),
            ...encodeCartSnapshotMetadata(normalizedItems),
        },
    });

    if (!paymentIntent.client_secret) {
        throw new HttpError(502, 'Payment provider did not return a client secret.');
    }

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderReference,
        currency: env.STRIPE_CURRENCY,
        subtotal,
        shippingAmount,
        totalAmount,
        items: normalizedItems,
    };
}
