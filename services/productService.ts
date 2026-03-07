import { HttpError } from '../middleware/errorHandler.js';
import type { FragranceNote, ProductDetail, ProductImage, ProductSummary, ProductVariant } from '../models/types.js';
import { query } from '../server/config/database.js';

interface ProductSummaryRow {
    id: number | string;
    slug: string;
    name: string;
    sub_name: string | null;
    tagline: string | null;
    size: string | null;
    base_price: string;
    primary_image_url: string | null;
}

interface ProductDetailAggregateRow {
    id: number | string;
    slug: string;
    name: string;
    sub_name: string | null;
    tagline: string | null;
    description: string | null;
    size: string | null;
    base_price: string;
    variants: Array<{
        id: number | string;
        sku: string;
        sizeLabel: string;
        price: number | string;
        stockQuantity: number;
    }> | null;
    notes: Array<{
        id: number | string;
        type: 'top' | 'heart' | 'base';
        note: string;
        displayOrder: number;
    }> | null;
    images: Array<{
        id: number | string;
        url: string;
        isPrimary: boolean;
        displayOrder: number;
    }> | null;
}

function mapProductSummary(row: ProductSummaryRow): ProductSummary {
    return {
        id: Number(row.id),
        slug: row.slug,
        name: row.name,
        subName: row.sub_name,
        tagline: row.tagline,
        size: row.size,
        basePrice: Number(row.base_price),
        primaryImageUrl: row.primary_image_url,
    };
}

function mapVariant(row: {
    id: number | string;
    sku: string;
    sizeLabel: string;
    price: string | number;
    stockQuantity: number;
}): ProductVariant {
    return {
        id: Number(row.id),
        sku: row.sku,
        sizeLabel: row.sizeLabel,
        price: Number(row.price),
        stockQuantity: row.stockQuantity,
    };
}

function mapNote(row: {
    id: number | string;
    type: 'top' | 'heart' | 'base';
    note: string;
    displayOrder: number;
}): FragranceNote {
    return {
        id: Number(row.id),
        type: row.type,
        note: row.note,
        displayOrder: row.displayOrder,
    };
}

function mapImage(row: {
    id: number | string;
    url: string;
    isPrimary: boolean;
    displayOrder: number;
}): ProductImage {
    return {
        id: Number(row.id),
        url: row.url,
        isPrimary: row.isPrimary,
        displayOrder: row.displayOrder,
    };
}

export async function listActiveProducts(options: { limit: number; offset: number }): Promise<ProductSummary[]> {
    const result = await query<ProductSummaryRow>(
        `
            SELECT
                p.id,
                p.slug,
                p.name,
                p.sub_name,
                p.tagline,
                p.size,
                p.base_price,
                image.url AS primary_image_url
            FROM products p
            LEFT JOIN LATERAL (
                SELECT url
                FROM product_images
                WHERE product_id = p.id
                ORDER BY is_primary DESC, display_order ASC, id ASC
                LIMIT 1
            ) image ON TRUE
            WHERE p.is_active = TRUE
            ORDER BY p.created_at ASC, p.id ASC
            LIMIT $1
            OFFSET $2
        `,
        [options.limit, options.offset],
    );

    return result.rows.map(mapProductSummary);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail> {
    const productResult = await query<ProductDetailAggregateRow>(
        `
            SELECT
                p.id,
                p.slug,
                p.name,
                p.sub_name,
                p.tagline,
                p.description,
                p.size,
                p.base_price,
                COALESCE(variants.variants, '[]'::json) AS variants,
                COALESCE(notes.notes, '[]'::json) AS notes,
                COALESCE(images.images, '[]'::json) AS images
            FROM products p
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
            WHERE p.slug = $1
              AND p.is_active = TRUE
            LIMIT 1
        `,
        [slug],
    );

    if (productResult.rowCount === 0) {
        throw new HttpError(404, 'Product not found.');
    }

    const product = productResult.rows[0];
    const variants = (product.variants ?? []).map(mapVariant);
    const notes = (product.notes ?? []).map(mapNote);
    const images = (product.images ?? []).map(mapImage);

    return {
        ...mapProductSummary({
            id: product.id,
            slug: product.slug,
            name: product.name,
            sub_name: product.sub_name,
            tagline: product.tagline,
            size: product.size,
            base_price: product.base_price,
            primary_image_url: images[0]?.url ?? null,
        }),
        description: product.description,
        variants,
        notes,
        images,
    };
}
