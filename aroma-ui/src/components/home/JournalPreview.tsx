import { Link } from 'react-router-dom';

const journalEntries = [
    {
        title: 'The Grammar of Sillage',
        summary: 'How projection, quietness, and skin chemistry shape the feeling of a fragrance after the first hour.',
    },
    {
        title: 'Why Woods Still Matter',
        summary: 'A closer look at sandalwood, cedar, and oud as structural materials rather than ornamental notes.',
    },
    {
        title: 'Composing in Negative Space',
        summary: 'Our approach to editing formulas until the fragrance feels spacious, modern, and precise.',
    },
];

export function JournalPreview() {
    return (
        <section className="w-full py-24 md:py-32">
            <div className="space-y-4 mb-12">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    Journal Preview
                </p>
                <h2 className="font-display font-light tracking-tight text-[var(--color-ink)] text-4xl md:text-6xl">
                    FROM THE JOURNAL
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {journalEntries.map((entry) => (
                    <article
                        key={entry.title}
                        className="glass-panel rounded-2xl bg-white/40 dark:bg-black/40 backdrop-blur-md border border-[var(--glass-border)] p-8 md:p-10 hover:-translate-y-1 transition-transform duration-500"
                    >
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                            Journal
                        </p>
                        <h3 className="mt-6 font-display text-2xl font-light tracking-tight text-[var(--color-ink)]">
                            {entry.title}
                        </h3>
                        <p className="mt-4 font-light leading-relaxed text-[var(--text-muted)]">
                            {entry.summary}
                        </p>
                        <Link className="mt-8 inline-flex font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors" to="/about">
                            Read Article
                        </Link>
                    </article>
                ))}
            </div>
        </section>
    );
}
