import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStoreProducts } from '../data/products';

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

interface OrderAddress {
    id: number;
    customerId: number | null;
    sessionId: string | null;
    name: string;
    phone: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
    createdAt: string;
}

interface OrderSummary {
    orderId: number;
    status: string;
    items: OrderItem[];
    subtotal: number;
    total: number;
    address: OrderAddress | null;
    created_at: string;
}

interface OrderResponse {
    data: OrderSummary;
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

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-transparent px-5 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 text-sm font-light text-[var(--color-ink)] sm:text-base">{value}</p>
        </div>
    );
}

function AddressRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 text-sm font-light leading-relaxed text-[var(--color-ink)] sm:text-base">{value}</p>
        </div>
    );
}

export default function OrderDetail() {
    const { id } = useParams();
    const { products } = useStoreProducts();
    const [order, setOrder] = useState<OrderSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id || !/^\d+$/.test(id)) {
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
                const response = await fetch(`/api/orders/${encodeURIComponent(id)}`, {
                    method: 'GET',
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(await getErrorMessage(response, 'Unable to load this order.'));
                }

                const payload = (await response.json()) as OrderResponse;

                if (abortController.signal.aborted) {
                    return;
                }

                setOrder(payload.data);
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
    }, [id]);

    const shipping = order ? Math.max(order.total - order.subtotal, 0) : 0;

    if (isLoading) {
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="w-full rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-10 text-center shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Order details</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Loading your order
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-[var(--text-muted)]">
                        Retrieving the order information and shipping details now.
                    </p>
                </div>
            </main>
        );
    }

    if (error || !order) {
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="w-full rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/82 p-10 text-center shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Order details</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Order not found
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-[var(--text-muted)]">
                        {error ?? 'We could not find the order details for this page.'}
                    </p>
                    <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <Link
                            className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-canvas)] transition hover:opacity-85"
                            to="/my-orders"
                        >
                            Back to my orders
                        </Link>
                        <Link
                            className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                            to="/shop"
                        >
                            Continue shopping
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <section className="rounded-[36px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/86 p-6 shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-10">
                <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] pb-8">
                    <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--text-muted)]">Order detail</p>
                    <h1 className="font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Order #{order.orderId}
                    </h1>
                    <p className="max-w-2xl text-base font-light leading-relaxed text-[var(--text-muted)] sm:text-lg">
                        Review the order status, delivery address, and itemized totals for your Nawabi Aroma purchase.
                    </p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Order ID" value={`#${order.orderId}`} />
                    <StatCard label="Order date" value={formatOrderDate(order.created_at)} />
                    <StatCard label="Status" value={formatStatus(order.status)} />
                    <StatCard label="Total amount" value={formatPrice(order.total)} />
                </div>

                <section className="mt-10 rounded-[32px] border border-[var(--glass-border)] bg-transparent p-6 sm:p-8">
                    <div className="border-b border-[var(--glass-border)] pb-6">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Shipping address</p>
                        <h2 className="mt-3 font-display text-3xl font-light tracking-tight text-[var(--color-ink)]">
                            Delivery destination
                        </h2>
                    </div>

                    {order.address ? (
                        <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                            <AddressRow label="Full name" value={order.address.name} />
                            <AddressRow label="Phone" value={order.address.phone ?? 'Not provided'} />
                            <AddressRow label="Address line 1" value={order.address.addressLine1} />
                            <AddressRow label="Address line 2" value={order.address.addressLine2 || 'Not provided'} />
                            <AddressRow label="City" value={order.address.city} />
                            <AddressRow label="State" value={order.address.state} />
                            <AddressRow label="Pincode" value={order.address.postalCode} />
                            <AddressRow label="Country" value={order.address.country} />
                        </div>
                    ) : (
                        <p className="mt-6 text-sm font-light leading-relaxed text-[var(--text-muted)]">
                            Shipping address details are not available for this order.
                        </p>
                    )}
                </section>

                <section className="mt-10 rounded-[32px] border border-[var(--glass-border)] bg-transparent p-6 sm:p-8">
                    <div className="flex flex-col gap-3 border-b border-[var(--glass-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Items</p>
                            <h2 className="mt-3 font-display text-3xl font-light tracking-tight text-[var(--color-ink)]">
                                Purchased items
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
                                className="flex gap-4 rounded-3xl border border-[var(--glass-border)] bg-[var(--color-canvas)]/72 p-4"
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
                                            <h3 className="font-display text-lg font-light text-[var(--color-ink)]">{item.productName}</h3>
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

                    <div className="mt-8 rounded-[28px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/78 p-6 shadow-sm">
                        <div className="space-y-4">
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
                </section>
            </section>
        </main>
    );
}
