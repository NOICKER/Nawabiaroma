import { Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const ARTICLES_ENDPOINT = '/api/admin/articles';
const fieldClassName =
    'w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-primary)] focus:bg-white/7';
const labelClassName = 'font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]';

interface AdminArticle {
    id: number;
    slug: string;
    title: string;
    summary: string | null;
    contentHtml: string | null;
    coverImageUrl: string | null;
    isPublished: boolean;
    publishedAt: string | null;
}

interface ArticlePayload {
    slug: string;
    title: string;
    summary: string | null;
    contentHtml: string | null;
    coverImageUrl: string | null;
    isPublished: boolean;
    publishedAt: string | null;
}

interface ArticleFormState {
    title: string;
    slug: string;
    summary: string;
    contentHtml: string;
    coverImageUrl: string;
    isPublished: boolean;
    publishedAt: string;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

function createEmptyFormState(): ArticleFormState {
    return {
        title: '',
        slug: '',
        summary: '',
        contentHtml: '',
        coverImageUrl: '',
        isPublished: false,
        publishedAt: '',
    };
}

function slugifyTitle(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function normalizeOptionalField(value: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function toDateTimeLocalValue(value: string | null) {
    if (!value) {
        return '';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '';
    }

    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return offsetDate.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string) {
    if (value.trim().length === 0) {
        return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function createFormState(article: AdminArticle): ArticleFormState {
    return {
        title: article.title,
        slug: article.slug,
        summary: article.summary ?? '',
        contentHtml: article.contentHtml ?? '',
        coverImageUrl: article.coverImageUrl ?? '',
        isPublished: article.isPublished,
        publishedAt: toDateTimeLocalValue(article.publishedAt),
    };
}

function getPublishedBadgeClass(isPublished: boolean) {
    return isPublished
        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
        : 'border-white/12 bg-white/5 text-[var(--text-muted)]';
}

function formatPublishedAt(value: string | null) {
    if (!value) {
        return 'Not set';
    }

    return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

async function readApiPayload<T>(response: Response) {
    let payload: ApiResponse<T> | null = null;

    try {
        payload = (await response.json()) as ApiResponse<T>;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to complete this request.');
    }

    if (payload?.data === undefined) {
        throw new Error('Unexpected API response.');
    }

    return payload.data;
}

async function readApiMutation(response: Response) {
    let payload: ApiResponse<unknown> | null = null;

    try {
        payload = (await response.json()) as ApiResponse<unknown>;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to complete this request.');
    }
}

async function fetchArticles(token: string) {
    const response = await fetch(ARTICLES_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<AdminArticle[]>(response);
}

async function saveArticle(token: string, articleId: number | null, payload: ArticlePayload) {
    const response = await fetch(articleId === null ? ARTICLES_ENDPOINT : `${ARTICLES_ENDPOINT}/${articleId}`, {
        method: articleId === null ? 'POST' : 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return readApiPayload<AdminArticle>(response);
}

async function deleteArticle(token: string, articleId: number) {
    const response = await fetch(`${ARTICLES_ENDPOINT}/${articleId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiMutation(response);
}

function buildPayload(formState: ArticleFormState): ArticlePayload {
    return {
        title: formState.title.trim(),
        slug: formState.slug.trim(),
        summary: normalizeOptionalField(formState.summary),
        contentHtml: normalizeOptionalField(formState.contentHtml),
        coverImageUrl: normalizeOptionalField(formState.coverImageUrl),
        isPublished: formState.isPublished,
        publishedAt: toIsoDateTime(formState.publishedAt),
    };
}

function validateForm(formState: ArticleFormState) {
    if (formState.title.trim().length === 0) {
        return 'Title is required.';
    }

    if (formState.slug.trim().length === 0) {
        return 'Slug is required.';
    }

    return '';
}

export function AdminArticles() {
    const { token } = useAdminAuth();
    const [articles, setArticles] = useState<AdminArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [formError, setFormError] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
    const [formState, setFormState] = useState<ArticleFormState>(() => createEmptyFormState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingPublishId, setPendingPublishId] = useState<number | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [hasManualSlug, setHasManualSlug] = useState(false);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            setListError('Admin session missing.');
            return;
        }

        let isCancelled = false;

        const loadArticles = async () => {
            setIsLoading(true);
            setListError('');

            try {
                const nextArticles = await fetchArticles(token);

                if (!isCancelled) {
                    setArticles(nextArticles);
                }
            } catch (error) {
                if (!isCancelled) {
                    setListError(error instanceof Error ? error.message : 'Unable to load articles.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadArticles();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    const openCreateForm = () => {
        setIsFormVisible(true);
        setEditingArticleId(null);
        setFormState(createEmptyFormState());
        setFormError('');
        setHasManualSlug(false);
    };

    const openEditForm = (article: AdminArticle) => {
        setIsFormVisible(true);
        setEditingArticleId(article.id);
        setFormState(createFormState(article));
        setFormError('');
        setHasManualSlug(article.slug !== slugifyTitle(article.title));
    };

    const closeForm = () => {
        setIsFormVisible(false);
        setEditingArticleId(null);
        setFormState(createEmptyFormState());
        setFormError('');
        setHasManualSlug(false);
    };

    const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const nextTitle = event.target.value;

        setFormState((currentState) => ({
            ...currentState,
            title: nextTitle,
            slug: hasManualSlug ? currentState.slug : slugifyTitle(nextTitle),
        }));
    };

    const handleSlugChange = (event: ChangeEvent<HTMLInputElement>) => {
        setHasManualSlug(true);
        setFormState((currentState) => ({
            ...currentState,
            slug: event.target.value,
        }));
    };

    const handleInputChange =
        (field: 'coverImageUrl' | 'publishedAt') =>
        (event: ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value;

            setFormState((currentState) => ({
                ...currentState,
                [field]: nextValue,
            }));
        };

    const handleTextAreaChange =
        (field: 'summary' | 'contentHtml') =>
        (event: ChangeEvent<HTMLTextAreaElement>) => {
            const nextValue = event.target.value;

            setFormState((currentState) => ({
                ...currentState,
                [field]: nextValue,
            }));
        };

    const handlePublishedChange = (event: ChangeEvent<HTMLInputElement>) => {
        setFormState((currentState) => ({
            ...currentState,
            isPublished: event.target.checked,
        }));
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!token) {
            setFormError('Admin session missing.');
            return;
        }

        const validationError = validateForm(formState);

        if (validationError) {
            setFormError(validationError);
            return;
        }

        setIsSubmitting(true);
        setFormError('');

        try {
            await saveArticle(token, editingArticleId, buildPayload(formState));
            const nextArticles = await fetchArticles(token);
            setArticles(nextArticles);
            closeForm();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Unable to save this article.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePublishToggle = async (article: AdminArticle) => {
        if (!token) {
            setListError('Admin session missing.');
            return;
        }

        setPendingPublishId(article.id);
        setListError('');

        try {
            await saveArticle(token, article.id, {
                title: article.title,
                slug: article.slug,
                summary: article.summary,
                contentHtml: article.contentHtml,
                coverImageUrl: article.coverImageUrl,
                isPublished: !article.isPublished,
                publishedAt: article.publishedAt,
            });

            const nextArticles = await fetchArticles(token);
            setArticles(nextArticles);
        } catch (error) {
            setListError(error instanceof Error ? error.message : 'Unable to update article state.');
        } finally {
            setPendingPublishId(null);
        }
    };

    const handleDeleteArticle = async (articleId: number) => {
        if (!token) {
            setListError('Admin session missing.');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this?')) {
            return;
        }

        setPendingDeleteId(articleId);
        setListError('');

        try {
            await deleteArticle(token, articleId);
            setArticles((currentArticles) => currentArticles.filter((article) => article.id !== articleId));
        } catch (error) {
            setListError(error instanceof Error ? error.message : 'Unable to delete this article.');
        } finally {
            setPendingDeleteId(null);
        }
    };

    const editingArticle = editingArticleId === null ? null : articles.find((article) => article.id === editingArticleId) ?? null;

    return (
        <section className="flex flex-1 flex-col gap-6 py-2 md:py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">Articles</p>
                    <h1 className="mt-3 font-display text-4xl font-light tracking-[0.04em] text-[var(--color-ink)] md:text-5xl">
                        Articles
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                        Publish editorial content, manage article metadata, and control what is visible on the public journal.
                    </p>
                </div>

                {!isFormVisible ? (
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110 active:scale-[0.99]"
                        onClick={openCreateForm}
                        type="button"
                    >
                        <Plus className="h-4 w-4" strokeWidth={1.75} />
                        <span>Add Article</span>
                    </button>
                ) : null}
            </div>

            {isFormVisible ? (
                <div className="glass-panel rounded-[30px] px-6 py-8 md:px-8 md:py-10">
                    <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-primary)]">
                                {editingArticle ? 'Edit article' : 'Create article'}
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-light tracking-[0.04em] text-[var(--color-ink)]">
                                {editingArticle ? editingArticle.title : 'New article'}
                            </h2>
                        </div>

                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                            onClick={closeForm}
                            type="button"
                        >
                            <X className="h-4 w-4" strokeWidth={1.75} />
                            <span>Cancel</span>
                        </button>
                    </div>

                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="article-title">
                                    Title
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="article-title"
                                    onChange={handleTitleChange}
                                    placeholder="The Ritual of Scent"
                                    required
                                    type="text"
                                    value={formState.title}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="article-slug">
                                    Slug
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="article-slug"
                                    onChange={handleSlugChange}
                                    placeholder="the-ritual-of-scent"
                                    required
                                    type="text"
                                    value={formState.slug}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className={labelClassName} htmlFor="article-summary">
                                    Summary
                                </label>
                                <textarea
                                    className={`${fieldClassName} min-h-28 resize-y`}
                                    id="article-summary"
                                    onChange={handleTextAreaChange('summary')}
                                    placeholder="Optional summary for previews and editorial cards."
                                    value={formState.summary}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className={labelClassName} htmlFor="article-content-html">
                                    Content HTML
                                </label>
                                <textarea
                                    className={`${fieldClassName} min-h-48 resize-y font-mono text-xs`}
                                    id="article-content-html"
                                    onChange={handleTextAreaChange('contentHtml')}
                                    placeholder="<p>Write or paste article HTML here.</p>"
                                    value={formState.contentHtml}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="article-cover-image-url">
                                    Cover Image URL
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="article-cover-image-url"
                                    onChange={handleInputChange('coverImageUrl')}
                                    placeholder="https://example.com/cover.jpg"
                                    type="text"
                                    value={formState.coverImageUrl}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="article-published-at">
                                    Published At
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="article-published-at"
                                    onChange={handleInputChange('publishedAt')}
                                    type="datetime-local"
                                    value={formState.publishedAt}
                                />
                            </div>
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-3 text-sm text-[var(--color-ink)]">
                            <input
                                checked={formState.isPublished}
                                className="h-4 w-4 rounded border-[var(--glass-border)] bg-transparent accent-[var(--color-primary)]"
                                onChange={handlePublishedChange}
                                type="checkbox"
                            />
                            <span>Is Published</span>
                        </label>

                        {formError ? (
                            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                {formError}
                            </div>
                        ) : null}

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-5 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                onClick={closeForm}
                                type="button"
                            >
                                Cancel
                            </button>
                            <button
                                className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={isSubmitting}
                                type="submit"
                            >
                                {isSubmitting ? 'Saving' : editingArticle ? 'Save Changes' : 'Create Article'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden rounded-[30px]">
                    <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-5 md:px-8">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">Editorial Overview</p>
                            <p className="mt-2 text-sm text-[var(--color-ink)]">{articles.length} articles loaded</p>
                        </div>
                    </div>

                    {listError ? (
                        <div className="border-b border-[var(--glass-border)] px-6 py-4 text-sm text-[var(--color-ink)] md:px-8">
                            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3">
                                {listError}
                            </div>
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">Loading articles...</div>
                    ) : articles.length === 0 ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">No articles found yet. Add your first article to start publishing content.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--glass-border)]">
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                            Title
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Slug
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Published
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Published At
                                        </th>
                                        <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {articles.map((article) => {
                                        const isPending = pendingPublishId === article.id;
                                        const isDeleting = pendingDeleteId === article.id;

                                        return (
                                            <tr key={article.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                                <td className="px-6 py-5 align-top md:px-8">
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--color-ink)]">{article.title}</p>
                                                        {article.summary ? (
                                                            <p className="mt-2 max-w-xl text-xs leading-relaxed text-[var(--text-muted)]">{article.summary}</p>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">{article.slug}</td>
                                                <td className="px-6 py-5 align-top">
                                                    <span
                                                        className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${getPublishedBadgeClass(
                                                            article.isPublished,
                                                        )}`}
                                                    >
                                                        {article.isPublished ? 'Yes' : 'No'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">{formatPublishedAt(article.publishedAt)}</td>
                                                <td className="px-6 py-5 align-top md:px-8">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                                                            disabled={isDeleting}
                                                            onClick={() => openEditForm(article)}
                                                            type="button"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>Edit</span>
                                                        </button>
                                                        <button
                                                            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#ef4444] transition-colors hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-60"
                                                            disabled={isDeleting}
                                                            onClick={() => handleDeleteArticle(article.id)}
                                                            type="button"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>{isDeleting ? 'Deleting' : 'Delete'}</span>
                                                        </button>
                                                        <button
                                                            className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs uppercase tracking-[0.16em] transition-colors ${
                                                                article.isPublished
                                                                    ? 'border border-[var(--glass-border)] text-[var(--text-muted)] hover:text-[var(--color-ink)]'
                                                                    : 'bg-[var(--color-primary)]/18 text-[var(--color-ink)]'
                                                            }`}
                                                            disabled={isPending || isDeleting}
                                                            onClick={() => handlePublishToggle(article)}
                                                            type="button"
                                                        >
                                                            <Power className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>{isPending ? 'Updating' : article.isPublished ? 'Unpublish' : 'Publish'}</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
