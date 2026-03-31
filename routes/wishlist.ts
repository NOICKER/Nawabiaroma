import { Router } from 'express';
import {
    getWishlistController,
    addWishlistItemController,
    removeWishlistItemController,
} from '../controllers/wishlist.js';
import { requireCustomerAuth } from '../middleware/auth.js';

export const wishlistRouter = Router();

wishlistRouter.use(requireCustomerAuth);

wishlistRouter.get('/', getWishlistController);
wishlistRouter.post('/', addWishlistItemController);
wishlistRouter.delete('/:variantId', removeWishlistItemController);
