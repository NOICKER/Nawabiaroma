import { Router } from 'express';
import {
    createAdminUserController,
    createAdminProductImage,
    createAdminPromoCode,
    createAdminArticle,
    createAdminFragranceNote,
    createAdminPage,
    createAdminProduct,
    createAdminProductVariant,
    createUploadUrl,
    deleteAdminProductImage,
    deleteAdminPromoCode,
    deleteAdminArticle,
    deleteAdminFragranceNote,
    deleteAdminPage,
    deleteAdminProduct,
    deleteAdminProductVariant,
    listAdminUsersController,
    getAdminProduct,
    getAdminOrder,
    getAdminPromoCodes,
    getAdminArticles,
    getAdminOrders,
    getAdminPages,
    getAdminProducts,
    setAdminProductPrimaryImage,
    updateAdminArticle,
    updateAdminOrder,
    updateAdminPage,
    updateAdminPromoCode,
    updateAdminProduct,
    updateAdminProductVariant,
} from '../controllers/admin.js';
import { requireAdminAuth } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAdminAuth);
adminRouter.get('/users', listAdminUsersController);
adminRouter.post('/users', createAdminUserController);
adminRouter.get('/products', getAdminProducts);
adminRouter.get('/products/:id', getAdminProduct);
adminRouter.post('/products', createAdminProduct);
adminRouter.put('/products/:id', updateAdminProduct);
adminRouter.delete('/products/:id', deleteAdminProduct);
adminRouter.post('/products/:id/images', createAdminProductImage);
adminRouter.delete('/products/:id/images/:imageId', deleteAdminProductImage);
adminRouter.post('/products/:id/images/:imageId/primary', setAdminProductPrimaryImage);
adminRouter.post('/products/:id/variants', createAdminProductVariant);
adminRouter.put('/products/:id/variants/:variantId', updateAdminProductVariant);
adminRouter.delete('/products/:id/variants/:variantId', deleteAdminProductVariant);
adminRouter.post('/products/:id/notes', createAdminFragranceNote);
adminRouter.delete('/products/:id/notes/:noteId', deleteAdminFragranceNote);
adminRouter.get('/orders', getAdminOrders);
adminRouter.get('/orders/:id', getAdminOrder);
adminRouter.put('/orders/:id', updateAdminOrder);
adminRouter.get('/articles', getAdminArticles);
adminRouter.post('/articles', createAdminArticle);
adminRouter.put('/articles/:id', updateAdminArticle);
adminRouter.delete('/articles/:id', deleteAdminArticle);
adminRouter.get('/pages', getAdminPages);
adminRouter.post('/pages', createAdminPage);
adminRouter.put('/pages/:id', updateAdminPage);
adminRouter.delete('/pages/:id', deleteAdminPage);
adminRouter.get('/promo-codes', getAdminPromoCodes);
adminRouter.post('/promo-codes', createAdminPromoCode);
adminRouter.put('/promo-codes/:id', updateAdminPromoCode);
adminRouter.delete('/promo-codes/:id', deleteAdminPromoCode);
adminRouter.post('/upload', createUploadUrl);
