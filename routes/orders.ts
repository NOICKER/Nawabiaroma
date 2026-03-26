import { Router } from 'express';
import { createCodOrderController, createOrderController, getOrderController, listOrdersController } from '../controllers/orders.js';
import { requireCustomerAuth } from '../middleware/auth.js';

export const ordersRouter = Router();

ordersRouter.post('/create', requireCustomerAuth, createOrderController);
ordersRouter.post('/cod', requireCustomerAuth, createCodOrderController);
ordersRouter.get('/', listOrdersController);
ordersRouter.get('/:orderId', requireCustomerAuth, getOrderController);
