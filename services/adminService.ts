import { HttpError } from '../middleware/errorHandler.js';
import type { OrderStatus } from '../models/types.js';
import { query } from '../server/config/database.js';

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

export async function listAdminProducts() {
    const result = await query(
        `
            SELECT
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
            FROM products
            ORDER BY created_at DESC, id DESC
        `,
    );

    return result.rows;
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

export async function listAdminOrders() {
    const result = await query(
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

    return result.rows;
}

export async function updateAdminOrderRecord(id: number, payload: OrderUpdatePayload) {
    const result = await query(
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
