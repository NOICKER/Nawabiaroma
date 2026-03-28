import { z } from 'zod';

export const customerRegisterSchema = z.object({
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    password: z.string().min(8),
    phone: z.string().trim().min(1),
    addressLabel: z.string().trim().max(60).optional(),
    addressLine1: z.string().trim().min(1),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    postalCode: z.string().trim().min(1),
    country: z.string().trim().min(1),
});

export const customerLoginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});
