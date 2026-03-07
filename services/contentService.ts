import { HttpError } from '../middleware/errorHandler.js';
import type { CMSPage, JournalArticle } from '../models/types.js';
import { query } from '../server/config/database.js';

interface ArticleRow {
    id: number | string;
    slug: string;
    title: string;
    summary: string | null;
    content_html: string | null;
    cover_image_url: string | null;
    published_at: Date | null;
}

interface PageRow {
    id: number | string;
    slug: string;
    title: string;
    content_html: string | null;
    updated_at: Date;
}

export async function listPublishedArticles(): Promise<JournalArticle[]> {
    const result = await query<ArticleRow>(
        `
            SELECT
                id,
                slug,
                title,
                summary,
                content_html,
                cover_image_url,
                published_at
            FROM articles
            WHERE is_published = TRUE
            ORDER BY published_at DESC NULLS LAST, id DESC
        `,
    );

    return result.rows.map((row) => ({
        id: Number(row.id),
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        contentHtml: row.content_html,
        coverImageUrl: row.cover_image_url,
        publishedAt: row.published_at ? row.published_at.toISOString() : null,
    }));
}

export async function getPageBySlug(slug: string): Promise<CMSPage> {
    const result = await query<PageRow>(
        `
            SELECT id, slug, title, content_html, updated_at
            FROM pages
            WHERE slug = $1
            LIMIT 1
        `,
        [slug],
    );

    if (result.rowCount === 0) {
        throw new HttpError(404, `Page "${slug}" was not found.`);
    }

    const row = result.rows[0];

    return {
        id: Number(row.id),
        slug: row.slug,
        title: row.title,
        contentHtml: row.content_html,
        updatedAt: row.updated_at.toISOString(),
    };
}
