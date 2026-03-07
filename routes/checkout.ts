import { Router } from 'express';
import { createCheckout } from '../controllers/checkout.js';
import { validateCheckoutRequest } from '../middleware/validateCheckout.js';

export const checkoutRouter = Router();

checkoutRouter.post('/', validateCheckoutRequest, createCheckout);
