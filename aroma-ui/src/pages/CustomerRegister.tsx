import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AddressFormFields } from '../components/account/AddressFormFields';
import { emptyAddressFormState, type AddressFormState } from '../components/account/addressFormState';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import type { CustomerProfile } from '../context/types';
import { buildApiUrl } from '../lib/api';

interface AuthResponse {
    data: {
        token: string;
        customer: CustomerProfile;
    };
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };
        return payload.error ?? payload.message ?? fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

export function CustomerRegister() {
    const navigate = useNavigate();
    const { login } = useCustomerAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [addressForm, setAddressForm] = useState<AddressFormState>({
        ...emptyAddressFormState,
        label: 'Home',
        setAsDefault: true,
    });
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch(buildApiUrl('/api/auth/customer/register'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: addressForm.name,
                    email,
                    password,
                    phone: addressForm.phone,
                    addressLabel: addressForm.label,
                    addressLine1: addressForm.addressLine1,
                    addressLine2: addressForm.addressLine2,
                    city: addressForm.city,
                    state: addressForm.state,
                    postalCode: addressForm.postalCode,
                    country: addressForm.country,
                }),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to create your account right now.'));
            }

            const payload = (await response.json()) as AuthResponse;
            login(payload.data);
            navigate('/account/addresses', {
                replace: true,
                state: { message: 'Your account is ready and your first address has been saved.' },
            });
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to create your account right now.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="mx-auto max-w-[1440px] px-4 py-24 sm:px-8 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,0.85fr)]">
                <section className="glass-panel rounded-[32px] p-8 sm:p-10 lg:p-12">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Customer Register</p>
                    <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-6xl">
                        Create your account and save your first delivery address
                    </h1>
                    <p className="mt-5 max-w-2xl text-base font-light leading-relaxed text-[var(--text-muted)]">
                        The goal is simple: one clean signup, then faster repeat orders and easy gifting later. Your mobile number and default address stay ready for checkout from day one.
                    </p>

                    <div className="mt-10 grid gap-4 sm:grid-cols-3">
                        {[
                            'Phone captured once',
                            'Home address saved as default',
                            'More gift addresses can be added later',
                        ].map((item) => (
                            <div key={item} className="rounded-[24px] border border-[var(--glass-border)] bg-transparent p-5">
                                <p className="font-display text-xl font-light text-[var(--color-ink)]">{item}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <form className="glass-panel rounded-[32px] p-8 sm:p-10" onSubmit={handleSubmit}>
                    <div className="space-y-8">
                        <div className="space-y-5">
                            <label className="block space-y-2">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Email</span>
                                <input
                                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-transparent px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]"
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                    type="email"
                                    value={email}
                                />
                            </label>

                            <label className="block space-y-2">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Password</span>
                                <input
                                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-transparent px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]"
                                    minLength={8}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                    type="password"
                                    value={password}
                                />
                            </label>
                        </div>

                        <div className="border-t border-[var(--glass-border)] pt-8">
                            <AddressFormFields
                                onChange={(field, nextValue) => {
                                    setAddressForm((current) => ({
                                        ...current,
                                        [field]: nextValue,
                                    }));
                                }}
                                showDefaultToggle={false}
                                value={addressForm}
                            />
                        </div>
                    </div>

                    {error ? (
                        <p className="mt-6 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">
                            {error}
                        </p>
                    ) : null}

                    <button
                        className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85 disabled:opacity-60"
                        disabled={isSubmitting}
                        type="submit"
                    >
                        {isSubmitting ? 'Creating Account...' : 'Create Account & Save Address'}
                    </button>

                    <p className="mt-6 text-sm text-[var(--text-muted)]">
                        Already have an account?{' '}
                        <Link className="text-[var(--color-ink)] underline-offset-4 hover:underline" to="/account/login">
                            Sign in
                        </Link>
                    </p>
                </form>
            </div>
        </main>
    );
}
