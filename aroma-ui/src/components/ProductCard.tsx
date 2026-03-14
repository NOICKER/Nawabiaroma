import { Link } from 'react-router-dom';

export interface Product {
    id: string;
    name: string;
    category: string;
    price: string;
    image: string;
    glowColor: string;
    delay?: string;
}

interface ProductCardProps {
    product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
    return (
        <Link
            className="group relative block aspect-[3/4] overflow-hidden rounded-[24px] border border-[var(--glass-border)] glass-panel bg-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] transition-all duration-500 cursor-pointer dark:bg-black/40 md:hover:-translate-y-2 md:hover:border-[var(--color-ink)]/20"
            style={{ animation: `fadeInUp 0.8s ease-out ${product.delay ?? '0s'} forwards`, opacity: 0 }}
            to={`/product/${product.id}`}
        >
            <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-10 md:p-12">
                <div className="relative w-full h-full flex items-center justify-center">
                    <div
                        className={`absolute inset-0 ${product.glowColor} rounded-full blur-3xl transform group-hover:scale-125 transition-transform duration-1000`}
                    ></div>
                    <img
                        alt={product.name}
                        className="h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] relative z-10 transition-transform duration-700 group-hover:scale-110"
                        src={product.image}
                    />
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-20 flex items-end justify-between gap-4 p-5 sm:p-6 md:p-8">
                <div className="min-w-0">
                    <h3 className="mb-1 font-display text-xl font-medium tracking-tight text-[var(--color-ink)] sm:text-2xl">
                        {product.name}
                    </h3>
                    <p className="font-mono text-[10px] tracking-widest text-[var(--text-muted)] uppercase">{product.category}</p>
                </div>
                <span className="shrink-0 font-mono text-xs font-light text-[var(--color-ink)]/80 sm:text-sm dark:text-zinc-300">
                    {product.price}
                </span>
            </div>
            <div className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center bg-[var(--color-canvas)]/20 opacity-0 backdrop-blur-sm transition-opacity duration-500 group-hover:opacity-100 md:flex dark:bg-black/20">
                <span className="bg-[var(--glass-surface)] backdrop-blur-md border border-[var(--glass-border)] text-[var(--color-ink)] font-display font-medium text-sm px-8 py-3 rounded-full translate-y-4 group-hover:translate-y-0 transition-transform duration-500 hover:bg-[var(--color-ink)] hover:text-[var(--color-canvas)]">
                    View Details
                </span>
            </div>
        </Link>
    );
}

export function ProductCardSkeleton({ delay = '0s' }: { delay?: string }) {
    return (
        <div
            className="relative aspect-[3/4] overflow-hidden rounded-[24px] border border-[var(--glass-border)] glass-panel bg-white/40 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] dark:bg-black/40"
            style={{ animation: `fadeInUp 0.8s ease-out ${delay} forwards`, opacity: 0 }}
        >
            <div className="absolute inset-0 flex items-center justify-center p-8 sm:p-10 md:p-12">
                <div className="relative flex h-full w-full items-center justify-center">
                    <div className="absolute inset-6 rounded-full bg-[var(--color-ink)]/6 blur-3xl"></div>
                    <div className="relative z-10 h-full w-full max-w-[180px] animate-pulse rounded-[32px] bg-[var(--color-ink)]/8"></div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 z-20 p-5 sm:p-6 md:p-8">
                <div className="h-7 w-32 animate-pulse rounded-full bg-[var(--color-ink)]/10"></div>
                <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
                <div className="mt-5 h-4 w-16 animate-pulse rounded-full bg-[var(--color-ink)]/8"></div>
            </div>
        </div>
    );
}
