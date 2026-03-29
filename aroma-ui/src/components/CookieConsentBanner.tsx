interface CookieConsentBannerProps {
    onAccept: () => void;
    onDecline: () => void;
}

export function CookieConsentBanner({ onAccept, onDecline }: CookieConsentBannerProps) {
    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] px-4 sm:px-6 lg:px-8">
            <section className="glass-panel pointer-events-auto mx-auto max-w-5xl rounded-[30px] bg-[var(--color-canvas)]/88 p-5 sm:p-6">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-primary)]">
                            Cookie Preferences
                        </p>
                        <h2 className="mt-3 font-display text-2xl font-light tracking-tight text-[var(--color-ink)] sm:text-3xl">
                            Help us understand how the storefront is used
                        </h2>
                        <p className="mt-3 text-sm font-light leading-relaxed text-[var(--text-muted)] sm:text-base">
                            We use optional analytics cookies to measure visits and improve the Nawabi Aroma storefront. Accept to enable Google
                            Analytics 4, or decline to continue without analytics tracking.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                            onClick={onDecline}
                            type="button"
                        >
                            Decline
                        </button>
                        <button
                            className="inline-flex items-center justify-center rounded-full bg-[var(--color-primary)] px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-white transition hover:brightness-110"
                            onClick={onAccept}
                            type="button"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
