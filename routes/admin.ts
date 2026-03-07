import { Router } from 'express';
import {
    createAdminArticle,
    createAdminPage,
    createAdminProduct,
    createUploadUrl,
    getAdminArticles,
    getAdminOrders,
    getAdminPages,
    getAdminProducts,
    updateAdminArticle,
    updateAdminOrder,
    updateAdminPage,
    updateAdminProduct,
} from '../controllers/admin.js';
import { requireAdminAuth } from '../middleware/auth.js';

export const adminRouter = Router();

adminRouter.use(requireAdminAuth);
adminRouter.get('/products', getAdminProducts);
adminRouter.post('/products', createAdminProduct);
adminRouter.put('/products/:id', updateAdminProduct);
adminRouter.get('/orders', getAdminOrders);
adminRouter.put('/orders/:id', updateAdminOrder);
adminRouter.get('/articles', getAdminArticles);
adminRouter.post('/articles', createAdminArticle);
adminRouter.put('/articles/:id', updateAdminArticle);
adminRouter.get('/pages', getAdminPages);
adminRouter.post('/pages', createAdminPage);
adminRouter.put('/pages/:id', updateAdminPage);
adminRouter.post('/upload', createUploadUrl);
