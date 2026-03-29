import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { env } from '../server/config/env.js';
import { countAdmins, createAdmin, loginAdmin } from '../services/adminAuthService.js';
import { customerLoginSchema, customerRegisterSchema } from './schemas/customerAuth.js';
import { loginCustomer, registerCustomer } from '../services/customerService.js';
import { adminBootstrapSchema, adminLoginSchema } from './schemas/adminAuth.js';

export const loginAdminController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = adminLoginSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid login payload.', parsed.error.flatten());
    }

    const token = await loginAdmin(parsed.data);

    res.status(200).json({
        data: {
            token,
        },
    });
});

export const bootstrapAdminController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = adminBootstrapSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid bootstrap payload.', parsed.error.flatten());
    }

    const configuredBootstrapSecret = env.ADMIN_BOOTSTRAP_SECRET;

    if (!configuredBootstrapSecret || parsed.data.bootstrapSecret !== configuredBootstrapSecret) {
        throw new HttpError(403, 'Invalid admin setup request.');
    }

    if ((await countAdmins()) !== 0) {
        throw new HttpError(409, 'Admin setup is unavailable.');
    }

    await createAdmin({
        email: parsed.data.email,
        initials: parsed.data.initials,
        password: parsed.data.password,
        requireEmpty: true,
    });

    const token = await loginAdmin({
        email: parsed.data.email,
        password: parsed.data.password,
    });

    res.status(200).json({
        data: {
            token,
        },
    });
});

export const registerCustomerController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = customerRegisterSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid registration payload.', parsed.error.flatten());
    }

    const authResponse = await registerCustomer(parsed.data);

    res.status(201).json({
        data: authResponse,
    });
});

export const loginCustomerController = asyncHandler(async (req: Request, res: Response) => {
    const parsed = customerLoginSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid login payload.', parsed.error.flatten());
    }

    const authResponse = await loginCustomer(parsed.data);

    res.status(200).json({
        data: authResponse,
    });
});
