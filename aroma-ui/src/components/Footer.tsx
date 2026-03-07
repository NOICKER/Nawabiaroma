import { Link } from 'react-router-dom';

export function Footer() {
    return (
        <footer className="border-t border-[var(--glass-border)] bg-[var(--color-canvas)]/70">
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-16 md:py-20 grid gap-12 md:grid-cols-[1.2fr_1fr_1fr]">
                <div className="space-y-4">
                    <Link className="inline-flex text-2xl font-bold tracking-[0.3em] leading-none" to="/">
                        NAWABI
                    </Link>
                    <p className="max-w-md font-light text-[var(--text-muted)] leading-relaxed">
                        Modern perfume composed with memory, restraint, and a quiet sense of ceremony.
                    </p>
                </div>

                <div className="space-y-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                        Navigation
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link className="text-sm hover:opacity-60 transition-opacity" to="/">
                            Home
                        </Link>
                        <Link className="text-sm hover:opacity-60 transition-opacity" to="/shop">
                            Shop
                        </Link>
                        <Link className="text-sm hover:opacity-60 transition-opacity" to="/about">
                            About
                        </Link>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                        Service
                    </p>
                    <div className="space-y-3 text-sm text-[var(--text-muted)]">
                        <p>Shipping: Complimentary delivery across India.</p>
                        <p>Returns: Complimentary returns on unopened bottles.</p>
                    </div>
                </div>
            </div>

            <div className="border-t border-[var(--glass-border)]">
                <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                        Copyright © 2026 Nawabi. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
