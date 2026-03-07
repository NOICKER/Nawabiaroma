import express, { Router } from 'express';
import { handlePaymentWebhook } from '../controllers/webhooks.js';

export const webhooksRouter = Router();

webhooksRouter.post('/payment', express.raw({ type: 'application/json' }), handlePaymentWebhook);
