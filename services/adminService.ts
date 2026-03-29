import { HttpError } from '../middleware/errorHandler.js';
import type { FragranceNoteType, OrderStatus, PaymentMethod, PaymentStatus } from '../models/types.js';
import { deleteProductImageFromStorage } from '../services/storageService.js';
import { query, type Queryable, withTransaction } from '../server/config/database.js';
import { createAdmin, listAdmins } from './adminAuthService.js';

interface ProductPayload {
    slug: string;
    name: string;
    subName?: string | null;
    tagline?: string | null;
    description?: string | null;
    size?: string | null;
    basePrice: number;
    isActive: boolean;
}

interface OrderUpdatePayload {
    status?: OrderStatus;
    trackingNumber?: string | null;
}

interface ArticlePayload {
    slug: string;
    title: string;
    summary?: string | null;
    contentHtml?: string | null;
    coverImageUrl?: string | null;
    isPublished: boolean;
    publishedAt?: string | null;
}

interface PagePayload {
    slug: string;
    title: string;
    contentHtml?: string | null;
}

interface ProductVariantPayload {
    sku: string;
    sizeLabel: string;
    priceOverride?: number | null;
    stockQuantity: number;
}

interface ProductImagePayload {
    url: string;
    isPrimary: boolean;
    displayOrder: number;
}

interface FragranceNotePayload {
    type: FragranceNoteType;
    note: string;
    displayOrder: number;
}

type PromoCodeType = 'percentage' | 'fixed_amount';

interface PromoCodePayload {
    code: string;
    type: PromoCodeType;
    value: number;
    minOrderAmount?: number | null;
    maxUses?: number | null;
    isActive: boolean;
    expiresAt?: string | null;
}

interface AdminProductListRow {
    id: number | string;
    slug: string;
    name: string;
    subName: string | null;
    tagline: string | null;
    description: string | null;
    size: string | null;
    basePrice: number | string;
    isActive: boolean;
    createdAt: Date | string;
    primaryImageUrl: string | null;
}

interface AdminProductVariantRow {
    id: number | string;
    sku: string;
    sizeLabel: string;
    price: number | string;
    stockQuantity: number | string;
}

interface AdminProductImageRow {
    id: number | string;
    url: string;
    isPrimary: boolean;
    displayOrder: number | string;
}

interface AdminFragranceNoteRow {
    id: number | string;
    type: FragranceNoteType;
    note: string;
    displayOrder: number | string;
}

interface AdminProductDetailRow extends AdminProductListRow {
    variants: AdminProductVariantRow[] | null;
    notes: AdminFragranceNoteRow[] | null;
    images: AdminProductImageRow[] | null;
}

interface AdminOrderRow {
    id: number | string;
    totalAmount: number | string;
    status: OrderStatus;
    trackingNumber: string | null;
    paymentMethod: PaymentMethod | null;
    paymentStatus: PaymentStatus | null;
    createdAt: Date | string;
    customerEmail: string | null;
    itemCount: number | string;
}

interface AdminOrderItemRow {
    variantId: number | string;
    productId: number | string;
    productName: string;
    variant: string;
    quantity: number | string;
    price: number | string;
    subtotal: number | string;
}

interface AdminOrderDetailRow {
    id: number | string;
    subtotalAmount: number | string;
    totalAmount: number | string;
    status: OrderStatus;
    trackingNumber: string | null;
    paymentMethod: PaymentMethod | null;
    paymentStatus: PaymentStatus | null;
    createdAt: Date | string;
    customerEmail: string | null;
    shippingAddress: Record<string, unknown> | null;
    items: AdminOrderItemRow[] | null;
}

interface UpdatedAdminOrderRow {
    id: number | string;
    totalAmount: number | string;
    status: OrderStatus;
    trackingNumber: string | null;
    createdAt: Date | string;
}

interface PromoCodeRow {
    id: number | string;
    code: string;
    type: PromoCodeType;
    value: number | string;
    minOrderAmount: number | string | null;
    maxUses: number | string | null;
    timesUsed: number | string;
    isActive: boolean;
    expiresAt: Date | string | null;
    createdAt: Date | string;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';
const POSTGRES_FOREIGN_KEY_VIOLATION = '23503';

function mapAdminOrderRow(row: AdminOrderRow) {
    return {
        ...row,
        id: Number(row.id),
        totalAmount: Number(row.totalAmount),
        itemCount: Number(row.itemCount),
        paymentMethod: normalizePaymentMethod(row.paymentMethod, row.status),
        paymentStatus: row.paymentStatus ?? null,
    };
}

function mapUpdatedAdminOrderRow(row: UpdatedAdminOrderRow) {
    return {
        ...row,
        id: Number(row.id),
        totalAmount: Number(row.totalAmount),
    };
}

function normalizePaymentMethod(value: PaymentMethod | null, status: OrderStatus): PaymentMethod {
    if (value === 'online' || value === 'cod') {
        return value;
    }

    return status === 'processing' ? 'cod' : 'online';
}

function mapAdminOrderItem(row: AdminOrderItemRow) {
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

function mapAdminOrderDetailRow(row: AdminOrderDetailRow) {
    return {
        id: Number(row.id),
        subtotalAmount: Number(row.subtotalAmount),
        totalAmount: Number(row.totalAmount),
        status: row.status,
        trackingNumber: row.trackingNumber,
        paymentMethod: normalizePaymentMethod(row.paymentMethod, row.status),
        paymentStatus: row.paymentStatus ?? null,
        createdAt: toIsoString(row.createdAt),
        customerEmail: row.customerEmail,
        address: row.shippingAddress,
        items: (row.items ?? []).map(mapAdminOrderItem),
    };
}

function mapPromoCodeRow(row: PromoCodeRow) {
    return {
        id: Number(row.id),
        code: row.code,
        type: row.type,
        value: Number(row.value),
        minOrderAmount: row.minOrderAmount === null ? null : Number(row.minOrderAmount),
        maxUses: row.maxUses === null ? null : Number(row.maxUses),
        timesUsed: Number(row.timesUsed),
        isActive: row.isActive,
        expiresAt: row.expiresAt === null ? null : toIsoString(row.expiresAt),
        createdAt: toIsoString(row.createdAt),
    };
}

function normalizePromoCodePayload(payload: PromoCodePayload) {
    return {
        code: payload.code.trim().toUpperCase(),
        type: payload.type,
        value: payload.value,
        minOrderAmount: payload.minOrderAmount ?? null,
        maxUses: payload.maxUses ?? null,
        isActive: payload.isActive,
        expiresAt: payload.expiresAt ?? null,
    };
}

function isPromoCodeConflict(error: unknown) {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const databaseError = error as { code?: string; constraint?: string };

    return databaseError.code === POSTGRES_UNIQUE_VIOLATION && databaseError.constraint === 'promo_codes_code_key';
}

function isProductSlugConflict(error: unknown) {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const databaseError = error as { code?: string; constraint?: string };

    return databaseError.code === POSTGRES_UNIQUE_VIOLATION && databaseError.constraint === 'products_slug_key';
}

function isForeignKeyConflict(error: unknown) {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const databaseError = error as { code?: string };

    return databaseError.code === POSTGRES_FOREIGN_KEY_VIOLATION;
}

async function assertProductExists(productId: number) {
    return assertProductExistsWithExecutor(productId, { query });
}

async function assertProductExistsWithExecutor(productId: number, executor: Queryable) {
    const result = await executor.query(
        `
            SELECT 1
            FROM products
            WHERE id = $1
        `,
        [productId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Product not found.');
    }
}

function toIsoString(value: Date | string) {
    return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAdminProductImage(row: AdminProductImageRow) {
    return {
        id: Number(row.id),
        url: row.url,
        isPrimary: row.isPrimary,
        displayOrder: Number(row.displayOrder),
    };
}

function mapAdminProductListRow(row: AdminProductListRow) {
    return {
        id: Number(row.id),
        slug: row.slug,
        name: row.name,
        subName: row.subName,
        tagline: row.tagline,
        description: row.description,
        size: row.size,
        basePrice: Number(row.basePrice),
        isActive: row.isActive,
        primaryImageUrl: row.primaryImageUrl,
        createdAt: toIsoString(row.createdAt),
    };
}

export async function listAdminProducts() {
    const result = await query<AdminProductListRow>(
        `
            SELECT
                p.id,
                p.slug,
                p.name,
                p.sub_name AS "subName",
                p.tagline,
                p.description,
                p.size,
                p.base_price AS "basePrice",
                p.is_active AS "isActive",
                p.created_at AS "createdAt",
                image.url AS "primaryImageUrl"
            FROM products p
            LEFT JOIN LATERAL (
                SELECT url
                FROM product_images
                WHERE product_id = p.id
                ORDER BY is_primary DESC, display_order ASC, id ASC
                LIMIT 1
            ) image ON TRUE
            ORDER BY p.created_at DESC, p.id DESC
        `,
    );

    return result.rows.map(mapAdminProductListRow);
}

export async function getAdminProductDetailRecord(id: number) {
    const result = await query<AdminProductDetailRow>(
        `
            SELECT
                p.id,
                p.slug,
                p.name,
                p.sub_name AS "subName",
                p.tagline,
                p.description,
                p.size,
                p.base_price AS "basePrice",
                p.is_active AS "isActive",
                p.created_at AS "createdAt",
                image.url AS "primaryImageUrl",
                COALESCE(variants.variants, '[]'::json) AS variants,
                COALESCE(notes.notes, '[]'::json) AS notes,
                COALESCE(images.images, '[]'::json) AS images
            FROM products p
            LEFT JOIN LATERAL (
                SELECT url
                FROM product_images
                WHERE product_id = p.id
                ORDER BY is_primary DESC, display_order ASC, id ASC
                LIMIT 1
            ) image ON TRUE
            LEFT JOIN LATERAL (
                SELECT json_agg(
                    json_build_object(
                        'id', pv.id,
                        'sku', pv.sku,
                        'sizeLabel', pv.size_label,
                        'price', COALESCE(pv.price_override, p.base_price),
                        'stockQuantity', pv.stock_quantity
                    )
                    ORDER BY pv.id ASC
                ) AS variants
                FROM product_variants pv
                WHERE pv.product_id = p.id
            ) variants ON TRUE
            LEFT JOIN LATERAL (
                SELECT json_agg(
                    json_build_object(
                        'id', fn.id,
                        'type', fn.type,
                        'note', fn.note,
                        'displayOrder', fn.display_order
                    )
                    ORDER BY fn.display_order ASC, fn.id ASC
                ) AS notes
                FROM fragrance_notes fn
                WHERE fn.product_id = p.id
            ) notes ON TRUE
            LEFT JOIN LATERAL (
                SELECT json_agg(
                    json_build_object(
                        'id', pi.id,
                        'url', pi.url,
                        'isPrimary', pi.is_primary,
                        'displayOrder', pi.display_order
                    )
                    ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
                ) AS images
                FROM product_images pi
                WHERE pi.product_id = p.id
            ) images ON TRUE
            WHERE p.id = $1
            LIMIT 1
        `,
        [id],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Product not found.');
    }

    const row = result.rows[0];

    return {
        ...mapAdminProductListRow(row),
        variants: (row.variants ?? []).map((variant) => ({
            id: Number(variant.id),
            sku: variant.sku,
            sizeLabel: variant.sizeLabel,
            price: Number(variant.price),
            stockQuantity: Number(variant.stockQuantity),
        })),
        notes: (row.notes ?? []).map((note) => ({
            id: Number(note.id),
            type: note.type,
            note: note.note,
            displayOrder: Number(note.displayOrder),
        })),
        images: (row.images ?? []).map(mapAdminProductImage),
    };
}

export async function createAdminProductRecord(payload: ProductPayload) {
    try {
        const result = await query(
            `
                INSERT INTO products (
                    slug,
                    name,
                    sub_name,
                    tagline,
                    description,
                    size,
                    base_price,
                    is_active
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING
                    id,
                    slug,
                    name,
                    sub_name AS "subName",
                    tagline,
                    description,
                    size,
                    base_price AS "basePrice",
                    is_active AS "isActive",
                    created_at AS "createdAt"
            `,
            [
                payload.slug,
                payload.name,
                payload.subName ?? null,
                payload.tagline ?? null,
                payload.description ?? null,
                payload.size ?? null,
                payload.basePrice,
                payload.isActive,
            ],
        );

        return result.rows[0];
    } catch (error) {
        if (isProductSlugConflict(error)) {
            throw new HttpError(409, 'A product with this slug already exists.');
        }

        throw error;
    }
}

export async function updateAdminProductRecord(id: number, payload: ProductPayload) {
    try {
        const result = await query(
            `
                UPDATE products
                SET
                    slug = $2,
                    name = $3,
                    sub_name = $4,
                    tagline = $5,
                    description = $6,
                    size = $7,
                    base_price = $8,
                    is_active = $9
                WHERE id = $1
                RETURNING
                    id,
                    slug,
                    name,
                    sub_name AS "subName",
                    tagline,
                    description,
                    size,
                    base_price AS "basePrice",
                    is_active AS "isActive",
                    created_at AS "createdAt"
            `,
            [
                id,
                payload.slug,
                payload.name,
                payload.subName ?? null,
                payload.tagline ?? null,
                payload.description ?? null,
                payload.size ?? null,
                payload.basePrice,
                payload.isActive,
            ],
        );

        if (result.rowCount === 0) {
            throw new HttpError(404, 'Product not found.');
        }

        return result.rows[0];
    } catch (error) {
        if (isProductSlugConflict(error)) {
            throw new HttpError(409, 'A product with this slug already exists.');
        }

        throw error;
    }
}

export async function createAdminProductImageRecord(productId: number, payload: ProductImagePayload) {
    return withTransaction(async (client) => {
        await assertProductExistsWithExecutor(productId, client);

        const primaryResult = await client.query<{ id: number | string }>(
            `
                SELECT id
                FROM product_images
                WHERE product_id = $1
                  AND is_primary = TRUE
                LIMIT 1
            `,
            [productId],
        );
        const shouldBePrimary = payload.isPrimary || primaryResult.rowCount === 0;

        if (shouldBePrimary) {
            await client.query(
                `
                    UPDATE product_images
                    SET is_primary = FALSE
                    WHERE product_id = $1
                `,
                [productId],
            );
        }

        const result = await client.query<AdminProductImageRow>(
            `
                INSERT INTO product_images (
                    product_id,
                    url,
                    is_primary,
                    display_order
                )
                VALUES ($1, $2, $3, $4)
                RETURNING
                    id,
                    url,
                    is_primary AS "isPrimary",
                    display_order AS "displayOrder"
            `,
            [productId, payload.url, shouldBePrimary, payload.displayOrder],
        );

        return mapAdminProductImage(result.rows[0]);
    });
}

export async function deleteAdminProductImageRecord(productId: number, imageId: number) {
    return withTransaction(async (client) => {
        await assertProductExistsWithExecutor(productId, client);

        const deleteResult = await client.query<AdminProductImageRow>(
            `
                DELETE FROM product_images
                WHERE product_id = $1
                  AND id = $2
                RETURNING
                    id,
                    url,
                    is_primary AS "isPrimary",
                    display_order AS "displayOrder"
            `,
            [productId, imageId],
        );

        if (deleteResult.rowCount === 0) {
            throw new HttpError(404, 'Product image not found.');
        }

        const deletedImage = deleteResult.rows[0];

        if (deletedImage.isPrimary) {
            const nextPrimaryResult = await client.query<{ id: number | string }>(
                `
                    SELECT id
                    FROM product_images
                    WHERE product_id = $1
                    ORDER BY display_order ASC, id ASC
                    LIMIT 1
                `,
                [productId],
            );

            if ((nextPrimaryResult.rowCount ?? 0) > 0) {
                await client.query(
                    `
                        UPDATE product_images
                        SET is_primary = CASE WHEN id = $2 THEN TRUE ELSE FALSE END
                        WHERE product_id = $1
                    `,
                    [productId, Number(nextPrimaryResult.rows[0].id)],
                );
            }
        }

        await deleteProductImageFromStorage(deletedImage.url);

        return mapAdminProductImage(deletedImage);
    });
}

export async function setAdminProductPrimaryImageRecord(productId: number, imageId: number) {
    return withTransaction(async (client) => {
        await assertProductExistsWithExecutor(productId, client);

        const imageResult = await client.query<AdminProductImageRow>(
            `
                SELECT
                    id,
                    url,
                    is_primary AS "isPrimary",
                    display_order AS "displayOrder"
                FROM product_images
                WHERE product_id = $1
                  AND id = $2
                LIMIT 1
            `,
            [productId, imageId],
        );

        if (imageResult.rowCount === 0) {
            throw new HttpError(404, 'Product image not found.');
        }

        await client.query(
            `
                UPDATE product_images
                SET is_primary = CASE WHEN id = $2 THEN TRUE ELSE FALSE END
                WHERE product_id = $1
            `,
            [productId, imageId],
        );

        return {
            ...mapAdminProductImage(imageResult.rows[0]),
            isPrimary: true,
        };
    });
}

export async function deleteAdminProductRecord(id: number) {
    try {
        const result = await query(
            `
                DELETE FROM products
                WHERE id = $1
                RETURNING id
            `,
            [id],
        );

        if (result.rowCount === 0) {
            throw new HttpError(404, 'Product not found.');
        }

        return result.rows[0];
    } catch (error) {
        if (isForeignKeyConflict(error)) {
            throw new HttpError(409, 'Cannot delete product because it has associated orders or active carts. Please mark it as inactive instead.');
        }

        throw error;
    }
}

export async function createAdminProductVariantRecord(productId: number, payload: ProductVariantPayload) {
    const result = await query(
        `
            INSERT INTO product_variants (
                product_id,
                sku,
                size_label,
                price_override,
                stock_quantity
            )
            SELECT
                p.id,
                $2,
                $3,
                $4,
                $5
            FROM products p
            WHERE p.id = $1
            RETURNING
                id,
                product_id AS "productId",
                sku,
                size_label AS "sizeLabel",
                price_override AS "priceOverride",
                stock_quantity AS "stockQuantity"
        `,
        [productId, payload.sku, payload.sizeLabel, payload.priceOverride ?? null, payload.stockQuantity],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Product not found.');
    }

    return result.rows[0];
}

export async function updateAdminProductVariantRecord(productId: number, variantId: number, payload: ProductVariantPayload) {
    await assertProductExists(productId);

    const result = await query(
        `
            UPDATE product_variants
            SET
                sku = $3,
                size_label = $4,
                price_override = $5,
                stock_quantity = $6
            WHERE product_id = $1
              AND id = $2
            RETURNING
                id,
                product_id AS "productId",
                sku,
                size_label AS "sizeLabel",
                price_override AS "priceOverride",
                stock_quantity AS "stockQuantity"
        `,
        [productId, variantId, payload.sku, payload.sizeLabel, payload.priceOverride ?? null, payload.stockQuantity],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Variant not found.');
    }

    return result.rows[0];
}

export async function deleteAdminProductVariantRecord(productId: number, variantId: number) {
    await assertProductExists(productId);

    try {
        const result = await query(
            `
                DELETE FROM product_variants
                WHERE product_id = $1
                  AND id = $2
                RETURNING id
            `,
            [productId, variantId],
        );

        if (result.rowCount === 0) {
            throw new HttpError(404, 'Variant not found.');
        }

        return result.rows[0];
    } catch (error) {
        if (isForeignKeyConflict(error)) {
            throw new HttpError(409, 'Cannot delete variant because it has associated orders or active carts.');
        }

        throw error;
    }
}

export async function createAdminFragranceNoteRecord(productId: number, payload: FragranceNotePayload) {
    const result = await query(
        `
            INSERT INTO fragrance_notes (
                product_id,
                type,
                note,
                display_order
            )
            SELECT
                p.id,
                $2,
                $3,
                $4
            FROM products p
            WHERE p.id = $1
            RETURNING
                id,
                product_id AS "productId",
                type,
                note,
                display_order AS "displayOrder"
        `,
        [productId, payload.type, payload.note, payload.displayOrder],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Product not found.');
    }

    return result.rows[0];
}

export async function deleteAdminFragranceNoteRecord(productId: number, noteId: number) {
    await assertProductExists(productId);

    const result = await query(
        `
            DELETE FROM fragrance_notes
            WHERE product_id = $1
              AND id = $2
            RETURNING id
        `,
        [productId, noteId],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Fragrance note not found.');
    }

    return result.rows[0];
}

export async function listAdminOrders() {
    const result = await query<AdminOrderRow>(
        `
            SELECT
                o.id,
                o.total_amount AS "totalAmount",
                o.status,
                o.tracking_number AS "trackingNumber",
                o.payment_method AS "paymentMethod",
                payment.status AS "paymentStatus",
                o.created_at AS "createdAt",
                c.email AS "customerEmail",
                COALESCE(SUM(oi.quantity), 0) AS "itemCount"
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            LEFT JOIN LATERAL (
                SELECT p.status
                FROM payments p
                WHERE p.order_id = o.id
                ORDER BY p.created_at DESC, p.id DESC
                LIMIT 1
            ) payment ON TRUE
            GROUP BY o.id, c.email, payment.status
            ORDER BY o.created_at DESC, o.id DESC
        `,
    );

    return result.rows.map(mapAdminOrderRow);
}

export async function getAdminOrderRecord(id: number) {
    const result = await query<AdminOrderDetailRow>(
        `
            SELECT
                o.id,
                o.subtotal_amount AS "subtotalAmount",
                o.total_amount AS "totalAmount",
                o.status,
                o.tracking_number AS "trackingNumber",
                o.payment_method AS "paymentMethod",
                payment.status AS "paymentStatus",
                o.created_at AS "createdAt",
                o.shipping_address_json AS "shippingAddress",
                c.email AS "customerEmail",
                COALESCE(items.items, '[]'::json) AS items
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            LEFT JOIN LATERAL (
                SELECT p.status
                FROM payments p
                WHERE p.order_id = o.id
                ORDER BY p.created_at DESC, p.id DESC
                LIMIT 1
            ) payment ON TRUE
            LEFT JOIN LATERAL (
                SELECT json_agg(
                    json_build_object(
                        'variantId', oi.product_variant_id,
                        'productId', pv.product_id,
                        'productName', p.name,
                        'variant', pv.size_label,
                        'quantity', oi.quantity,
                        'price', oi.price_at_purchase,
                        'subtotal', oi.price_at_purchase * oi.quantity
                    )
                    ORDER BY oi.id ASC
                ) AS items
                FROM order_items oi
                INNER JOIN product_variants pv ON pv.id = oi.product_variant_id
                INNER JOIN products p ON p.id = pv.product_id
                WHERE oi.order_id = o.id
            ) items ON TRUE
            WHERE o.id = $1
            LIMIT 1
        `,
        [id],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Order not found.');
    }

    return mapAdminOrderDetailRow(result.rows[0]);
}

export async function updateAdminOrderRecord(id: number, payload: OrderUpdatePayload) {
    const hasStatus = Object.prototype.hasOwnProperty.call(payload, 'status');
    const hasTrackingNumber = Object.prototype.hasOwnProperty.call(payload, 'trackingNumber');

    const result = await query<UpdatedAdminOrderRow>(
        `
            UPDATE orders
            SET
                status = CASE WHEN $2 THEN $3 ELSE status END,
                tracking_number = CASE WHEN $4 THEN $5 ELSE tracking_number END
            WHERE id = $1
            RETURNING
                id,
                total_amount AS "totalAmount",
                status,
                tracking_number AS "trackingNumber",
                created_at AS "createdAt"
        `,
        [id, hasStatus, payload.status ?? null, hasTrackingNumber, payload.trackingNumber ?? null],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Order not found.');
    }

    return mapUpdatedAdminOrderRow(result.rows[0]);
}

export async function listAdminPromoCodes() {
    const result = await query<PromoCodeRow>(
        `
            SELECT
                id,
                code,
                type,
                value,
                min_order_amount AS "minOrderAmount",
                max_uses AS "maxUses",
                times_used AS "timesUsed",
                is_active AS "isActive",
                expires_at AS "expiresAt",
                created_at AS "createdAt"
            FROM promo_codes
            ORDER BY created_at DESC, id DESC
        `,
    );

    return result.rows.map(mapPromoCodeRow);
}

export async function createAdminPromoCodeRecord(payload: PromoCodePayload) {
    const normalizedPayload = normalizePromoCodePayload(payload);

    try {
        const result = await query<PromoCodeRow>(
            `
                INSERT INTO promo_codes (
                    code,
                    type,
                    value,
                    min_order_amount,
                    max_uses,
                    is_active,
                    expires_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING
                    id,
                    code,
                    type,
                    value,
                    min_order_amount AS "minOrderAmount",
                    max_uses AS "maxUses",
                    times_used AS "timesUsed",
                    is_active AS "isActive",
                    expires_at AS "expiresAt",
                    created_at AS "createdAt"
            `,
            [
                normalizedPayload.code,
                normalizedPayload.type,
                normalizedPayload.value,
                normalizedPayload.minOrderAmount,
                normalizedPayload.maxUses,
                normalizedPayload.isActive,
                normalizedPayload.expiresAt,
            ],
        );

        return mapPromoCodeRow(result.rows[0]);
    } catch (error) {
        if (isPromoCodeConflict(error)) {
            throw new HttpError(409, 'A promo code with this code already exists.');
        }

        throw error;
    }
}

export async function updateAdminPromoCodeRecord(id: number, payload: PromoCodePayload) {
    const normalizedPayload = normalizePromoCodePayload(payload);

    try {
        const result = await query<PromoCodeRow>(
            `
                UPDATE promo_codes
                SET
                    code = $2,
                    type = $3,
                    value = $4,
                    min_order_amount = $5,
                    max_uses = $6,
                    is_active = $7,
                    expires_at = $8
                WHERE id = $1
                RETURNING
                    id,
                    code,
                    type,
                    value,
                    min_order_amount AS "minOrderAmount",
                    max_uses AS "maxUses",
                    times_used AS "timesUsed",
                    is_active AS "isActive",
                    expires_at AS "expiresAt",
                    created_at AS "createdAt"
            `,
            [
                id,
                normalizedPayload.code,
                normalizedPayload.type,
                normalizedPayload.value,
                normalizedPayload.minOrderAmount,
                normalizedPayload.maxUses,
                normalizedPayload.isActive,
                normalizedPayload.expiresAt,
            ],
        );

        if (result.rowCount === 0) {
            throw new HttpError(404, 'Promo code not found.');
        }

        return mapPromoCodeRow(result.rows[0]);
    } catch (error) {
        if (isPromoCodeConflict(error)) {
            throw new HttpError(409, 'A promo code with this code already exists.');
        }

        throw error;
    }
}

export async function deleteAdminPromoCodeRecord(id: number) {
    const result = await query(
        `
            DELETE FROM promo_codes
            WHERE id = $1
            RETURNING id
        `,
        [id],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Promo code not found.');
    }

    return result.rows[0];
}

export async function listAdminArticles() {
    const result = await query(
        `
            SELECT
                id,
                slug,
                title,
                summary,
                content_html AS "contentHtml",
                cover_image_url AS "coverImageUrl",
                is_published AS "isPublished",
                published_at AS "publishedAt"
            FROM articles
            ORDER BY published_at DESC NULLS LAST, id DESC
        `,
    );

    return result.rows;
}

export async function createAdminArticleRecord(payload: ArticlePayload) {
    const result = await query(
        `
            INSERT INTO articles (
                slug,
                title,
                summary,
                content_html,
                cover_image_url,
                is_published,
                published_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING
                id,
                slug,
                title,
                summary,
                content_html AS "contentHtml",
                cover_image_url AS "coverImageUrl",
                is_published AS "isPublished",
                published_at AS "publishedAt"
        `,
        [
            payload.slug,
            payload.title,
            payload.summary ?? null,
            payload.contentHtml ?? null,
            payload.coverImageUrl ?? null,
            payload.isPublished,
            payload.publishedAt ?? null,
        ],
    );

    return result.rows[0];
}

export async function updateAdminArticleRecord(id: number, payload: ArticlePayload) {
    const result = await query(
        `
            UPDATE articles
            SET
                slug = $2,
                title = $3,
                summary = $4,
                content_html = $5,
                cover_image_url = $6,
                is_published = $7,
                published_at = $8
            WHERE id = $1
            RETURNING
                id,
                slug,
                title,
                summary,
                content_html AS "contentHtml",
                cover_image_url AS "coverImageUrl",
                is_published AS "isPublished",
                published_at AS "publishedAt"
        `,
        [
            id,
            payload.slug,
            payload.title,
            payload.summary ?? null,
            payload.contentHtml ?? null,
            payload.coverImageUrl ?? null,
            payload.isPublished,
            payload.publishedAt ?? null,
        ],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Article not found.');
    }

    return result.rows[0];
}

export async function deleteAdminArticleRecord(id: number) {
    const result = await query(
        `
            DELETE FROM articles
            WHERE id = $1
            RETURNING id
        `,
        [id],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Article not found.');
    }

    return result.rows[0];
}

export async function listAdminPages() {
    const result = await query(
        `
            SELECT
                id,
                slug,
                title,
                content_html AS "contentHtml",
                updated_at AS "updatedAt"
            FROM pages
            ORDER BY updated_at DESC, id DESC
        `,
    );

    return result.rows;
}

export async function createAdminPageRecord(payload: PagePayload) {
    const result = await query(
        `
            INSERT INTO pages (
                slug,
                title,
                content_html
            )
            VALUES ($1, $2, $3)
            RETURNING
                id,
                slug,
                title,
                content_html AS "contentHtml",
                updated_at AS "updatedAt"
        `,
        [payload.slug, payload.title, payload.contentHtml ?? null],
    );

    return result.rows[0];
}

export async function deleteAdminPageRecord(id: number) {
    const result = await query(
        `
            DELETE FROM pages
            WHERE id = $1
            RETURNING id
        `,
        [id],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Page not found.');
    }

    return result.rows[0];
}

export async function updateAdminPageRecord(id: number, payload: PagePayload) {
    const result = await query(
        `
            UPDATE pages
            SET
                slug = $2,
                title = $3,
                content_html = $4,
                updated_at = NOW()
            WHERE id = $1
            RETURNING
                id,
                slug,
                title,
                content_html AS "contentHtml",
                updated_at AS "updatedAt"
        `,
        [id, payload.slug, payload.title, payload.contentHtml ?? null],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Page not found.');
    }

    return result.rows[0];
}

export async function listAdminUserRecords() {
    return listAdmins();
}

export async function createAdminUserRecord(payload: { email: string; initials?: string | null; password: string }) {
    return createAdmin(payload);
}
