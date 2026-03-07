import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CollectionPreview } from '../components/home/CollectionPreview';
import { CraftTrustSection } from '../components/home/CraftTrustSection';
import { DiscoverySection } from '../components/home/DiscoverySection';
import { JournalPreview } from '../components/home/JournalPreview';
import { PhilosophySection } from '../components/home/PhilosophySection';

export function Home() {
    const titleRef = useRef<HTMLHeadingElement | null>(null);
    const panelRefs = useRef<Array<HTMLDivElement | null>>([]);
    const frameRef = useRef<number | null>(null);
    const pointerOffsetRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
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
            <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden parallax-container group/hero">
                <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none select-none opacity-10 md:opacity-100">
                    <h1 className="text-[12vw] md:text-[140px] lg:text-[180px] font-light leading-[0.8] tracking-tighter text-center refraction-text w-full px-4 transition-transform duration-75" ref={titleRef}>
                        INVISIBLE <br className="hidden md:block" /> ARCHITECTURE
                    </h1>
                </div>

                <div className="relative z-10 w-full max-w-[300px] md:max-w-[420px] lg:max-w-[500px] aspect-[3/4] flex items-center justify-center animate-float">
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            alt="A clear rectangular glass perfume bottle with a minimalist label standing on a white surface, casting soft shadows."
                            className="w-full h-full object-contain drop-shadow-2xl relative z-10"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMrT3RMQocO-khmZzuXBFTv7sR4v5bRecN26lsg1oWl0mrSlAMXXkBvkgRe3R1PqZmjbd7hGxfzLzt_9-eYpdm0phKuqJ2LT7J9OO2BOdD5yv8KsE2XnOeUoNBOQ3Gz8xq2HYcIN6AGn0way-lgZxJh9k5ES86EQJyfcnI929V7BE7b1GS0udAuKXF5Js7fq86nOwAezKajZfuOFA2kr4P6WFaceWpK-bV2e1aGByjoQ8eruTGTVSh_TqOKZt8TUcXRil2lgaKzEs"
                            style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}
                        />
                        <div className="hidden dark:block absolute inset-0 bg-gradient-to-t from-white/5 to-transparent opacity-30 z-0 rounded-full blur-3xl"></div>
                    </div>

                    <div className="absolute top-1/4 -right-8 md:-right-16 w-32 h-32 md:w-48 md:h-64 glass-panel rounded-2xl z-20 flex items-center justify-center transform transition-transform duration-700 ease-out group-hover/hero:translate-x-4 group-hover/hero:translate-y-4" ref={(node) => { panelRefs.current[0] = node; }}>
                        <div className="text-center opacity-80">
                            <span className="block font-mono text-xs tracking-widest text-[var(--text-muted)] mb-1">NOTES</span>
                            <span className="block font-display text-lg font-medium text-[var(--color-ink)]">Santal</span>
                            <span className="block font-display text-lg font-medium text-[var(--color-ink)]">Cardamom</span>
                            <span className="block font-display text-lg font-medium text-[var(--color-ink)]">Iris</span>
                        </div>
                    </div>

                    <div className="absolute bottom-12 -left-4 md:-left-12 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-white/40 to-transparent backdrop-blur-sm dark:bg-white/5 dark:backdrop-blur-md rounded-full z-20 transform transition-transform duration-1000 ease-out group-hover/hero:-translate-x-6 group-hover/hero:-translate-y-2 border border-white/20 dark:border-white/10 dark:shadow-2xl flex items-center justify-center">
                        <div className="hidden dark:block w-1/2 h-1/2 bg-white/10 rounded-full blur-xl"></div>
                    </div>
                </div>

                <Link
                    className="relative z-20 mt-10 bg-[var(--color-ink)] text-[var(--color-canvas)] font-display font-medium tracking-[0.2em] uppercase text-[11px] px-10 py-4 transition-all hover:opacity-80 active:scale-[0.98]"
                    to="/shop"
                >
                    Explore the Collection
                </Link>

                <div className="absolute bottom-8 md:bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4">
                    <span className="text-[10px] tracking-[0.2em] font-mono text-[var(--text-muted)] uppercase opacity-60">Experience</span>
                    <div className="w-[1px] h-16 md:h-24 bg-gradient-to-b from-[var(--color-ink)]/0 via-[var(--color-ink)]/40 to-[var(--color-ink)]/0 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-[var(--color-ink)] animate-scroll-down"></div>
                    </div>
                </div>

                <div className="dark:hidden absolute top-0 right-0 w-[50vw] h-[50vh] bg-gradient-to-b from-[var(--color-primary)]/5 to-transparent rounded-bl-[100%] filter blur-[100px] pointer-events-none z-0"></div>
                <div className="dark:hidden absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-gradient-to-t from-gray-200 to-transparent rounded-tr-[100%] filter blur-[80px] pointer-events-none z-0"></div>

                <div className="hidden dark:block absolute top-0 left-1/4 w-[60vw] h-[60vh] bg-blue-500/10 light-glow rounded-full"></div>
                <div className="hidden dark:block absolute bottom-0 right-1/4 w-[50vw] h-[50vh] bg-purple-500/5 light-glow rounded-full"></div>

                <div className="hidden dark:block fixed inset-0 pointer-events-none z-[1] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.02)_0%,transparent_70%)]"></div>
            </section>

            <div className="relative z-10 bg-[var(--bg-color)]">
                <div className="max-w-[1400px] mx-auto px-4 md:px-8">
                    <PhilosophySection />
                    <CollectionPreview />
                    <CraftTrustSection />
                    <DiscoverySection />
                    <JournalPreview />
                </div>
            </div>
        </main>
    );
}
