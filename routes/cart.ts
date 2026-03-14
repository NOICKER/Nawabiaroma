import { Router } from 'express';
import { addCartItemController, getCartController, removeCartItemController, updateCartItemController } from '../controllers/cart.js';

export const cartRouter = Router();

cartRouter.get('/', getCartController);
cartRouter.post('/add', addCartItemController);
cartRouter.post('/remove', removeCartItemController);
cartRouter.post('/update', updateCartItemController);
