import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { createCodOrder, createPaidOrder, getCustomerOrderById, listOrdersBySessionId } from '../services/orderService.js';

const paidOrderSchema = z.object({
    sessionId: z.string().trim().min(1),
    addressId: z.coerce.number().int().positive(),
    razorpayOrderId: z.string().trim().min(1),
    razorpayPaymentId: z.string().trim().min(1),
    razorpaySignature: z.string().trim().min(1),
});

const codOrderSchema = z.object({
    sessionId: z.string().trim().min(1),
    addressId: z.coerce.number().int().positive(),
});

const listOrdersSchema = z.object({
    sessionId: z.string().trim().min(1),
});

function getAuthenticatedCustomerId(req: Request) {
    const customerId = Number(req.customer?.sub);

    if (!Number.isInteger(customerId) || customerId <= 0) {
        throw new HttpError(401, 'Invalid customer session.');
    }

    return customerId;
}

export const createOrderController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = paidOrderSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid paid order payload.', parsed.error.flatten());
    }

    const order = await createPaidOrder({
        ...parsed.data,
        customerId: getAuthenticatedCustomerId(req),
    });

    res.status(201).json({
        data: order,
    });
});

export const createCodOrderController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = codOrderSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid COD order payload.', parsed.error.flatten());
    }

    const order = await createCodOrder({
        ...parsed.data,
        customerId: getAuthenticatedCustomerId(req),
    });

    res.status(201).json({
        data: order,
    });
});

export const getOrderController = asyncHandler(async (req: Request, res: Response) => {
    const orderId = Number(req.params.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new HttpError(400, 'Invalid order id.');
    }

    const order = await getCustomerOrderById(getAuthenticatedCustomerId(req), orderId);

    res.status(200).json({
        data: order,
    });
});

export const listOrdersController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = listOrdersSchema.safeParse(req.query);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid order lookup parameters.', parsed.error.flatten());
    }

    const orders = await listOrdersBySessionId(parsed.data.sessionId);

    res.status(200).json({
        data: orders,
    });
});
