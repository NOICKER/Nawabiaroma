import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getProductBySlug, listActiveProducts } from '../services/productService.js';

const PUBLIC_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

function getSingleParam(value: string | string[] | undefined, name: string) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new HttpError(400, `Invalid ${name}.`);
    }

    return value;
}

function parsePaginationValue(value: unknown, fallback: number, maximum: number) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0) {
        return fallback;
    }

    return Math.min(Math.trunc(parsed), maximum);
}

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
    const limit = parsePaginationValue(req.query.limit, 24, 100);
    const offset = parsePaginationValue(req.query.offset, 0, 10_000);
    const products = await listActiveProducts({ limit, offset });
    res.set('Cache-Control', PUBLIC_CACHE_CONTROL);

    res.status(200).json({
        data: products,
        pagination: {
            limit,
            offset,
        },
    });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
    const product = await getProductBySlug(getSingleParam(req.params.slug, 'product slug'));
    res.set('Cache-Control', PUBLIC_CACHE_CONTROL);

    res.status(200).json({
        data: product,
    });
});
