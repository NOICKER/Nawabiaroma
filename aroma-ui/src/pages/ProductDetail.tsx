import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { type StoreProduct, useStoreProduct } from '../data/products';

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

function NoteCard({ label, notes }: { label: string; notes: string[] }) {
    const visibleNotes = notes.length > 0 ? notes : ['Details coming soon'];

    return (
        <div className="rounded-sm border border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-md transition-all duration-300 hover:border-[var(--color-ink)]/30 hover:bg-[var(--color-ink)]/5 dark:hover:bg-white/[0.08]">
            <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:px-8">
                <div className="shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] lg:w-28">
                    {label}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--color-ink)]">
                    {visibleNotes.map((note, index) => (
                        <span key={`${label}-${note}-${index}`} className="flex items-center gap-3">
                            {index > 0 ? <span className="text-[var(--text-muted)]">/</span> : null}
                            {note}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function ProductDetail() {
    const { id } = useParams();

    if (!id) {
        return <ProductNotFound />;
    }

    return <ProductDetailResource key={id} slug={id} />;
}

function ProductDetailResource({ slug }: { slug: string }) {
    const { product, isLoading, error } = useStoreProduct(slug);

    if (isLoading) {
        return <ProductDetailSkeleton />;
    }

    if (error) {
        if (error === 'Product not found.') {
            return <ProductNotFound />;
        }

        return <ProductLoadError message={error} />;
    }

    if (!product) {
        return <ProductNotFound />;
    }

    return <ProductDetailContent productData={product} />;
}

function ProductNotFound() {
    return (
        <main className="flex min-h-screen items-center bg-[var(--color-canvas)] px-6 py-24 sm:px-8 lg:px-24 lg:py-32">
            <div className="w-full max-w-xl space-y-8">
                <Link
                    className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                    to="/shop"
                >
                    <span aria-hidden="true">&larr;</span>
                    Back to Collection
                </Link>
                <div className="space-y-4">
                    <h1 className="font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-7xl">
                        Product not found
                    </h1>
                    <p className="text-lg font-light leading-relaxed text-[var(--text-muted)]">
                        This fragrance link is no longer available. Return to the collection to continue browsing.
                    </p>
                </div>
            </div>
        </main>
    );
}

function ProductLoadError({ message }: { message: string }) {
    return (
        <main className="flex min-h-screen items-center bg-[var(--color-canvas)] px-6 py-24 sm:px-8 lg:px-24 lg:py-32">
            <div className="w-full max-w-xl space-y-8">
                <Link
                    className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                    to="/shop"
                >
                    <span aria-hidden="true">&larr;</span>
                    Back to Collection
                </Link>
                <div className="space-y-4">
                    <h1 className="font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-7xl">
                        Product unavailable
                    </h1>
                    <p className="text-lg font-light leading-relaxed text-[var(--text-muted)]">{message}</p>
                </div>
            </div>
        </main>
    );
}

function ProductDetailSkeleton() {
    return (
        <main className="relative flex min-h-screen flex-col lg:flex-row">
            <section className="relative overflow-hidden bg-[var(--color-canvas)] lg:h-screen lg:w-1/2 lg:sticky lg:top-0">
                <div className="relative flex h-[58vh] min-h-[380px] w-full items-center justify-center p-8 sm:h-[70vh] sm:p-12 lg:h-full lg:p-24">
                    <div className="h-full w-full max-w-[420px] animate-pulse rounded-[40px] bg-[var(--color-ink)]/6"></div>
                </div>
            </section>

            <section className="flex min-h-screen flex-col bg-[var(--color-canvas)] px-6 py-16 sm:px-8 sm:py-20 lg:w-1/2 lg:px-24 lg:py-32">
                <div className="w-full max-w-xl space-y-8">
                    <div className="h-3 w-28 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                    <div className="space-y-4">
                        <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                        <div className="h-14 w-3/4 animate-pulse rounded-full bg-[var(--color-ink)]/10"></div>
                        <div className="h-14 w-1/2 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-5 w-full animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                        <div className="h-5 w-5/6 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                    </div>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }, (_, index) => (
                            <div key={index} className="h-20 animate-pulse rounded-[28px] bg-[var(--color-ink)]/6"></div>
                        ))}
                    </div>
                    <div className="h-24 animate-pulse rounded-[32px] bg-[var(--color-ink)]/6"></div>
                </div>
            </section>
        </main>
    );
}

function ProductDetailContent({ productData }: { productData: StoreProduct }) {
    const { addToCart, openCart } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [addFeedback, setAddFeedback] = useState<string | null>(null);
    const [addFeedbackTone, setAddFeedbackTone] = useState<'success' | 'error' | null>(null);
    const hasVariant = productData.variantId !== null;
    const isDiscoveryProduct = productData.displayName.toLowerCase().includes('discovery');

    const handleAddToCart = async () => {
        if (!hasVariant) {
            setAddFeedback('This product variant is unavailable right now.');
            setAddFeedbackTone('error');
            return;
        }

        setIsAddingToCart(true);
        setAddFeedback(null);
        setAddFeedbackTone(null);

        const result = await addToCart(
            {
                id: productData.id,
                name: productData.displayName,
                size: productData.size,
                price: productData.priceValue,
                image: productData.image,
                variantId: productData.variantId ?? undefined,
            },
            quantity,
        );

        setIsAddingToCart(false);

        if (!result.ok) {
            setAddFeedback(result.error ?? 'Unable to add this item right now.');
            setAddFeedbackTone('error');
            return;
        }

        setAddFeedback('Added to your selection.');
        setAddFeedbackTone('success');
        openCart();
    };

    return (
        <main className="relative flex min-h-screen flex-col lg:flex-row">
            <section className="relative overflow-hidden bg-[var(--color-canvas)] dark:bg-[#0d0d0d] lg:h-screen lg:w-1/2 lg:sticky lg:top-0">
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/40 via-transparent to-black/60"></div>
                <div className="relative flex h-[58vh] min-h-[380px] w-full items-center justify-center p-8 sm:h-[70vh] sm:p-12 lg:h-full lg:p-24">
                    <div className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-ink)]/5 blur-[120px] dark:bg-white/[0.02]"></div>
                    <img
                        alt={`${productData.displayName} Bottle`}
                        className="relative z-20 h-full w-auto object-contain mix-blend-multiply dark:brightness-[0.9] dark:contrast-[1.1] dark:mix-blend-normal"
                        src={productData.image}
                    />
                </div>
                <div className="absolute bottom-6 left-6 z-30 flex items-center gap-3 sm:bottom-10 sm:left-10 lg:bottom-12 lg:left-12">
                    <div className="h-[1px] w-8 bg-[var(--color-ink)]/20"></div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">{productData.source}</span>
                </div>
            </section>

            <section className="flex min-h-screen flex-col bg-[var(--color-canvas)] px-6 py-16 sm:px-8 sm:py-20 lg:w-1/2 lg:px-24 lg:py-32">
                <div className="w-full max-w-xl">
                    <Link
                        className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                        to="/shop"
                    >
                        <span aria-hidden="true">&larr;</span>
                        Back to Collection
                    </Link>

                    <div className="mb-12 mt-8 space-y-6 sm:mb-16 sm:mt-10">
                        <div className="flex items-center gap-4">
                            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">{productData.number}</span>
                        </div>
                        <h1 className="font-display text-5xl font-light leading-none tracking-[-0.03em] text-[var(--color-ink)] sm:text-6xl lg:text-8xl">
                            {productData.name}
                            {productData.nameSub ? (
                                <>
                                    <br /> <span className="italic font-light opacity-80">{productData.nameSub}</span>
                                </>
                            ) : null}
                        </h1>
                        <div className="mt-10 flex flex-col gap-3 border-t border-[var(--glass-border)] pt-6 sm:mt-12 sm:flex-row sm:items-baseline sm:justify-between sm:pt-8">
                            <span className="font-mono text-[11px] tracking-widest text-[var(--text-muted)]">{productData.size}</span>
                            <span className="font-mono text-xl font-light text-[var(--color-ink)]">{formatPrice(productData.priceValue)}</span>
                        </div>
                    </div>

                    <div className="mb-16 space-y-5 text-base font-light leading-relaxed text-[var(--text-muted)] sm:mb-20 sm:text-lg">
                        <p>{productData.tagline}</p>
                        <p className="text-sm font-mono tracking-tight text-[var(--text-muted)]/60">{productData.description}</p>
                    </div>

                    <div className="mb-20 space-y-6 sm:mb-24 sm:space-y-8">
                        <h3 className="font-display text-sm font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
                            Olfactory Architecture
                        </h3>
                        <div className="space-y-3">
                            <NoteCard label="Top Notes" notes={productData.notes.top} />
                            <NoteCard label="Heart Notes" notes={productData.notes.heart} />
                            <NoteCard label="Base Notes" notes={productData.notes.base} />
                        </div>
                    </div>

                    <div className="mb-24 divide-y divide-[var(--glass-border)] border-t border-[var(--glass-border)] sm:mb-32">
                        <details className="group cursor-pointer py-6">
                            <summary className="flex list-none items-center justify-between font-display text-sm uppercase tracking-widest text-[var(--color-ink)]/80">
                                <span>Sourcing & Purity</span>
                                <span className="material-symbols-outlined font-light transition-transform duration-500 group-open:rotate-45">
                                    add
                                </span>
                            </summary>
                            <div className="pt-6 font-mono text-xs leading-loose tracking-wide text-[var(--text-muted)]">
                                ALCOHOL DENAT., PARFUM (FRAGRANCE), AQUA (WATER), LIMONENE, LINALOOL, CITRAL, GERANIOL. ETHICALLY
                                HARVESTED AGARWOOD FROM ASSAM.
                            </div>
                        </details>
                        <details className="group cursor-pointer py-6">
                            <summary className="flex list-none items-center justify-between font-display text-sm uppercase tracking-widest text-[var(--color-ink)]/80">
                                <span>Logistics</span>
                                <span className="material-symbols-outlined font-light transition-transform duration-500 group-open:rotate-45">
                                    add
                                </span>
                            </summary>
                            <div className="pt-6 font-mono text-xs leading-loose tracking-wide text-[var(--text-muted)]">
                                COMPLIMENTARY WHITE-GLOVE DELIVERY ON ALL SIGNATURE COLLECTION ORDERS. WORLDWIDE SHIPPING AVAILABLE.
                            </div>
                        </details>
                    </div>

                    <div className="sticky bottom-4 z-40 pt-4 sm:bottom-6">
                        <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-3 backdrop-blur-2xl">
                            <div className="flex flex-col gap-2 sm:flex-row sm:gap-px">
                                <div className="flex w-full items-center justify-between border border-[var(--glass-border)] bg-[var(--color-canvas)] px-6 py-5 sm:w-48">
                                    <button
                                        className="text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                        onClick={() => setQuantity((currentQuantity) => Math.max(1, currentQuantity - 1))}
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined text-sm">remove</span>
                                    </button>
                                    <span className="font-mono text-sm">{String(quantity).padStart(2, '0')}</span>
                                    <button
                                        className="text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                        onClick={() => setQuantity((currentQuantity) => currentQuantity + 1)}
                                        type="button"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                    </button>
                                </div>
                                <button
                                    className="flex-1 bg-[var(--color-ink)] px-12 py-5 font-display text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-canvas)] transition-all hover:opacity-80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                                    disabled={isAddingToCart || !hasVariant}
                                    onClick={handleAddToCart}
                                    type="button"
                                >
                                    {isAddingToCart ? 'Adding to Selection' : hasVariant ? 'Add to Selection' : 'Unavailable'}
                                </button>
                            </div>

                            <div className="mt-4 space-y-3">
                                {addFeedback ? (
                                    <p
                                        aria-live="polite"
                                        className={`font-mono text-[11px] tracking-wide ${
                                            addFeedbackTone === 'error' ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink)]'
                                        }`}
                                    >
                                        {addFeedback}
                                    </p>
                                ) : null}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="font-mono text-[11px] tracking-wide text-[var(--text-muted)]">
                                        Includes a complimentary 2ml sample to test before opening.
                                    </p>
                                    {!isDiscoveryProduct ? (
                                        <Link
                                            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                            to="/shop"
                                        >
                                            Not sure? Explore the Discovery Set in the collection
                                        </Link>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
