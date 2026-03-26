import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getCustomerProfile } from '../services/customerService.js';
import { getCustomerOrderById, listOrdersByCustomerId } from '../services/orderService.js';

function getAuthenticatedCustomerId(req: Request) {
    const customerId = Number(req.customer?.sub);

    if (!Number.isInteger(customerId) || customerId <= 0) {
        throw new HttpError(401, 'Invalid customer session.');
    }

    return customerId;
}

export const getAccountMeController = asyncHandler(async (req: Request, res: Response) => {
    const customer = await getCustomerProfile(getAuthenticatedCustomerId(req));

    res.status(200).json({
        data: customer,
    });
});

export const listAccountOrdersController = asyncHandler(async (req: Request, res: Response) => {
    const orders = await listOrdersByCustomerId(getAuthenticatedCustomerId(req));

    res.status(200).json({
        data: orders,
    });
});

export const getAccountOrderController = asyncHandler(async (req: Request, res: Response) => {
    const orderId = Number(req.params.orderId);

    if (!Number.isInteger(orderId) || orderId <= 0) {
        throw new HttpError(400, 'Invalid order id.');
    }

    const order = await getCustomerOrderById(getAuthenticatedCustomerId(req), orderId);

    res.status(200).json({
        data: order,
    });
});
