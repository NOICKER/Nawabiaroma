import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { buildApiUrl } from '../lib/api';

interface OrderItem {
    variantId: number;
    productId: number;
    productName: string;
    variant: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface OrderAddress {
    name: string;
    phone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

interface OrderSummary {
    orderId: number;
    status: string;
    paymentMethod: 'online' | 'cod';
    items: OrderItem[];
    subtotal: number;
    total: number;
    address: OrderAddress | null;
    trackingNumber: string | null;
    createdAt: string;
}

interface OrderResponse {
    data: OrderSummary;
}

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };
        return payload.error ?? payload.message ?? fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

export function OrderConfirmation() {
    const { token } = useCustomerAuth();
    const location = useLocation();
    const [order, setOrder] = useState<OrderSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const orderId = useMemo(() => new URLSearchParams(location.search).get('orderId'), [location.search]);

    useEffect(() => {
        if (!token || !orderId) {
            setIsLoading(false);
            setError('Order not found.');
            return;
        }

        const abortController = new AbortController();

        void (async () => {
            try {
                const response = await fetch(buildApiUrl(`/api/orders/${encodeURIComponent(orderId)}`), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(await getErrorMessage(response, 'Unable to load this order.'));
                }

                const payload = (await response.json()) as OrderResponse;

                if (!abortController.signal.aborted) {
                    setOrder(payload.data);
                }
            } catch (loadError) {
                if (!abortController.signal.aborted) {
                    setError(loadError instanceof Error ? loadError.message : 'Unable to load this order.');
                }
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

    if (isLoading) {
        return <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-8 lg:px-12">Loading order...</main>;
    }

    if (!order || error) {
        return (
            <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-8 lg:px-12">
                <div className="glass-panel rounded-[32px] p-8 text-sm text-[var(--color-primary)]">{error ?? 'Order not found.'}</div>
            </main>
        );
    }

    const paymentMessage =
        order.paymentMethod === 'cod' ? 'Your order is confirmed. Pay on delivery.' : 'Payment successful.';

    return (
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <section className="glass-panel rounded-[36px] p-6 sm:p-10">
                <div className="border-b border-[var(--glass-border)] pb-8 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Order Confirmation</p>
                    <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Thank you for your order
                    </h1>
                    <p className="mt-4 text-base font-light text-[var(--text-muted)]">{paymentMessage}</p>
                </div>

                <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_360px]">
                    <div className="space-y-4">
                        <div className="rounded-[28px] border border-[var(--glass-border)] bg-transparent p-6">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Order ID</p>
                            <p className="mt-2 text-lg text-[var(--color-ink)]">#{order.orderId}</p>
                        </div>

                        {order.items.map((item) => (
                            <article key={`${order.orderId}-${item.variantId}`} className="rounded-[28px] border border-[var(--glass-border)] bg-transparent p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="font-display text-xl font-light text-[var(--color-ink)]">{item.productName}</h2>
                                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">{item.variant}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Qty {item.quantity}</p>
                                        <p className="mt-2 text-sm text-[var(--color-ink)]">{formatPrice(item.subtotal)}</p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <aside className="space-y-4">
                        <div className="rounded-[28px] border border-[var(--glass-border)] bg-transparent p-6">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Shipping</p>
                            {order.address ? (
                                <div className="mt-3 space-y-1 text-sm text-[var(--color-ink)]">
                                    <p>{order.address.name}</p>
                                    <p>{order.address.addressLine1}</p>
                                    {order.address.addressLine2 ? <p>{order.address.addressLine2}</p> : null}
                                    <p>
                                        {order.address.city}, {order.address.state} {order.address.postalCode}
                                    </p>
                                    <p>{order.address.country}</p>
                                    {order.address.phone ? <p>{order.address.phone}</p> : null}
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-[var(--text-muted)]">Shipping address unavailable.</p>
                            )}
                        </div>

                        <div className="rounded-[28px] border border-[var(--glass-border)] bg-transparent p-6">
                            <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                                <span>Subtotal</span>
                                <span className="text-[var(--color-ink)]">{formatPrice(order.subtotal)}</span>
                            </div>
                            <div className="mt-4 flex items-center justify-between border-t border-[var(--glass-border)] pt-4">
                                <span className="font-display text-xl font-light text-[var(--color-ink)]">Total</span>
                                <span className="text-lg text-[var(--color-ink)]">{formatPrice(order.total)}</span>
                            </div>
                        </div>

                        <p className="text-sm text-[var(--text-muted)]">Estimated delivery: 3 to 7 business days across India.</p>

                        <div className="space-y-3">
                            <Link
                                className="inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85"
                                to="/shop"
                            >
                                Continue Shopping
                            </Link>
                            <Link
                                className="inline-flex w-full items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                to="/orders"
                            >
                                View All Orders
                            </Link>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    );
}
