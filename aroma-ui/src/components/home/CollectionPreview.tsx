import { ProductCard } from '../../components/ProductCard';
import { featuredProducts } from '../../data/products';

const cardProducts = featuredProducts.map((product) => ({
    id: product.id,
    name: product.displayName,
    category: product.category,
    price: product.price,
    image: product.image,
    glowColor: product.glowColor,
    delay: product.delay,
}));

export function CollectionPreview() {
    return (
        <section className="w-full py-24 md:py-32">
            <div className="space-y-4 mb-12 md:mb-16">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                    Collection Preview
                </p>
                <h2 className="font-display font-light tracking-tight text-[var(--color-ink)] text-4xl md:text-6xl lg:text-7xl">
                    THE COLLECTION
                </h2>
                <p className="max-w-2xl font-light text-lg leading-relaxed text-[var(--text-muted)]">
                    Three signatures from the debut collection, each composed to feel architectural, intimate, and quietly memorable.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
                {cardProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
            </div>

            <style>{`
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </section>
    );
}
