import { ArrowLeft, PackageCheck, Save } from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const ADMIN_ORDERS_ENDPOINT = '/api/admin/orders';
const orderStatuses = [
    'awaiting_payment',
    'paid',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'failed_payment',
    'draft',
] as const;

type OrderStatus = (typeof orderStatuses)[number];
type PaymentMethod = 'online' | 'cod';
type PaymentStatus = 'requires_payment_method' | 'succeeded' | 'failed' | 'refunded' | null;

interface AdminOrderSummary {
    id: number;
    totalAmount: number;
    status: OrderStatus;
    trackingNumber: string | null;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
    stripePaymentIntentId?: string | null;
    createdAt: string;
    customerEmail: string | null;
    itemCount: number;
}

interface OrderDetailItem {
    variantId: number;
    productId: number;
    productName: string;
    variant: string;
    quantity: number;
    price: number;
    subtotal: number;
}

interface OrderDetailResponse {
    id: number;
    status: OrderStatus;
    items: OrderDetailItem[];
    subtotalAmount: number;
    totalAmount: number;
    address: unknown;
    createdAt: string;
    customerEmail: string | null;
    trackingNumber: string | null;
    paymentMethod: PaymentMethod;
    paymentStatus: PaymentStatus;
}

interface ApiResponse<T> {
    data?: T;
    error?: string;
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

function formatPaymentMethod(value: PaymentMethod) {
    return value === 'cod' ? 'Cash on Delivery' : 'Paid Online';
}

function formatPaymentStatus(paymentMethod: PaymentMethod, paymentStatus: PaymentStatus) {
    if (!paymentStatus) {
        return paymentMethod === 'cod' ? 'Pending on delivery' : 'Not recorded';
    }

    return paymentStatus.replace(/_/g, ' ');
}

function getPaymentStatusBadgeClass(paymentMethod: PaymentMethod, paymentStatus: PaymentStatus) {
    if (!paymentStatus) {
        return paymentMethod === 'cod'
            ? 'border-amber-400/30 bg-amber-500/15 text-amber-200'
            : 'border-white/12 bg-white/5 text-[var(--text-muted)]';
    }

    switch (paymentStatus) {
        case 'succeeded':
            return 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200';
        case 'failed':
            return 'border-red-400/30 bg-red-500/15 text-red-200';
        case 'refunded':
            return 'border-violet-400/30 bg-violet-500/15 text-violet-200';
        case 'requires_payment_method':
        default:
            return 'border-amber-400/30 bg-amber-500/15 text-amber-200';
    }
}

function normalizeTrackingNumber(value: string) {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
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

async function fetchAdminOrders(token: string) {
    const response = await fetch(ADMIN_ORDERS_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<AdminOrderSummary[]>(response);
}

async function fetchOrderDetail(token: string, orderId: number) {
    const response = await fetch(`${ADMIN_ORDERS_ENDPOINT}/${orderId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return readApiPayload<OrderDetailResponse>(response);
}

async function updateOrder(token: string, orderId: number, payload: Partial<Pick<AdminOrderSummary, 'status' | 'trackingNumber'>>) {
    const response = await fetch(`${ADMIN_ORDERS_ENDPOINT}/${orderId}`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    return readApiPayload<{
        id: number;
        totalAmount: number;
        status: OrderStatus;
        trackingNumber: string | null;
        createdAt: string;
    }>(response);
}

export function AdminOrders() {
    const { token } = useAdminAuth();
    const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [orderDetail, setOrderDetail] = useState<OrderDetailResponse | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [statusValue, setStatusValue] = useState<OrderStatus>('awaiting_payment');
    const [trackingNumberValue, setTrackingNumberValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saveError, setSaveError] = useState('');

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            setListError('Admin session missing.');
            return;
        }

        let isCancelled = false;

        const loadOrders = async () => {
            setIsLoading(true);
            setListError('');

            try {
                const nextOrders = await fetchAdminOrders(token);

                if (!isCancelled) {
                    setOrders(nextOrders);
                }
            } catch (error) {
                if (!isCancelled) {
                    setListError(error instanceof Error ? error.message : 'Unable to load orders.');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        void loadOrders();

        return () => {
            isCancelled = true;
        };
    }, [token]);

    useEffect(() => {
        if (!saveMessage) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setSaveMessage('');
        }, 2000);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [saveMessage]);

    const selectedOrder = selectedOrderId === null ? null : orders.find((order) => order.id === selectedOrderId) ?? null;
    const hasChanges =
        selectedOrder !== null &&
        (statusValue !== selectedOrder.status || normalizeTrackingNumber(trackingNumberValue) !== selectedOrder.trackingNumber);

    const openOrderDetail = async (order: AdminOrderSummary) => {
        if (!token) {
            setDetailError('Admin session missing.');
            return;
        }

        setSelectedOrderId(order.id);
        setOrderDetail(null);
        setDetailError('');
        setSaveError('');
        setSaveMessage('');
        setStatusValue(order.status);
        setTrackingNumberValue(order.trackingNumber ?? '');
        setIsDetailLoading(true);

        try {
            const detail = await fetchOrderDetail(token, order.id);
            setOrderDetail(detail);
        } catch (error) {
            setDetailError(error instanceof Error ? error.message : 'Unable to load order details.');
        } finally {
            setIsDetailLoading(false);
        }
    };

    const closeOrderDetail = () => {
        setSelectedOrderId(null);
        setOrderDetail(null);
        setDetailError('');
        setSaveError('');
        setSaveMessage('');
        setStatusValue('awaiting_payment');
        setTrackingNumberValue('');
        setIsDetailLoading(false);
    };

    const handleStatusChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setStatusValue(event.target.value as OrderStatus);
    };

    const handleTrackingNumberChange = (event: ChangeEvent<HTMLInputElement>) => {
        setTrackingNumberValue(event.target.value);
    };

    const handleSave = async () => {
        if (!token || !selectedOrder) {
            setSaveError('Admin session missing.');
            return;
        }

        const nextTrackingNumber = normalizeTrackingNumber(trackingNumberValue);
        const payload: Partial<Pick<AdminOrderSummary, 'status' | 'trackingNumber'>> = {};

        if (statusValue !== selectedOrder.status) {
            payload.status = statusValue;
        }

        if (nextTrackingNumber !== selectedOrder.trackingNumber) {
            payload.trackingNumber = nextTrackingNumber;
        }

        if (Object.keys(payload).length === 0) {
            return;
        }

        setIsSaving(true);
        setSaveError('');
        setSaveMessage('');

        try {
            const updatedOrder = await updateOrder(token, selectedOrder.id, payload);
            const refreshedOrders = await fetchAdminOrders(token);

            setOrders(refreshedOrders);
            setStatusValue(updatedOrder.status);
            setTrackingNumberValue(updatedOrder.trackingNumber ?? '');
            setOrderDetail((currentDetail) =>
                currentDetail
                    ? {
                          ...currentDetail,
                          status: updatedOrder.status,
                      }
                    : currentDetail,
            );
            setSaveMessage('Saved');
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : 'Unable to save order changes.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="flex flex-1 flex-col gap-6 py-2 md:py-4">
            <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--color-primary)]">Orders</p>
                <h1 className="mt-3 font-display text-4xl font-light tracking-[0.04em] text-[var(--color-ink)] md:text-5xl">
                    Orders
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                    Review incoming orders, track fulfillment progress, and update operational status without leaving the dashboard.
                </p>
            </div>

            {selectedOrder ? (
                <div className="glass-panel rounded-[30px] px-6 py-8 md:px-8 md:py-10">
                    <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] pb-6 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--color-primary)]">Order Detail</p>
                            <h2 className="mt-3 font-display text-3xl font-light tracking-[0.04em] text-[var(--color-ink)]">
                                Order #{selectedOrder.id}
                            </h2>
                        </div>

                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                            onClick={closeOrderDetail}
                            type="button"
                        >
                            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                            <span>Back to Orders</span>
                        </button>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Order ID</p>
                            <p className="mt-3 text-lg text-[var(--color-ink)]">#{selectedOrder.id}</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Customer Email</p>
                            <p className="mt-3 text-sm text-[var(--color-ink)]">{selectedOrder.customerEmail ?? 'Unknown customer'}</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Total</p>
                            <p className="mt-3 text-lg text-[var(--color-ink)]">{formatCurrency(selectedOrder.totalAmount)}</p>
                        </div>
                        <div className="rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Payment Method</p>
                            <p className="mt-3 text-sm text-[var(--color-ink)]">
                                {formatPaymentMethod(orderDetail?.paymentMethod ?? selectedOrder.paymentMethod)}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Payment Status</p>
                            <span
                                className={`mt-3 inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${getPaymentStatusBadgeClass(
                                    orderDetail?.paymentMethod ?? selectedOrder.paymentMethod,
                                    orderDetail?.paymentStatus ?? selectedOrder.paymentStatus,
                                )}`}
                            >
                                {formatPaymentStatus(
                                    orderDetail?.paymentMethod ?? selectedOrder.paymentMethod,
                                    orderDetail?.paymentStatus ?? selectedOrder.paymentStatus,
                                )}
                            </span>
                        </div>
                        <div className="rounded-2xl border border-[var(--glass-border)] bg-white/4 px-4 py-4">
                            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Created At</p>
                            <p className="mt-3 text-sm text-[var(--color-ink)]">{formatDateTime(selectedOrder.createdAt)}</p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-[28px] border border-[var(--glass-border)] bg-white/4 px-5 py-5">
                        <div className="flex flex-col gap-4 border-b border-[var(--glass-border)] pb-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-primary)]">Items</p>
                                <p className="mt-2 text-sm text-[var(--text-muted)]">Review the products and quantities attached to this order.</p>
                            </div>

                            <span
                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${getStatusBadgeClass(
                                    statusValue,
                                )}`}
                            >
                                {statusValue.replace(/_/g, ' ')}
                            </span>
                        </div>

                        {isDetailLoading ? (
                            <p className="mt-5 text-sm text-[var(--text-muted)]">Loading order details...</p>
                        ) : detailError ? (
                            <div className="mt-5 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                {detailError}
                            </div>
                        ) : orderDetail && orderDetail.items.length > 0 ? (
                            <div className="mt-5 space-y-3">
                                {orderDetail.items.map((item) => (
                                    <div
                                        key={`${item.productId}-${item.variantId}`}
                                        className="grid gap-3 rounded-2xl border border-[var(--glass-border)] bg-[var(--color-canvas)]/35 px-4 py-4 md:grid-cols-[1.4fr_1fr_0.6fr_0.8fr_0.8fr]"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-[var(--color-ink)]">{item.productName}</p>
                                            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{item.variant}</p>
                                        </div>
                                        <div>
                                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Variant</p>
                                            <p className="mt-2 text-sm text-[var(--color-ink)]">{item.variant}</p>
                                        </div>
                                        <div>
                                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Quantity</p>
                                            <p className="mt-2 text-sm text-[var(--color-ink)]">{item.quantity}</p>
                                        </div>
                                        <div>
                                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Price</p>
                                            <p className="mt-2 text-sm text-[var(--color-ink)]">{formatCurrency(item.price)}</p>
                                        </div>
                                        <div>
                                            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Subtotal</p>
                                            <p className="mt-2 text-sm text-[var(--color-ink)]">{formatCurrency(item.subtotal)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="mt-5 text-sm text-[var(--text-muted)]">No item lines are available for this order.</p>
                        )}
                    </div>

                    <div className="mt-6 rounded-[28px] border border-[var(--glass-border)] bg-white/4 px-5 py-5">
                        <div className="flex items-center gap-3">
                            <div className="glass-panel flex h-11 w-11 items-center justify-center rounded-2xl">
                                <PackageCheck className="h-4 w-4 text-[var(--color-primary)]" strokeWidth={1.75} />
                            </div>
                            <div>
                                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--color-primary)]">Manage Fulfillment</p>
                                <p className="mt-1 text-sm text-[var(--text-muted)]">Update the operational state and optional shipment reference.</p>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]" htmlFor="order-status">
                                    Status
                                </label>
                                <select
                                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors focus:border-[var(--color-primary)] focus:bg-white/7"
                                    id="order-status"
                                    onChange={handleStatusChange}
                                    value={statusValue}
                                >
                                    {orderStatuses.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]" htmlFor="tracking-number">
                                    Tracking Number
                                </label>
                                <input
                                    className="w-full rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition-colors placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-primary)] focus:bg-white/7"
                                    id="tracking-number"
                                    onChange={handleTrackingNumberChange}
                                    placeholder="Optional tracking reference"
                                    type="text"
                                    value={trackingNumberValue}
                                />
                            </div>
                        </div>

                        {saveError ? (
                            <div className="mt-5 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3 text-sm text-[var(--color-ink)]">
                                {saveError}
                            </div>
                        ) : null}

                        {saveMessage ? (
                            <div className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-200">
                                {saveMessage}
                            </div>
                        ) : null}

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                className="inline-flex items-center justify-center rounded-2xl border border-[var(--glass-border)] px-5 py-3 text-sm uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                onClick={closeOrderDetail}
                                type="button"
                            >
                                Back to Orders
                            </button>
                            <button
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-3 font-display text-[11px] font-medium uppercase tracking-[0.24em] text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={!hasChanges || isSaving}
                                onClick={handleSave}
                                type="button"
                            >
                                <Save className="h-4 w-4" strokeWidth={1.75} />
                                <span>{isSaving ? 'Saving' : 'Save Changes'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-panel overflow-hidden rounded-[30px]">
                    <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-6 py-5 md:px-8">
                        <div>
                            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">Order Queue</p>
                            <p className="mt-2 text-sm text-[var(--color-ink)]">{orders.length} orders loaded</p>
                        </div>
                    </div>

                    {listError ? (
                        <div className="border-b border-[var(--glass-border)] px-6 py-4 text-sm text-[var(--color-ink)] md:px-8">
                            <div className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-3">
                                {listError}
                            </div>
                        </div>
                    ) : null}

                    {isLoading ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">Loading orders...</div>
                    ) : orders.length === 0 ? (
                        <div className="px-6 py-10 text-sm text-[var(--text-muted)] md:px-8">No orders found yet.</div>
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
                                            Total Amount
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Payment Method
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Payment Status
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Item Count
                                        </th>
                                        <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                            Created At
                                        </th>
                                        <th className="px-6 py-4 text-right font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)] md:px-8">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order) => (
                                        <tr key={order.id} className="border-b border-[var(--glass-border)]/70 last:border-b-0">
                                            <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)] md:px-8">#{order.id}</td>
                                            <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{order.customerEmail ?? 'Unknown customer'}</td>
                                            <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{formatCurrency(order.totalAmount)}</td>
                                            <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{formatPaymentMethod(order.paymentMethod)}</td>
                                            <td className="px-6 py-5 align-top">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${getPaymentStatusBadgeClass(
                                                        order.paymentMethod,
                                                        order.paymentStatus,
                                                    )}`}
                                                >
                                                    {formatPaymentStatus(order.paymentMethod, order.paymentStatus)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 align-top">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] ${getStatusBadgeClass(
                                                        order.status,
                                                    )}`}
                                                >
                                                    {order.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 align-top text-sm text-[var(--color-ink)]">{order.itemCount}</td>
                                            <td className="px-6 py-5 align-top text-sm text-[var(--text-muted)]">{formatDateTime(order.createdAt)}</td>
                                            <td className="px-6 py-5 align-top md:px-8">
                                                <div className="flex justify-end">
                                                    <button
                                                        className="inline-flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)] transition-colors hover:text-[var(--color-ink)]"
                                                        onClick={() => openOrderDetail(order)}
                                                        type="button"
                                                    >
                                                        <PackageCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                                                        <span>Manage</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
