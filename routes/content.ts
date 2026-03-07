import { Router } from 'express';
import { getPage, listJournal } from '../controllers/content.js';

export const contentRouter = Router();

contentRouter.get('/journal', listJournal);
contentRouter.get('/pages/:slug', getPage);
