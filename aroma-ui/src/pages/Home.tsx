import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CollectionPreview } from '../components/home/CollectionPreview';
import { CraftTrustSection } from '../components/home/CraftTrustSection';
import { DiscoverySection } from '../components/home/DiscoverySection';
import { JournalPreview } from '../components/home/JournalPreview';
import { PhilosophySection } from '../components/home/PhilosophySection';
import { useStoreProducts } from '../data/products';

export function Home() {
    const titleRef = useRef<HTMLHeadingElement | null>(null);
    const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
    const frameRef = useRef<number | null>(null);
    const pointerOffsetRef = useRef({ x: 0, y: 0 });
    const { products, isLoading: isProductsLoading, error: productsError } = useStoreProducts();

    useEffect(() => {
        if (!window.matchMedia('(pointer: fine)').matches) {
            return;
        }

        const updateParallax = () => {
            frameRef.current = null;

            const { x, y } = pointerOffsetRef.current;

            panelRefs.current.forEach((panel) => {
                if (panel) {
                    panel.style.transform = `translateX(${x}px) translateY(${y}px)`;
                }
            });

            if (titleRef.current) {
                titleRef.current.style.transform = `translateX(${x * 0.5}px) translateY(${y * 0.5}px)`;
            }
        };

        const handleMouseMove = (event: MouseEvent) => {
            pointerOffsetRef.current = {
                x: (window.innerWidth - event.pageX * 2) / 100,
                y: (window.innerHeight - event.pageY * 2) / 100,
            };

            if (frameRef.current === null) {
                frameRef.current = window.requestAnimationFrame(updateParallax);
            }
        };

        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);

            if (frameRef.current !== null) {
                window.cancelAnimationFrame(frameRef.current);
            }
        };
    }, []);

    return (
        <main className="relative">
            <section className="parallax-container group/hero relative flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-6 pb-14 pt-28 sm:px-8 md:h-screen md:px-0 md:pb-0 md:pt-0">
                <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center select-none opacity-10 md:opacity-100">
                    <h1
                        className="w-full px-4 text-center text-[17vw] font-light leading-[0.82] tracking-tighter refraction-text transition-transform duration-75 sm:text-[14vw] md:text-[140px] lg:text-[180px]"
                        ref={titleRef}
                    >
                        INVISIBLE <br className="hidden md:block" /> ARCHITECTURE
                    </h1>
                </div>

                <div className="relative z-10 flex aspect-[3/4] w-full max-w-[220px] items-center justify-center animate-float sm:max-w-[280px] md:max-w-[420px] lg:max-w-[500px]">
                    <div className="relative flex h-full w-full items-center justify-center">
                        <img
                            alt="A clear rectangular glass perfume bottle with a minimalist label standing on a white surface, casting soft shadows."
                            className="relative z-10 h-full w-full object-contain drop-shadow-2xl"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMrT3RMQocO-khmZzuXBFTv7sR4v5bRecN26lsg1oWl0mrSlAMXXkBvkgRe3R1PqZmjbd7hGxfzLzt_9-eYpdm0phKuqJ2LT7J9OO2BOdD5yv8KsE2XnOeUoNBOQ3Gz8xq2HYcIN6AGn0way-lgZxJh9k5ES86EQJyfcnI929V7BE7b1GS0udAuKXF5Js7fq86nOwAezKajZfuOFA2kr4P6WFaceWpK-bV2e1aGByjoQ8eruTGTVSh_TqOKZt8TUcXRil2lgaKzEs"
                            style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}
                        />
                        <div className="absolute inset-0 z-0 hidden rounded-full bg-gradient-to-t from-white/5 to-transparent opacity-30 blur-3xl dark:block"></div>
                    </div>

                    <div
                        className="absolute right-0 top-8 z-20 flex h-24 w-24 items-center justify-center rounded-2xl glass-panel transition-transform duration-700 ease-out group-hover/hero:translate-x-4 group-hover/hero:translate-y-4 sm:h-28 sm:w-28 md:-right-16 md:top-1/4 md:h-64 md:w-48"
                        ref={(node) => {
                            panelRefs.current[0] = node;
                        }}
                    >
                        <div className="text-center opacity-80">
                            <span className="mb-1 block font-mono text-[9px] tracking-widest text-[var(--text-muted)] sm:text-[10px]">NOTES</span>
                            <span className="block font-display text-sm font-medium text-[var(--color-ink)] sm:text-base md:text-lg">Santal</span>
                            <span className="block font-display text-sm font-medium text-[var(--color-ink)] sm:text-base md:text-lg">Cardamom</span>
                            <span className="block font-display text-sm font-medium text-[var(--color-ink)] sm:text-base md:text-lg">Iris</span>
                        </div>
                    </div>

                    <div className="absolute bottom-10 left-0 z-20 flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-gradient-to-tr from-white/40 to-transparent backdrop-blur-sm transition-transform duration-1000 ease-out group-hover/hero:-translate-x-6 group-hover/hero:-translate-y-2 sm:h-24 sm:w-24 md:-left-12 md:h-32 md:w-32 dark:border-white/10 dark:bg-white/5 dark:backdrop-blur-md dark:shadow-2xl">
                        <div className="hidden h-1/2 w-1/2 rounded-full bg-white/10 blur-xl dark:block"></div>
                    </div>
                </div>

                <Link
                    className="relative z-20 mt-10 inline-flex w-full max-w-xs justify-center bg-[var(--color-ink)] px-8 py-4 text-center font-display text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-canvas)] transition-all hover:opacity-80 active:scale-[0.98] sm:w-auto sm:px-10"
                    to="/shop"
                >
                    Explore the Collection
                </Link>

                <div className="absolute bottom-10 left-1/2 z-30 hidden -translate-x-1/2 flex-col items-center gap-4 sm:flex md:bottom-10">
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-60">Experience</span>
                    <div className="relative h-16 w-[1px] overflow-hidden bg-gradient-to-b from-[var(--color-ink)]/0 via-[var(--color-ink)]/40 to-[var(--color-ink)]/0 md:h-24">
                        <div className="absolute left-0 top-0 h-full w-full bg-[var(--color-ink)] animate-scroll-down"></div>
                    </div>
                </div>

                <div className="pointer-events-none absolute right-0 top-0 z-0 h-[50vh] w-[50vw] rounded-bl-[100%] bg-gradient-to-b from-[var(--color-primary)]/5 to-transparent blur-[100px] dark:hidden"></div>
                <div className="pointer-events-none absolute bottom-0 left-0 z-0 h-[40vh] w-[40vw] rounded-tr-[100%] bg-gradient-to-t from-gray-200 to-transparent blur-[80px] dark:hidden"></div>

                <div className="light-glow absolute left-1/4 top-0 hidden h-[60vh] w-[60vw] rounded-full bg-blue-500/10 dark:block"></div>
                <div className="light-glow absolute bottom-0 right-1/4 hidden h-[50vh] w-[50vw] rounded-full bg-purple-500/5 dark:block"></div>

                <div className="fixed inset-0 z-[1] hidden pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_70%)] dark:block"></div>
            </section>

            <div className="relative z-10 bg-[var(--color-canvas)]">
                <div className="mx-auto max-w-[1400px] px-4 md:px-8">
                    <PhilosophySection />
                    <CollectionPreview error={productsError} isLoading={isProductsLoading} products={products} />
                    <CraftTrustSection />
                    <DiscoverySection error={productsError} isLoading={isProductsLoading} products={products} />
                    <JournalPreview />
                </div>
            </div>
        </main>
    );
}
