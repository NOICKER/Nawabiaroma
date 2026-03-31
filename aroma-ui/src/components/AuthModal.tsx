import { useState, type FormEvent } from 'react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { buildApiUrl } from '../lib/api';
import { X } from 'lucide-react';
import type { CustomerProfile } from '../context/types';

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

export function AuthModal() {
    const { login, showAuthModal, closeAuthModal, executePostLoginCallback } = useCustomerAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!showAuthModal) return null;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch(buildApiUrl('/api/auth/customer/login'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to sign in right now.'));
            }

            const payload = (await response.json()) as AuthResponse;
            login(payload.data);
            closeAuthModal();
            executePostLoginCallback();
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to sign in right now.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-ink)]/20 px-4 backdrop-blur-sm transition-opacity">
            <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-[var(--color-canvas)] p-8 shadow-2xl">
                <button
                    onClick={closeAuthModal}
                    className="absolute right-6 top-6 rounded-full p-2 text-[var(--color-ink)] transition hover:bg-[var(--glass-border)]"
                >
                    <X className="h-4 w-4" />
                </button>

                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Sign In</p>
                <h1 className="mt-4 font-display text-2xl font-light tracking-tight text-[var(--color-ink)]">
                    Save to Wishlist
                </h1>
                
                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                    <label className="block space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Email</span>
                        <input
                            className="w-full rounded-2xl border border-[var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]"
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            type="email"
                            value={email}
                        />
                    </label>

                    <label className="block space-y-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Password</span>
                        <input
                            className="w-full rounded-2xl border border-[var(--glass-border)] bg-transparent px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]"
                            onChange={(event) => setPassword(event.target.value)}
                            required
                            type="password"
                            value={password}
                        />
                    </label>

                    {error ? (
                        <p className="rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">
                            {error}
                        </p>
                    ) : null}

                    <button
                        className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85 disabled:opacity-60"
                        disabled={isSubmitting}
                        type="submit"
                    >
                        {isSubmitting ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
}
