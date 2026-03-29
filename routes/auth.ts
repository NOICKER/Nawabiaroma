import { Router } from 'express';
import {
    bootstrapAdminController,
    loginAdminController,
    loginCustomerController,
    purgeAdminsController,
    registerCustomerController,
    secretLoginAdminController,
} from '../controllers/auth.js';
import { adminAuthRateLimit } from '../middleware/rateLimit.js';

export const authRouter = Router();

authRouter.post('/admin/login', adminAuthRateLimit, loginAdminController);
authRouter.post('/admin/bootstrap', adminAuthRateLimit, bootstrapAdminController);
authRouter.post('/admin/secret-login', adminAuthRateLimit, secretLoginAdminController);
authRouter.post('/admin/purge', adminAuthRateLimit, purgeAdminsController);
authRouter.post('/customer/register', registerCustomerController);
authRouter.post('/customer/login', loginCustomerController);
