export function About() {
    return (
        <main className="px-5 pb-24 pt-28 sm:px-6 md:pb-32 md:pt-48">
            <article className="mx-auto flex max-w-[680px] flex-col gap-16 opacity-0 animate-[fadeIn_1s_ease-out_forwards] sm:gap-20 md:gap-24">
                <header className="flex flex-col items-center gap-6 text-center sm:gap-8">
                    <div className="h-20 w-px bg-gradient-to-b from-transparent to-[var(--color-ink)]/30"></div>
                    <h1 className="font-display text-4xl font-light leading-[0.9] tracking-tighter text-[var(--color-ink)] sm:text-5xl md:text-8xl">
                        WE BOTTLE <br /> <span className="font-normal italic font-serif text-[var(--color-ink)]/90">MEMORIES.</span>
                    </h1>
                    <p className="mt-2 max-w-md font-body text-base font-light leading-relaxed text-[var(--text-muted)] md:mt-4 md:text-xl">
                        The invisible architecture of smell. Stripping away the ornate to reveal the essential.
                    </p>
                </header>

                <figure className="group relative opacity-0 animate-[fadeInUp_0.8s_ease-out_0.2s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <div className="aspect-[16/9] w-full overflow-hidden rounded-sm bg-neutral-100 ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10">
                        <img
                            alt="Macro photography of chemical glassware"
                            className="h-full w-full object-cover grayscale contrast-110 brightness-90 transition-all duration-700 hover:grayscale-0 hover:contrast-100 hover:brightness-100 mix-blend-multiply dark:mix-blend-normal"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCARTj7CBfefXOM6spdqqhiAqFOj_jBTtHByJ9mkwJVckGSenIQ4GqR0BxmIgjGSUvgqJPoz0IXkAMf11pBshz-BK2SkGQQw27-oByw9OvQQg0795fjF7FM2L8vwSd0OBZpQNiXo7FhSMogH-bOFr1Ir3rwAA6gTCXaBO2po-iysf_Q0o1FOT6kmsd_EZa-P-ZTwP4IazFgEH_mRbA2NSFCvmCo4iE_VmlSIg7e0CVcoqKCdNYMgAAIAlUyPRIXv4zuym7SmlolTEo"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)]/60 to-transparent opacity-40"></div>
                    </div>
                    <figcaption className="mt-4 flex items-center gap-3 font-mono text-[10px] tracking-widest text-[var(--text-muted)]">
                        <span className="h-px w-8 bg-[var(--color-ink)]/20"></span>
                        FIG 01. - MOLECULAR DISTILLATION
                    </figcaption>
                </figure>

                <div className="prose prose-invert max-w-none space-y-8 font-light leading-[1.8] text-[var(--color-ink)]/80 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.4s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <p className="text-lg leading-relaxed text-[var(--color-ink)] sm:text-xl">
                        Luxury is often synonymous with noise - a heavy velvet curtain of gold filigree designed to obscure the reality of the craft. At Nawabi, we operate in the silence between the notes.
                    </p>
                    <p>
                        Our laboratory is a sanctuary of subtraction. We start with the chaotic complexity of nature - rare oud from Assam, vetiver from Haiti - and we meticulously refine it. We remove the impurities and the olfactory clutter until only the ghost of the scent remains. It is an act of restoration.
                    </p>
                </div>

                <blockquote className="relative border-y border-[var(--glass-border)] py-12 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.5s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-canvas)] px-4">
                        <span className="material-symbols-outlined text-sm text-[var(--color-ink)]/20">flare</span>
                    </div>
                    <p className="px-4 text-center font-serif text-2xl italic leading-tight text-[var(--color-ink)] sm:px-8 sm:text-3xl md:text-5xl">
                        "Perfume is the ghost of a flower, caught in a glass cage."
                    </p>
                    <footer className="mt-8 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                        The Alchemist's Journal, Vol. IV
                    </footer>
                </blockquote>

                <figure className="group relative opacity-0 animate-[fadeInUp_0.8s_ease-out_0.6s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <div className="aspect-[21/9] w-full overflow-hidden rounded-sm bg-neutral-100 ring-1 ring-black/10 dark:bg-neutral-900 dark:ring-white/10">
                        <img
                            alt="Raw ingredients in monochrome"
                            className="h-full w-full object-cover grayscale contrast-110 brightness-90 transition-all duration-700 hover:grayscale-0 hover:contrast-100 hover:brightness-100 mix-blend-multiply dark:mix-blend-normal"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9ZA7KhQ3T4k7CxbTBjsNpvZISAKeNc6TerGXHg98XV-41MQfIx3lDVwArDTw0TeXtecdZ9-Znul_A_lmLnIGpfgcqcFjKa6w8wahtMQzAL85F8KkSF1J6OWc6iqKArX7Wl8YySJP8EMut1yr8v-f1BMlP2y7uz6G8As98DqPEGDMdJAhNA5gxC2lTplApK_kHO3t-_eQBkSnqd4o9KOfISMrqTMNyoQwywZ9_OuTPkniQdjEeeJN6w3uXLo_EW0yJG6B673kCYc0"
                        />
                    </div>
                    <figcaption className="mt-4 flex items-center justify-end gap-3 font-mono text-[10px] tracking-widest text-[var(--text-muted)]">
                        FIG 02. - RAW MATERIAL EXTRACTION
                        <span className="h-px w-8 bg-[var(--color-ink)]/20"></span>
                    </figcaption>
                </figure>

                <div className="prose prose-invert max-w-none space-y-8 font-light leading-[1.8] text-[var(--color-ink)]/80 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.7s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <p>
                        We do not create fragrances to overpower. We create atmospheres that linger like an after-image on the retina. Each bottle is a study in tension between the synthetic and the natural, the scientific and the soulful.
                    </p>
                    <p>
                        Using advanced molecular extraction, we isolate specific aromatic compounds that define an ingredient's character, discarding the rest. This allows for fragrances that are startlingly clear and modern. Scent without the weight.
                    </p>
                </div>


            </article>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </main>
    );
}
