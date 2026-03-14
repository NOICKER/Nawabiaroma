import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const JOURNAL_ENDPOINT = '/api/journal';

interface JournalEntry {
    id: number;
    slug: string;
    title: string;
    summary: string | null;
}

interface JournalResponse {
    data: JournalEntry[];
}

export function JournalPreview() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        void fetch(JOURNAL_ENDPOINT)
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Unable to load journal entries right now.');
                }

                return (await response.json()) as JournalResponse;
            })
            .then((payload) => {
                if (isCancelled) {
                    return;
                }

                setEntries(payload.data.slice(0, 3));
                setError(null);
                setIsLoading(false);
            })
            .catch((loadError) => {
                if (isCancelled) {
                    return;
                }

                setError(loadError instanceof Error ? loadError.message : 'Unable to load journal entries right now.');
                setIsLoading(false);
            });

        return () => {
            isCancelled = true;
        };
    }, []);

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

            {error ? (
                <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-6 py-5 text-sm text-[var(--text-muted)]">
                    {error}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {isLoading
                        ? Array.from({ length: 3 }, (_, index) => (
                              <article
                                  key={index}
                                  className="glass-panel rounded-2xl bg-white/40 dark:bg-black/40 backdrop-blur-md border border-[var(--glass-border)] p-8 md:p-10"
                              >
                                  <div className="h-3 w-16 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                                  <div className="mt-6 h-8 w-3/4 animate-pulse rounded-full bg-[var(--color-ink)]/10"></div>
                                  <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                                  <div className="mt-3 h-4 w-5/6 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                                  <div className="mt-8 h-3 w-24 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                              </article>
                          ))
                        : entries.map((entry) => (
                              <article
                                  key={entry.id}
                                  className="glass-panel rounded-2xl bg-white/40 dark:bg-black/40 backdrop-blur-md border border-[var(--glass-border)] p-8 md:p-10 hover:-translate-y-1 transition-transform duration-500"
                              >
                                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                                      Journal
                                  </p>
                                  <h3 className="mt-6 font-display text-2xl font-light tracking-tight text-[var(--color-ink)]">
                                      {entry.title}
                                  </h3>
                                  <p className="mt-4 font-light leading-relaxed text-[var(--text-muted)]">
                                      {entry.summary ?? 'A new journal entry is being prepared.'}
                                  </p>
                                  <Link
                                      className="mt-8 inline-flex font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors"
                                      to="/about"
                                  >
                                      Read Article
                                  </Link>
                              </article>
                          ))}
                </div>
            )}
        </section>
    );
}
