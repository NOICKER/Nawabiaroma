export function Contact() {
    return (
        <main className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pt-32">
            <section className="glass-panel rounded-[32px] p-8 sm:p-10">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Contact</p>
                <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                    Get in touch
                </h1>
                <div className="mt-8 space-y-4 text-base text-[var(--text-muted)]">
                    <p>Email: hello@nawabiaroma.com</p>
                    <p>WhatsApp: +91 90000 00000</p>
                    <p>Service area: India only</p>
                </div>
            </section>
        </main>
    );
}
