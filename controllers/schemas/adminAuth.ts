import { z } from 'zod';

export const adminLoginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1),
});

export const adminBootstrapSchema = z.object({
    email: z.string().trim().email(),
    initials: z.string().trim().min(1).max(8),
    password: z.string().min(8),
    bootstrapSecret: z.string().min(1),
});
