import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { allowedUploadContentTypes, orderStatuses, type UploadUrlRequest } from '../models/types.js';
import {
    createAdminArticleRecord,
    createAdminFragranceNoteRecord,
    createAdminPageRecord,
    createAdminProductRecord,
    createAdminProductVariantRecord,
    deleteAdminArticleRecord,
    deleteAdminFragranceNoteRecord,
    deleteAdminPageRecord,
    deleteAdminProductRecord,
    deleteAdminProductVariantRecord,
    listAdminArticles,
    listAdminOrders,
    listAdminPages,
    listAdminProducts,
    updateAdminArticleRecord,
    updateAdminOrderRecord,
    updateAdminPageRecord,
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

const fragranceNotePayloadSchema = z.object({
    type: z.enum(['top', 'heart', 'base']),
    note: z.string().min(1),
    displayOrder: z.coerce.number().int().min(0),
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

export const updateAdminOrder = asyncHandler(async (req: Request, res: Response) => {
    const parsed = orderUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid order update payload.', parsed.error.flatten());
    }

    const order = await updateAdminOrderRecord(parseId(req.params.id), parsed.data);
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
