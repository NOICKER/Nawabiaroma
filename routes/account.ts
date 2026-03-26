import { Router } from 'express';
import { getAccountMeController, listAccountOrdersController, getAccountOrderController } from '../controllers/account.js';
import { requireCustomerAuth } from '../middleware/auth.js';

export const accountRouter = Router();

accountRouter.use(requireCustomerAuth);
accountRouter.get('/me', getAccountMeController);
accountRouter.get('/orders', listAccountOrdersController);
accountRouter.get('/orders/:orderId', getAccountOrderController);
