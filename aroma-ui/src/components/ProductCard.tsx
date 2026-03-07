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
            className="group relative aspect-[3/4] glass-panel rounded-2xl bg-white/40 dark:bg-black/40 backdrop-blur-md border border-[var(--glass-border)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] hover:border-[var(--color-ink)]/20 hover:-translate-y-2 overflow-hidden cursor-pointer transition-all duration-500 block"
            style={{ animation: `fadeInUp 0.8s ease-out ${product.delay ?? '0s'} forwards`, opacity: 0 }}
            to={`/product/${product.id}`}
        >
            <div className="absolute inset-0 flex items-center justify-center p-12">
                <div className="relative w-full h-full flex items-center justify-center">
                    <div className={`absolute inset-0 ${product.glowColor} rounded-full blur-3xl transform group-hover:scale-125 transition-transform duration-1000`}></div>
                    <img
                        alt={product.name}
                        className="h-full object-contain drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] relative z-10 transition-transform duration-700 group-hover:scale-110"
                        src={product.image}
                    />
                </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 flex justify-between items-end z-20">
                <div>
                    <h3 className="font-display font-medium text-2xl tracking-tight text-[var(--color-ink)] mb-1">{product.name}</h3>
                    <p className="font-mono text-[10px] tracking-widest text-[var(--text-muted)] uppercase">{product.category}</p>
                </div>
                <span className="font-mono text-sm font-light text-[var(--color-ink)]/80 dark:text-zinc-300">{product.price}</span>
            </div>
            <div className="absolute inset-0 bg-[var(--bg-color)]/20 dark:bg-black/20 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 flex items-center justify-center pointer-events-none">
                <span className="bg-[var(--glass-surface)] backdrop-blur-md border border-[var(--glass-border)] text-[var(--color-ink)] font-display font-medium text-sm px-8 py-3 rounded-full translate-y-4 group-hover:translate-y-0 transition-transform duration-500 hover:bg-[var(--color-ink)] hover:text-[var(--bg-color)]">
                    View Details
                </span>
            </div>
        </Link>
    );
}
