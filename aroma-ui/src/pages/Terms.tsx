import { useEffect, useState } from 'react';
import { buildApiUrl } from '../lib/api';

interface PageResponse {
    data: {
        title: string;
        contentHtml: string | null;
    };
}

export function Terms() {
    const [contentHtml, setContentHtml] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            try {
                const response = await fetch(buildApiUrl('/api/pages/terms'));

                if (!response.ok) {
                    return;
                }

                const payload = (await response.json()) as PageResponse;
                setContentHtml(payload.data.contentHtml);
            } catch {
                return;
            }
        })();
    }, []);

    return (
        <main className="mx-auto max-w-4xl px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pt-32">
            <article className="glass-panel rounded-[32px] p-8 sm:p-10">
                <h1 className="font-display text-4xl font-light tracking-tight text-[var(--color-ink)]">Terms & Conditions</h1>
                <div
                    className="prose prose-neutral mt-6 max-w-none text-[var(--text-muted)]"
                    dangerouslySetInnerHTML={{
                        __html:
                            contentHtml ??
                            '<p>Orders are shipped across India only. Delivery timelines are estimates. Returns are accepted for unopened products subject to approval.</p>',
                    }}
                />
            </article>
        </main>
    );
}
