import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
    const location = useLocation();
    const { login } = useCustomerAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const next = typeof location.state === 'object' && location.state && 'next' in location.state ? location.state.next : '/account';

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
                    name,
                    email,
                    password,
                }),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to create your account right now.'));
            }

            const payload = (await response.json()) as AuthResponse;
            login(payload.data);
            navigate(typeof next === 'string' ? next : '/account', { replace: true });
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to create your account right now.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-24 sm:px-8 lg:px-12">
            <div className="grid w-full gap-8 lg:grid-cols-[1fr_460px]">
                <section className="glass-panel rounded-[32px] p-8 sm:p-10">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Customer Register</p>
                    <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Create your Nawabi Aroma account
                    </h1>
                    <p className="mt-4 max-w-xl text-base font-light leading-relaxed text-[var(--text-muted)]">
                        Register once to complete checkout faster and keep all of your orders in one place.
                    </p>
                </section>

                <form className="glass-panel rounded-[32px] p-8 sm:p-10" onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        <label className="block space-y-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Full Name</span>
                            <input
                                className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]"
                                onChange={(event) => setName(event.target.value)}
                                required
                                value={name}
                            />
                        </label>

                        <label className="block space-y-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Email</span>
                            <input
                                className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]"
                                onChange={(event) => setEmail(event.target.value)}
                                required
                                type="email"
                                value={email}
                            />
                        </label>

                        <label className="block space-y-3">
                            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Password</span>
                            <input
                                className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]"
                                minLength={8}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                                type="password"
                                value={password}
                            />
                        </label>
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
                        {isSubmitting ? 'Creating Account...' : 'Create Account'}
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
