import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AddressCard } from '../components/account/AddressCard';
import { AddressFormFields } from '../components/account/AddressFormFields';
import { emptyAddressFormState, type AddressFormState } from '../components/account/addressFormState';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import type { SavedAddress } from '../context/types';
import { buildApiUrl } from '../lib/api';

interface AddressListResponse {
    data: SavedAddress[];
}

interface AddressResponse {
    data: SavedAddress;
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };
        return payload.error ?? payload.message ?? fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

function mapAddressToFormState(address: SavedAddress): AddressFormState {
    return {
        label: address.label ?? '',
        name: address.name,
        phone: address.phone ?? '',
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? '',
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
        setAsDefault: address.isDefault,
    };
}

export function AccountAddresses() {
    const { token, customer } = useCustomerAuth();
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [formState, setFormState] = useState<AddressFormState>({
        ...emptyAddressFormState,
        name: customer?.name ?? '',
        phone: customer?.phone ?? '',
    });
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeAddressId, setActiveAddressId] = useState<number | null>(null);

    const loadAddresses = async () => {
        if (!token) {
            setAddresses([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(buildApiUrl('/api/account/addresses'), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to load your address book.'));
            }

            const payload = (await response.json()) as AddressListResponse;
            setAddresses(payload.data ?? []);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load your address book.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadAddresses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const resetCreateForm = () => {
        setActiveAddressId(null);
        setFormState({
            ...emptyAddressFormState,
            name: customer?.name ?? '',
            phone: customer?.phone ?? '',
        });
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!token) {
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch(
                buildApiUrl(activeAddressId ? `/api/account/addresses/${activeAddressId}` : '/api/account/addresses'),
                {
                    method: activeAddressId ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(formState),
                },
            );

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to save the address.'));
            }

            await response.json().catch(() => null as AddressResponse | null);
            await loadAddresses();
            resetCreateForm();
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save the address.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (addressId: number) => {
        if (!token) {
            return;
        }

        setError(null);

        try {
            const response = await fetch(buildApiUrl(`/api/account/addresses/${addressId}`), {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to delete the address.'));
            }

            await loadAddresses();

            if (activeAddressId === addressId) {
                resetCreateForm();
            }
        } catch (deleteError) {
            setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete the address.');
        }
    };

    const handleSetDefault = async (addressId: number) => {
        if (!token) {
            return;
        }

        setError(null);

        try {
            const response = await fetch(buildApiUrl(`/api/account/addresses/${addressId}/default`), {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to update your default address.'));
            }

            await loadAddresses();
        } catch (defaultError) {
            setError(defaultError instanceof Error ? defaultError.message : 'Unable to update your default address.');
        }
    };

    return (
        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_420px]">
                <section className="space-y-6">
                    <div className="glass-panel rounded-[32px] p-8 sm:p-10">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Address Book</p>
                        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h1 className="font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                                    Saved delivery addresses
                                </h1>
                                <p className="mt-3 max-w-2xl text-base font-light leading-relaxed text-[var(--text-muted)]">
                                    Borrowing the best part of Amazon’s address book: save once, reuse anytime, and keep separate addresses ready for gifts.
                                </p>
                            </div>
                            <button
                                className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-canvas)] transition hover:opacity-85"
                                onClick={resetCreateForm}
                                type="button"
                            >
                                Add New Address
                            </button>
                        </div>
                    </div>

                    {error ? (
                        <div className="rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">
                            {error}
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="glass-panel rounded-[32px] p-8 text-sm text-[var(--text-muted)]">Loading your saved addresses...</div>
                    ) : addresses.length === 0 ? (
                        <div className="glass-panel rounded-[32px] p-8 sm:p-10">
                            <h2 className="font-display text-3xl font-light text-[var(--color-ink)]">No saved addresses yet</h2>
                            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
                                Add a home address now, then layer in gift destinations later without slowing down checkout.
                            </p>
                            <Link
                                className="mt-8 inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                to="/checkout"
                            >
                                Go to checkout
                            </Link>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {addresses.map((address) => (
                                <AddressCard
                                    key={address.id}
                                    address={address}
                                    onDelete={() => void handleDelete(address.id)}
                                    onEdit={() => {
                                        setActiveAddressId(address.id);
                                        setFormState(mapAddressToFormState(address));
                                    }}
                                    onMakeDefault={() => void handleSetDefault(address.id)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                <aside className="glass-panel rounded-[32px] p-6 sm:p-8 lg:sticky lg:top-28 lg:self-start">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                        {activeAddressId ? 'Edit Address' : 'New Address'}
                    </p>
                    <h2 className="mt-3 font-display text-3xl font-light tracking-tight text-[var(--color-ink)]">
                        {activeAddressId ? 'Refine this saved destination' : 'Add another place to deliver'}
                    </h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
                        Keep your own place as default and still save special gifting destinations for later.
                    </p>

                    <form className="mt-8 space-y-6" onSubmit={handleFormSubmit}>
                        <AddressFormFields
                            onChange={(field, nextValue) => {
                                setFormState((current) => ({
                                    ...current,
                                    [field]: nextValue,
                                }));
                            }}
                            value={formState}
                        />

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                className="inline-flex flex-1 items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-canvas)] transition hover:opacity-85 disabled:opacity-60"
                                disabled={isSaving}
                                type="submit"
                            >
                                {isSaving ? 'Saving...' : activeAddressId ? 'Update Address' : 'Save Address'}
                            </button>
                            <button
                                className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                onClick={resetCreateForm}
                                type="button"
                            >
                                Clear
                            </button>
                        </div>
                    </form>
                </aside>
            </div>
        </main>
    );
}
