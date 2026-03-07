import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { productById, type StoreProduct } from '../data/products';

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

export function ProductDetail() {
    const { id } = useParams();
    const productData = id ? productById[id] : undefined;

    if (!productData) {
        return <ProductNotFound />;
    }

    return <ProductDetailContent key={productData.id} productData={productData} />;
}

function ProductNotFound() {
    return (
        <main className="min-h-screen bg-[var(--color-canvas)] px-8 py-24 lg:px-24 lg:py-32 flex items-center">
            <div className="max-w-xl w-full space-y-8">
                <Link
                    className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors"
                    to="/shop"
                >
                    <span aria-hidden="true">&larr;</span>
                    Back to Collection
                </Link>
                <div className="space-y-4">
                    <h1 className="font-display text-5xl lg:text-7xl font-light tracking-tight text-[var(--color-ink)]">
                        Product not found
                    </h1>
                    <p className="font-light text-[var(--text-muted)] text-lg leading-relaxed">
                        This fragrance link is no longer available. Return to the collection to continue browsing.
                    </p>
                </div>
            </div>
        </main>
    );
}

function ProductDetailContent({ productData }: { productData: StoreProduct }) {
    const { addToCart, openCart } = useCart();
    const [quantity, setQuantity] = useState(1);

    const handleAddToCart = () => {
        addToCart(
            {
                id: productData.id,
                name: productData.displayName,
                size: productData.size,
                price: productData.priceValue,
                image: productData.image,
            },
            quantity
        );
        openCart();
    };

    return (
        <main className="relative flex flex-col lg:flex-row min-h-screen">
            <section className="lg:w-1/2 lg:h-screen lg:sticky lg:top-0 relative overflow-hidden bg-[var(--color-canvas)] dark:bg-[#0d0d0d]">
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10 pointer-events-none"></div>
                <div className="w-full h-[70vh] lg:h-full flex items-center justify-center p-12 lg:p-24 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[var(--color-ink)]/5 dark:bg-white/[0.02] rounded-full blur-[120px]"></div>
                    <img
                        alt={`${productData.displayName} Bottle`}
                        className="relative z-20 h-full w-auto object-contain mix-blend-multiply dark:mix-blend-normal dark:brightness-[0.9] dark:contrast-[1.1]"
                        src={productData.image}
                    />
                </div>
                <div className="absolute bottom-12 left-12 z-30 flex items-center gap-3">
                    <div className="h-[1px] w-8 bg-[var(--color-ink)]/20"></div>
                    <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">{productData.source}</span>
                </div>
            </section>

            <section className="lg:w-1/2 min-h-screen bg-[var(--color-canvas)] px-8 py-24 lg:px-24 lg:py-32 flex flex-col">
                <div className="max-w-xl w-full">
                    <Link
                        className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors"
                        to="/shop"
                    >
                        <span aria-hidden="true">&larr;</span>
                        Back to Collection
                    </Link>

                    <div className="space-y-6 mb-16 mt-10">
                        <div className="flex items-center gap-4">
                            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">{productData.number}</span>
                        </div>
                        <h1 className="font-display text-6xl lg:text-8xl font-light tracking-[-0.03em] leading-none text-[var(--color-ink)]">
                            {productData.name} <br /> <span className="italic font-light opacity-80">{productData.nameSub}</span>
                        </h1>
                        <div className="flex items-baseline justify-between pt-8 border-t border-[var(--glass-border)] mt-12">
                            <span className="font-mono text-[11px] text-[var(--text-muted)] tracking-widest">{productData.size}</span>
                            <span className="font-mono text-xl font-light text-[var(--color-ink)]">{formatPrice(productData.priceValue)}</span>
                        </div>
                    </div>

                    <div className="space-y-6 text-[var(--text-muted)] font-light leading-relaxed text-lg mb-20">
                        <p>{productData.tagline}</p>
                        <p className="text-sm font-mono text-[var(--text-muted)]/60 tracking-tight">{productData.description}</p>
                    </div>

                    <div className="space-y-8 mb-24">
                        <h3 className="font-display text-sm font-medium tracking-[0.2em] text-[var(--text-muted)] uppercase">Olfactory Architecture</h3>
                        <div className="space-y-2">
                            <div className="group/note">
                                <div className="h-14 w-full rounded-sm flex items-center px-8 cursor-default transition-all duration-300 
                                    border border-[var(--glass-border)] bg-[var(--glass-surface)] hover:bg-[var(--color-ink)]/5 dark:hover:bg-white/[0.08]
                                    hover:border-[var(--color-ink)]/30 hover:translate-x-1 backdrop-blur-md">
                                    <div className="w-28 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">Top Notes</div>
                                    <div className="flex gap-3 text-sm text-[var(--color-ink)]">
                                        {productData.notes.top.map((note, index) => (
                                            <span key={note} className="flex items-center gap-3">
                                                {index > 0 && <span className="text-[var(--text-muted)]">/</span>}
                                                {note}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="group/note">
                                <div className="h-20 w-full rounded-sm flex items-center px-8 cursor-default transition-all duration-300
                                    border border-[var(--glass-border)] bg-[var(--glass-surface)] hover:bg-[var(--color-ink)]/5 dark:hover:bg-white/[0.08]
                                    hover:border-[var(--color-ink)]/30 hover:translate-x-1 backdrop-blur-md">
                                    <div className="w-28 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">Heart Notes</div>
                                    <div className="flex gap-3 text-sm text-[var(--color-ink)]">
                                        {productData.notes.heart.map((note, index) => (
                                            <span key={note} className="flex items-center gap-3">
                                                {index > 0 && <span className="text-[var(--text-muted)]">/</span>}
                                                {note}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="group/note">
                                <div className="h-32 w-full rounded-sm flex items-center px-8 cursor-default transition-all duration-300
                                    border border-[var(--glass-border)] bg-[var(--glass-surface)] hover:bg-[var(--color-ink)]/5 dark:hover:bg-white/[0.08]
                                    hover:border-[var(--color-ink)]/30 hover:translate-x-1 backdrop-blur-md">
                                    <div className="w-28 font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em]">Base Notes</div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-ink)]">
                                        {productData.notes.base.map((note, index) => (
                                            <span key={note} className="flex items-center gap-4">
                                                {index > 0 && <span className="text-[var(--text-muted)]">/</span>}
                                                {note}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-[var(--glass-border)] divide-y divide-[var(--glass-border)] mb-32">
                        <details className="group py-6 cursor-pointer">
                            <summary className="flex items-center justify-between font-display text-sm uppercase tracking-widest text-[var(--color-ink)]/80 list-none">
                                <span>Sourcing & Purity</span>
                                <span className="material-symbols-outlined transition-transform duration-500 group-open:rotate-45 font-light">add</span>
                            </summary>
                            <div className="pt-6 text-xs text-[var(--text-muted)] font-mono leading-loose tracking-wide">
                                ALCOHOL DENAT., PARFUM (FRAGRANCE), AQUA (WATER), LIMONENE, LINALOOL, CITRAL, GERANIOL. ETHICALLY HARVESTED AGARWOOD FROM ASSAM.
                            </div>
                        </details>
                        <details className="group py-6 cursor-pointer">
                            <summary className="flex items-center justify-between font-display text-sm uppercase tracking-widest text-[var(--color-ink)]/80 list-none">
                                <span>Logistics</span>
                                <span className="material-symbols-outlined transition-transform duration-500 group-open:rotate-45 font-light">add</span>
                            </summary>
                            <div className="pt-6 text-xs text-[var(--text-muted)] font-mono leading-loose tracking-wide">
                                COMPLIMENTARY WHITE-GLOVE DELIVERY ON ALL SIGNATURE COLLECTION ORDERS. WORLDWIDE SHIPPING AVAILABLE.
                            </div>
                        </details>
                    </div>

                    <div className="sticky bottom-10 z-40">
                        <div className="flex flex-col sm:flex-row gap-px bg-[var(--color-ink)]/10 p-[1px] backdrop-blur-2xl">
                            <div className="bg-[var(--color-canvas)] flex items-center justify-between px-6 py-5 w-full sm:w-48 border border-[var(--glass-border)]">
                                <button className="text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors" onClick={() => setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1))} type="button">
                                    <span className="material-symbols-outlined text-sm">remove</span>
                                </button>
                                <span className="font-mono text-sm">{String(quantity).padStart(2, '0')}</span>
                                <button className="text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors" onClick={() => setQuantity((currentQuantity) => currentQuantity + 1)} type="button">
                                    <span className="material-symbols-outlined text-sm">add</span>
                                </button>
                            </div>
                            <button className="flex-1 bg-[var(--color-ink)] text-[var(--color-canvas)] font-display font-medium tracking-[0.2em] uppercase text-[11px] py-5 px-12 transition-all hover:opacity-80 active:scale-[0.98]" onClick={handleAddToCart} type="button">
                                Add to Selection
                            </button>
                        </div>
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[11px] font-mono text-[var(--text-muted)] tracking-wide">
                                Includes a complimentary 2ml sample to test before opening.
                            </p>
                            {productData.id !== 'discovery-set' ? (
                                <Link
                                    className="text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors"
                                    to="/product/discovery-set"
                                >
                                    Not sure? Try the Discovery Set first
                                </Link>
                            ) : null}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
