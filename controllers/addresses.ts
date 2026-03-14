import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { createAddress, listAddressesBySessionId } from '../services/addressService.js';

const createAddressSchema = z
    .object({
        sessionId: z.string().trim().min(1).optional(),
        session_id: z.string().trim().min(1).optional(),
        name: z.string().trim().min(1),
        phone: z.string().trim().min(1),
        address_line1: z.string().trim().min(1).optional(),
        addressLine1: z.string().trim().min(1).optional(),
        address_line2: z.string().trim().optional(),
        addressLine2: z.string().trim().optional(),
        city: z.string().trim().min(1),
        state: z.string().trim().min(1),
        postal_code: z.string().trim().min(1).optional(),
        postalCode: z.string().trim().min(1).optional(),
        country: z.string().trim().min(1),
    })
    .transform((value) => ({
        sessionId: value.sessionId ?? value.session_id,
        name: value.name,
        phone: value.phone,
        addressLine1: value.address_line1 ?? value.addressLine1,
        addressLine2: value.address_line2 ?? value.addressLine2,
        city: value.city,
        state: value.state,
        postalCode: value.postal_code ?? value.postalCode,
        country: value.country,
    }))
    .refine((value) => value.sessionId, {
        message: 'sessionId is required.',
    })
    .refine((value) => value.addressLine1, {
        message: 'address_line1 is required.',
    })
    .refine((value) => value.postalCode, {
        message: 'postal_code is required.',
    });

const listAddressesSchema = z
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

function parseSchema<T>(schema: z.ZodType<T>, payload: unknown, message: string) {
    const parsed = schema.safeParse(payload);

    if (!parsed.success) {
        throw new HttpError(400, message, parsed.error.flatten());
    }

    return parsed.data;
}

export const createAddressController = asyncHandler(async (req: Request, res: Response) => {
    const payload = parseSchema(createAddressSchema, req.body, 'Invalid address payload.');

    if (!payload.sessionId || !payload.addressLine1 || !payload.postalCode) {
        throw new HttpError(400, 'Invalid address payload.');
    }

    const address = await createAddress({
        sessionId: payload.sessionId,
        name: payload.name,
        phone: payload.phone,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
        country: payload.country,
    });

    res.status(201).json({
        data: address,
    });
});

export const listAddressesController = asyncHandler(async (req: Request, res: Response) => {
    const payload = parseSchema(listAddressesSchema, req.query, 'Invalid address lookup parameters.');

    if (!payload.sessionId) {
        throw new HttpError(400, 'Invalid address lookup parameters.');
    }

    const addresses = await listAddressesBySessionId(payload.sessionId);

    res.status(200).json({
        data: addresses,
    });
});
