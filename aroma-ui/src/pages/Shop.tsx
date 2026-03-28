import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProductCard, ProductCardSkeleton, type Product } from '../components/ProductCard';
import { useStoreProducts } from '../data/products';
import { useScrollDirection } from '../hooks/useScrollDirection';

const filterCategories = ['Woody', 'Floral', 'Fresh', 'Oriental', 'Citrus'] as const;
const activeFilterButtonClass =
    "relative whitespace-nowrap text-sm font-medium text-[var(--color-primary)] transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:bg-[var(--color-primary)] after:content-[''] dark:text-white dark:after:bg-white";
const inactiveFilterButtonClass =
    'whitespace-nowrap text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]';

export function Shop() {
    const location = useLocation();
    const navigate = useNavigate();
    const { scrollDirection, isScrolledPast } = useScrollDirection();
    const isScrolledDown = scrollDirection === 'down' && isScrolledPast;
    const [successMessage, setSuccessMessage] = useState<string | null>(() => {
        if (location.state && typeof location.state === 'object' && 'message' in location.state && typeof location.state.message === 'string') {
            return location.state.message;
        }
        return null;
    });

    useEffect(() => {
        if (successMessage) {
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => {
                setSuccessMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, navigate, location.pathname]);

    const [activeFilter, setActiveFilter] = useState<string>('All Scents');
    const { products, isLoading, error } = useStoreProducts();
    const cardProducts: Product[] = products.map((product) => ({
        id: product.id,
        name: product.displayName,
        category: product.category,
        price: product.price,
        image: product.image,
        glowColor: product.glowColor,
        delay: product.delay,
    }));
    const filteredProducts =
        activeFilter === 'All Scents'
            ? cardProducts
            : cardProducts.filter((product) => product.category.toLowerCase().includes(activeFilter.toLowerCase()));

    const columnClasses = [
        'flex flex-col gap-8 md:gap-10',
        'flex flex-col gap-8 md:gap-10 md:mt-12',
        'flex flex-col gap-8 md:gap-10 md:mt-4 lg:mt-24',
    ];

    const columns = filteredProducts.reduce<Product[][]>(
        (productColumns, product, index) => {
            productColumns[index % productColumns.length].push(product);
            return productColumns;
        },
        Array.from({ length: columnClasses.length }, () => []),
    );

    return (
        <main className="relative z-10 mx-auto flex max-w-[1400px] flex-col items-center px-4 pb-24 pt-28 md:px-8 md:pb-20 md:pt-32">
            {successMessage ? (
                <div className="mb-4 w-full text-center">
                    <p className="inline-block rounded-full border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-6 py-2.5 text-sm font-medium tracking-wide text-[var(--color-primary)] opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                        {successMessage}
                    </p>
                </div>
            ) : null}

            <header className="mb-14 text-center opacity-0 animate-[fadeIn_1s_ease-out_forwards] md:mb-24">
                <h1 className="mb-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl md:mb-6 md:text-7xl lg:text-8xl">
                    THE COLLECTION
                </h1>
                <p className="mx-auto max-w-lg text-base font-light leading-relaxed text-[var(--text-muted)] md:text-lg">
                    Ethereal olfaction captured in glass. A study of light, shadow, and the invisible architecture of scent.
                </p>
            </header>

            <p className="mb-8 text-center font-mono text-[10px] uppercase tracking-[0.26em] text-[var(--text-muted)] sm:text-[11px] sm:tracking-[0.3em]">
                {isLoading ? 'Loading the Debut Collection' : `The Debut Collection - ${filteredProducts.length} Ensembles`}
            </p>

            <div className={`sticky ${isScrolledDown ? 'top-4 md:top-8' : 'top-[80px] md:top-[124px]'} z-20 mb-12 flex w-full justify-center opacity-0 transition-all duration-500 ease-in-out animate-[fadeIn_1s_ease-out_0.2s_forwards] md:mb-16`}>
                <div className="inline-flex w-full max-w-full rounded-[28px] glass-panel px-1 py-1.5 shadow-sm md:w-auto md:rounded-full md:px-6 md:py-3">
                    <div className="no-scrollbar flex items-center gap-5 overflow-x-auto px-3 md:gap-8 md:px-4">
                        <button
                            className={activeFilter === 'All Scents' ? activeFilterButtonClass : inactiveFilterButtonClass}
                            onClick={() => setActiveFilter('All Scents')}
                            type="button"
                        >
                            All Scents
                        </button>
                        {filterCategories.map((category) => (
                            <button
                                key={category}
                                className={activeFilter === category ? activeFilterButtonClass : inactiveFilterButtonClass}
                                onClick={() => setActiveFilter(category)}
                                type="button"
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error ? (
                <div className="w-full rounded-[28px] border border-[var(--glass-border)] bg-[var(--glass-surface)] px-6 py-5 text-sm text-[var(--text-muted)]">
                    {error}
                </div>
            ) : (
                <>
                    <div className="flex w-full flex-col gap-6 md:hidden">
                        {isLoading
                            ? Array.from({ length: 6 }, (_, index) => (
                                  <ProductCardSkeleton key={index} delay={`${0.2 + index * 0.1}s`} />
                              ))
                            : filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                    </div>

                    <div className="hidden w-full gap-8 md:grid md:grid-cols-2 md:gap-10 lg:grid-cols-3">
                        {isLoading
                            ? columnClasses.map((columnClass, columnIndex) => (
                                  <div key={columnIndex} className={columnClass}>
                                      {Array.from({ length: 2 }, (_, index) => (
                                          <ProductCardSkeleton key={index} delay={`${0.2 + (columnIndex * 2 + index) * 0.1}s`} />
                                      ))}
                                  </div>
                              ))
                            : columns.map((column, index) => (
                                  <div key={index} className={columnClasses[index]}>
                                      {column.map((product) => (
                                          <ProductCard key={product.id} product={product} />
                                      ))}
                                  </div>
                              ))}
                    </div>
                </>
            )}

            <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-20 hidden h-48 bg-gradient-to-t from-[var(--color-canvas)] to-transparent md:block"></div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </main>
    );
}
