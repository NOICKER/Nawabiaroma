const pillars = [
    {
        title: 'Fragrance Architecture',
        description: 'Each perfume is structured in layers that unfold slowly, revealing the composition with clarity rather than excess.',
    },
    {
        title: 'Premium Oils',
        description: 'We use high-quality aromatic materials selected for depth, longevity, and a cleaner impression on skin.',
    },
    {
        title: 'Modern Composition',
        description: 'Classic perfumery references are edited through a contemporary lens so the result feels precise, wearable, and current.',
    },
];

export function CraftTrustSection() {
    return (
        <section className="w-full py-24 md:py-32">
            <div className="space-y-4 mb-12">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    Craft / Trust
                </p>
                <h2 className="font-display font-light tracking-tight text-[var(--color-ink)] text-4xl md:text-6xl">
                    COMPOSED WITH DISCIPLINE
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {pillars.map((pillar) => (
                    <article
                        key={pillar.title}
                        className="glass-panel rounded-2xl bg-white/40 dark:bg-black/40 backdrop-blur-md border border-[var(--glass-border)] p-8 md:p-10"
                    >
                        <h3 className="font-display text-2xl font-light tracking-tight text-[var(--color-ink)]">
                            {pillar.title}
                        </h3>
                        <p className="mt-4 font-light leading-relaxed text-[var(--text-muted)]">
                            {pillar.description}
                        </p>
                    </article>
                ))}
            </div>
        </section>
    );
}
