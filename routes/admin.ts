import { Router } from 'express';
import {
    createAdminProductImage,
    createAdminArticle,
    createAdminFragranceNote,
    createAdminPage,
    createAdminProduct,
    createAdminProductVariant,
    createUploadUrl,
    deleteAdminProductImage,
    deleteAdminArticle,
    deleteAdminFragranceNote,
    deleteAdminPage,
    deleteAdminProduct,
    deleteAdminProductVariant,
    getAdminProduct,
    getAdminArticles,
    getAdminOrders,
    getAdminPages,
    getAdminProducts,
    setAdminProductPrimaryImage,
    updateAdminArticle,
    updateAdminOrder,
    updateAdminPage,
    updateAdminProduct,
    updateAdminProductVariant,
} from '../controllers/admin.js';
import { requireAdminAuth } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAdminAuth);
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
adminRouter.put('/orders/:id', updateAdminOrder);
adminRouter.get('/articles', getAdminArticles);
adminRouter.post('/articles', createAdminArticle);
adminRouter.put('/articles/:id', updateAdminArticle);
adminRouter.delete('/articles/:id', deleteAdminArticle);
adminRouter.get('/pages', getAdminPages);
adminRouter.post('/pages', createAdminPage);
adminRouter.put('/pages/:id', updateAdminPage);
adminRouter.delete('/pages/:id', deleteAdminPage);
adminRouter.post('/upload', createUploadUrl);
