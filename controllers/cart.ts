import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { addCartItem, getCart, removeCartItem, updateCartItem } from '../services/cartService.js';
import type { PersistentCart } from '../models/types.js';

const identifierSchema = z
    .object({
        sessionId: z.string().trim().min(1).optional(),
        session_id: z.string().trim().min(1).optional(),
        customerId: z.coerce.number().int().positive().optional(),
        customer_id: z.coerce.number().int().positive().optional(),
    })
    .passthrough()
    .transform((value) => ({
        sessionId: value.sessionId ?? value.session_id,
        customerId: value.customerId ?? value.customer_id,
    }))
    .refine((value) => value.sessionId || value.customerId, {
        message: 'A session_id or customer_id is required.',
    });

const addCartItemSchema = identifierSchema
    .and(
        z.object({
            variantId: z.coerce.number().int().positive().optional(),
            variant_id: z.coerce.number().int().positive().optional(),
            quantity: z.coerce.number().int().min(1).max(10).default(1),
        }),
    )
    .transform((value) => ({
        sessionId: value.sessionId,
        customerId: value.customerId,
        variantId: value.variantId ?? value.variant_id,
        quantity: value.quantity,
    }))
    .refine((value) => value.variantId !== undefined, {
        message: 'variant_id is required.',
    });

const removeCartItemSchema = identifierSchema
    .and(
        z.object({
            variantId: z.coerce.number().int().positive().optional(),
            variant_id: z.coerce.number().int().positive().optional(),
        }),
    )
    .transform((value) => ({
        sessionId: value.sessionId,
        customerId: value.customerId,
        variantId: value.variantId ?? value.variant_id,
    }))
    .refine((value) => value.variantId !== undefined, {
        message: 'variant_id is required.',
    });

const updateCartItemSchema = identifierSchema
    .and(
        z.object({
            variantId: z.coerce.number().int().positive().optional(),
            variant_id: z.coerce.number().int().positive().optional(),
            quantity: z.coerce.number().int().min(0).max(10),
        }),
    )
    .transform((value) => ({
        sessionId: value.sessionId,
        customerId: value.customerId,
        variantId: value.variantId ?? value.variant_id,
        quantity: value.quantity,
    }))
    .refine((value) => value.variantId !== undefined, {
        message: 'variant_id is required.',
    });

function parseSchema<T>(schema: z.ZodType<T>, payload: unknown, message: string) {
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
        throw new HttpError(400, message, parsed.error.flatten());
    }

    return parsed.data;
}

function getSingleHeaderValue(value: string | string[] | undefined) {
    if (typeof value === 'string') {
        return value;
    }

    return Array.isArray(value) ? value[0] : undefined;
}

function getSessionIdFromHeaders(req: Request) {
    return (
        getSingleHeaderValue(req.headers['x-session-id']) ??
        getSingleHeaderValue(req.headers['x-cart-session-id']) ??
        getSingleHeaderValue(req.headers['session-id']) ??
        getSingleHeaderValue(req.headers.sessionid)
    );
}

function formatCartResponse(cart: PersistentCart) {
    return {
        id: cart.id,
        customerId: cart.customerId,
        sessionId: cart.sessionId,
        status: cart.status,
        expiresAt: cart.expiresAt,
        updatedAt: cart.updatedAt,
        itemCount: cart.itemCount,
        subtotal: cart.subtotal,
        items: cart.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productSlug: item.productSlug,
            variantId: item.variantId,
            sku: item.sku,
            productName: item.productName,
            variant: item.sizeLabel,
            quantity: item.quantity,
            price: item.unitPrice,
            subtotal: item.lineTotal,
            primaryImageUrl: item.primaryImageUrl,
            stockQuantity: item.stockQuantity,
        })),
    };
}

export const getCartController = asyncHandler(async (req: Request, res: Response) => {
    const payload = parseSchema(
        identifierSchema,
        {
            ...req.query,
            sessionId:
                (typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined) ??
                (typeof req.query.session_id === 'string' ? req.query.session_id : undefined) ??
                getSessionIdFromHeaders(req),
        },
        'Invalid cart lookup parameters.',
    );
    const cart = await getCart(payload);

    res.status(200).json({
        data: formatCartResponse(cart),
    });
});

export const addCartItemController = asyncHandler(async (req: Request, res: Response) => {
    const payload = parseSchema(addCartItemSchema, req.body, 'Invalid add-to-cart payload.');

    if (payload.variantId === undefined) {
        throw new HttpError(400, 'variant_id is required.');
    }

    const cart = await addCartItem({
        ...payload,
        variantId: payload.variantId,
    });

    res.status(200).json({
        data: formatCartResponse(cart),
    });
});

export const removeCartItemController = asyncHandler(async (req: Request, res: Response) => {
    const payload = parseSchema(removeCartItemSchema, req.body, 'Invalid remove-from-cart payload.');

    if (payload.variantId === undefined) {
        throw new HttpError(400, 'variant_id is required.');
    }

    const cart = await removeCartItem({
        ...payload,
        variantId: payload.variantId,
    });

    res.status(200).json({
        data: formatCartResponse(cart),
    });
});

export const updateCartItemController = asyncHandler(async (req: Request, res: Response) => {
    const payload = parseSchema(updateCartItemSchema, req.body, 'Invalid update-cart payload.');

    if (payload.variantId === undefined) {
        throw new HttpError(400, 'variant_id is required.');
    }

    const cart = await updateCartItem({
        ...payload,
        variantId: payload.variantId,
    });

    res.status(200).json({
        data: formatCartResponse(cart),
    });
});
