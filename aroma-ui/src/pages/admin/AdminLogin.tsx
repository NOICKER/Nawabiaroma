import { ArrowRight, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useCart } from '../../context/CartContext';
import {
    readBootstrapSecretFromHash,
    submitAdminLogin,
    submitAdminSecretLogin,
} from '../../lib/adminAuth.ts';

export function AdminLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false);
    const { isAuthenticated, login } = useAdminAuth();
    const { closeCart, isCartOpen } = useCart();
    const navigate = useNavigate();
    const didAutoLogin = useRef(false);

    useEffect(() => {
        if (isCartOpen) {
            closeCart();
        }
    }, [closeCart, isCartOpen]);

    // Auto-login when #setup=SECRET is in the URL
    useEffect(() => {
        if (typeof window === 'undefined' || didAutoLogin.current) {
            return;
        }

        const setupSecret = readBootstrapSecretFromHash(window.location.hash);

        if (!setupSecret) {
            return;
        }

        didAutoLogin.current = true;

        // Clear hash from URL immediately so it's not visible
        window.history.replaceState(
            window.history.state,
            document.title,
            `${window.location.pathname}${window.location.search}`,
        );

        setIsAutoLoggingIn(true);

        submitAdminSecretLogin(setupSecret)
            .then((token) => {
                login(token);
                navigate('/admin', { replace: true });
            })
            .catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Invalid setup secret. Access denied.');
                setIsAutoLoggingIn(false);
            });
    }, [login, navigate]);

    if (isAuthenticated) {
        return <Navigate replace to="/admin" />;
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            const token = await submitAdminLogin(email, password);
            login(token);
            navigate('/admin');
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : 'Unable to log in.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="dark fixed inset-0 z-[100] overflow-y-auto bg-[var(--color-canvas)] text-[var(--color-ink)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(18,137,161,0.24),transparent_45%)]"></div>
            <div className="pointer-events-none absolute bottom-0 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-[var(--color-primary)]/12 blur-[140px]"></div>

            <div className="relative flex min-h-full items-center justify-center px-4 py-10 sm:px-6">
                <div className="glass-panel w-full max-w-md rounded-[32px] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-8 sm:py-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">
                                {isAutoLoggingIn ? 'Authenticating' : 'Nawabi Admin'}
                            </p>
                            <h1 className="mt-4 font-display text-3xl font-light tracking-[0.04em] text-[var(--color-ink)] sm:text-4xl">
                                {isAutoLoggingIn ? 'Verifying secret…' : 'Sign in'}
                            </h1>
                        </div>
                        <div className="glass-panel flex h-12 w-12 items-center justify-center rounded-2xl">
                            {isAutoLoggingIn ? (
                                <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary)]" strokeWidth={1.75} />
                            ) : (
                                <Shield className="h-5 w-5 text-[var(--color-primary)]" strokeWidth={1.75} />
                            )}
                        </div>
                    </div>

                    <p className="mt-5 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
                        {isAutoLoggingIn
                            ? 'Validating your setup secret with the server. You will be redirected automatically.'
                            : 'Access the internal dashboard to manage inventory, editorial content, and order operations.'}
                    </p>

                    {!isAutoLoggingIn && (
                        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]" htmlFor="admin-email">
                                    Email
                                </label>
                                <input
                                    autoComplete="email"
                                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-primary)] focus:bg-white/7"
                                    id="admin-email"
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="admin@nawabiaroma.com"
                                    required
                                    type="email"
                                    value={email}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]" htmlFor="admin-password">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        autoComplete="current-password"
                                        className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 pr-12 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-primary)] focus:bg-white/7"
                                        id="admin-password"
                                        onChange={(event) => setPassword(event.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        type={isPasswordVisible ? 'text' : 'password'}
                                        value={password}
                                    />
                                    <button
                                        aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                                        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                        onClick={() => setIsPasswordVisible((s) => !s)}
                                        type="button"
                                    >
                                        {isPasswordVisible ? <EyeOff className="h-4.5 w-4.5" strokeWidth={1.75} /> : <Eye className="h-4.5 w-4.5" strokeWidth={1.75} />}
                                    </button>
                                </div>
                            </div>

                            {error ? (
                                <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                    {error}
                                </div>
                            ) : null}

                            <button
                                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-4 py-3 font-display text-[11px] font-medium uppercase tracking-[0.28em] text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={isSubmitting}
                                type="submit"
                            >
                                <span>{isSubmitting ? 'Signing In…' : 'Enter Admin'}</span>
                                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                        </form>
                    )}

                    {isAutoLoggingIn && error ? (
                        <div className="mt-6 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                            {error}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
