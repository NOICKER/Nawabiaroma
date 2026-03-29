import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { buildApiUrl } from '../../lib/api';

const PROMO_CODES_ENDPOINT = buildApiUrl('/api/admin/promo-codes');
const fieldClassName =
    'w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-primary)] focus:bg-white/7';
const labelClassName = 'font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]';

type PromoCodeType = 'percentage' | 'fixed_amount';

interface PromoCode {
    id: number;
    code: string;
    type: PromoCodeType;
    value: number;
    minOrderAmount: number | null;
    maxUses: number | null;
    timesUsed: number;
    isActive: boolean;
    expiresAt: string | null;
}

interface PromoCodeFormState {
    code: string;
    type: PromoCodeType;
    value: string;
    minOrderAmount: string;
    maxUses: string;
    isActive: boolean;
    expiresAt: string;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

function createEmptyFormState(): PromoCodeFormState {
    return {
        code: '',
        type: 'percentage',
        value: '',
        minOrderAmount: '',
        maxUses: '',
        isActive: true,
        expiresAt: '',
    };
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

function createFormState(promoCode: PromoCode): PromoCodeFormState {
    return {
        code: promoCode.code,
        type: promoCode.type,
        value: String(promoCode.value),
        minOrderAmount: promoCode.minOrderAmount === null ? '' : String(promoCode.minOrderAmount),
        maxUses: promoCode.maxUses === null ? '' : String(promoCode.maxUses),
        isActive: promoCode.isActive,
        expiresAt: toDateTimeLocalValue(promoCode.expiresAt),
    };
}

function formatCurrency(value: number) {
    return `INR ${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatPromoValue(type: PromoCodeType, value: number) {
    return type === 'percentage' ? `${value}%` : formatCurrency(value);
}

function formatDateTime(value: string | null) {
    if (!value) {
        return 'No expiry';
    }

    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
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

async function fetchPromoCodes(token: string) {
    const response = await fetch(PROMO_CODES_ENDPOINT, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return readApiPayload<PromoCode[]>(response);
}

async function savePromoCode(token: string, promoCodeId: number | null, formState: PromoCodeFormState) {
    const response = await fetch(promoCodeId === null ? PROMO_CODES_ENDPOINT : `${PROMO_CODES_ENDPOINT}/${promoCodeId}`, {
        method: promoCodeId === null ? 'POST' : 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            code: formState.code.trim().toUpperCase(),
            type: formState.type,
            value: Number(formState.value),
            minOrderAmount: formState.minOrderAmount.trim().length === 0 ? null : Number(formState.minOrderAmount),
            maxUses: formState.maxUses.trim().length === 0 ? null : Number(formState.maxUses),
            isActive: formState.isActive,
            expiresAt: toIsoDateTime(formState.expiresAt),
        }),
    });

    return readApiPayload<PromoCode>(response);
}

async function deletePromoCode(token: string, promoCodeId: number) {
    const response = await fetch(`${PROMO_CODES_ENDPOINT}/${promoCodeId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });

    await readApiPayload<{ id: number }>(response);
}

function validateForm(formState: PromoCodeFormState) {
    const value = Number(formState.value);

    if (formState.code.trim().length === 0) {
        return 'Code is required.';
    }

    if (!Number.isFinite(value) || value <= 0) {
        return 'Value must be greater than zero.';
    }

    if (formState.type === 'percentage' && value > 100) {
        return 'Percentage promo codes cannot exceed 100.';
    }

    if (formState.maxUses.trim().length > 0) {
        const maxUses = Number(formState.maxUses);

        if (!Number.isInteger(maxUses) || maxUses <= 0) {
            return 'Max uses must be a positive whole number.';
        }
    }

    return '';
}

export function AdminPromoCodes() {
    const { token } = useAdminAuth();
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [formError, setFormError] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingPromoCodeId, setEditingPromoCodeId] = useState<number | null>(null);
    const [formState, setFormState] = useState<PromoCodeFormState>(() => createEmptyFormState());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            setListError('Admin session missing.');
            return;
        }

        let isCancelled = false;

        const loadPromoCodes = async () => {
            setIsLoading(true);
            setListError('');

            try {
                const nextPromoCodes = await fetchPromoCodes(token);

                if (!isCancelled) {
                    setPromoCodes(nextPromoCodes);
                }
            } catch (error) {
                if (!isCancelled) {
                    setListError(error instanceof Error ? error.message : 'Unable to load promo codes.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadPromoCodes();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    const openCreateForm = () => {
        setIsFormVisible(true);
        setEditingPromoCodeId(null);
        setFormState(createEmptyFormState());
        setFormError('');
    };

    const openEditForm = (promoCode: PromoCode) => {
        setIsFormVisible(true);
        setEditingPromoCodeId(promoCode.id);
        setFormState(createFormState(promoCode));
        setFormError('');
    };

    const closeForm = () => {
        setIsFormVisible(false);
        setEditingPromoCodeId(null);
        setFormState(createEmptyFormState());
        setFormError('');
    };

    const handleInputChange =
        (field: keyof PromoCodeFormState) =>
        (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const value =
                field === 'isActive' && event.target instanceof HTMLInputElement ? event.target.checked : event.target.value;

            setFormState((currentState) => ({
                ...currentState,
                [field]: field === 'code' && typeof value === 'string' ? value.toUpperCase() : value,
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
            await savePromoCode(token, editingPromoCodeId, formState);
            setPromoCodes(await fetchPromoCodes(token));
            closeForm();
        } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Unable to save this promo code.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePromoCode = async (promoCodeId: number) => {
        if (!token) {
            setListError('Admin session missing.');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this?')) {
            return;
        }

        setPendingDeleteId(promoCodeId);
        setListError('');

        try {
            await deletePromoCode(token, promoCodeId);
            setPromoCodes((currentPromoCodes) => currentPromoCodes.filter((promoCode) => promoCode.id !== promoCodeId));
        } catch (error) {
            setListError(error instanceof Error ? error.message : 'Unable to delete this promo code.');
        } finally {
            setPendingDeleteId(null);
        }
    };

    return (
        <section className="flex flex-1 flex-col gap-6 py-2 md:py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">Promo Codes</p>
                    <h1 className="mt-3 font-display text-4xl font-light tracking-[0.04em] text-[var(--color-ink)] md:text-5xl">
                        Promo Codes
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                        Create or update discount rules from the admin panel.
                    </p>
                </div>

                {!isFormVisible ? (
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110"
                        onClick={openCreateForm}
                        type="button"
                    >
                        <Plus className="h-4 w-4" strokeWidth={1.75} />
                        <span>Add Promo Code</span>
                    </button>
                ) : null}
            </div>

            {isFormVisible ? (
                <div className="glass-panel rounded-[30px] px-6 py-8 md:px-8 md:py-10">
                    <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-primary)]">
                                {editingPromoCodeId === null ? 'Create promo code' : 'Edit promo code'}
                            </p>
                            <h2 className="mt-3 font-display text-3xl font-light tracking-[0.04em] text-[var(--color-ink)]">
                                {editingPromoCodeId === null ? 'New promo code' : formState.code}
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

                    <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
                        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="promo-code-code">Code</label>
                                <input className={fieldClassName} id="promo-code-code" onChange={handleInputChange('code')} type="text" value={formState.code} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="promo-code-type">Type</label>
                                <select className={fieldClassName} id="promo-code-type" onChange={handleInputChange('type')} value={formState.type}>
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed_amount">Fixed Amount</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="promo-code-value">Value</label>
                                <input className={fieldClassName} id="promo-code-value" onChange={handleInputChange('value')} type="number" value={formState.value} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="promo-code-min-order">Min Order Amount</label>
                                <input className={fieldClassName} id="promo-code-min-order" onChange={handleInputChange('minOrderAmount')} type="number" value={formState.minOrderAmount} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="promo-code-max-uses">Max Uses</label>
                                <input className={fieldClassName} id="promo-code-max-uses" onChange={handleInputChange('maxUses')} type="number" value={formState.maxUses} />
                            </div>
                            <div className="space-y-2">
                                <label className={labelClassName} htmlFor="promo-code-expires-at">Expires At</label>
                                <input className={fieldClassName} id="promo-code-expires-at" onChange={handleInputChange('expiresAt')} type="datetime-local" value={formState.expiresAt} />
                            </div>
                        </div>

                        <label className="flex items-center gap-3 rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-3 text-sm text-[var(--color-ink)]">
                            <input checked={formState.isActive} className="h-4 w-4 accent-[var(--color-primary)]" onChange={handleInputChange('isActive')} type="checkbox" />
                            <span>Active</span>
                        </label>

                        {formError ? <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">{formError}</div> : null}

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-5 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)]" onClick={closeForm} type="button">
                                Cancel
                            </button>
                            <button className="inline-flex items-center justify-center rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white disabled:opacity-70" disabled={isSubmitting} type="submit">
                                {isSubmitting ? 'Saving' : editingPromoCodeId === null ? 'Create Promo Code' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden rounded-[30px]">
                    <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-5 md:px-8">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">Discount Rules</p>
                            <p className="mt-2 text-sm text-[var(--color-ink)]">{promoCodes.length} promo codes loaded</p>
                        </div>
                    </div>

                    {listError ? <div className="border-b border-[var(--glass-border)] px-6 py-4 text-sm text-[var(--color-ink)] md:px-8"><div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3">{listError}</div></div> : null}

                    {isLoading ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">Loading promo codes...</div>
                    ) : promoCodes.length === 0 ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">No promo codes found yet.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="border-b border-[var(--glass-border)]">
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">Code</th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Value</th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Usage</th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Expires</th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Status</th>
                                        <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promoCodes.map((promoCode) => {
                                        const isDeleting = pendingDeleteId === promoCode.id;

                                        return (
                                            <tr key={promoCode.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                                <td className="px-6 py-5 align-top md:px-8">
                                                    <div>
                                                        <p className="text-sm font-medium text-[var(--color-ink)]">{promoCode.code}</p>
                                                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{promoCode.type === 'percentage' ? 'Percentage' : 'Fixed Amount'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{formatPromoValue(promoCode.type, promoCode.value)}</td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">
                                                    {promoCode.timesUsed}
                                                    {promoCode.maxUses === null ? '' : ` / ${promoCode.maxUses}`}
                                                </td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">{formatDateTime(promoCode.expiresAt)}</td>
                                                <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{promoCode.isActive ? 'Active' : 'Inactive'}</td>
                                                <td className="px-6 py-5 align-top md:px-8">
                                                    <div className="flex justify-end gap-2">
                                                        <button className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]" onClick={() => openEditForm(promoCode)} type="button">
                                                            <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                            <span>Edit</span>
                                                        </button>
                                                        <button className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[#ef4444] disabled:opacity-60" disabled={isDeleting} onClick={() => handleDeletePromoCode(promoCode.id)} type="button">
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
