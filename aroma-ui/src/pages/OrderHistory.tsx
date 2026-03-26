import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { buildApiUrl } from '../lib/api';

interface OrderSummary {
    orderId: number;
    status: string;
    paymentMethod: 'online' | 'cod';
    items: Array<unknown>;
    subtotal: number;
    total: number;
    trackingNumber: string | null;
    createdAt: string;
}

interface OrdersResponse {
    data: OrderSummary[];
}

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

function formatStatus(value: string) {
    return value
        .split('_')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

function formatDate(value: string) {
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };
        return payload.error ?? payload.message ?? fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

export function OrderHistory() {
    const { token } = useCustomerAuth();
    const [orders, setOrders] = useState<OrderSummary[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!token) {
            setOrders([]);
            setIsLoading(false);
            return;
        }

        const abortController = new AbortController();

        void (async () => {
            try {
                const response = await fetch(buildApiUrl('/api/account/orders'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(await getErrorMessage(response, 'Unable to load your orders right now.'));
                }

                const payload = (await response.json()) as OrdersResponse;

                if (!abortController.signal.aborted) {
                    setOrders(payload.data ?? []);
                }
            } catch (loadError) {
                if (!abortController.signal.aborted) {
                    setError(loadError instanceof Error ? loadError.message : 'Unable to load your orders right now.');
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
    }, [token]);

    if (isLoading) {
        return <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-8 lg:px-12">Loading orders...</main>;
    }

    if (error) {
        return (
            <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-8 lg:px-12">
                <div className="glass-panel rounded-[32px] p-8 text-sm text-[var(--color-primary)]">{error}</div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <div className="border-b border-[var(--glass-border)] pb-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Order History</p>
                <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                    Your orders
                </h1>
            </div>

            <div className="mt-8 space-y-4">
                {orders.map((order) => (
                    <article key={order.orderId} className="glass-panel rounded-[30px] p-6 sm:p-8">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 className="font-display text-2xl font-light text-[var(--color-ink)]">Order #{order.orderId}</h2>
                                    <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                                        {formatStatus(order.status)}
                                    </span>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Date</p>
                                        <p className="mt-2 text-sm text-[var(--color-ink)]">{formatDate(order.createdAt)}</p>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Total</p>
                                        <p className="mt-2 text-sm text-[var(--color-ink)]">{formatPrice(order.total)}</p>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Payment</p>
                                        <p className="mt-2 text-sm text-[var(--color-ink)]">
                                            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Link
                                className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                to={`/order-confirmation?orderId=${encodeURIComponent(order.orderId)}`}
                            >
                                View Details
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </main>
    );
}
