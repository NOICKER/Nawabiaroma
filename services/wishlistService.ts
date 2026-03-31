import { HttpError } from '../middleware/errorHandler.js';
import { pool } from '../server/config/database.js';

export interface WishlistItem {
    id: string; // BIGINT string
    customerId: string; // BIGINT string
    productId: string; // BIGINT string
    variantId: string; // BIGINT string
    createdAt: string;
    productName: string;
    productSlug: string;
    sku: string;
    sizeLabel: string;
    unitPrice: string;
    stockQuantity: number;
    primaryImageUrl: string | null;
}

export async function getWishlist(customerId: number): Promise<WishlistItem[]> {
    const result = await pool.query(
        `
        SELECT
            w.id,
            w.customer_id,
            w.product_id,
            w.variant_id,
            w.created_at,
            p.name as product_name,
            p.slug as product_slug,
            pv.sku,
            pv.size_label,
            COALESCE(pv.price_override, p.base_price) as unit_price,
            pv.stock_quantity,
            image.url as primary_image_url
        FROM wishlists w
        JOIN products p ON p.id = w.product_id
        JOIN product_variants pv ON pv.id = w.variant_id
        LEFT JOIN LATERAL (
            SELECT url
            FROM product_images
            WHERE product_id = p.id
            ORDER BY is_primary DESC, display_order ASC, id ASC
            LIMIT 1
        ) image ON TRUE
        WHERE w.customer_id = $1
        ORDER BY w.created_at DESC
        `,
        [customerId]
    );

    return result.rows.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        productId: row.product_id,
        variantId: row.variant_id,
        createdAt: row.created_at,
        productName: row.product_name,
        productSlug: row.product_slug,
        sku: row.sku,
        sizeLabel: row.size_label,
        unitPrice: row.unit_price,
        stockQuantity: Number(row.stock_quantity),
        primaryImageUrl: row.primary_image_url
    }));
}

export async function addWishlistItem(customerId: number, productId: number, variantId: number): Promise<void> {
    // Check if variant exists
    const variantResult = await pool.query(
        `
        SELECT p.id as product_id 
        FROM product_variants pv 
        JOIN products p ON pv.product_id = p.id 
        WHERE pv.id = $1 AND p.is_active = true
        `,
        [variantId]
    );

    if (variantResult.rowCount === 0) {
        throw new HttpError(404, 'Variant not found or product is inactive.');
    }

    if (Number(variantResult.rows[0].product_id) !== productId) {
        throw new HttpError(400, 'Variant does not belong to the specified product.');
    }

    await pool.query(
        `
        INSERT INTO wishlists (customer_id, product_id, variant_id, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (customer_id, variant_id) DO NOTHING
        `,
        [customerId, productId, variantId]
    );
}

export async function removeWishlistItem(customerId: number, variantId: number): Promise<void> {
    await pool.query(
        `
        DELETE FROM wishlists
        WHERE customer_id = $1 AND variant_id = $2
        `,
        [customerId, variantId]
    );
}
