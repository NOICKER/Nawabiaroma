import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
    const { isCartOpen, itemCount, toggleCart } = useCart();

    return (
        <nav className="fixed z-30 w-full flex justify-center px-4 md:px-6 top-8 max-md:top-auto max-md:bottom-8">
            <div className="glass-panel relative grid w-full max-w-[1220px] grid-cols-[1fr_auto_1fr] items-center rounded-full px-10 py-4 md:px-12 md:py-[18px] transition-all duration-500 hover:border-white/20">
                <div className="hidden md:flex items-center gap-8 lg:gap-9 justify-self-start min-w-0 col-start-1">
                    <Link className="text-[13px] uppercase tracking-[0.15em] font-medium hover:opacity-60 transition-opacity" to="/shop">Shop</Link>
                    <Link className="text-[13px] uppercase tracking-[0.15em] font-medium hover:opacity-60 transition-opacity" to="/about">About</Link>
                </div>
                <Link className="relative z-10 px-6 text-xl md:text-2xl font-bold tracking-[0.3em] leading-none justify-self-center col-start-2" to="/">
                    NAWABI
                </Link>
                <div className="flex items-center gap-5 md:gap-8 lg:gap-9 justify-self-end min-w-0 col-start-3">
                    <ThemeToggle />

                    <button
                        aria-expanded={isCartOpen}
                        aria-label="Cart"
                        className="flex items-center gap-3 group"
                        onClick={toggleCart}
                        type="button"
                    >
                        <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
                        <span className="font-mono text-xs translate-y-[1px] group-hover:opacity-60 transition-opacity">({itemCount})</span>
                    </button>
                    <button className="md:hidden flex items-center">
                        <span className="material-symbols-outlined !text-[20px]">menu</span>
                    </button>
                </div>
            </div>
        </nav>
    );
}
