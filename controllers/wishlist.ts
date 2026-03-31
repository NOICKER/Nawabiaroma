import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getWishlist, addWishlistItem, removeWishlistItem } from '../services/wishlistService.js';

const addWishlistItemSchema = z.object({
    productId: z.coerce.number().int().positive(),
    variantId: z.coerce.number().int().positive()
});

export const getWishlistController = asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.customer?.id;
    if (!customerId) {
        throw new HttpError(401, 'Unauthorized');
    }

    const items = await getWishlist(customerId);

    res.status(200).json({
        data: items,
    });
});

export const addWishlistItemController = asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.customer?.id;
    if (!customerId) {
        throw new HttpError(401, 'Unauthorized');
    }

    const parsed = addWishlistItemSchema.safeParse(req.body);
    if (!parsed.success) {
        throw new HttpError(400, 'Invalid payload', parsed.error.flatten());
    }

    const { productId, variantId } = parsed.data;

    await addWishlistItem(customerId, productId, variantId);

    // Return the updated wishlist after adding
    const items = await getWishlist(customerId);

    res.status(200).json({
        data: items,
    });
});

export const removeWishlistItemController = asyncHandler(async (req: Request, res: Response) => {
    const customerId = req.customer?.id;
    if (!customerId) {
        throw new HttpError(401, 'Unauthorized');
    }

    const variantIdParam = req.params.variantId;
    if (!variantIdParam) {
        throw new HttpError(400, 'variantId parameter is required');
    }

    const variantId = parseInt(variantIdParam, 10);
    if (isNaN(variantId)) {
        throw new HttpError(400, 'variantId must be a valid number');
    }

    await removeWishlistItem(customerId, variantId);

    // Return the updated wishlist after removing
    const items = await getWishlist(customerId);

    res.status(200).json({
        data: items,
    });
});
