import { randomUUID } from 'node:crypto';
import { HttpError } from '../middleware/errorHandler.js';
import type { Queryable } from '../server/config/database.js';

const CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CartRow {
    id: number | string;
    customer_id: number | string | null;
    session_id: string;
}

interface OrderRow {
    id: number | string;
}

export interface ResolvedActiveCart {
    id: number;
    customerId: number | null;
    sessionId: string;
}

function buildCartExpiry() {
    return new Date(Date.now() + CART_TTL_MS);
}

function buildArchivedSessionId(sessionId: string) {
    return `${sessionId}:ordered:${randomUUID()}`;
}

function mapResolvedCart(row: CartRow): ResolvedActiveCart {
    return {
        id: Number(row.id),
        customerId: row.customer_id === null ? null : Number(row.customer_id),
        sessionId: row.session_id,
    };
}

export async function getExistingOrderIdByCartId(cartId: number, executor: Queryable) {
    const result = await executor.query<OrderRow>(
        `
            SELECT id
            FROM orders
            WHERE cart_id = $1
            LIMIT 1
        `,
        [cartId],
    );

    return result.rowCount === 0 ? null : Number(result.rows[0].id);
}

async function forkCartFromOrderedCart(
    cart: ResolvedActiveCart,
    input: { sessionId: string; customerId: number },
    executor: Queryable,
) {
    const expiresAt = buildCartExpiry();
    const archivedSessionId = cart.sessionId === input.sessionId ? buildArchivedSessionId(cart.sessionId) : cart.sessionId;

    await executor.query(
        `
            UPDATE carts
            SET session_id = $2,
                status = 'converted',
                expires_at = $3,
                updated_at = NOW()
            WHERE id = $1
        `,
        [cart.id, archivedSessionId, expiresAt],
    );

    const createdCartResult = await executor.query<CartRow>(
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
                session_id
        `,
        [input.customerId, input.sessionId, expiresAt],
    );

    const nextCart = mapResolvedCart(createdCartResult.rows[0]);

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
        [nextCart.id, cart.id],
    );

    await executor.query(`DELETE FROM cart_items WHERE cart_id = $1`, [cart.id]);

    return nextCart;
}

export async function ensureReusableActiveCart(
    input: { sessionId: string; customerId: number; expectedCartId?: number },
    executor: Queryable,
) {
    const result = await executor.query<CartRow>(
        `
            SELECT
                id,
                customer_id,
                session_id
            FROM carts
            WHERE session_id = $1
              AND status = 'active'
              AND ($2::bigint IS NULL OR id = $2)
            ORDER BY updated_at DESC, id DESC
            LIMIT 1
            FOR UPDATE
        `,
        [input.sessionId, input.expectedCartId ?? null],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Cart not found.');
    }

    const cart = mapResolvedCart(result.rows[0]);

    if (cart.customerId !== null && cart.customerId !== input.customerId) {
        throw new HttpError(403, 'Cart belongs to a different customer.');
    }

    const existingOrderId = await getExistingOrderIdByCartId(cart.id, executor);

    if (!existingOrderId) {
        return cart;
    }

    return forkCartFromOrderedCart(cart, input, executor);
}
