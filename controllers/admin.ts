import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { allowedUploadContentTypes, orderStatuses, type UploadUrlRequest } from '../models/types.js';
import { getRequestLogContext, logger } from '../services/logger.js';
import {
    createAdminUserRecord,
    createAdminProductImageRecord,
    createAdminPromoCodeRecord,
    createAdminArticleRecord,
    createAdminFragranceNoteRecord,
    createAdminPageRecord,
    createAdminProductRecord,
    createAdminProductVariantRecord,
    deleteAdminProductImageRecord,
    deleteAdminPromoCodeRecord,
    deleteAdminArticleRecord,
    deleteAdminFragranceNoteRecord,
    deleteAdminPageRecord,
    deleteAdminProductRecord,
    deleteAdminProductVariantRecord,
    getAdminOrderRecord,
    getAdminProductDetailRecord,
    listAdminArticles,
    listAdminUserRecords,
    listAdminPromoCodes,
    listAdminOrders,
    listAdminPages,
    listAdminProducts,
    setAdminProductPrimaryImageRecord,
    updateAdminArticleRecord,
    updateAdminOrderRecord,
    updateAdminPageRecord,
    updateAdminPromoCodeRecord,
    updateAdminProductRecord,
    updateAdminProductVariantRecord,
} from '../services/adminService.js';
import { createProductImageUploadUrl } from '../services/storageService.js';

const uploadUrlSchema = z.object({
    fileName: z.string().min(1),
    contentType: z.enum(allowedUploadContentTypes),
});

const productPayloadSchema = z.object({
    slug: z.string().min(1),
    name: z.string().min(1),
    subName: z.string().nullable().optional(),
    tagline: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    size: z.string().nullable().optional(),
    basePrice: z.coerce.number().positive(),
    isActive: z.boolean().default(true),
});

const productVariantPayloadSchema = z.object({
    sku: z.string().min(1),
    sizeLabel: z.string().min(1),
    priceOverride: z.coerce.number().positive().nullable().optional(),
    stockQuantity: z.coerce.number().int().min(0),
});

const productImagePayloadSchema = z.object({
    url: z.string().url(),
    isPrimary: z.boolean().default(false),
    displayOrder: z.coerce.number().int().min(0).default(0),
});

const orderUpdateSchema = z
    .object({
        status: z.enum(orderStatuses).optional(),
        trackingNumber: z.string().min(1).nullable().optional(),
    })
    .refine((value) => value.status !== undefined || value.trackingNumber !== undefined, {
        message: 'Provide status or tracking number.',
    });

const articlePayloadSchema = z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().nullable().optional(),
    contentHtml: z.string().nullable().optional(),
    coverImageUrl: z.string().nullable().optional(),
    isPublished: z.boolean().default(false),
    publishedAt: z.string().datetime().nullable().optional(),
});

const pagePayloadSchema = z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    contentHtml: z.string().nullable().optional(),
});

const adminUserPayloadSchema = z.object({
    email: z.string().trim().email(),
    initials: z.string().trim().min(1).max(8),
    password: z.string().min(8),
});

const fragranceNotePayloadSchema = z.object({
    type: z.enum(['top', 'heart', 'base']),
    note: z.string().min(1),
    displayOrder: z.coerce.number().int().min(0),
});

const promoCodePayloadSchema = z
    .object({
        code: z.string().trim().min(1).transform((value) => value.toUpperCase()),
        type: z.enum(['percentage', 'fixed_amount']),
        value: z.number().positive(),
        minOrderAmount: z.union([z.number().nonnegative(), z.null()]).optional(),
        maxUses: z.union([z.number().int().positive(), z.null()]).optional(),
        isActive: z.boolean().default(true),
        expiresAt: z.string().datetime().nullable().optional(),
    })
    .refine((value) => value.type !== 'percentage' || value.value <= 100, {
        message: 'Percentage promo codes cannot exceed 100.',
        path: ['value'],
    });

function getSingleParam(value: string | string[] | undefined, name: string) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new HttpError(400, `Invalid ${name}.`);
    }

    return value;
}

function parseId(value: string | string[] | undefined) {
    const parsed = Number(getSingleParam(value, 'resource id'));

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new HttpError(400, 'Invalid resource id.');
    }

    return parsed;
}

export const createUploadUrl = asyncHandler(async (req: Request, res: Response) => {
    const parsed = uploadUrlSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid upload request payload.', parsed.error.flatten());
    }

    const payload = parsed.data as UploadUrlRequest;
    const uploadUrl = await createProductImageUploadUrl(payload);

    res.status(201).json({
        data: uploadUrl,
    });
});

export const getAdminProducts = asyncHandler(async (_req: Request, res: Response) => {
    const products = await listAdminProducts();
    res.status(200).json({ data: products });
});

export const listAdminUsersController = asyncHandler(async (_req: Request, res: Response) => {
    const admins = await listAdminUserRecords();
    res.status(200).json({ data: admins });
});

export const createAdminUserController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = adminUserPayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid admin user payload.', parsed.error.flatten());
    }

    const admin = await createAdminUserRecord(parsed.data);
    res.status(201).json({ data: admin });
});

export const getAdminProduct = asyncHandler(async (req: Request, res: Response) => {
    const product = await getAdminProductDetailRecord(parseId(req.params.id));
    res.status(200).json({ data: product });
});

export const createAdminProduct = asyncHandler(async (req: Request, res: Response) => {
    const parsed = productPayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid product payload.', parsed.error.flatten());
    }

    const product = await createAdminProductRecord(parsed.data);
    res.status(201).json({ data: product });
});

export const updateAdminProduct = asyncHandler(async (req: Request, res: Response) => {
    const parsed = productPayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid product payload.', parsed.error.flatten());
    }

    const product = await updateAdminProductRecord(parseId(req.params.id), parsed.data);
    res.status(200).json({ data: product });
});

export const deleteAdminProduct = asyncHandler(async (req: Request, res: Response) => {
    const deletedProduct = await deleteAdminProductRecord(parseId(req.params.id));
    res.status(200).json({ data: deletedProduct });
});

export const createAdminProductImage = asyncHandler(async (req: Request, res: Response) => {
    const parsed = productImagePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid product image payload.', parsed.error.flatten());
    }

    const image = await createAdminProductImageRecord(parseId(req.params.id), parsed.data);
    res.status(201).json({ data: image });
});

export const deleteAdminProductImage = asyncHandler(async (req: Request, res: Response) => {
    const image = await deleteAdminProductImageRecord(parseId(req.params.id), parseId(req.params.imageId));
    res.status(200).json({ data: image });
});

export const setAdminProductPrimaryImage = asyncHandler(async (req: Request, res: Response) => {
    const image = await setAdminProductPrimaryImageRecord(parseId(req.params.id), parseId(req.params.imageId));
    res.status(200).json({ data: image });
});

export const createAdminProductVariant = asyncHandler(async (req: Request, res: Response) => {
    const parsed = productVariantPayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid product variant payload.', parsed.error.flatten());
    }

    const variant = await createAdminProductVariantRecord(parseId(req.params.id), parsed.data);
    res.status(201).json({ data: variant });
});

export const updateAdminProductVariant = asyncHandler(async (req: Request, res: Response) => {
    const parsed = productVariantPayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid product variant payload.', parsed.error.flatten());
    }

    const variant = await updateAdminProductVariantRecord(parseId(req.params.id), parseId(req.params.variantId), parsed.data);
    logger.info({
        event_type: 'admin_variant_updated',
        outcome: 'success',
        ...getRequestLogContext(req),
        product_id: parseId(req.params.id),
        variant_id: parseId(req.params.variantId),
        stock_quantity: parsed.data.stockQuantity,
    });
    res.status(200).json({ data: variant });
});

export const deleteAdminProductVariant = asyncHandler(async (req: Request, res: Response) => {
    const deletedVariant = await deleteAdminProductVariantRecord(parseId(req.params.id), parseId(req.params.variantId));
    res.status(200).json({ data: deletedVariant });
});

export const createAdminFragranceNote = asyncHandler(async (req: Request, res: Response) => {
    const parsed = fragranceNotePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid fragrance note payload.', parsed.error.flatten());
    }

    const note = await createAdminFragranceNoteRecord(parseId(req.params.id), parsed.data);
    res.status(201).json({ data: note });
});

export const deleteAdminFragranceNote = asyncHandler(async (req: Request, res: Response) => {
    const deletedNote = await deleteAdminFragranceNoteRecord(parseId(req.params.id), parseId(req.params.noteId));
    res.status(200).json({ data: deletedNote });
});

export const getAdminOrders = asyncHandler(async (_req: Request, res: Response) => {
    const orders = await listAdminOrders();
    res.status(200).json({ data: orders });
});

export const getAdminOrder = asyncHandler(async (req: Request, res: Response) => {
    const order = await getAdminOrderRecord(parseId(req.params.id));
    res.status(200).json({ data: order });
});

export const updateAdminOrder = asyncHandler(async (req: Request, res: Response) => {
    const parsed = orderUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid order update payload.', parsed.error.flatten());
    }

    const order = await updateAdminOrderRecord(parseId(req.params.id), parsed.data);
    logger.info({
        event_type: 'admin_order_updated',
        outcome: 'success',
        ...getRequestLogContext(req),
        order_id: order.id,
        status: order.status,
        tracking_number: order.trackingNumber,
    });
    res.status(200).json({ data: order });
});

export const getAdminArticles = asyncHandler(async (_req: Request, res: Response) => {
    const articles = await listAdminArticles();
    res.status(200).json({ data: articles });
});

export const createAdminArticle = asyncHandler(async (req: Request, res: Response) => {
    const parsed = articlePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid article payload.', parsed.error.flatten());
    }

    const article = await createAdminArticleRecord(parsed.data);
    res.status(201).json({ data: article });
});

export const updateAdminArticle = asyncHandler(async (req: Request, res: Response) => {
    const parsed = articlePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid article payload.', parsed.error.flatten());
    }

    const article = await updateAdminArticleRecord(parseId(req.params.id), parsed.data);
    res.status(200).json({ data: article });
});

export const deleteAdminArticle = asyncHandler(async (req: Request, res: Response) => {
    const deletedArticle = await deleteAdminArticleRecord(parseId(req.params.id));
    res.status(200).json({ data: deletedArticle });
});

export const getAdminPages = asyncHandler(async (_req: Request, res: Response) => {
    const pages = await listAdminPages();
    res.status(200).json({ data: pages });
});

export const createAdminPage = asyncHandler(async (req: Request, res: Response) => {
    const parsed = pagePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid page payload.', parsed.error.flatten());
    }

    const page = await createAdminPageRecord(parsed.data);
    res.status(201).json({ data: page });
});

export const updateAdminPage = asyncHandler(async (req: Request, res: Response) => {
    const parsed = pagePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid page payload.', parsed.error.flatten());
    }

    const page = await updateAdminPageRecord(parseId(req.params.id), parsed.data);
    res.status(200).json({ data: page });
});

export const deleteAdminPage = asyncHandler(async (req: Request, res: Response) => {
    const deletedPage = await deleteAdminPageRecord(parseId(req.params.id));
    res.status(200).json({ data: deletedPage });
});

export const getAdminPromoCodes = asyncHandler(async (_req: Request, res: Response) => {
    const promoCodes = await listAdminPromoCodes();
    res.status(200).json({ data: promoCodes });
});

export const createAdminPromoCode = asyncHandler(async (req: Request, res: Response) => {
    const parsed = promoCodePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid promo code payload.', parsed.error.flatten());
    }

    const promoCode = await createAdminPromoCodeRecord(parsed.data);
    res.status(201).json({ data: promoCode });
});

export const updateAdminPromoCode = asyncHandler(async (req: Request, res: Response) => {
    const parsed = promoCodePayloadSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid promo code payload.', parsed.error.flatten());
    }

    const promoCode = await updateAdminPromoCodeRecord(parseId(req.params.id), parsed.data);
    res.status(200).json({ data: promoCode });
});

export const deleteAdminPromoCode = asyncHandler(async (req: Request, res: Response) => {
    const deletedPromoCode = await deleteAdminPromoCodeRecord(parseId(req.params.id));
    res.status(200).json({ data: deletedPromoCode });
});
