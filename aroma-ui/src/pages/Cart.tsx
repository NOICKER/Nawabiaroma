import { useEffect } from 'react';
import { Minus, Plus, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart, type CartProduct } from '../context/CartContext';

const discoverySetItem: CartProduct = {
    id: 'discovery-set',
    name: 'DISCOVERY SET',
    size: '6 x 2ml · Selection',
    price: 2400,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMrT3RMQocO-khmZzuXBFTv7sR4v5bRecN26lsg1oWl0mrSlAMXXkBvkgRe3R1PqZmjbd7hGxfzLzt_9-eYpdm0phKuqJ2LT7J9OO2BOdD5yv8KsE2XnOeUoNBOQ3Gz8xq2HYcIN6AGn0way-lgZxJh9k5ES86EQJyfcnI929V7BE7b1GS0udAuKXF5Js7fq86nOwAezKajZfuOFA2kr4P6WFaceWpK-bV2e1aGByjoQ8eruTGTVSh_TqOKZt8TUcXRil2lgaKzEs',
};

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

export function Cart() {
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

    useEffect(() => {
        if (!isCartOpen) {
            return;
        }

        const previousBodyOverflow = document.body.style.overflow;
        const previousHtmlOverflow = document.documentElement.style.overflow;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousBodyOverflow;
            document.documentElement.style.overflow = previousHtmlOverflow;
        };
    }, [isCartOpen]);

    if (!isCartOpen) {
        return null;
    }

    const isEmpty = cartItems.length === 0;

    return (
        <div className="fixed inset-0 z-[60] overflow-hidden">
            <div className="fixed inset-0 z-[60] bg-[var(--color-canvas)]/80 backdrop-blur-md" onClick={closeCart}>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none blur-[12px] opacity-20 scale-95">
                    <h1 className="font-display text-8xl font-light tracking-tighter text-[var(--color-ink)] uppercase">
                        Invisible<br />Architecture
                    </h1>
                </div>
            </div>

            <div className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-[480px] flex-col bg-[var(--color-canvas)]/70 dark:bg-[rgba(15,15,15,0.7)] backdrop-blur-[32px] border-l border-[var(--glass-border)] shadow-[-20px_0_60px_rgba(0,0,0,0.6)]">
                <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--glass-border)]">
                    <div className="flex items-center gap-4">
                        <h2 className="font-display text-xl font-light tracking-[0.2em] text-[var(--color-ink)]">SELECTION</h2>
                        <span className="font-mono text-xs text-[var(--text-muted)] border border-[var(--glass-border)] px-2 py-0.5 rounded-full">
                            {String(itemCount).padStart(2, '0')}
                        </span>
                    </div>
                    <button
                        aria-label="Close cart"
                        className="flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-[var(--color-ink)]/10 text-[var(--text-muted)] hover:text-[var(--color-ink)]"
                        onClick={closeCart}
                        type="button"
                    >
                        <X className="h-5 w-5" strokeWidth={1.75} />
                    </button>
                </div>

                {isEmpty ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-10 text-center">
                        <p className="font-display text-2xl font-light tracking-[0.12em] text-[var(--color-ink)] uppercase">
                            Your selection is empty
                        </p>
                        <Link
                            className="bg-[var(--color-ink)] text-[var(--color-canvas)] font-display font-medium tracking-[0.2em] uppercase text-[11px] px-10 py-4 transition-all hover:opacity-80 active:scale-[0.98]"
                            onClick={closeCart}
                            to="/shop"
                        >
                            Explore fragrances
                        </Link>
                    </div>
                ) : (
                    <>
                        <div className="flex-1 overflow-y-auto px-10 py-8 space-y-10 overscroll-contain" style={{ scrollbarWidth: 'thin' }}>
                            {cartItems.map((item, index) => (
                                <div key={item.id}>
                                    <div className="flex gap-6 group">
                                        <div className="relative shrink-0 overflow-hidden rounded-sm bg-[var(--color-ink)]/5 aspect-square h-20 w-20 border border-[var(--glass-border)]">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                                                style={{ backgroundImage: `url('${item.image}')` }}
                                            ></div>
                                            <div className="absolute inset-0 bg-black/10"></div>
                                        </div>
                                        <div className="flex flex-1 flex-col justify-between py-1">
                                            <div className="flex justify-between items-start gap-4">
                                                <div>
                                                    <h3 className="font-display text-base font-medium text-[var(--color-ink)] tracking-wide">{item.name}</h3>
                                                    <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-widest mt-1 font-mono">{item.size}</p>
                                                </div>
                                                <p className="font-mono text-sm font-medium text-[var(--color-ink)]">{formatPrice(item.price * item.quantity)}</p>
                                            </div>
                                            <div className="flex items-center justify-between mt-4">
                                                <div className="flex h-9 items-center rounded-sm border border-[var(--glass-border)] bg-[var(--color-ink)]/5 px-1">
                                                    <button aria-label={`Decrease quantity for ${item.name}`} className="flex h-7 w-7 items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors" onClick={() => decrementItem(item.id)} type="button">
                                                        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                    </button>
                                                    <span className="w-10 text-center font-mono text-xs text-[var(--color-ink)]">{item.quantity}</span>
                                                    <button aria-label={`Increase quantity for ${item.name}`} className="flex h-7 w-7 items-center justify-center text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors" onClick={() => incrementItem(item.id)} type="button">
                                                        <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                    </button>
                                                </div>
                                                <button className="shrink-0 text-[10px] text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--color-ink)] transition-colors" onClick={() => removeFromCart(item.id)} type="button">Remove</button>
                                            </div>
                                        </div>
                                    </div>
                                    {index < cartItems.length - 1 && <div className="h-px w-full bg-[var(--glass-border)] mt-10"></div>}
                                </div>
                            ))}

                            <div className="mt-12 rounded-sm border border-dashed border-[var(--glass-border)] bg-[var(--glass-surface)] p-6">
                                <div className="flex gap-4">
                                    <Sparkles className="h-4 w-4 shrink-0 text-[var(--text-muted)]" strokeWidth={1.75} />
                                    <div>
                                        <h4 className="font-display text-xs font-medium text-[var(--color-ink)] uppercase tracking-widest">The Signature Set</h4>
                                        <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed font-light">Add the Discovery Set to test the full range before opening any full-size bottle.</p>
                                        <button className="mt-4 text-[10px] text-[var(--color-primary)] uppercase tracking-[0.2em] font-medium hover:text-[var(--color-ink)] transition-colors" onClick={() => addToCart(discoverySetItem, 1)} type="button">
                                            + Add Discovery Set
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-[var(--glass-border)] bg-[var(--color-canvas)]/40 px-10 pt-8 pb-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <Link className="text-[10px] uppercase tracking-[0.2em] font-medium text-[var(--text-muted)] hover:text-[var(--color-ink)] transition-colors" onClick={closeCart} to="/shop">
                                    Continue Shopping
                                </Link>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-light text-[var(--text-muted)] uppercase tracking-widest">Subtotal</span>
                                    <span className="font-mono text-sm text-[var(--color-ink)]">{formatPrice(subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs font-light text-[var(--text-muted)] uppercase tracking-widest">Shipping</span>
                                    <span className="font-mono text-[10px] text-[var(--text-muted)] italic tracking-wide">Calculated at checkout</span>
                                </div>
                                <div className="pt-4 flex justify-between items-end border-t border-[var(--glass-border)]">
                                    <span className="font-display text-lg font-light text-[var(--color-ink)] tracking-[0.1em]">TOTAL</span>
                                    <span className="font-mono text-xl font-medium text-[var(--color-ink)]">{formatPrice(subtotal)}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-light">
                                    Free delivery across India
                                </p>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-light">
                                    Complimentary returns on unopened bottles
                                </p>
                            </div>

                            <button className="relative group w-full overflow-hidden bg-[var(--color-ink)] py-5 transition-all hover:bg-[var(--color-primary)] active:scale-[0.98]" type="button">
                                <div className="relative z-10 flex items-center justify-center">
                                    <span className="font-display text-[11px] font-bold tracking-[0.3em] text-[var(--color-canvas)] group-hover:text-white transition-colors">PROCEED TO CHECKOUT</span>
                                </div>
                            </button>

                            <div className="flex flex-col items-center gap-2">
                                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-light">
                                    Secured by encrypted gateway
                                </p>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
