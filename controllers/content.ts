import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { HttpError } from '../middleware/errorHandler.js';
import { getPageBySlug, listPublishedArticles } from '../services/contentService.js';

const PUBLIC_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

function getSingleParam(value: string | string[] | undefined, name: string) {
    if (typeof value !== 'string' || value.length === 0) {
        throw new HttpError(400, `Invalid ${name}.`);
    }

    return value;
}

export const listJournal = asyncHandler(async (_req: Request, res: Response) => {
    const articles = await listPublishedArticles();
    res.set('Cache-Control', PUBLIC_CACHE_CONTROL);

    res.status(200).json({
        data: articles,
    });
});

export const getPage = asyncHandler(async (req: Request, res: Response) => {
    const page = await getPageBySlug(getSingleParam(req.params.slug, 'page slug'));
    res.set('Cache-Control', PUBLIC_CACHE_CONTROL);

    res.status(200).json({
        data: page,
    });
});
