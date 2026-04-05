import { Link } from 'react-router-dom';

export function Footer() {
    return (
        <footer className="border-t border-[var(--glass-border)] bg-[var(--color-canvas)]/70">
            <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:px-8 md:py-20">
                <div className="space-y-4">
                    <Link className="inline-flex flex-col items-start gap-4" to="/">
                        <img
                            alt="Nawabi Aroma seal logo"
                            className="h-20 w-20 rounded-full object-cover shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                            decoding="async"
                            loading="lazy"
                            src="/brand/nawabi-seal-512.png"
                        />
                        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                            Nawabi Aroma
                        </span>
                    </Link>
                    <p className="max-w-md font-light leading-relaxed text-[var(--text-muted)]">
                        Modern perfume composed with memory, restraint, and a quiet sense of ceremony.
                    </p>
                </div>

                <div className="space-y-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                        Navigation
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link className="text-sm transition-opacity hover:opacity-60" to="/">
                            Home
                        </Link>
                        <Link className="text-sm transition-opacity hover:opacity-60" to="/shop">
                            Shop
                        </Link>
                        <Link className="text-sm transition-opacity hover:opacity-60" to="/about">
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

                <div className="space-y-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Legal</p>
                    <div className="flex flex-col gap-3">
                        <Link className="text-sm transition-opacity hover:opacity-60" to="/contact">
                            Contact
                        </Link>
                        <Link className="text-sm transition-opacity hover:opacity-60" to="/terms">
                            Terms
                        </Link>
                        <Link className="text-sm transition-opacity hover:opacity-60" to="/privacy">
                            Privacy
                        </Link>
                    </div>
                </div>
            </div>

            <div className="border-t border-[var(--glass-border)]">
                <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                        Copyright 2026 Nawabi. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
