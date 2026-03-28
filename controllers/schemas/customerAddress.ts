import { z } from 'zod';

export const customerAddressUpsertSchema = z.object({
    label: z.string().trim().max(60).optional(),
    name: z.string().trim().min(1),
    phone: z.string().trim().min(1),
    addressLine1: z.string().trim().min(1),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(1),
    state: z.string().trim().min(1),
    postalCode: z.string().trim().min(1),
    country: z.string().trim().min(1),
    setAsDefault: z.boolean().optional(),
});
