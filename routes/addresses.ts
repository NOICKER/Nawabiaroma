import { Router } from 'express';
import { createAddressController, listAddressesController } from '../controllers/addresses.js';

export const addressesRouter = Router();

addressesRouter.post('/', createAddressController);
addressesRouter.get('/', listAddressesController);
