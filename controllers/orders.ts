import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { orderStatuses } from '../models/types.js';
import { createOrderFromCartSession, getOrderById, listOrdersBySessionId, updateOrderStatus } from '../services/orderService.js';

const createOrderSchema = z
    .object({
        sessionId: z.string().trim().min(1).optional(),
        session_id: z.string().trim().min(1).optional(),
        addressId: z.coerce.number().int().positive().optional(),
        address_id: z.coerce.number().int().positive().optional(),
    })
    .transform((value) => ({
        sessionId: value.sessionId ?? value.session_id,
        addressId: value.addressId ?? value.address_id,
    }))
    .refine((value) => value.sessionId, {
        message: 'sessionId is required.',
    })
    .refine((value) => value.addressId, {
        message: 'addressId is required.',
    });

export const createOrderController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = createOrderSchema.safeParse(req.body);

    if (!parsed.success || !parsed.data.sessionId || !parsed.data.addressId) {
        throw new HttpError(400, 'Invalid order creation payload.', parsed.success ? undefined : parsed.error.flatten());
    }

    try {
        const order = await createOrderFromCartSession(parsed.data.sessionId, parsed.data.addressId);

        res.status(201).json({
            data: order,
        });
    } catch (error) {
        if (
            error instanceof HttpError &&
            error.statusCode === 409 &&
            error.message === 'Insufficient stock' &&
            error.details &&
            typeof error.details === 'object' &&
            'variantId' in error.details
        ) {
            const variantId = (error.details as { variantId: unknown }).variantId;

            return res.status(409).json({
                error: 'Insufficient stock',
                variantId,
            });
        }

        throw error;
    }
});

const orderIdParamSchema = z.object({
    orderId: z.coerce.number().int().positive(),
});

const orderStatusUpdateSchema = z.object({
    status: z.enum(orderStatuses),
});

const listOrdersSchema = z
    .object({
        sessionId: z.string().trim().min(1).optional(),
        session_id: z.string().trim().min(1).optional(),
    })
    .transform((value) => ({
        sessionId: value.sessionId ?? value.session_id,
    }))
    .refine((value) => value.sessionId, {
        message: 'sessionId is required.',
    });

export const getOrderController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = orderIdParamSchema.safeParse(req.params);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid order id.', parsed.error.flatten());
    }

    const order = await getOrderById(parsed.data.orderId);

    res.status(200).json({
        data: order,
    });
});

export const listOrdersController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = listOrdersSchema.safeParse(req.query);

    if (!parsed.success || !parsed.data.sessionId) {
        throw new HttpError(400, 'Invalid order lookup parameters.', parsed.success ? undefined : parsed.error.flatten());
    }

    const orders = await listOrdersBySessionId(parsed.data.sessionId);

    res.status(200).json({
        data: orders,
    });
});

export const updateOrderStatusController = asyncHandler(async (req: Request, res: Response) => {
    const params = orderIdParamSchema.safeParse(req.params);
    const body = orderStatusUpdateSchema.safeParse(req.body);

    if (!params.success) {
        throw new HttpError(400, 'Invalid order id.', params.error.flatten());
    }

    if (!body.success) {
        throw new HttpError(400, 'Invalid order status payload.', body.error.flatten());
    }

    const order = await updateOrderStatus(params.data.orderId, body.data.status);

    res.status(200).json({
        data: order,
    });
});
