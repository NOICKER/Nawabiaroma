import { Router } from 'express';
import { loginAdmin } from '../controllers/auth.js';

export const authRouter = Router();

authRouter.post('/login', loginAdmin);
