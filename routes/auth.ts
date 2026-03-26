import { Router } from 'express';
import { loginAdmin, loginCustomerController, registerCustomerController } from '../controllers/auth.js';

export const authRouter = Router();

authRouter.post('/login', loginAdmin);
authRouter.post('/customer/register', registerCustomerController);
authRouter.post('/customer/login', loginCustomerController);
