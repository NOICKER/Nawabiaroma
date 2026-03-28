import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomerAuth } from '../context/CustomerAuthContext';

const CART_SESSION_STORAGE_KEY = 'cart_session_id';
const ORDERS_ENDPOINT = '/api/orders';

interface OrderListItemInput {
    id?: string;
    orderId?: number;
    createdAt?: string;
    created_at?: string;
    status: string;
    total: number;
    items: unknown[];
}

interface OrdersResponse {
    data: OrderListItemInput[];
}

interface OrderCard {
    id: string;
    createdAt: string;
    status: string;
    total: number;
    items: unknown[];
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

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
}

function formatOrderDate(value: string) {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
        return value;
    }

    return parsedDate.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function formatStatus(value: string) {
    return value
        .split('_')
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

function getStatusClasses(status: string) {
    switch (status) {
        case 'paid':
            return 'border-sky-400/25 bg-sky-500/10 text-sky-700';
        case 'shipped':
            return 'border-violet-400/25 bg-violet-500/10 text-violet-700';
        case 'delivered':
            return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-700';
        case 'cancelled':
            return 'border-rose-400/25 bg-rose-500/10 text-rose-700';
        default:
            return 'border-[var(--glass-border)] bg-transparent text-[var(--text-muted)]';
    }
}

function normalizeOrder(order: OrderListItemInput): OrderCard {
    return {
        id: order.id ?? String(order.orderId ?? ''),
        createdAt: order.createdAt ?? order.created_at ?? '',
        status: order.status,
        total: order.total,
        items: Array.isArray(order.items) ? order.items : [],
    };
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

export default function MyOrders() {
    const navigate = useNavigate();
    const { token } = useCustomerAuth();
    const [orders, setOrders] = useState<OrderCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const sessionId = getCartSessionId();

        if (!token) {
            setOrders([]);
            setError('Sign in to view your orders.');
            setIsLoading(false);
            return;
        }

        if (!sessionId) {
            setOrders([]);
            setError(null);
            setIsLoading(false);
            return;
        }

        const abortController = new AbortController();

        void (async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`${ORDERS_ENDPOINT}?sessionId=${encodeURIComponent(sessionId)}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(await getErrorMessage(response, 'Unable to load your orders right now.'));
                }

                const payload = (await response.json()) as OrdersResponse;

                if (abortController.signal.aborted) {
                    return;
                }

                const nextOrders = Array.isArray(payload.data) ? payload.data.map(normalizeOrder) : [];
                setOrders(nextOrders);
            } catch (loadError) {
                if (abortController.signal.aborted) {
                    return;
                }

                setOrders([]);
                setError(loadError instanceof Error ? loadError.message : 'Unable to load your orders right now.');
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
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="w-full rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-10 text-center shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">My orders</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Loading your orders
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-[var(--text-muted)]">
                        Retrieving your latest Nawabi Aroma purchases now.
                    </p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="w-full rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-10 text-center shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">My orders</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Unable to load orders
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-[var(--text-muted)]">{error}</p>
                    <button
                        className="mt-10 inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-canvas)] transition hover:opacity-85"
                        onClick={() => navigate('/shop')}
                        type="button"
                    >
                        Continue shopping
                    </button>
                </div>
            </main>
        );
    }

    if (orders.length === 0) {
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="w-full rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-10 text-center shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">My orders</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        You have no orders yet
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-[var(--text-muted)]">
                        Explore the collection to place your first order and start your fragrance archive.
                    </p>
                    <button
                        className="mt-10 inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-canvas)] transition hover:opacity-85"
                        onClick={() => navigate('/shop')}
                        type="button"
                    >
                        Explore fragrances
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-5xl px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <div className="border-b border-[var(--glass-border)] pb-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--text-muted)]">My orders</p>
                <h1 className="mt-4 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                    Your fragrance archive
                </h1>
                <p className="mt-4 max-w-2xl text-base font-light leading-relaxed text-[var(--text-muted)] sm:text-lg">
                    Review your previous orders and open any purchase for a more detailed summary.
                </p>
            </div>

            <div className="mt-8 space-y-4">
                {orders.map((order) => (
                    <article
                        key={order.id}
                        className="rounded-[30px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-6 shadow-[0_18px_60px_rgba(15,15,15,0.06)] backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_22px_70px_rgba(15,15,15,0.09)] sm:p-8"
                    >
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <p className="font-display text-2xl font-light tracking-tight text-[var(--color-ink)]">Order #{order.id}</p>
                                    <span
                                        className={`inline-flex items-center rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${getStatusClasses(
                                            order.status,
                                        )}`}
                                    >
                                        {formatStatus(order.status)}
                                    </span>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Order date</p>
                                        <p className="mt-2 text-sm font-light text-[var(--color-ink)]">{formatOrderDate(order.createdAt)}</p>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Total amount</p>
                                        <p className="mt-2 text-sm font-light text-[var(--color-ink)]">{formatPrice(order.total)}</p>
                                    </div>
                                    <div>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Items</p>
                                        <p className="mt-2 text-sm font-light text-[var(--color-ink)]">
                                            {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                onClick={() => navigate(`/my-orders/${encodeURIComponent(order.id)}`)}
                                type="button"
                            >
                                View details
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        </main>
    );
}
