import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useStoreProducts } from '../data/products';

const CART_SESSION_STORAGE_KEY = 'cart_session_id';
const ORDERS_ENDPOINT = '/api/orders';
const FALLBACK_PRODUCT_IMAGE =
    'https://images.unsplash.com/photo-1594913785121-667503fa0e98?auto=format&fit=crop&q=80&w=1200';

interface OrderItem {
    variantId: number;
    productId: number;
    productName: string;
    variant: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface OrderSummary {
    orderId: number;
    status: string;
    items: OrderItem[];
    subtotal: number;
    total: number;
    created_at: string;
}

interface OrderResponse {
    data: OrderSummary;
}

interface OrdersResponse {
    data: OrderSummary[];
}

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

function formatOrderDate(value: string) {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return parsedDate.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function formatStatus(value: string) {
    return value
        .split('_')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };

        if (typeof payload.error === 'string' && payload.error.length > 0) {
            return payload.error;
        }

        if (typeof payload.message === 'string' && payload.message.length > 0) {
            return payload.message;
        }
    } catch {
        // Ignore non-JSON responses and fall back to the default message.
    }

    return fallbackMessage;
}

function getCartSessionId() {
    if (typeof window === 'undefined') {
        return '';
    }

    try {
        return window.localStorage.getItem(CART_SESSION_STORAGE_KEY) ?? '';
    } catch {
        return '';
    }
}

function resolveProductImage(productName: string, catalog: Array<{ displayName: string; name: string; image: string }>) {
    const normalizedProductName = productName.trim().toLowerCase();
    const matchingProduct = catalog.find((product) => {
        const normalizedDisplayName = product.displayName.trim().toLowerCase();
        const normalizedName = product.name.trim().toLowerCase();

        return (
            normalizedDisplayName === normalizedProductName ||
            normalizedName === normalizedProductName ||
            normalizedDisplayName.includes(normalizedProductName) ||
            normalizedProductName.includes(normalizedName)
        );
    });

    return matchingProduct?.image ?? FALLBACK_PRODUCT_IMAGE;
}

function MetaStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-white/60 px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 text-sm font-light text-[var(--color-ink)] sm:text-base">{value}</p>
        </div>
    );
}

export default function OrderSuccess() {
    const location = useLocation();
    const { token } = useCustomerAuth();
    const { products } = useStoreProducts();
    const [order, setOrder] = useState<OrderSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const orderId = searchParams.get('orderId');

    useEffect(() => {
        if (orderId && !/^\d+$/.test(orderId)) {
            setOrder(null);
            setError('Order not found.');
            setIsLoading(false);
            return;
        }

        const abortController = new AbortController();

        setIsLoading(true);
        setError(null);

        void (async () => {
            try {
                if (!token) {
                    throw new Error('Sign in to view this order.');
                }

                let nextOrder: OrderSummary | null = null;

                if (orderId) {
                    const response = await fetch(`${ORDERS_ENDPOINT}/${encodeURIComponent(orderId)}`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: abortController.signal,
                    });

                    if (!response.ok) {
                        throw new Error(await getErrorMessage(response, 'Unable to load this order.'));
                    }

                    const payload = (await response.json()) as OrderResponse;
                    nextOrder = payload.data;
                } else {
                    const sessionId = getCartSessionId();

                    if (!sessionId) {
                        throw new Error('Order not found.');
                    }

                    const response = await fetch(`${ORDERS_ENDPOINT}?sessionId=${encodeURIComponent(sessionId)}`, {
                        method: 'GET',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        signal: abortController.signal,
                    });

                    if (!response.ok) {
                        throw new Error(await getErrorMessage(response, 'Unable to load your latest order.'));
                    }

                    const payload = (await response.json()) as OrdersResponse;
                    nextOrder = Array.isArray(payload.data) ? payload.data[0] ?? null : null;

                    if (!nextOrder) {
                        throw new Error('Order not found.');
                    }
                }

                if (abortController.signal.aborted) {
                    return;
                }

                setOrder(nextOrder);
                setError(null);
            } catch (loadError) {
                if (abortController.signal.aborted) {
                    return;
                }

                setOrder(null);
                setError(loadError instanceof Error ? loadError.message : 'Unable to load this order.');
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoading(false);
                }
            }
        })();

        return () => {
            abortController.abort();
        };
    }, [orderId, token]);

    const shipping = order ? Math.max(order.total - order.subtotal, 0) : 0;

    if (isLoading) {
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="w-full rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-10 text-center shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Order status</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Loading your order
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-[var(--text-muted)]">
                        We are gathering the order confirmation details now.
                    </p>
                </div>
            </main>
        );
    }

    if (error || !order) {
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="w-full rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-10 text-center shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Order status</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Order not found
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-[var(--text-muted)]">
                        {error ?? 'We could not find the order details for this confirmation page.'}
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-canvas)] transition hover:opacity-85"
                            to="/shop"
                        >
                            Continue shopping
                        </Link>
                        <Link
                            className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                            to="/my-orders"
                        >
                            View my orders
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <section className="overflow-hidden rounded-[36px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/86 shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl">
                <div className="border-b border-[var(--glass-border)] bg-[radial-gradient(circle_at_top,_rgba(194,166,109,0.14),_transparent_46%)] px-6 py-10 text-center sm:px-10 sm:py-14">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--glass-border)] bg-white/70 text-[var(--color-ink)] shadow-sm">
                        <span className="font-mono text-xs uppercase tracking-[0.24em]">OK</span>
                    </div>
                    <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--text-muted)]">Order confirmed</p>
                    <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-6xl">
                        Thank you for your order
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base font-light leading-relaxed text-[var(--text-muted)] sm:text-lg">
                        Your payment was successful. Your order is being processed.
                    </p>
                </div>

                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_360px]">
                    <div className="px-6 py-8 sm:px-10 sm:py-10">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <MetaStat label="Order ID" value={`#${order.orderId}`} />
                            <MetaStat label="Order date" value={formatOrderDate(order.created_at)} />
                            <MetaStat label="Status" value={formatStatus(order.status)} />
                        </div>

                        <div className="mt-10">
                            <div className="flex items-end justify-between gap-4 border-b border-[var(--glass-border)] pb-5">
                                <div>
                                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Items</p>
                                    <h2 className="mt-3 font-display text-3xl font-light tracking-tight text-[var(--color-ink)]">
                                        Order summary
                                    </h2>
                                </div>
                                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                </p>
                            </div>

                            <div className="mt-6 space-y-4">
                                {order.items.map((item) => (
                                    <div
                                        key={`${order.orderId}-${item.variantId}`}
                                        className="flex gap-4 rounded-3xl border border-[var(--glass-border)] bg-white/60 p-4"
                                    >
                                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-ink)]/5">
                                            <img
                                                alt={item.productName}
                                                className="h-full w-full object-cover"
                                                src={resolveProductImage(item.productName, products)}
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <h3 className="font-display text-lg font-light text-[var(--color-ink)]">
                                                        {item.productName}
                                                    </h3>
                                                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                                        {item.variant}
                                                    </p>
                                                </div>
                                                <div className="text-left sm:text-right">
                                                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                                        Qty {item.quantity}
                                                    </p>
                                                    <p className="mt-2 font-mono text-sm text-[var(--color-ink)]">{formatPrice(item.subtotal)}</p>
                                                </div>
                                            </div>
                                            <p className="mt-4 font-mono text-sm text-[var(--text-muted)]">{formatPrice(item.price)} each</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <aside className="border-t border-[var(--glass-border)] bg-white/45 px-6 py-8 lg:border-l lg:border-t-0 lg:px-8 lg:py-10">
                        <div className="rounded-[28px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/78 p-6 shadow-sm">
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Totals</p>
                            <div className="mt-6 space-y-4">
                                <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                                    <span>Subtotal</span>
                                    <span className="font-mono text-[var(--color-ink)]">{formatPrice(order.subtotal)}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                                    <span>Shipping</span>
                                    <span className="font-mono text-[var(--color-ink)]">{formatPrice(shipping)}</span>
                                </div>
                                <div className="flex items-center justify-between border-t border-[var(--glass-border)] pt-4">
                                    <span className="font-display text-xl font-light text-[var(--color-ink)]">Total</span>
                                    <span className="font-mono text-lg text-[var(--color-ink)]">{formatPrice(order.total)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <Link
                                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85"
                                to="/shop"
                            >
                                Continue shopping
                            </Link>
                            <Link
                                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                to="/my-orders"
                            >
                                View my orders
                            </Link>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
