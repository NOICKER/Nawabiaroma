import { Router } from 'express';
import {
    createAccountAddressController,
    deleteAccountAddressController,
    getAccountMeController,
    getAccountOrderController,
    listAccountAddressesController,
    listAccountOrdersController,
    setDefaultAccountAddressController,
    updateAccountAddressController,
} from '../controllers/account.js';
import { requireCustomerAuth } from '../middleware/auth.js';

export const accountRouter = Router();

accountRouter.use(requireCustomerAuth);
accountRouter.get('/me', getAccountMeController);
accountRouter.get('/addresses', listAccountAddressesController);
accountRouter.post('/addresses', createAccountAddressController);
accountRouter.put('/addresses/:addressId', updateAccountAddressController);
accountRouter.patch('/addresses/:addressId/default', setDefaultAccountAddressController);
accountRouter.delete('/addresses/:addressId', deleteAccountAddressController);
accountRouter.get('/orders', listAccountOrdersController);
accountRouter.get('/orders/:orderId', getAccountOrderController);
