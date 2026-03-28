import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { AuthTokenPayload } from '../models/types.js';
import { env } from '../server/config/env.js';
import { customerLoginSchema, customerRegisterSchema } from './schemas/customerAuth.js';
import { loginCustomer, registerCustomer } from '../services/customerService.js';
import { verifyPassword } from '../services/passwordService.js';

const adminLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const loginAdmin = asyncHandler(async (req: Request, res: Response) => {
    const parsed = adminLoginSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid login payload.', parsed.error.flatten());
    }

    const { email, password } = parsed.data;
    const isValidEmail = email === env.ADMIN_EMAIL;
    const isValidPassword = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);

    if (!isValidEmail || !isValidPassword) {
        throw new HttpError(401, 'Invalid credentials.');
    }

    const payload: AuthTokenPayload = {
        sub: env.ADMIN_EMAIL,
        email: env.ADMIN_EMAIL,
        role: 'admin',
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
        algorithm: 'HS256',
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expiresIn: '12h',
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
