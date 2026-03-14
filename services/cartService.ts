import { randomUUID } from 'node:crypto';
import type { QueryResult } from 'pg';
import { HttpError } from '../middleware/errorHandler.js';
import type { CartStatus, PersistentCart, PersistentCartItem } from '../models/types.js';
import type { Queryable } from '../server/config/database.js';
import { withTransaction } from '../server/config/database.js';

const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CART_ITEM_QUANTITY = 10;

export interface CartIdentityInput {
    sessionId?: string;
    customerId?: number;
}

export interface AddCartItemInput extends CartIdentityInput {
    variantId: number;
    quantity: number;
}

export interface RemoveCartItemInput extends CartIdentityInput {
    variantId: number;
}

export interface UpdateCartItemInput extends CartIdentityInput {
    variantId: number;
    quantity: number;
}

interface CartRow {
    id: number | string;
    customer_id: number | string | null;
    session_id: string;
    status: CartStatus;
    expires_at: Date | string;
    updated_at: Date | string;
}

interface CartAggregateRow extends CartRow {
    items: CartAggregateItemRow[] | null;
}

interface CartAggregateItemRow {
    id: number | string;
    variantId: number | string;
    productId: number | string;
    productName: string;
    productSlug: string;
    sku: string;
    sizeLabel: string;
    quantity: number;
    unitPrice: number | string;
    lineTotal: number | string;
    stockQuantity: number;
    primaryImageUrl: string | null;
}

interface CustomerExistsRow {
    id: number | string;
}

interface VariantRow {
    id: number | string;
    product_id: number | string;
    sku: string;
    size_label: string;
    stock_quantity: number;
    price_override: string | null;
    name: string;
    slug: string;
    base_price: string;
    is_active: boolean;
}

interface CartItemQuantityRow {
    quantity: number;
}

type ResolvedCart = CartRow & { id: number; customer_id: number | null };

function buildCartExpiry() {
    return new Date(Date.now() + CART_TTL_MS);
}

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeCartRow(row: CartRow): ResolvedCart {
    return {
        ...row,
        id: Number(row.id),
        customer_id: row.customer_id === null ? null : Number(row.customer_id),
    };
}

function mapCartItem(row: CartAggregateItemRow): PersistentCartItem {
    return {
        id: Number(row.id),
        variantId: Number(row.variantId),
        productId: Number(row.productId),
        productName: row.productName,
        productSlug: row.productSlug,
        sku: row.sku,
        sizeLabel: row.sizeLabel,
        quantity: row.quantity,
        unitPrice: Number(row.unitPrice),
        lineTotal: Number(row.lineTotal),
        stockQuantity: row.stockQuantity,
        primaryImageUrl: row.primaryImageUrl,
    };
}

function buildEmptyCart(input: CartIdentityInput): PersistentCart {
    return {
        id: null,
        customerId: input.customerId ?? null,
        sessionId: input.sessionId ?? null,
        status: 'active',
        expiresAt: null,
        updatedAt: null,
        items: [],
        itemCount: 0,
        subtotal: 0,
    };
}

function mapCart(row: CartAggregateRow): PersistentCart {
    const items = (row.items ?? []).map(mapCartItem);
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
        id: Number(row.id),
        customerId: row.customer_id === null ? null : Number(row.customer_id),
        sessionId: row.session_id,
        status: row.status,
        expiresAt: toIsoString(row.expires_at),
        updatedAt: toIsoString(row.updated_at),
        items,
        itemCount,
        subtotal,
    };
}

function generateSyntheticSessionId(customerId?: number) {
    return customerId ? `customer:${customerId}:${randomUUID()}` : `guest:${randomUUID()}`;
}

function buildMergedSessionId(sessionId: string) {
    return `${sessionId}:merged:${randomUUID()}`;
}

function assertValidCartQuantity(quantity: number, options: { allowZero?: boolean } = {}) {
    if (!Number.isInteger(quantity)) {
        throw new HttpError(400, 'Quantity must be an integer.');
    }

    if (quantity < 0 || (!options.allowZero && quantity === 0)) {
        throw new HttpError(400, 'Quantity cannot be negative.');
    }

    if (quantity > MAX_CART_ITEM_QUANTITY) {
        throw new HttpError(400, `Quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}.`);
    }
}

async function ensureCustomerExists(customerId: number, executor: Queryable) {
    const result = await executor.query<CustomerExistsRow>(
        `
            SELECT id
            FROM customers
            WHERE id = $1
            LIMIT 1
        `,
        [customerId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Customer not found.');
    }
}

async function findCartBySessionId(sessionId: string, executor: Queryable) {
    const result = await executor.query<CartRow>(
        `
            SELECT
                id,
                customer_id,
                session_id,
                status,
                expires_at,
                updated_at
            FROM carts
            WHERE session_id = $1
            ORDER BY (status = 'active') DESC, updated_at DESC, id DESC
            LIMIT 1
        `,
        [sessionId],
    );

    if (result.rowCount === 0) {
        return null;
    }

    return normalizeCartRow(result.rows[0]);
}

async function findCartByCustomerId(customerId: number, executor: Queryable) {
    const result = await executor.query<CartRow>(
        `
            SELECT
                id,
                customer_id,
                session_id,
                status,
                expires_at,
                updated_at
            FROM carts
            WHERE customer_id = $1
            ORDER BY (status = 'active') DESC, updated_at DESC, id DESC
            LIMIT 1
        `,
        [customerId],
    );

    if (result.rowCount === 0) {
        return null;
    }

    return normalizeCartRow(result.rows[0]);
}

async function createCart(input: { sessionId: string; customerId?: number }, executor: Queryable): Promise<ResolvedCart> {
    const expiresAt = buildCartExpiry();
    const result = await executor.query<CartRow>(
        `
            INSERT INTO carts (
                customer_id,
                session_id,
                status,
                expires_at,
                updated_at
            )
            VALUES ($1, $2, 'active', $3, NOW())
            RETURNING
                id,
                customer_id,
                session_id,
                status,
                expires_at,
                updated_at
        `,
        [input.customerId ?? null, input.sessionId, expiresAt],
    );

    return normalizeCartRow(result.rows[0]);
}

async function activateCart(cartId: number, input: CartIdentityInput, executor: Queryable): Promise<ResolvedCart> {
    const expiresAt = buildCartExpiry();
    const result = await executor.query<CartRow>(
        `
            UPDATE carts
            SET customer_id = COALESCE($2, customer_id),
                session_id = COALESCE($3, session_id),
                status = 'active',
                expires_at = $4,
                updated_at = NOW()
            WHERE id = $1
            RETURNING
                id,
                customer_id,
                session_id,
                status,
                expires_at,
                updated_at
        `,
        [cartId, input.customerId ?? null, input.sessionId ?? null, expiresAt],
    );

    return normalizeCartRow(result.rows[0]);
}

async function touchCart(cartId: number, executor: Queryable) {
    const expiresAt = buildCartExpiry();

    await executor.query(
        `
            UPDATE carts
            SET status = 'active',
                expires_at = $2,
                updated_at = NOW()
            WHERE id = $1
        `,
        [cartId, expiresAt],
    );
}

async function mergeGuestCartIntoCustomerCart(
    sourceCart: Awaited<ReturnType<typeof findCartBySessionId>>,
    targetCart: Awaited<ReturnType<typeof findCartByCustomerId>>,
    input: Required<Pick<CartIdentityInput, 'customerId'>> & CartIdentityInput,
    executor: Queryable,
): Promise<ResolvedCart> {
    if (!sourceCart || !targetCart) {
        throw new HttpError(500, 'Cannot merge cart without both source and target carts.');
    }

    const desiredSessionId = input.sessionId ?? targetCart.session_id;

    await executor.query(
        `
            INSERT INTO cart_items (
                cart_id,
                product_variant_id,
                quantity,
                created_at,
                updated_at
            )
            SELECT
                $1,
                product_variant_id,
                quantity,
                NOW(),
                NOW()
            FROM cart_items
            WHERE cart_id = $2
            ON CONFLICT (cart_id, product_variant_id)
            DO UPDATE
            SET quantity = cart_items.quantity + EXCLUDED.quantity,
                updated_at = NOW()
        `,
        [targetCart.id, sourceCart.id],
    );

    await executor.query(`DELETE FROM cart_items WHERE cart_id = $1`, [sourceCart.id]);

    if (sourceCart.session_id === desiredSessionId && targetCart.session_id !== desiredSessionId) {
        await executor.query(
            `
                UPDATE carts
                SET session_id = $2,
                    status = 'converted',
                    updated_at = NOW()
                WHERE id = $1
            `,
            [sourceCart.id, buildMergedSessionId(sourceCart.session_id)],
        );
    } else {
        await executor.query(
            `
                UPDATE carts
                SET status = 'converted',
                    updated_at = NOW()
                WHERE id = $1
            `,
            [sourceCart.id],
        );
    }

    return activateCart(targetCart.id, { customerId: input.customerId, sessionId: desiredSessionId }, executor);
}

async function getCartById(cartId: number, executor: Queryable): Promise<PersistentCart> {
    const result: QueryResult<CartAggregateRow> = await executor.query(
        `
            SELECT
                c.id,
                c.customer_id,
                c.session_id,
                c.status,
                c.expires_at,
                c.updated_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', ci.id,
                            'variantId', pv.id,
                            'productId', p.id,
                            'productName', p.name,
                            'productSlug', p.slug,
                            'sku', pv.sku,
                            'sizeLabel', pv.size_label,
                            'quantity', ci.quantity,
                            'unitPrice', COALESCE(pv.price_override, p.base_price),
                            'lineTotal', COALESCE(pv.price_override, p.base_price) * ci.quantity,
                            'stockQuantity', pv.stock_quantity,
                            'primaryImageUrl', image.url
                        )
                        ORDER BY ci.created_at ASC, ci.id ASC
                    ) FILTER (WHERE ci.id IS NOT NULL),
                    '[]'::json
                ) AS items
            FROM carts c
            LEFT JOIN cart_items ci ON ci.cart_id = c.id
            LEFT JOIN product_variants pv ON pv.id = ci.product_variant_id
            LEFT JOIN products p ON p.id = pv.product_id
            LEFT JOIN LATERAL (
                SELECT url
                FROM product_images
                WHERE product_id = p.id
                ORDER BY is_primary DESC, display_order ASC, id ASC
                LIMIT 1
            ) image ON TRUE
            WHERE c.id = $1
            GROUP BY
                c.id,
                c.customer_id,
                c.session_id,
                c.status,
                c.expires_at,
                c.updated_at
        `,
        [cartId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Cart not found.');
    }

    return mapCart(result.rows[0]);
}

async function getVariant(variantId: number, executor: Queryable) {
    const result = await executor.query<VariantRow>(
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
            WHERE v.id = $1
            LIMIT 1
        `,
        [variantId],
    );

    if (result.rowCount === 0 || !result.rows[0].is_active) {
        throw new HttpError(404, 'Variant not found.');
    }

    return result.rows[0];
}

async function resolveCart(
    input: CartIdentityInput,
    options: { createIfMissing: boolean },
    executor: Queryable,
): Promise<ResolvedCart | null> {
    if (!input.sessionId && !input.customerId) {
        throw new HttpError(400, 'A session_id or customer_id is required.');
    }

    if (input.customerId) {
        await ensureCustomerExists(input.customerId, executor);
    }

    const sessionCart = input.sessionId ? await findCartBySessionId(input.sessionId, executor) : null;
    const customerCart = input.customerId ? await findCartByCustomerId(input.customerId, executor) : null;

    if (input.customerId && sessionCart && sessionCart.customer_id !== null && sessionCart.customer_id !== input.customerId) {
        throw new HttpError(409, 'Session cart belongs to a different customer.');
    }

    if (input.customerId && sessionCart && customerCart) {
        if (sessionCart.id === customerCart.id) {
            return activateCart(sessionCart.id, input, executor);
        }

        return mergeGuestCartIntoCustomerCart(sessionCart, customerCart, { ...input, customerId: input.customerId }, executor);
    }

    if (sessionCart) {
        return activateCart(sessionCart.id, input, executor);
    }

    if (customerCart) {
        return activateCart(customerCart.id, input, executor);
    }

    if (!options.createIfMissing) {
        return null;
    }

    return createCart(
        {
            sessionId: input.sessionId ?? generateSyntheticSessionId(input.customerId),
            customerId: input.customerId,
        },
        executor,
    );
}

export async function getCart(input: CartIdentityInput): Promise<PersistentCart> {
    return withTransaction(async (client) => {
        const cart = await resolveCart(input, { createIfMissing: false }, client);

        if (!cart) {
            return buildEmptyCart(input);
        }

        return getCartById(cart.id, client);
    });
}

export async function addCartItem(input: AddCartItemInput): Promise<PersistentCart> {
    return withTransaction(async (client) => {
        assertValidCartQuantity(input.quantity);

        const cart = await resolveCart(input, { createIfMissing: true }, client);

        if (!cart) {
            throw new HttpError(500, 'Cart could not be created.');
        }

        const variant = await getVariant(input.variantId, client);
        const quantityResult = await client.query<CartItemQuantityRow>(
            `
                SELECT quantity
                FROM cart_items
                WHERE cart_id = $1
                  AND product_variant_id = $2
                LIMIT 1
            `,
            [cart.id, input.variantId],
        );
        const existingQuantity = quantityResult.rowCount === 0 ? 0 : quantityResult.rows[0].quantity;
        const nextQuantity = existingQuantity + input.quantity;

        if (nextQuantity > MAX_CART_ITEM_QUANTITY) {
            throw new HttpError(400, `Quantity cannot exceed ${MAX_CART_ITEM_QUANTITY}.`);
        }

        if (variant.stock_quantity < nextQuantity) {
            throw new HttpError(409, `Variant ${input.variantId} does not have enough inventory.`);
        }

        await client.query(
            `
                INSERT INTO cart_items (
                    cart_id,
                    product_variant_id,
                    quantity,
                    created_at,
                    updated_at
                )
                VALUES ($1, $2, $3, NOW(), NOW())
                ON CONFLICT (cart_id, product_variant_id)
                DO UPDATE
                SET quantity = cart_items.quantity + EXCLUDED.quantity,
                    updated_at = NOW()
            `,
            [cart.id, input.variantId, input.quantity],
        );

        await touchCart(cart.id, client);

        return getCartById(cart.id, client);
    });
}

export async function removeCartItem(input: RemoveCartItemInput): Promise<PersistentCart> {
    return withTransaction(async (client) => {
        const cart = await resolveCart(input, { createIfMissing: false }, client);

        if (cart === null) {
            throw new HttpError(404, 'Cart not found.');
        }

        const quantityResult = await client.query<CartItemQuantityRow>(
            `
                SELECT quantity
                FROM cart_items
                WHERE cart_id = $1
                  AND product_variant_id = $2
                LIMIT 1
            `,
            [cart.id, input.variantId],
        );

        if (quantityResult.rowCount === 0) {
            throw new HttpError(404, 'Cart item not found.');
        }

        await client.query(
            `
                DELETE FROM cart_items
                WHERE cart_id = $1
                  AND product_variant_id = $2
            `,
            [cart.id, input.variantId],
        );

        await touchCart(cart.id, client);

        return getCartById(cart.id, client);
    });
}

export async function updateCartItem(input: UpdateCartItemInput): Promise<PersistentCart> {
    return withTransaction(async (client) => {
        assertValidCartQuantity(input.quantity, { allowZero: true });

        const cart = await resolveCart(input, { createIfMissing: false }, client);

        if (cart === null) {
            throw new HttpError(404, 'Cart not found.');
        }

        const quantityResult = await client.query<CartItemQuantityRow>(
            `
                SELECT quantity
                FROM cart_items
                WHERE cart_id = $1
                  AND product_variant_id = $2
                LIMIT 1
            `,
            [cart.id, input.variantId],
        );

        if (quantityResult.rowCount === 0) {
            throw new HttpError(404, 'Cart item not found.');
        }

        if (input.quantity === 0) {
            await client.query(
                `
                    DELETE FROM cart_items
                    WHERE cart_id = $1
                      AND product_variant_id = $2
                `,
                [cart.id, input.variantId],
            );
        } else {
            const variant = await getVariant(input.variantId, client);

            if (variant.stock_quantity < input.quantity) {
                throw new HttpError(409, `Variant ${input.variantId} does not have enough inventory.`);
            }

            await client.query(
                `
                    UPDATE cart_items
                    SET quantity = $3,
                        updated_at = NOW()
                    WHERE cart_id = $1
                      AND product_variant_id = $2
                `,
                [cart.id, input.variantId, input.quantity],
            );
        }

        await touchCart(cart.id, client);

        return getCartById(cart.id, client);
    });
}
