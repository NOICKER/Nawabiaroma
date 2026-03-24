import { HttpError } from '../middleware/errorHandler.js';
import type { FragranceNoteType, OrderStatus } from '../models/types.js';
import { deleteProductImageFromStorage } from '../services/storageService.js';
import { query, type Queryable, withTransaction } from '../server/config/database.js';

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
    stripePaymentIntentId: string | null;
    createdAt: Date | string;
    customerEmail: string | null;
    itemCount: number | string;
}

interface UpdatedAdminOrderRow {
    id: number | string;
    totalAmount: number | string;
    status: OrderStatus;
    trackingNumber: string | null;
    stripePaymentIntentId: string | null;
    createdAt: Date | string;
}

function mapAdminOrderRow(row: AdminOrderRow) {
    return {
        ...row,
        id: Number(row.id),
        totalAmount: Number(row.totalAmount),
        itemCount: Number(row.itemCount),
    };
}

function mapUpdatedAdminOrderRow(row: UpdatedAdminOrderRow) {
    return {
        ...row,
        id: Number(row.id),
        totalAmount: Number(row.totalAmount),
    };
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
}

export async function updateAdminProductRecord(id: number, payload: ProductPayload) {
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
                o.stripe_payment_intent_id AS "stripePaymentIntentId",
                o.created_at AS "createdAt",
                c.email AS "customerEmail",
                COALESCE(SUM(oi.quantity), 0) AS "itemCount"
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            LEFT JOIN order_items oi ON oi.order_id = o.id
            GROUP BY o.id, c.email
            ORDER BY o.created_at DESC, o.id DESC
        `,
    );

    return result.rows.map(mapAdminOrderRow);
}

export async function updateAdminOrderRecord(id: number, payload: OrderUpdatePayload) {
    const result = await query<UpdatedAdminOrderRow>(
        `
            UPDATE orders
            SET
                status = COALESCE($2, status),
                tracking_number = COALESCE($3, tracking_number)
            WHERE id = $1
            RETURNING
                id,
                total_amount AS "totalAmount",
                status,
                tracking_number AS "trackingNumber",
                stripe_payment_intent_id AS "stripePaymentIntentId",
                created_at AS "createdAt"
        `,
        [id, payload.status ?? null, payload.trackingNumber ?? null],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, 'Order not found.');
    }

    return mapUpdatedAdminOrderRow(result.rows[0]);
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
