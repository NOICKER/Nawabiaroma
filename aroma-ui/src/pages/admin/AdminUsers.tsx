import { ShieldPlus } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { buildApiUrl } from '../../lib/api.ts';

const ADMIN_USERS_ENDPOINT = buildApiUrl('/api/admin/users');
const fieldClassName =
    'w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-primary)] focus:bg-white/7';
const labelClassName = 'font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]';

interface AdminUser {
    id: number;
    email: string;
    initials: string | null;
    isActive: boolean;
    createdAt: string;
    lastLoginAt: string | null;
}

interface AdminUserFormState {
    email: string;
    initials: string;
    password: string;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

function createEmptyFormState(): AdminUserFormState {
    return {
        email: '',
        initials: '',
        password: '',
    };
}

function formatDateTime(value: string | null) {
    if (!value) {
        return 'Never';
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

async function fetchAdminUsers(token: string) {
    const response = await fetch(ADMIN_USERS_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<AdminUser[]>(response);
}

async function createAdminUser(token: string, formState: AdminUserFormState) {
    const response = await fetch(ADMIN_USERS_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: formState.email.trim(),
            initials: formState.initials.trim(),
            password: formState.password,
        }),
    });

    return readApiPayload<AdminUser>(response);
}

function validateForm(formState: AdminUserFormState) {
    if (formState.email.trim().length === 0) {
        return 'Email is required.';
    }

    if (formState.initials.trim().length === 0 || formState.initials.trim().length > 8) {
        return 'Initials must be between 1 and 8 characters.';
    }

    if (formState.password.length < 8) {
        return 'Password must be at least 8 characters.';
    }

    return '';
}

export function AdminUsers() {
    const { token } = useAdminAuth();
    const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [formError, setFormError] = useState('');
    const [formState, setFormState] = useState<AdminUserFormState>(() => createEmptyFormState());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            setListError('Admin session missing.');
            return;
        }

        let isCancelled = false;

        const loadAdminUsers = async () => {
            setIsLoading(true);
            setListError('');

            try {
                const nextAdminUsers = await fetchAdminUsers(token);

                if (!isCancelled) {
                    setAdminUsers(nextAdminUsers);
                }
            } catch (error) {
                if (!isCancelled) {
                    setListError(error instanceof Error ? error.message : 'Unable to load admin users.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadAdminUsers();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    const handleInputChange =
        (field: keyof AdminUserFormState) =>
        (event: ChangeEvent<HTMLInputElement>) => {
            setFormState((currentState) => ({
                ...currentState,
                [field]: event.target.value,
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
            await createAdminUser(token, formState);
            setAdminUsers(await fetchAdminUsers(token));
            setFormState(createEmptyFormState());
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Unable to create this admin user.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="flex flex-1 flex-col gap-6 py-2 md:py-4">
            <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">Admins</p>
                <h1 className="mt-3 font-display text-4xl font-light tracking-[0.04em] text-[var(--color-ink)] md:text-5xl">
                    Admin Users
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                    Keep the admin roster visible and add new operators without reopening the public bootstrap flow.
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
                <div className="glass-panel overflow-hidden rounded-[30px]">
                    <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-5 md:px-8">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">Active Admins</p>
                            <p className="mt-2 text-sm text-[var(--color-ink)]">{adminUsers.length} admin accounts</p>
                        </div>
                    </div>

                    {listError ? (
                        <div className="px-6 py-6 md:px-8">
                            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                {listError}
                            </div>
                        </div>
                    ) : isLoading ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">Loading admin users...</div>
                    ) : adminUsers.length === 0 ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">No admin users found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--glass-border)]">
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                            Email
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Initials
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Last Login
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                            Created
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adminUsers.map((adminUser) => (
                                        <tr key={adminUser.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                            <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)] md:px-8">{adminUser.email}</td>
                                            <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{adminUser.initials ?? '—'}</td>
                                            <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">
                                                {formatDateTime(adminUser.lastLoginAt)}
                                            </td>
                                            <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)] md:px-8">
                                                {formatDateTime(adminUser.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="glass-panel rounded-[30px] px-6 py-8 md:px-8">
                    <div className="flex items-start justify-between gap-4 border-b border-[var(--glass-border)] pb-6">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-primary)]">Add admin</p>
                            <h2 className="mt-3 font-display text-3xl font-light tracking-[0.04em] text-[var(--color-ink)]">
                                Invite another operator
                            </h2>
                        </div>

                        <div className="glass-panel flex h-12 w-12 items-center justify-center rounded-2xl">
                            <ShieldPlus className="h-5 w-5 text-[var(--color-primary)]" strokeWidth={1.75} />
                        </div>
                    </div>

                    <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className={labelClassName} htmlFor="admin-user-email">Email</label>
                            <input
                                autoComplete="email"
                                className={fieldClassName}
                                id="admin-user-email"
                                onChange={handleInputChange('email')}
                                placeholder="admin@nawabiaroma.com"
                                type="email"
                                value={formState.email}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={labelClassName} htmlFor="admin-user-initials">Initials</label>
                            <input
                                autoComplete="nickname"
                                className={fieldClassName}
                                id="admin-user-initials"
                                maxLength={8}
                                onChange={handleInputChange('initials')}
                                placeholder="NA"
                                type="text"
                                value={formState.initials}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={labelClassName} htmlFor="admin-user-password">Password</label>
                            <input
                                autoComplete="new-password"
                                className={fieldClassName}
                                id="admin-user-password"
                                onChange={handleInputChange('password')}
                                placeholder="Minimum 8 characters"
                                type="password"
                                value={formState.password}
                            />
                        </div>

                        {formError ? (
                            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                {formError}
                            </div>
                        ) : null}

                        <button
                            className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white disabled:opacity-70"
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? 'Creating Admin' : 'Create Admin'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}
