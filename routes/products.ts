import { Router } from 'express';
import { getProduct, listProducts } from '../controllers/products.js';

export const productsRouter = Router();

productsRouter.get('/', listProducts);
productsRouter.get('/:slug', getProduct);
