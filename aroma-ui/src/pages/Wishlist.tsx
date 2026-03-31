import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { buildCartLineId } from '../utils/cart';

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

export function Wishlist() {
    const { items, isLoading, removeFromWishlist } = useWishlist();
    const { addToCart, openCart } = useCart();

    const handleAddToCart = async (item: any) => {
        if (item.stockQuantity <= 0) return;

        const result = await addToCart(
            {
                id: buildCartLineId(item.productId, Number(item.variantId)),
                name: item.productName,
                size: item.sizeLabel,
                price: Number(item.unitPrice),
                image: item.primaryImageUrl ?? '',
                variantId: Number(item.variantId),
            },
            1,
        );

        if (result.ok) {
            openCart();
            removeFromWishlist(Number(item.variantId));
        } else {
            alert(result.error ?? 'Unable to add this item right now.');
        }
    };

    return (
        <main className="min-h-screen bg-[var(--color-canvas)] px-6 py-24 sm:px-8 lg:px-24 md:py-32">
            <div className="mx-auto max-w-5xl space-y-12">
                <header className="space-y-4">
                    <h1 className="font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-6xl">
                        Your Wishlist
                    </h1>
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        Saved for later
                    </p>
                </header>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-ink)] border-t-transparent flex items-center justify-center"></div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-[32px] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-8 py-20 text-center backdrop-blur-md">
                        <p className="font-display text-xl font-light text-[var(--text-muted)]">Your wishlist is empty.</p>
                        <Link
                            className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85"
                            to="/shop"
                        >
                            Explore Collection
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((item) => {
                            const isOutOfStock = item.stockQuantity <= 0;

                            return (
                                <div
                                    key={item.id}
                                    className="group flex flex-col justify-between overflow-hidden rounded-[24px] border border-[var(--glass-border)] bg-[var(--glass-surface)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-all hover:border-[var(--color-ink)]/20"
                                >
                                    <div className="relative aspect-square p-6">
                                        <button
                                            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/50 text-[var(--text-muted)] backdrop-blur-md transition hover:bg-black/10 hover:text-[var(--color-ink)]"
                                            onClick={() => removeFromWishlist(Number(item.variantId))}
                                            aria-label="Remove from wishlist"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        
                                        <Link to={`/product/${item.productSlug}`} className="flex h-full w-full items-center justify-center">
                                            {item.primaryImageUrl ? (
                                                <img
                                                    src={item.primaryImageUrl}
                                                    alt={item.productName}
                                                    className="h-full object-contain transition-transform duration-700 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="h-20 w-20 rounded bg-black/5"></div>
                                            )}
                                        </Link>
                                    </div>

                                    <div className="flex flex-1 flex-col justify-between border-t border-[var(--glass-border)] p-5">
                                        <Link to={`/product/${item.productSlug}`} className="space-y-2">
                                            <h3 className="font-display text-lg font-medium tracking-tight text-[var(--color-ink)] truncate">
                                                {item.productName}
                                            </h3>
                                            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                                {item.sizeLabel}
                                            </p>
                                        </Link>

                                        <div className="mt-5 flex items-center justify-between">
                                            <span className="font-mono text-sm text-[var(--color-ink)]">
                                                {formatPrice(Number(item.unitPrice))}
                                            </span>
                                            
                                            <button
                                                onClick={() => handleAddToCart(item)}
                                                disabled={isOutOfStock}
                                                className="bg-[var(--color-ink)] text-[var(--color-canvas)] rounded-full px-5 py-2 font-mono text-[10px] uppercase tracking-[0.2em] transition hover:opacity-85 disabled:opacity-50"
                                            >
                                                {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
