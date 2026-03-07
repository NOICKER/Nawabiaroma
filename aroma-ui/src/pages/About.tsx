export function About() {
    return (
        <main className="pt-32 md:pt-48 pb-32 px-6">
            <article className="max-w-[680px] mx-auto flex flex-col gap-24 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
                <header className="text-center flex flex-col items-center gap-8">
                    <div className="h-20 w-px bg-gradient-to-b from-transparent to-[var(--color-ink)]/30"></div>
                    <h1 className="font-display font-light text-5xl md:text-8xl leading-[0.9] tracking-tighter text-[var(--color-ink)]">
                        WE BOTTLE <br /> <span className="font-normal italic font-serif text-[var(--color-ink)]/90">MEMORIES.</span>
                    </h1>
                    <p className="font-body font-light text-lg md:text-xl leading-relaxed text-[var(--text-muted)] mt-4 max-w-md">
                        The invisible architecture of smell. Stripping away the ornate to reveal the essential.
                    </p>
                </header>

                <figure className="group relative opacity-0 animate-[fadeInUp_0.8s_ease-out_0.2s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <div className="aspect-[16/9] w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden rounded-sm ring-1 ring-black/10 dark:ring-white/10">
                        <img
                            alt="Macro photography of chemical glassware"
                            className="w-full h-full object-cover grayscale contrast-110 brightness-90 hover:grayscale-0 hover:contrast-100 hover:brightness-100 transition-all duration-700 mix-blend-multiply dark:mix-blend-normal"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCARTj7CBfefXOM6spdqqhiAqFOj_jBTtHByJ9mkwJVckGSenIQ4GqR0BxmIgjGSUvgqJPoz0IXkAMf11pBshz-BK2SkGQQw27-oByw9OvQQg0795fjF7FM2L8vwSd0OBZpQNiXo7FhSMogH-bOFr1Ir3rwAA6gTCXaBO2po-iysf_Q0o1FOT6kmsd_EZa-P-ZTwP4IazFgEH_mRbA2NSFCvmCo4iE_VmlSIg7e0CVcoqKCdNYMgAAIAlUyPRIXv4zuym7SmlolTEo"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-canvas)]/60 to-transparent opacity-40"></div>
                    </div>
                    <figcaption className="mt-4 font-mono text-[10px] tracking-widest text-[var(--text-muted)] flex items-center gap-3">
                        <span className="h-px w-8 bg-[var(--color-ink)]/20"></span>
                        FIG 01. — MOLECULAR DISTILLATION
                    </figcaption>
                </figure>

                <div className="prose prose-invert max-w-none font-light text-[var(--color-ink)]/80 leading-[1.8] space-y-8 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.4s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <p className="text-xl leading-relaxed text-[var(--color-ink)]">
                        Luxury is often synonymous with noise—a heavy velvet curtain of gold filigree designed to obscure the reality of the craft. At Nawabi, we operate in the silence between the notes.
                    </p>
                    <p>
                        Our laboratory is a sanctuary of subtraction. We start with the chaotic complexity of nature—rare oud from Assam, vetiver from Haiti—and we meticulously refine it. We remove the impurities and the olfactory clutter until only the ghost of the scent remains. It is an act of restoration.
                    </p>
                </div>

                <blockquote className="py-12 relative border-y border-[var(--glass-border)] opacity-0 animate-[fadeInUp_0.8s_ease-out_0.5s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-canvas)] px-4">
                        <span className="material-symbols-outlined text-[var(--color-ink)]/20 text-sm">flare</span>
                    </div>
                    <p className="font-serif italic text-4xl md:text-5xl text-center leading-tight text-[var(--color-ink)] px-8">
                        "Perfume is the ghost of a flower, caught in a glass cage."
                    </p>
                    <footer className="mt-8 text-center font-mono text-[10px] text-[var(--text-muted)] tracking-[0.3em] uppercase">
                        The Alchemist's Journal, Vol. IV
                    </footer>
                </blockquote>

                <figure className="group relative opacity-0 animate-[fadeInUp_0.8s_ease-out_0.6s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <div className="aspect-[21/9] w-full bg-neutral-100 dark:bg-neutral-900 overflow-hidden rounded-sm ring-1 ring-black/10 dark:ring-white/10">
                        <img
                            alt="Raw ingredients in monochrome"
                            className="w-full h-full object-cover grayscale contrast-110 brightness-90 hover:grayscale-0 hover:contrast-100 hover:brightness-100 transition-all duration-700 mix-blend-multiply dark:mix-blend-normal"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA9ZA7KhQ3T4k7CxbTBjsNpvZISAKeNc6TerGXHg98XV-41MQfIx3lDVwArDTw0TeXtecdZ9-Znul_A_lmLnIGpfgcqcFjKa6w8wahtMQzAL85F8KkSF1J6OWc6iqKArX7Wl8YySJP8EMut1yr8v-f1BMlP2y7uz6G8As98DqPEGDMdJAhNA5gxC2lTplApK_kHO3t-_eQBkSnqd4o9KOfISMrqTMNyoQwywZ9_OuTPkniQdjEeeJN6w3uXLo_EW0yJG6B673kCYc0"
                        />
                    </div>
                    <figcaption className="mt-4 font-mono text-[10px] tracking-widest text-[var(--text-muted)] flex items-center justify-end gap-3">
                        FIG 02. — RAW MATERIAL EXTRACTION
                        <span className="h-px w-8 bg-[var(--color-ink)]/20"></span>
                    </figcaption>
                </figure>

                <div className="prose prose-invert max-w-none font-light text-[var(--color-ink)]/80 leading-[1.8] space-y-8 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.7s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <p>
                        We do not create fragrances to overpower. We create atmospheres that linger like an after-image on the retina. Each bottle is a study in tension between the synthetic and the natural, the scientific and the soulful.
                    </p>
                    <p>
                        Using advanced molecular extraction, we isolate specific aromatic compounds that define an ingredient's character, discarding the rest. This allows for fragrances that are startlingly clear and modern. Scent without the weight.
                    </p>
                </div>

                <div className="mt-12 flex flex-col items-center gap-8 pb-12 opacity-0 animate-[fadeInUp_0.8s_ease-out_0.8s_forwards]" style={{ animationFillMode: 'forwards' }}>
                    <div className="h-12 w-px bg-[var(--color-ink)]/10"></div>
                    <div className="w-48 opacity-90 dark:filter dark:invert dark:brightness-150 text-[var(--color-ink)]">
                        <svg fill="none" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" className="stroke-[1.5px]">
                            <path d="M10 50 C 20 40, 40 20, 50 30 C 60 40, 50 60, 40 60 C 30 60, 40 40, 60 35 C 80 30, 90 60, 80 65 C 70 70, 100 40, 110 40 C 120 40, 115 55, 125 50 C 135 45, 150 30, 160 35 C 170 40, 160 55, 180 50" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="font-display font-medium text-xs tracking-[0.2em] uppercase text-[var(--color-ink)]">Dr. A. K. Nawabi</p>
                        <p className="font-mono text-[10px] text-[var(--text-muted)] mt-2 tracking-widest">HEAD PERFUMER & FOUNDER</p>
                    </div>
                </div>
            </article>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </main>
    );
}
