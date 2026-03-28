import { useState, useEffect } from 'react';

export function useScrollDirection() {
    const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('up');
    const [isScrolledPast, setIsScrolledPast] = useState(false);

    useEffect(() => {
        let lastScrollY = window.scrollY;

        const updateScrollDirection = () => {
            const scrollY = window.scrollY;
            const direction = scrollY > lastScrollY ? 'down' : 'up';
            
            if (direction !== scrollDirection && (scrollY - lastScrollY > 10 || scrollY - lastScrollY < -10)) {
                setScrollDirection(direction);
            }
            
            // Helpful to know if we've scrolled past the initial hero threshold
            if (scrollY > 150 && !isScrolledPast) {
                setIsScrolledPast(true);
            } else if (scrollY <= 150 && isScrolledPast) {
                setIsScrolledPast(false);
                setScrollDirection('up'); // Reset cleanly at top
            }

            lastScrollY = scrollY > 0 ? scrollY : 0;
        };

        window.addEventListener('scroll', updateScrollDirection, { passive: true });
        
        return () => {
            window.removeEventListener('scroll', updateScrollDirection);
        };
    }, [scrollDirection, isScrolledPast]);

    return { scrollDirection, isScrolledPast };
}
