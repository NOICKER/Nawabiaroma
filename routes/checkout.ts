import { Router } from 'express';
import { createCheckout } from '../controllers/checkout.js';
import { requireCustomerAuth } from '../middleware/auth.js';
import { validateCheckoutRequest } from '../middleware/validateCheckout.js';

export const checkoutRouter = Router();

checkoutRouter.post('/', requireCustomerAuth, validateCheckoutRequest, createCheckout);
