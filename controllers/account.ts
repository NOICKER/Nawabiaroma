import type { Request, Response } from 'express';
import { customerAddressUpsertSchema } from './schemas/customerAddress.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { createCustomerAddress, deleteCustomerAddress, listAddressesByCustomerId, setDefaultAddress, updateCustomerAddress } from '../services/addressService.js';
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

function parseAddressPayload(payload: unknown) {
    const parsed = customerAddressUpsertSchema.safeParse(payload);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid address payload.', parsed.error.flatten());
    }

    return parsed.data;
}

function parseAddressId(rawAddressId: unknown) {
    if (typeof rawAddressId !== 'string') {
        throw new HttpError(400, 'Invalid address id.');
    }

    const addressId = Number(rawAddressId);

    if (!Number.isInteger(addressId) || addressId <= 0) {
        throw new HttpError(400, 'Invalid address id.');
    }

    return addressId;
}

export const listAccountAddressesController = asyncHandler(async (req: Request, res: Response) => {
    const addresses = await listAddressesByCustomerId(getAuthenticatedCustomerId(req));

    res.status(200).json({
        data: addresses,
    });
});

export const createAccountAddressController = asyncHandler(async (req: Request, res: Response) => {
    const customerId = getAuthenticatedCustomerId(req);
    const payload = parseAddressPayload(req.body);
    const address = await createCustomerAddress({
        customerId,
        label: payload.label,
        name: payload.name,
        phone: payload.phone,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
        country: payload.country,
        setAsDefault: payload.setAsDefault,
    });

    res.status(201).json({
        data: address,
    });
});

export const updateAccountAddressController = asyncHandler(async (req: Request, res: Response) => {
    const customerId = getAuthenticatedCustomerId(req);
    const addressId = parseAddressId(req.params.addressId);
    const payload = parseAddressPayload(req.body);
    const address = await updateCustomerAddress({
        addressId,
        customerId,
        label: payload.label,
        name: payload.name,
        phone: payload.phone,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
        country: payload.country,
        setAsDefault: payload.setAsDefault,
    });

    res.status(200).json({
        data: address,
    });
});

export const deleteAccountAddressController = asyncHandler(async (req: Request, res: Response) => {
    const customerId = getAuthenticatedCustomerId(req);
    const addressId = parseAddressId(req.params.addressId);

    await deleteCustomerAddress(addressId, customerId);

    res.status(204).send();
});

export const setDefaultAccountAddressController = asyncHandler(async (req: Request, res: Response) => {
    const customerId = getAuthenticatedCustomerId(req);
    const addressId = parseAddressId(req.params.addressId);
    const address = await setDefaultAddress(addressId, customerId);

    res.status(200).json({
        data: address,
    });
});
