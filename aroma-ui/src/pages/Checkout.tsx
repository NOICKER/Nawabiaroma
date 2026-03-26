import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { buildApiUrl } from '../lib/api';

const CART_SESSION_STORAGE_KEY = 'cart_session_id';

type CheckoutStep = 'address' | 'payment';
type PaymentMethod = 'online' | 'cod';

interface AddressResponse {
    data: {
        id: number;
    };
}

interface CheckoutResponse {
    data: {
        provider: 'razorpay';
        razorpayOrderId: string;
        amount: number;
        currency: string;
        key: string;
    };
}

interface OrderResponse {
    data: {
        orderId: number;
    };
}

interface RazorpayPaymentSuccess {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface RazorpayInstance {
    on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    open: () => void;
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill?: {
        name?: string;
        email?: string;
        contact?: string;
    };
    handler: (response: RazorpayPaymentSuccess) => void;
    modal?: {
        ondismiss?: () => void;
    };
}

declare global {
    interface Window {
        Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
    }
}

interface CheckoutFormState {
    fullName: string;
    email: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
}

const initialFormState: CheckoutFormState = {
    fullName: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    phone: '',
};

function formatPrice(value: number) {
    return `\u20B9${value.toLocaleString('en-IN')}`;
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

async function getErrorMessage(response: Response, fallbackMessage: string) {
    try {
        const payload = (await response.json()) as { error?: string; message?: string };
        return payload.error ?? payload.message ?? fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

function loadRazorpayScript() {
    if (typeof window === 'undefined') {
        return Promise.resolve(false);
    }

    if (window.Razorpay) {
        return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
        const existingScript = document.querySelector<HTMLScriptElement>('script[data-razorpay-checkout="true"]');

        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(true), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.dataset.razorpayCheckout = 'true';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

export default function Checkout() {
    const navigate = useNavigate();
    const { cartItems, subtotal } = useCart();
    const { customer, token } = useCustomerAuth();
    const [step, setStep] = useState<CheckoutStep>('address');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
    const [formState, setFormState] = useState<CheckoutFormState>(() => ({
        ...initialFormState,
        fullName: customer?.name ?? '',
        email: customer?.email ?? '',
    }));
    const [addressId, setAddressId] = useState<number | null>(null);
    const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const total = subtotal;
    const sessionId = useMemo(() => getCartSessionId(), []);

    const handleAddressSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (!sessionId) {
            setError('Cart session not found. Refresh and try again.');
            return;
        }

        setIsSubmittingAddress(true);

        try {
            const response = await fetch(buildApiUrl('/api/addresses'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    sessionId,
                    name: formState.fullName,
                    phone: formState.phone,
                    addressLine1: formState.addressLine1,
                    addressLine2: formState.addressLine2,
                    city: formState.city,
                    state: formState.state,
                    postalCode: formState.postalCode,
                    country: formState.country,
                }),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to save the shipping address.'));
            }

            const payload = (await response.json()) as AddressResponse;
            setAddressId(payload.data.id);
            setStep('payment');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to save the shipping address.');
        } finally {
            setIsSubmittingAddress(false);
        }
    };

    const handleOnlinePayment = async () => {
        if (!token || !addressId || !sessionId) {
            setError('Checkout session is incomplete. Refresh and try again.');
            return;
        }

        setIsSubmittingPayment(true);
        setError(null);

        try {
            const checkoutResponse = await fetch(buildApiUrl('/api/checkout'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sessionId,
                    addressId,
                }),
            });

            if (!checkoutResponse.ok) {
                throw new Error(await getErrorMessage(checkoutResponse, 'Unable to initialize Razorpay checkout.'));
            }

            const checkoutPayload = (await checkoutResponse.json()) as CheckoutResponse;
            const isRazorpayLoaded = await loadRazorpayScript();

            if (!isRazorpayLoaded || !window.Razorpay) {
                throw new Error('Unable to load Razorpay checkout right now.');
            }

            const RazorpayConstructor = window.Razorpay;

            await new Promise<void>((resolve, reject) => {
                const razorpay = new RazorpayConstructor({
                    key: checkoutPayload.data.key,
                    amount: checkoutPayload.data.amount,
                    currency: checkoutPayload.data.currency,
                    name: 'Nawabi Aroma',
                    description: 'Complete your Nawabi Aroma order',
                    order_id: checkoutPayload.data.razorpayOrderId,
                    prefill: {
                        name: formState.fullName,
                        email: formState.email,
                        contact: formState.phone,
                    },
                    handler: async (response) => {
                        try {
                            const orderResponse = await fetch(buildApiUrl('/api/orders/create'), {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                    sessionId,
                                    addressId,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpaySignature: response.razorpay_signature,
                                }),
                            });

                            if (!orderResponse.ok) {
                                throw new Error(await getErrorMessage(orderResponse, 'Unable to finalize your order.'));
                            }

                            const payload = (await orderResponse.json()) as OrderResponse;
                            navigate(`/order-confirmation?orderId=${encodeURIComponent(payload.data.orderId)}`);
                            resolve();
                        } catch (handlerError) {
                            reject(handlerError);
                        }
                    },
                    modal: {
                        ondismiss: () => reject(new Error('Payment was cancelled before completion.')),
                    },
                });

                razorpay.on('payment.failed', (paymentError) => {
                    reject(new Error(paymentError.error?.description ?? 'Payment failed. Please try again.'));
                });

                razorpay.open();
            });
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to complete checkout right now.');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    const handleCodOrder = async () => {
        if (!token || !addressId || !sessionId) {
            setError('Checkout session is incomplete. Refresh and try again.');
            return;
        }

        setIsSubmittingPayment(true);
        setError(null);

        try {
            const response = await fetch(buildApiUrl('/api/orders/cod'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    sessionId,
                    addressId,
                }),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to place your COD order.'));
            }

            const payload = (await response.json()) as OrderResponse;
            navigate(`/order-confirmation?orderId=${encodeURIComponent(payload.data.orderId)}`);
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to place your COD order.');
        } finally {
            setIsSubmittingPayment(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="glass-panel w-full rounded-[32px] p-10 text-center sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Checkout</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Your cart is empty
                    </h1>
                    <Link
                        className="mt-10 inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--color-canvas)] transition hover:opacity-85"
                        to="/shop"
                    >
                        Explore fragrances
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-[1440px] px-4 pb-24 pt-28 sm:px-8 lg:px-12 lg:pb-28 lg:pt-32">
            <div className="grid gap-8 lg:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.05fr)]">
                <aside className="glass-panel rounded-[32px] p-6 sm:p-8 lg:sticky lg:top-28 lg:self-start">
                    <div className="border-b border-[var(--glass-border)] pb-6">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Order Summary</p>
                        <h2 className="mt-3 font-display text-3xl font-light tracking-tight text-[var(--color-ink)]">Review your selection</h2>
                    </div>

                    <div className="mt-6 space-y-4">
                        {cartItems.map((item) => (
                            <div key={`${item.id}-${item.variantId}`} className="flex gap-4 rounded-3xl border border-[var(--glass-border)] bg-white/60 p-4">
                                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[var(--color-ink)]/5">
                                    {item.image ? <img alt={item.name} className="h-full w-full object-cover" src={item.image} /> : null}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="font-display text-lg font-light text-[var(--color-ink)]">{item.name}</h3>
                                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">{item.size}</p>
                                        </div>
                                        <p className="text-sm text-[var(--color-ink)]">{formatPrice(item.price * item.quantity)}</p>
                                    </div>
                                    <p className="mt-3 text-sm text-[var(--text-muted)]">Quantity: {item.quantity}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 space-y-4 border-t border-[var(--glass-border)] pt-6">
                        <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                            <span>Subtotal</span>
                            <span className="text-[var(--color-ink)]">{formatPrice(subtotal)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                            <span>Delivery</span>
                            <span className="text-[var(--color-ink)]">Free across India</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[var(--glass-border)] pt-4">
                            <span className="font-display text-xl font-light text-[var(--color-ink)]">Total</span>
                            <span className="text-lg text-[var(--color-ink)]">{formatPrice(total)}</span>
                        </div>
                    </div>
                </aside>

                <section className="glass-panel rounded-[32px] p-6 sm:p-8">
                    <div className="border-b border-[var(--glass-border)] pb-6">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Checkout</p>
                        <h1 className="mt-3 font-display text-4xl font-light tracking-tight text-[var(--color-ink)]">
                            {step === 'address' ? 'Step 1: Shipping address' : 'Step 2: Payment method'}
                        </h1>
                    </div>

                    {step === 'address' ? (
                        <form className="mt-8 space-y-6" onSubmit={handleAddressSubmit}>
                            <div className="grid gap-6 sm:grid-cols-2">
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5" onChange={(event) => setFormState((current) => ({ ...current, fullName: event.target.value }))} placeholder="Full name" required value={formState.fullName} />
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5" onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))} placeholder="Email" required type="email" value={formState.email} />
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5 sm:col-span-2" onChange={(event) => setFormState((current) => ({ ...current, addressLine1: event.target.value }))} placeholder="Address line 1" required value={formState.addressLine1} />
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5 sm:col-span-2" onChange={(event) => setFormState((current) => ({ ...current, addressLine2: event.target.value }))} placeholder="Address line 2 (optional)" value={formState.addressLine2} />
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5" onChange={(event) => setFormState((current) => ({ ...current, city: event.target.value }))} placeholder="City" required value={formState.city} />
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5" onChange={(event) => setFormState((current) => ({ ...current, state: event.target.value }))} placeholder="State" required value={formState.state} />
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5" onChange={(event) => setFormState((current) => ({ ...current, postalCode: event.target.value }))} placeholder="Postal code" required value={formState.postalCode} />
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5" onChange={(event) => setFormState((current) => ({ ...current, country: event.target.value }))} placeholder="Country" required value={formState.country} />
                                <input className="rounded-2xl border border-[var(--glass-border)] bg-white/70 px-4 py-3.5 sm:col-span-2" onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))} placeholder="Phone" value={formState.phone} />
                            </div>

                            {error ? <p className="rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">{error}</p> : null}

                            <button className="inline-flex rounded-full bg-[var(--color-ink)] px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85 disabled:opacity-60" disabled={isSubmittingAddress} type="submit">
                                {isSubmittingAddress ? 'Saving Address...' : 'Continue to Payment'}
                            </button>
                        </form>
                    ) : (
                        <div className="mt-8 space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <button
                                    className={`rounded-[28px] border p-6 text-left transition ${paymentMethod === 'online' ? 'border-[var(--color-ink)] bg-[var(--color-ink)]/5' : 'border-[var(--glass-border)] bg-white/55'}`}
                                    onClick={() => setPaymentMethod('online')}
                                    type="button"
                                >
                                    <p className="font-display text-2xl font-light text-[var(--color-ink)]">Pay Online</p>
                                    <p className="mt-2 text-sm text-[var(--text-muted)]">Razorpay: UPI, cards, and net banking.</p>
                                </button>
                                <button
                                    className={`rounded-[28px] border p-6 text-left transition ${paymentMethod === 'cod' ? 'border-[var(--color-ink)] bg-[var(--color-ink)]/5' : 'border-[var(--glass-border)] bg-white/55'}`}
                                    onClick={() => setPaymentMethod('cod')}
                                    type="button"
                                >
                                    <p className="font-display text-2xl font-light text-[var(--color-ink)]">Cash on Delivery</p>
                                    <p className="mt-2 text-sm text-[var(--text-muted)]">Pay when the package reaches you.</p>
                                </button>
                            </div>

                            {error ? <p className="rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">{error}</p> : null}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                    onClick={() => setStep('address')}
                                    type="button"
                                >
                                    Back
                                </button>
                                <button
                                    className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85 disabled:opacity-60"
                                    disabled={isSubmittingPayment}
                                    onClick={paymentMethod === 'online' ? handleOnlinePayment : handleCodOrder}
                                    type="button"
                                >
                                    {isSubmittingPayment ? 'Processing...' : paymentMethod === 'online' ? 'Pay Now' : 'Place COD Order'}
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
