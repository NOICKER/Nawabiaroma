import { ProductCard } from '../components/ProductCard';
import { storeProducts } from '../data/products';

const cardProducts = storeProducts.map((product) => ({
    id: product.id,
    name: product.displayName,
    category: product.category,
    price: product.price,
    image: product.image,
    glowColor: product.glowColor,
    delay: product.delay,
}));

const columnClasses = [
    'flex flex-col gap-8 md:gap-10',
    'flex flex-col gap-8 md:gap-10 md:mt-12',
    'flex flex-col gap-8 md:gap-10 md:mt-4 lg:mt-24',
];

const columns = cardProducts.reduce<typeof cardProducts[number][][]>(
    (productColumns, product, index) => {
        productColumns[index % productColumns.length].push(product);
        return productColumns;
    },
    Array.from({ length: columnClasses.length }, () => [])
);

export function Shop() {
    return (
        <main className="relative z-10 pt-32 pb-20 px-4 md:px-8 max-w-[1400px] mx-auto flex flex-col items-center">

            {/* Page Header */}
            <header className="text-center mb-16 md:mb-24 opacity-0 animate-[fadeIn_1s_ease-out_forwards]">
                <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-light tracking-tight text-[var(--color-ink)] mb-4 md:mb-6">
                    THE COLLECTION
                </h1>
                <p className="font-light text-[var(--text-muted)] text-lg max-w-lg mx-auto leading-relaxed">
                    Ethereal olfaction captured in glass. A study of light, shadow, and the invisible architecture of scent.
                </p>
            </header>

            <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                The Debut Collection — {cardProducts.length} Ensembles
            </p>

            {/* Filter Bar */}
            <div className="sticky top-28 z-40 mb-16 w-full flex justify-center opacity-0 animate-[fadeIn_1s_ease-out_0.2s_forwards]">
                <div className="glass-panel rounded-full px-2 py-2 md:px-6 md:py-3 shadow-sm inline-flex">
                    <div className="flex items-center gap-6 md:gap-8 overflow-x-auto no-scrollbar px-4">
                        <button className="whitespace-nowrap text-sm font-medium text-[var(--color-primary)] dark:text-white relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-full after:h-px after:bg-[var(--color-primary)] dark:after:bg-white transition-colors">
                            All Scents
                        </button>
                        {['Woody', 'Floral', 'Fresh', 'Oriental', 'Citrus'].map((category) => (
                            <button key={category} className="whitespace-nowrap text-sm font-medium text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors">
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 w-full">
                {columns.map((column, index) => (
                    <div key={index} className={columnClasses[index]}>
                        {column.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ))}
            </div>

            {/* Bottom gradient fade */}
            <div className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[var(--color-canvas)] to-transparent pointer-events-none z-20"></div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </main>
    );
}
