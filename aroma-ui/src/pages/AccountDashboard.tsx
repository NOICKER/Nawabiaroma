import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

export function AccountDashboard() {
    const { customer, logout } = useCustomerAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        setIsLoggingOut(true);
        logout();
        setIsLoggingOut(false);
    };

    return (
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <div className="glass-panel rounded-[32px] p-8 sm:p-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">My Account</p>
                <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                    {customer?.name ?? 'Your account'}
                </h1>
                <p className="mt-3 text-base font-light leading-relaxed text-[var(--text-muted)]">{customer?.email}</p>

                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                    <Link
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85"
                        to="/orders"
                    >
                        View Orders
                    </Link>
                    <button
                        className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                        onClick={handleLogout}
                        type="button"
                    >
                        {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                    </button>
                </div>
            </div>
        </main>
    );
}
