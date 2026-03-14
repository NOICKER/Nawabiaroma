import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const PAGES_ENDPOINT = '/api/admin/pages';
const fieldClassName =
    'w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-primary)] focus:bg-white/7';
const labelClassName = 'font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]';

interface AdminPage {
    id: number;
    slug: string;
    title: string;
    contentHtml: string | null;
    updatedAt: string;
}

interface PagePayload {
    slug: string;
    title: string;
    contentHtml: string | null;
}

interface PageFormState {
    title: string;
    slug: string;
    contentHtml: string;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

function createEmptyFormState(): PageFormState {
    return {
        title: '',
        slug: '',
        contentHtml: '',
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

function createFormState(page: AdminPage): PageFormState {
    return {
        title: page.title,
        slug: page.slug,
        contentHtml: page.contentHtml ?? '',
    };
}

function formatUpdatedAt(value: string) {
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

async function fetchPages(token: string) {
    const response = await fetch(PAGES_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<AdminPage[]>(response);
}

async function savePage(token: string, pageId: number | null, payload: PagePayload) {
    const response = await fetch(pageId === null ? PAGES_ENDPOINT : `${PAGES_ENDPOINT}/${pageId}`, {
        method: pageId === null ? 'POST' : 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return readApiPayload<AdminPage>(response);
}

async function deletePage(token: string, pageId: number) {
    const response = await fetch(`${PAGES_ENDPOINT}/${pageId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiMutation(response);
}

function buildPayload(formState: PageFormState): PagePayload {
    return {
        title: formState.title.trim(),
        slug: formState.slug.trim(),
        contentHtml: normalizeOptionalField(formState.contentHtml),
    };
}

function validateForm(formState: PageFormState) {
    if (formState.title.trim().length === 0) {
        return 'Title is required.';
    }

    if (formState.slug.trim().length === 0) {
        return 'Slug is required.';
    }

    return '';
}

export function AdminPages() {
    const { token } = useAdminAuth();
    const [pages, setPages] = useState<AdminPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [formError, setFormError] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingPageId, setEditingPageId] = useState<number | null>(null);
    const [formState, setFormState] = useState<PageFormState>(() => createEmptyFormState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
    const [hasManualSlug, setHasManualSlug] = useState(false);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            setListError('Admin session missing.');
            return;
        }

        let isCancelled = false;

        const loadPages = async () => {
            setIsLoading(true);
            setListError('');

            try {
                const nextPages = await fetchPages(token);

                if (!isCancelled) {
                    setPages(nextPages);
                }
            } catch (error) {
                if (!isCancelled) {
                    setListError(error instanceof Error ? error.message : 'Unable to load pages.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadPages();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    const openCreateForm = () => {
        setIsFormVisible(true);
        setEditingPageId(null);
        setFormState(createEmptyFormState());
        setFormError('');
        setHasManualSlug(false);
    };

    const openEditForm = (page: AdminPage) => {
        setIsFormVisible(true);
        setEditingPageId(page.id);
        setFormState(createFormState(page));
        setFormError('');
        setHasManualSlug(page.slug !== slugifyTitle(page.title));
    };

    const closeForm = () => {
        setIsFormVisible(false);
        setEditingPageId(null);
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

    const handleContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
        setFormState((currentState) => ({
            ...currentState,
            contentHtml: event.target.value,
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
            await savePage(token, editingPageId, buildPayload(formState));
            const nextPages = await fetchPages(token);
            setPages(nextPages);
            closeForm();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Unable to save this page.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePage = async (pageId: number) => {
        if (!token) {
            setListError('Admin session missing.');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this?')) {
            return;
        }

        setPendingDeleteId(pageId);
        setListError('');

        try {
            await deletePage(token, pageId);
            setPages((currentPages) => currentPages.filter((page) => page.id !== pageId));
        } catch (error) {
            setListError(error instanceof Error ? error.message : 'Unable to delete this page.');
        } finally {
            setPendingDeleteId(null);
        }
    };

    const editingPage = editingPageId === null ? null : pages.find((page) => page.id === editingPageId) ?? null;

    return (
        <section className="flex flex-1 flex-col gap-6 py-2 md:py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">Pages</p>
                    <h1 className="mt-3 font-display text-4xl font-light tracking-[0.04em] text-[var(--color-ink)] md:text-5xl">
                        Pages
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                        Maintain long-form CMS pages and update static site content directly from the admin workspace.
                    </p>
                </div>

                {!isFormVisible ? (
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110 active:scale-[0.99]"
                        onClick={openCreateForm}
                        type="button"
                    >
                        <Plus className="h-4 w-4" strokeWidth={1.75} />
                        <span>Add Page</span>
                    </button>
                ) : null}
            </div>

            {isFormVisible ? (
                <div className="glass-panel rounded-[30px] px-6 py-8 md:px-8 md:py-10">
                    <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-primary)]">
                                {editingPage ? 'Edit page' : 'Create page'}
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-light tracking-[0.04em] text-[var(--color-ink)]">
                                {editingPage ? editingPage.title : 'New page'}
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
                                <label className={labelClassName} htmlFor="page-title">
                                    Title
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="page-title"
                                    onChange={handleTitleChange}
                                    placeholder="About Nawabi"
                                    required
                                    type="text"
                                    value={formState.title}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="page-slug">
                                    Slug
                                </label>
                                <input
                                    className={fieldClassName}
                                    id="page-slug"
                                    onChange={handleSlugChange}
                                    placeholder="about-nawabi"
                                    required
                                    type="text"
                                    value={formState.slug}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className={labelClassName} htmlFor="page-content-html">
                                    Content HTML
                                </label>
                                <textarea
                                    className={`${fieldClassName} min-h-56 resize-y font-mono text-xs`}
                                    id="page-content-html"
                                    onChange={handleContentChange}
                                    placeholder="<section><h1>About</h1><p>Page content here.</p></section>"
                                    value={formState.contentHtml}
                                />
                            </div>
                        </div>

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
                                {isSubmitting ? 'Saving' : editingPage ? 'Save Changes' : 'Create Page'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden rounded-[30px]">
                    <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-5 md:px-8">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">Page Library</p>
                            <p className="mt-2 text-sm text-[var(--color-ink)]">{pages.length} pages loaded</p>
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
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">Loading pages...</div>
                    ) : pages.length === 0 ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">No pages found yet. Add your first page to start managing site content.</div>
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
                                            Last Updated
                                        </th>
                                        <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pages.map((page) => {
                                        const isDeleting = pendingDeleteId === page.id;

                                        return (
                                            <tr key={page.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                                <td className="px-6 py-5 align-top md:px-8">
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--color-ink)]">{page.title}</p>
                                                        {page.contentHtml ? (
                                                            <p className="mt-2 max-w-xl truncate text-xs text-[var(--text-muted)]">{page.contentHtml}</p>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">{page.slug}</td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">{formatUpdatedAt(page.updatedAt)}</td>
                                                <td className="px-6 py-5 align-top md:px-8">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60"
                                                            disabled={isDeleting}
                                                            onClick={() => openEditForm(page)}
                                                            type="button"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>Edit</span>
                                                        </button>
                                                        <button
                                                            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#ef4444] transition-colors hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-60"
                                                            disabled={isDeleting}
                                                            onClick={() => handleDeletePage(page.id)}
                                                            type="button"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>{isDeleting ? 'Deleting' : 'Delete'}</span>
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
