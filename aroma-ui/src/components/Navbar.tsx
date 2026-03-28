import { Menu, ShoppingCart, User, X } from 'lucide-react';
import { type FocusEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useScrollDirection } from '../hooks/useScrollDirection';

const desktopNavLeft = [
    { key: 'shop', label: 'Shop', to: '/shop' },
    { key: 'about', label: 'About', to: '/about' },
] as const;

const desktopNavRight = [
    { key: 'account', label: 'Account', to: '/account' },
] as const;

const mobileNavItems = [
    { key: 'home', label: 'Home', to: '/' },
    { key: 'shop', label: 'Shop', to: '/shop' },
    { key: 'about', label: 'About', to: '/about' },
    { key: 'account', label: 'Account', to: '/account' },
] as const;

function getActiveSection(pathname: string) {
    if (pathname === '/') {
        return 'home';
    }

    if (pathname.startsWith('/about')) {
        return 'about';
    }

    if (pathname.startsWith('/account') || pathname.startsWith('/orders') || pathname.startsWith('/checkout')) {
        return 'account';
    }

    if (pathname.startsWith('/shop') || pathname.startsWith('/product')) {
        return 'shop';
    }

    return null;
}

function getDesktopLinkClass(isActive: boolean) {
    return [
        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-all duration-300',
        isActive
            ? 'bg-[var(--color-ink)] text-[var(--color-canvas)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
            : 'text-[var(--text-muted)] hover:bg-[var(--color-ink)]/6 hover:text-[var(--color-ink)]',
    ].join(' ');
}

function getMobileLinkClass(isActive: boolean) {
    return [
        'flex items-center justify-between rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.15em] transition-colors',
        isActive
            ? 'bg-white/10 text-white'
            : 'text-white/78 hover:bg-white/6 hover:text-white',
    ].join(' ');
}

export function Navbar() {
    const { isCartOpen, itemCount, toggleCart } = useCart();
    const { isLoggedIn, customer, logout } = useCustomerAuth();
    const { pathname } = useLocation();
    const activeSection = getActiveSection(pathname);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
    const desktopNavRef = useRef<HTMLDivElement | null>(null);
    const { scrollDirection, isScrolledPast } = useScrollDirection();
    const isScrolledDown = scrollDirection === 'down' && isScrolledPast;

    const handleDesktopBlur = (event: FocusEvent<HTMLDivElement>) => {
        if (!desktopNavRef.current?.contains(event.relatedTarget as Node | null)) {
            setIsDesktopExpanded(false);
        }
    };

    useEffect(() => {
        const handleWindowBlur = () => {
            const activeElement = document.activeElement;

            if (activeElement instanceof HTMLElement && desktopNavRef.current?.contains(activeElement)) {
                activeElement.blur();
            }

            setIsDesktopExpanded(false);
        };

        window.addEventListener('blur', handleWindowBlur);

        return () => {
            window.removeEventListener('blur', handleWindowBlur);
        };
    }, []);

    return (
        <nav className={`fixed inset-x-0 top-4 z-30 flex justify-center px-3 sm:px-4 md:top-8 md:px-6 transition-transform duration-500 ease-in-out ${isScrolledDown ? '-translate-y-[150%]' : 'translate-y-0'}`}>
            <div className="w-full md:hidden">
                <div className="glass-panel relative flex items-center justify-between rounded-[28px] px-4 py-3 sm:px-5">
                    <button
                        aria-expanded={isMenuOpen}
                        aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        className="flex h-10 w-10 items-center justify-center"
                        onClick={() => setIsMenuOpen((currentState) => !currentState)}
                        type="button"
                    >
                        {isMenuOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
                    </button>

                    <Link
                        className="group relative px-3 text-center text-base font-bold leading-none tracking-[0.2em] text-[var(--color-ink)] transition-all duration-300 hover:scale-[1.03] hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] sm:text-lg"
                        onClick={() => setIsMenuOpen(false)}
                        to={isLoggedIn ? '/shop' : '/'}
                    >
                        <span>NAWABI AROMA</span>
                        <span className="absolute -bottom-1.5 left-1/2 h-[1px] w-0 -translate-x-1/2 bg-[var(--color-ink)] opacity-0 transition-all duration-300 group-hover:w-8 group-hover:opacity-60"></span>
                    </Link>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            aria-expanded={isCartOpen}
                            aria-label="Cart"
                            className="group flex items-center gap-2"
                            onClick={toggleCart}
                            type="button"
                        >
                            <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
                            <span className="translate-y-[1px] font-mono text-[11px] transition-opacity group-hover:opacity-60 sm:text-xs">
                                ({itemCount})
                            </span>
                        </button>
                    </div>

                        {isMenuOpen ? (
                        <div className="absolute inset-x-0 top-full mt-3 rounded-[28px] border border-[var(--glass-border)] bg-[#1f1f1f] px-4 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
                            <div className="flex flex-col gap-2">
                                {(isLoggedIn ? mobileNavItems.filter((i) => i.key === 'account') : mobileNavItems).map((item) => {
                                    const isActive = activeSection === item.key;

                                    return (
                                        <Link
                                            key={item.key}
                                            aria-current={isActive ? 'page' : undefined}
                                            className={getMobileLinkClass(isActive)}
                                            onClick={() => setIsMenuOpen(false)}
                                            to={item.to}
                                        >
                                            <span>{item.label}</span>
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                                    isActive ? 'bg-[var(--color-primary)]' : 'bg-white/15'
                                                }`}
                                            ></span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <div
                ref={desktopNavRef}
                className="relative hidden h-[92px] w-full max-w-[1800px] items-start justify-center md:flex"
                onBlurCapture={handleDesktopBlur}
                onFocusCapture={() => setIsDesktopExpanded(true)}
                onMouseEnter={() => setIsDesktopExpanded(true)}
                onMouseLeave={() => setIsDesktopExpanded(false)}
            >
                <div
                    className={`glass-panel pointer-events-auto hidden overflow-hidden rounded-full md:items-center md:py-[16px] md:transition-all md:duration-500 md:ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        isDesktopExpanded ? (isLoggedIn ? 'md:w-[480px] md:px-6 md:justify-between' : 'md:w-[680px] md:px-6 lg:w-[800px] lg:px-8') : 'md:w-[118px] md:px-4 md:justify-center'
                    } ${isLoggedIn ? 'md:flex' : 'md:grid'}`}
                    style={isLoggedIn ? {} : {
                        gridTemplateColumns: '1fr auto 1fr',
                    }}
                >
                    {!isLoggedIn && (
                        <div
                            className={`flex min-w-0 items-center gap-2 overflow-hidden transition-all duration-400 ease-out ${
                                isDesktopExpanded ? 'max-w-[260px] translate-x-0 opacity-100' : 'pointer-events-none max-w-0 -translate-x-3 opacity-0'
                            }`}
                        >
                            {desktopNavLeft.map((item) => {
                                const isActive = activeSection === item.key;

                                return (
                                    <Link
                                        key={item.key}
                                        aria-current={isActive ? 'page' : undefined}
                                        className={getDesktopLinkClass(isActive)}
                                        to={item.to}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                                isActive ? 'bg-current opacity-90' : 'bg-current opacity-25'
                                            }`}
                                        ></span>
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                    )}

                    <Link
                        className={`group relative flex flex-shrink-0 items-center justify-center overflow-hidden text-center transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isDesktopExpanded ? (isLoggedIn ? 'w-[16rem]' : 'w-[18rem]') : 'w-[2.9rem]'
                        }`}
                        to={isLoggedIn ? '/shop' : '/'}
                    >
                        <span
                            className={`absolute inset-0 flex items-center justify-center whitespace-nowrap text-xl font-bold leading-none text-[var(--color-ink)] transition-[opacity,transform] duration-350 ${
                                isDesktopExpanded ? 'pointer-events-none translate-y-1 scale-95 opacity-0' : 'translate-y-0 scale-100 opacity-100 group-hover:scale-105'
                            }`}
                        >
                            <span className="tracking-[0.04em]">NA</span>
                        </span>
                        <span
                            className={`inline-block whitespace-nowrap text-center text-xl font-bold leading-none text-[var(--color-ink)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                                isDesktopExpanded ? 'translate-y-0 tracking-[0.28em] opacity-100 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.7)] group-hover:text-white' : 'pointer-events-none translate-y-1 tracking-[0.2em] opacity-0'
                            }`}
                        >
                            NAWABI AROMA
                        </span>
                        <span
                            className={`absolute -bottom-2 left-1/2 h-px -translate-x-1/2 transition-all duration-500 ${
                                activeSection === 'home'
                                    ? isDesktopExpanded
                                        ? 'w-[72%] bg-[var(--color-primary)] opacity-75'
                                        : 'w-5 bg-[var(--color-primary)] opacity-75'
                                    : 'w-0 bg-[var(--color-ink)] opacity-0 group-hover:w-16 group-hover:bg-[var(--color-primary)] group-hover:opacity-75'
                            }`}
                        ></span>
                    </Link>

                    <div
                        className={`flex min-w-0 items-center justify-end gap-2 overflow-hidden transition-all duration-400 ease-out ${
                            isDesktopExpanded ? 'max-w-[280px] translate-x-0 opacity-100' : 'pointer-events-none max-w-0 translate-x-3 opacity-0'
                        }`}
                    >
                        {desktopNavRight.map((item) => {
                            const isActive = activeSection === item.key;

                            if (item.key === 'account' && isLoggedIn) {
                                return (
                                    <div key={item.key} className="group relative z-[100]">
                                        <Link
                                            aria-current={isActive ? 'page' : undefined}
                                            className={getDesktopLinkClass(isActive)}
                                            to={item.to}
                                        >
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                                    isActive ? 'bg-current opacity-90' : 'bg-current opacity-25'
                                                }`}
                                            ></span>
                                            <span className="flex items-center gap-1.5">
                                                <User className="h-4.5 w-4.5" strokeWidth={1.75} />
                                                <span className="sr-only">Account</span>
                                            </span>
                                        </Link>

                                        <div className="absolute right-0 top-[120%] hidden w-56 flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)] bg-[var(--color-canvas)]/95 shadow-2xl backdrop-blur-xl group-hover:flex">
                                            <div className="border-b border-[var(--glass-border)] px-5 py-4">
                                                <p className="truncate font-display text-sm text-[var(--color-ink)]">
                                                    {customer?.name || 'Customer'}
                                                </p>
                                                <p className="truncate font-mono text-[10px] text-[var(--text-muted)]">
                                                    {customer?.email}
                                                </p>
                                            </div>
                                            <div className="flex flex-col py-2">
                                                <Link
                                                    className="px-5 py-2.5 font-display text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:bg-[var(--color-ink)]/5 hover:text-[var(--color-primary)]"
                                                    to="/orders"
                                                >
                                                    Orders
                                                </Link>
                                                <Link
                                                    className="px-5 py-2.5 font-display text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:bg-[var(--color-ink)]/5 hover:text-[var(--color-primary)]"
                                                    to="/account/addresses"
                                                >
                                                    Addresses
                                                </Link>
                                                <Link
                                                    className="px-5 py-2.5 font-display text-xs uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:bg-[var(--color-ink)]/5 hover:text-[var(--color-primary)]"
                                                    to="/account"
                                                >
                                                    Profile
                                                </Link>
                                            </div>
                                            <div className="border-t border-[var(--glass-border)] py-2">
                                                <button
                                                    className="w-full px-5 py-2.5 text-left font-display text-xs uppercase tracking-widest text-red-500/80 transition-colors hover:bg-red-500/5 hover:text-red-500"
                                                    onClick={() => void logout()}
                                                    type="button"
                                                >
                                                    Logout
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.key}
                                    aria-current={isActive ? 'page' : undefined}
                                    className={getDesktopLinkClass(isActive)}
                                    to={item.to}
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                                            isActive ? 'bg-current opacity-90' : 'bg-current opacity-25'
                                        }`}
                                    ></span>
                                    {item.key === 'account' ? (
                                        <span className="flex items-center gap-1.5">
                                            <User className="h-4.5 w-4.5" strokeWidth={1.75} />
                                            <span className="sr-only">Account</span>
                                        </span>
                                    ) : (
                                        item.label
                                    )}
                                </Link>
                            );
                        })}
                        <button
                            aria-expanded={isCartOpen}
                            aria-label="Cart"
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium uppercase tracking-[0.16em] transition-all duration-300 ${
                                isCartOpen
                                    ? 'bg-[var(--color-ink)] text-[var(--color-canvas)] shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
                                    : 'text-[var(--text-muted)] hover:bg-[var(--color-ink)]/6 hover:text-[var(--color-ink)]'
                            }`}
                            onClick={toggleCart}
                            type="button"
                        >
                            <ShoppingCart className="h-4.5 w-4.5" strokeWidth={1.75} />
                            <span className="font-mono text-[11px] tracking-[0.12em]">({itemCount})</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
