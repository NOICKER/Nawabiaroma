import { useEffect } from 'react';
import { Minus, Plus, Sparkles, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, type CartProduct } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const discoverySetItem: CartProduct = {
    id: 'discovery-set',
    name: 'DISCOVERY SET',
    size: '6 x 2ml - Selection',
    price: 2400,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMrT3RMQocO-khmZzuXBFTv7sR4v5bRecN26lsg1oWl0mrSlAMXXkBvkgRe3R1PqZmjbd7hGxfzLzt_9-eYpdm0phKuqJ2LT7J9OO2BOdD5yv8KsE2XnOeUoNBOQ3Gz8xq2HYcIN6AGn0way-lgZxJh9k5ES86EQJyfcnI929V7BE7b1GS0udAuKXF5Js7fq86nOwAezKajZfuOFA2kr4P6WFaceWpK-bV2e1aGByjoQ8eruTGTVSh_TqOKZt8TUcXRil2lgaKzEs',
};

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

export function Cart() {
    const navigate = useNavigate();
    const {
        addToCart,
        cartItems,
        closeCart,
        decrementItem,
        incrementItem,
        isCartOpen,
        itemCount,
        removeFromCart,
        subtotal,
    } = useCart();
    const { isLoggedIn } = useCustomerAuth();

    const handleProceedToCheckout = () => {
        closeCart();
        navigate('/checkout');
    };

    useEffect(() => {
        if (!isCartOpen) {
            return;
        }

        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeCart();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeCart, isCartOpen]);

    if (!isCartOpen) {
        return null;
    }

    const isEmpty = cartItems.length === 0;

    return (
        <div className="fixed inset-0 z-[60] overflow-hidden">
            <div
                className="fixed inset-0 z-[60] animate-[cartOverlayFade_220ms_ease-out_forwards] bg-[var(--color-canvas)]/80 backdrop-blur-md"
                onClick={closeCart}
            >
                <div className="pointer-events-none absolute inset-0 hidden scale-95 flex-col items-center justify-center opacity-20 blur-[12px] sm:flex">
                    <h1 className="font-display text-8xl font-light uppercase tracking-tighter text-[var(--color-ink)]">
                        Invisible
                        <br />
                        Architecture
                    </h1>
                </div>
            </div>

            <div className="fixed inset-y-0 right-0 z-[70] flex h-full w-full max-w-full transform-gpu flex-col animate-[cartPanelIn_320ms_cubic-bezier(0.22,1,0.36,1)_forwards] bg-[var(--color-canvas)]/85 backdrop-blur-[32px] dark:bg-[rgba(15,15,15,0.88)] sm:max-w-[480px] sm:border-l sm:border-[var(--glass-border)] sm:bg-[var(--color-canvas)]/70 sm:shadow-[-20px_0_60px_rgba(0,0,0,0.6)] sm:dark:bg-[rgba(15,15,15,0.7)]">
                <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-5 py-5 sm:px-10 sm:py-8">
                    <div className="flex items-center gap-4">
                        <h2 className="font-display text-lg font-light tracking-[0.18em] text-[var(--color-ink)] sm:text-xl sm:tracking-[0.2em]">
                            SELECTION
                        </h2>
                        <span className="rounded-full border border-[var(--glass-border)] px-2 py-0.5 font-mono text-xs text-[var(--text-muted)]">
                            {String(itemCount).padStart(2, '0')}
                        </span>
                    </div>
                    <button
                        aria-label="Close cart"
                        className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-all hover:bg-[var(--color-ink)]/10 hover:text-[var(--color-ink)]"
                        onClick={closeCart}
                        type="button"
                    >
                        <X className="h-5 w-5" strokeWidth={1.75} />
                    </button>
                </div>

                {!isLoggedIn ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center sm:px-10">
                        <p className="font-display text-xl font-light uppercase tracking-[0.12em] text-[var(--color-ink)] sm:text-2xl">
                            Please sign in to view your selection
                        </p>
                        <Link
                            className="bg-[var(--color-ink)] px-10 py-4 font-display text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-canvas)] transition-all hover:opacity-80 active:scale-[0.98]"
                            onClick={closeCart}
                            to="/account"
                        >
                            SIGN IN
                        </Link>
                    </div>
                ) : isEmpty ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center sm:px-10">
                        <p className="font-display text-xl font-light uppercase tracking-[0.12em] text-[var(--color-ink)] sm:text-2xl">
                            Your selection is empty
                        </p>
                        <Link
                            className="bg-[var(--color-ink)] px-10 py-4 font-display text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--color-canvas)] transition-all hover:opacity-80 active:scale-[0.98]"
                            onClick={closeCart}
                            to="/shop"
                        >
                            Explore fragrances
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5 overscroll-contain sm:space-y-10 sm:px-10 sm:py-8" style={{ scrollbarWidth: 'thin' }}>
                            {cartItems.map((item, index) => (
                                <div key={item.id}>
                                    <div className="group flex gap-4 sm:gap-6">
                                        <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-sm border border-[var(--glass-border)] bg-[var(--color-ink)]/5 sm:h-20 sm:w-20">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                                style={{ backgroundImage: `url('${item.image}')` }}
                                            ></div>
                                            <div className="absolute inset-0 bg-black/10"></div>
                                        </div>

                                        <div className="flex flex-1 flex-col justify-between py-1">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                                <div>
                                                    <h3 className="font-display text-base font-medium tracking-wide text-[var(--color-ink)]">{item.name}</h3>
                                                    <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">{item.size}</p>
                                                </div>
                                                <p className="font-mono text-sm font-medium text-[var(--color-ink)] sm:text-right">
                                                    {formatPrice(item.price * item.quantity)}
                                                </p>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="flex h-9 items-center rounded-sm border border-[var(--glass-border)] bg-[var(--color-ink)]/5 px-1">
                                                    <button
                                                        aria-label={`Decrease quantity for ${item.name}`}
                                                        className="flex h-7 w-7 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                                        onClick={() => decrementItem(item.id)}
                                                        type="button"
                                                    >
                                                        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                    </button>
                                                    <span className="w-10 text-center font-mono text-xs text-[var(--color-ink)]">{item.quantity}</span>
                                                    <button
                                                        aria-label={`Increase quantity for ${item.name}`}
                                                        className="flex h-7 w-7 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                                        onClick={() => incrementItem(item.id)}
                                                        type="button"
                                                    >
                                                        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                    </button>
                                                </div>

                                                <button
                                                    className="shrink-0 text-[10px] uppercase tracking-widest text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                                    onClick={() => removeFromCart(item.id)}
                                                    type="button"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {index < cartItems.length - 1 ? <div className="mt-10 h-px w-full bg-[var(--glass-border)]"></div> : null}
                                </div>
                            ))}

                            <div className="mt-10 rounded-sm border border-dashed border-[var(--glass-border)] bg-[var(--glass-surface)] p-5 sm:mt-12 sm:p-6">
                                <div className="flex gap-4">
                                    <Sparkles className="h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.75} />
                                    <div>
                                        <h4 className="font-display text-xs font-medium uppercase tracking-widest text-[var(--color-ink)]">
                                            The Signature Set
                                        </h4>
                                        <p className="mt-2 text-xs font-light leading-relaxed text-[var(--text-muted)]">
                                            Add the Discovery Set to test the full range before opening any full-size bottle.
                                        </p>
                                        <button
                                            className="mt-4 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--color-primary)] transition-colors hover:text-[var(--color-ink)]"
                                            onClick={() => addToCart(discoverySetItem, 1)}
                                            type="button"
                                        >
                                            + Add Discovery Set
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8 border-t border-[var(--glass-border)] bg-[var(--color-canvas)]/40 px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6 sm:px-10 sm:pb-10 sm:pt-8">
                            <div className="flex items-center justify-between">
                                <Link
                                    className="text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                    onClick={closeCart}
                                    to="/shop"
                                >
                                    Continue Shopping
                                </Link>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-end justify-between">
                                    <span className="text-xs font-light uppercase tracking-widest text-[var(--text-muted)]">Subtotal</span>
                                    <span className="font-mono text-sm text-[var(--color-ink)]">{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex items-end justify-between gap-6">
                                    <span className="text-xs font-light uppercase tracking-widest text-[var(--text-muted)]">Shipping</span>
                                    <span className="text-right font-mono text-[10px] italic tracking-wide text-[var(--text-muted)]">
                                        Calculated at checkout
                                    </span>
                                </div>
                                <div className="flex items-end justify-between border-t border-[var(--glass-border)] pt-4">
                                    <span className="font-display text-lg font-light tracking-[0.1em] text-[var(--color-ink)]">TOTAL</span>
                                    <span className="font-mono text-xl font-medium text-[var(--color-ink)]">{formatPrice(subtotal)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-light uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                    Free delivery across India
                                </p>
                                <p className="text-[10px] font-light uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                    Complimentary returns on unopened bottles
                                </p>
                            </div>

                            <button
                                className="group relative w-full overflow-hidden bg-[var(--color-ink)] py-5 transition-all hover:bg-[var(--color-primary)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--color-ink)]"
                                disabled={isEmpty}
                                onClick={handleProceedToCheckout}
                                type="button"
                            >
                                <div className="relative z-10 flex items-center justify-center">
                                    <span className="font-display text-[11px] font-bold tracking-[0.3em] text-[var(--color-canvas)] transition-colors group-hover:text-white">
                                        PROCEED TO CHECKOUT
                                    </span>
                                </div>
                            </button>

                            <div className="flex flex-col items-center gap-2">
                                <p className="text-[9px] font-light uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                    Secured by encrypted gateway
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                @keyframes cartOverlayFade {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes cartPanelIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </div>
    );
}
