import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const ADMIN_PRODUCTS_ENDPOINT = '/api/admin/products';
const ADMIN_ORDERS_ENDPOINT = '/api/admin/orders';
const ADMIN_ARTICLES_ENDPOINT = '/api/admin/articles';
const revenueStatuses = new Set(['paid', 'processing', 'shipped', 'delivered']);

type OrderStatus =
    | 'awaiting_payment'
    | 'paid'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'failed_payment'
    | 'draft';

interface AdminProductSummary {
    id: number;
    slug: string;
    name: string;
    subName: string | null;
    basePrice: number;
    isActive: boolean;
    createdAt: string;
}

interface AdminOrderSummary {
    id: number;
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
    customerEmail: string | null;
}

interface AdminArticleSummary {
    id: number;
    isPublished: boolean;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
}

interface ResourceState<T> {
    data: T | null;
    error: string;
}

function createEmptyResourceState<T>(): ResourceState<T> {
    return {
        data: null,
        error: '',
    };
}

function getStatusBadgeClass(status: OrderStatus) {
    switch (status) {
        case 'awaiting_payment':
            return 'border-amber-400/30 bg-amber-500/15 text-amber-200';
        case 'paid':
        case 'processing':
            return 'border-sky-400/30 bg-sky-500/15 text-sky-200';
        case 'shipped':
            return 'border-violet-400/30 bg-violet-500/15 text-violet-200';
        case 'delivered':
            return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
        case 'cancelled':
            return 'border-rose-400/30 bg-rose-500/15 text-rose-200';
        case 'failed_payment':
            return 'border-red-400/30 bg-red-500/15 text-red-200';
        case 'draft':
        default:
            return 'border-white/12 bg-white/5 text-[var(--text-muted)]';
    }
}

function formatCurrency(value: number) {
    return `INR ${value.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}

function formatDateTime(value: string) {
    return new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

async function readApiPayload<T>(response: Response) {
    let payload: ApiResponse<T> | null = null;

    try {
        payload = (await response.json()) as ApiResponse<T>;
    } catch {
        payload = null;
    }

    if (!response.ok) {
        throw new Error(payload?.error ?? 'Unable to complete this request.');
    }

    if (payload?.data === undefined) {
        throw new Error('Unexpected API response.');
    }

    return payload.data;
}

async function fetchAdminProducts(token: string) {
    const response = await fetch(ADMIN_PRODUCTS_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<AdminProductSummary[]>(response);
}

async function fetchAdminOrders(token: string) {
    const response = await fetch(ADMIN_ORDERS_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<AdminOrderSummary[]>(response);
}

async function fetchAdminArticles(token: string) {
    const response = await fetch(ADMIN_ARTICLES_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<AdminArticleSummary[]>(response);
}

async function settleRequest<T>(request: Promise<T>): Promise<ResourceState<T>> {
    try {
        return {
            data: await request,
            error: '',
        };
    } catch (error) {
        return {
            data: null,
            error: error instanceof Error ? error.message : 'Unable to load this data right now.',
        };
    }
}

function StatCardSkeleton() {
    return (
        <div className="glass-panel rounded-[28px] px-5 py-5">
            <div className="animate-pulse">
                <div className="h-3 w-24 rounded bg-white/10" />
                <div className="mt-4 h-10 w-20 rounded bg-white/10" />
                <div className="mt-3 h-3 w-32 rounded bg-white/10" />
            </div>
        </div>
    );
}

export function AdminDashboard() {
    const { token } = useAdminAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [productsState, setProductsState] = useState<ResourceState<AdminProductSummary[]>>(() => createEmptyResourceState());
    const [ordersState, setOrdersState] = useState<ResourceState<AdminOrderSummary[]>>(() => createEmptyResourceState());
    const [articlesState, setArticlesState] = useState<ResourceState<AdminArticleSummary[]>>(() => createEmptyResourceState());

    useEffect(() => {
        if (!token) {
            return;
        }

        let isCancelled = false;

        const loadDashboard = async () => {
            setIsLoading(true);
            setProductsState(createEmptyResourceState());
            setOrdersState(createEmptyResourceState());
            setArticlesState(createEmptyResourceState());

            const [nextProducts, nextOrders, nextArticles] = await Promise.all([
                settleRequest(fetchAdminProducts(token)),
                settleRequest(fetchAdminOrders(token)),
                settleRequest(fetchAdminArticles(token)),
            ]);

            if (isCancelled) {
                return;
            }

            setProductsState(nextProducts);
            setOrdersState(nextOrders);
            setArticlesState(nextArticles);
            setIsLoading(false);
        };

        void loadDashboard();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    const resolvedProductsState = token ? productsState : { data: null, error: 'Admin session missing.' };
    const resolvedOrdersState = token ? ordersState : { data: null, error: 'Admin session missing.' };
    const resolvedArticlesState = token ? articlesState : { data: null, error: 'Admin session missing.' };
    const dashboardIsLoading = token ? isLoading : false;

    const products = resolvedProductsState.data ?? [];
    const orders = resolvedOrdersState.data ?? [];
    const articles = resolvedArticlesState.data ?? [];

    const recentOrders = [...orders]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 5);
    const recentProducts = [...products]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 5);
    const totalRevenue = orders.reduce((sum, order) => {
        if (!revenueStatuses.has(order.status)) {
            return sum;
        }

        return sum + order.totalAmount;
    }, 0);
    const publishedArticles = articles.filter((article) => article.isPublished).length;

    const stats = [
        {
            label: 'Total Products',
            value: resolvedProductsState.error ? '\u2014' : String(products.length),
            detail: resolvedProductsState.error ? 'Unavailable' : 'Catalog entries',
        },
        {
            label: 'Total Orders',
            value: resolvedOrdersState.error ? '\u2014' : String(orders.length),
            detail: resolvedOrdersState.error ? 'Unavailable' : 'Order records',
        },
        {
            label: 'Total Revenue',
            value: resolvedOrdersState.error ? '\u2014' : formatCurrency(totalRevenue),
            detail: resolvedOrdersState.error ? 'Unavailable' : 'Paid and fulfilled orders',
        },
        {
            label: 'Published Articles',
            value: resolvedArticlesState.error ? '\u2014' : String(publishedArticles),
            detail: resolvedArticlesState.error ? 'Unavailable' : 'Live editorial pieces',
        },
    ] as const;

    return (
        <section className="flex flex-1 flex-col gap-6 py-2 md:py-4">
            <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">Dashboard</p>
                <h1 className="mt-3 font-display text-4xl font-light tracking-[0.04em] text-[var(--color-ink)] md:text-5xl">
                    Dashboard
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                    Keep an eye on catalog size, order momentum, revenue, and recent admin activity from one overview.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {dashboardIsLoading
                    ? stats.map((stat) => <StatCardSkeleton key={stat.label} />)
                    : stats.map((stat) => (
                          <div key={stat.label} className="glass-panel rounded-[28px] px-5 py-5">
                              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">{stat.label}</p>
                              <p className="mt-4 font-display text-4xl font-light tracking-[0.02em] text-[var(--color-ink)]">{stat.value}</p>
                              <p className="mt-3 text-sm text-[var(--text-muted)]">{stat.detail}</p>
                          </div>
                      ))}
            </div>

            <div className="glass-panel overflow-hidden rounded-[30px]">
                <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">Recent Orders</p>
                        <p className="mt-2 text-sm text-[var(--color-ink)]">The latest five orders from the admin queue.</p>
                    </div>

                    <Link
                        className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                        to="/admin/orders"
                    >
                        View All Orders
                    </Link>
                </div>

                {dashboardIsLoading ? (
                    <div className="px-6 py-10 md:px-8">
                        <div className="animate-pulse space-y-3">
                            {Array.from({ length: 5 }, (_, index) => (
                                <div key={index} className="h-12 rounded-2xl bg-white/5" />
                            ))}
                        </div>
                    </div>
                ) : resolvedOrdersState.error ? (
                    <div className="px-6 py-8 md:px-8">
                        <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                            {resolvedOrdersState.error}
                        </div>
                    </div>
                ) : recentOrders.length === 0 ? (
                    <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">No recent orders yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--glass-border)]">
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                        Order ID
                                    </th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                        Customer Email
                                    </th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                        Total
                                    </th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                        Created At
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                        <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)] md:px-8">#{order.id}</td>
                                        <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{order.customerEmail ?? 'Unknown customer'}</td>
                                        <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{formatCurrency(order.totalAmount)}</td>
                                        <td className="px-6 py-5 align-top">
                                            <span
                                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${getStatusBadgeClass(
                                                    order.status,
                                                )}`}
                                            >
                                                {order.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)] md:px-8">
                                            {formatDateTime(order.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="glass-panel overflow-hidden rounded-[30px]">
                <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">Recent Products</p>
                        <p className="mt-2 text-sm text-[var(--color-ink)]">The latest five products created in the catalog.</p>
                    </div>

                    <Link
                        className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                        to="/admin/products"
                    >
                        View All Products
                    </Link>
                </div>

                {dashboardIsLoading ? (
                    <div className="px-6 py-10 md:px-8">
                        <div className="animate-pulse space-y-3">
                            {Array.from({ length: 5 }, (_, index) => (
                                <div key={index} className="h-12 rounded-2xl bg-white/5" />
                            ))}
                        </div>
                    </div>
                ) : resolvedProductsState.error ? (
                    <div className="px-6 py-8 md:px-8">
                        <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                            {resolvedProductsState.error}
                        </div>
                    </div>
                ) : recentProducts.length === 0 ? (
                    <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">No recent products yet.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--glass-border)]">
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                        Name
                                    </th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                        Slug
                                    </th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                        Base Price
                                    </th>
                                    <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                        Active
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentProducts.map((product) => (
                                    <tr key={product.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                        <td className="px-6 py-5 align-top md:px-8">
                                            <div>
                                                <p className="text-sm font-medium text-[var(--color-ink)]">{product.name}</p>
                                                {product.subName ? (
                                                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{product.subName}</p>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">{product.slug}</td>
                                        <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{formatCurrency(product.basePrice)}</td>
                                        <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)] md:px-8">{product.isActive ? 'Yes' : 'No'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
