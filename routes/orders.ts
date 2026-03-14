import { Router } from 'express';
import { createOrderController, getOrderController, listOrdersController, updateOrderStatusController } from '../controllers/orders.js';

export const ordersRouter = Router();

ordersRouter.get('/', listOrdersController);
ordersRouter.get('/:orderId', getOrderController);
ordersRouter.post('/:orderId/status', updateOrderStatusController);
ordersRouter.post('/create', createOrderController);
