import { Link } from 'react-router-dom';
import { discoverySetProduct } from '../../data/products';

export function DiscoverySection() {
    return (
        <section className="w-full py-24 md:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
                <div className="glass-panel rounded-2xl bg-white/40 dark:bg-black/40 backdrop-blur-md border border-[var(--glass-border)] p-8 md:p-12">
                    <div className="relative aspect-[4/5] flex items-center justify-center">
                        <div className="absolute inset-0 bg-gradient-to-tr from-stone-100 to-white dark:from-white/5 dark:to-white/5 rounded-full blur-3xl"></div>
                        <img
                            alt={`${discoverySetProduct.displayName} bottle`}
                            className="relative z-10 h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                            decoding="async"
                            loading="lazy"
                            src={discoverySetProduct.image}
                        />
                    </div>
                </div>

                <div className="space-y-6">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                        Discovery Set
                    </p>
                    <h2 className="font-display font-light tracking-tight text-[var(--color-ink)] text-4xl md:text-6xl lg:text-7xl">
                        START WITH THE SET
                    </h2>
                    <p className="font-light text-lg leading-relaxed text-[var(--text-muted)]">
                        Explore three 10ml signatures designed to let you live with the house before choosing a full bottle.
                    </p>
                    <Link
                        className="inline-flex bg-[var(--color-ink)] text-[var(--color-canvas)] font-display font-medium tracking-[0.2em] uppercase text-[11px] px-10 py-4 transition-all hover:opacity-80 active:scale-[0.98]"
                        to="/product/discovery-set"
                    >
                        Discover the Set
                    </Link>
                </div>
            </div>
        </section>
    );
}
