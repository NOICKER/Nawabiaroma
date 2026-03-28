import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AddressCard } from '../components/account/AddressCard';
import { AddressFormFields } from '../components/account/AddressFormFields';
import { emptyAddressFormState, type AddressFormState } from '../components/account/addressFormState';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import type { SavedAddress } from '../context/types';
import { buildApiUrl } from '../lib/api';

const CART_SESSION_STORAGE_KEY = 'cart_session_id';

type CheckoutStep = 'address' | 'payment';
type PaymentMethod = 'online' | 'cod';

interface AddressListResponse {
    data: SavedAddress[];
}

interface AddressResponse {
    data: SavedAddress;
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

function buildFreshAddressForm(name: string, phone: string, useAsDefault: boolean): AddressFormState {
    return {
        ...emptyAddressFormState,
        label: useAsDefault ? 'Home' : '',
        name,
        phone,
        setAsDefault: useAsDefault,
    };
}

function AddressSummary({ address }: { address: SavedAddress }) {
    return (
        <div className="rounded-[28px] border border-[var(--glass-border)] bg-transparent p-5">
            <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    {address.label || 'Selected address'}
                </span>
                {address.isDefault ? (
                    <span className="rounded-full bg-[var(--color-ink)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-canvas)]">
                        Default
                    </span>
                ) : null}
            </div>
            <p className="mt-4 font-display text-2xl font-light text-[var(--color-ink)]">{address.name}</p>
            <div className="mt-3 space-y-1 text-sm text-[var(--text-muted)]">
                <p>{address.phone || 'Phone not saved'}</p>
                <p>{address.addressLine1}</p>
                {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
                <p>
                    {address.city}, {address.state} {address.postalCode}
                </p>
                <p>{address.country}</p>
            </div>
        </div>
    );
}

export default function Checkout() {
    const navigate = useNavigate();
    const { cartItems, subtotal, clearCart } = useCart();
    const { customer, token } = useCustomerAuth();
    const [step, setStep] = useState<CheckoutStep>('address');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('online');
    const [addresses, setAddresses] = useState<SavedAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [addressForm, setAddressForm] = useState<AddressFormState>(() =>
        buildFreshAddressForm(customer?.name ?? '', customer?.phone ?? '', true),
    );
    const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
    const [isSubmittingAddress, setIsSubmittingAddress] = useState(false);
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const total = subtotal;
    const sessionId = useMemo(() => getCartSessionId(), []);
    const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? null;

    const loadAddresses = async () => {
        if (!token) {
            setAddresses([]);
            setSelectedAddressId(null);
            setIsLoadingAddresses(false);
            return;
        }

        setIsLoadingAddresses(true);

        try {
            const response = await fetch(buildApiUrl('/api/account/addresses'), {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to load saved addresses.'));
            }

            const payload = (await response.json()) as AddressListResponse;
            const nextAddresses = payload.data ?? [];
            const nextDefaultId = nextAddresses.find((address) => address.isDefault)?.id ?? nextAddresses[0]?.id ?? null;

            setAddresses(nextAddresses);
            setSelectedAddressId((current) => (current && nextAddresses.some((address) => address.id === current) ? current : nextDefaultId));
            setIsAddressFormOpen(nextAddresses.length === 0);

            if (nextAddresses.length === 0) {
                setAddressForm(buildFreshAddressForm(customer?.name ?? '', customer?.phone ?? '', true));
            }
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load saved addresses.');
        } finally {
            setIsLoadingAddresses(false);
        }
    };

    useEffect(() => {
        void loadAddresses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const openNewAddressForm = () => {
        setError(null);
        setIsAddressFormOpen(true);
        setAddressForm(buildFreshAddressForm(customer?.name ?? '', customer?.phone ?? '', addresses.length === 0));
    };

    const handleAddressSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!token) {
            setError('Sign in again to continue.');
            return;
        }

        setIsSubmittingAddress(true);
        setError(null);

        try {
            const response = await fetch(buildApiUrl('/api/account/addresses'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(addressForm),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to save the shipping address.'));
            }

            const payload = (await response.json()) as AddressResponse;
            await loadAddresses();
            setSelectedAddressId(payload.data.id);
            setIsAddressFormOpen(false);
            setStep('payment');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Unable to save the shipping address.');
        } finally {
            setIsSubmittingAddress(false);
        }
    };

    const handleOnlinePayment = async () => {
        if (!token || !selectedAddress || !sessionId) {
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
                    addressId: selectedAddress.id,
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
                        name: selectedAddress.name,
                        email: customer?.email,
                        contact: selectedAddress.phone ?? customer?.phone ?? '',
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
                                    addressId: selectedAddress.id,
                                    razorpayOrderId: response.razorpay_order_id,
                                    razorpayPaymentId: response.razorpay_payment_id,
                                    razorpaySignature: response.razorpay_signature,
                                }),
                            });

                            if (!orderResponse.ok) {
                                throw new Error(await getErrorMessage(orderResponse, 'Unable to finalize your order.'));
                            }

                            const payload = (await orderResponse.json()) as OrderResponse;
                            clearCart();
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
        if (!token || !selectedAddress || !sessionId) {
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
                    addressId: selectedAddress.id,
                }),
            });

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, 'Unable to place your COD order.'));
            }

            const payload = (await response.json()) as OrderResponse;
            clearCart();
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
                            <div key={`${item.id}-${item.variantId}`} className="flex gap-4 rounded-3xl border border-[var(--glass-border)] bg-transparent p-4">
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
                            {step === 'address' ? 'Step 1: Choose a delivery address' : 'Step 2: Payment method'}
                        </h1>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
                            Saved addresses speed up repeat orders, and extra gift addresses stay ready whenever you need them.
                        </p>
                    </div>

                    {step === 'address' ? (
                        <div className="mt-8 space-y-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-display text-2xl font-light text-[var(--color-ink)]">Your saved destinations</p>
                                    <p className="mt-1 text-sm text-[var(--text-muted)]">Select one below or add a new gift address.</p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <Link
                                        className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                        to="/account/addresses"
                                    >
                                        Manage Address Book
                                    </Link>
                                    <button
                                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-canvas)] transition hover:opacity-85"
                                        onClick={openNewAddressForm}
                                        type="button"
                                    >
                                        Add New Address
                                    </button>
                                </div>
                            </div>

                            {isLoadingAddresses ? (
                                <div className="rounded-[28px] border border-[var(--glass-border)] bg-transparent p-6 text-sm text-[var(--text-muted)]">
                                    Loading your saved addresses...
                                </div>
                            ) : addresses.length === 0 ? (
                                <div className="rounded-[28px] border border-[var(--glass-border)] bg-transparent p-6 text-sm leading-relaxed text-[var(--text-muted)]">
                                    This looks like your first order. Add your delivery address below and it will be saved automatically for next time.
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {addresses.map((address) => (
                                        <AddressCard
                                            key={address.id}
                                            address={address}
                                            selected={selectedAddressId === address.id}
                                            onSelect={() => {
                                                setSelectedAddressId(address.id);
                                                setStep('payment');
                                                setError(null);
                                            }}
                                            selectionLabel={selectedAddressId === address.id ? 'Continue' : 'Use this address'}
                                        />
                                    ))}
                                </div>
                            )}

                            {isAddressFormOpen ? (
                                <form className="rounded-[32px] border border-[var(--glass-border)] bg-transparent p-6 sm:p-8" onSubmit={handleAddressSubmit}>
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">New Address</p>
                                            <h2 className="mt-2 font-display text-3xl font-light text-[var(--color-ink)]">Save a new delivery destination</h2>
                                        </div>
                                        {addresses.length > 0 ? (
                                            <button
                                                className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                                onClick={() => setIsAddressFormOpen(false)}
                                                type="button"
                                            >
                                                Cancel
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="mt-6">
                                        <AddressFormFields
                                            onChange={(field, nextValue) => {
                                                setAddressForm((current) => ({
                                                    ...current,
                                                    [field]: nextValue,
                                                }));
                                            }}
                                            value={addressForm}
                                        />
                                    </div>

                                    {error ? (
                                        <p className="mt-6 rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">
                                            {error}
                                        </p>
                                    ) : null}

                                    <button
                                        className="mt-6 inline-flex rounded-full bg-[var(--color-ink)] px-8 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85 disabled:opacity-60"
                                        disabled={isSubmittingAddress}
                                        type="submit"
                                    >
                                        {isSubmittingAddress ? 'Saving Address...' : 'Save and Continue'}
                                    </button>
                                </form>
                            ) : null}

                            {!error && !isAddressFormOpen && selectedAddress ? (
                                <div className="rounded-[28px] border border-[var(--glass-border)] bg-transparent p-5">
                                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Ready to go</p>
                                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                                        Selected address: <span className="text-[var(--color-ink)]">{selectedAddress.label || selectedAddress.name}</span>
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="mt-8 space-y-6">
                            {selectedAddress ? <AddressSummary address={selectedAddress} /> : null}

                            <div className="grid gap-4 md:grid-cols-2">
                                <button
                                    className={`rounded-[28px] border p-6 text-left transition-all ${paymentMethod === 'online' ? 'border-[#28c8d7] bg-transparent' : 'border-[var(--glass-border)] bg-transparent'}`}
                                    onClick={() => setPaymentMethod('online')}
                                    type="button"
                                >
                                    <p className={`font-display text-2xl font-light transition-all duration-300 ${paymentMethod === 'online' ? 'text-[#28c8d7] [text-shadow:0_0_12px_rgba(40,200,215,0.6)]' : 'text-[var(--color-ink)]'}`}>Pay Online</p>
                                    <p className="mt-2 text-sm text-[var(--text-muted)]">Razorpay with UPI, cards, and net banking.</p>
                                </button>
                                <button
                                    className={`rounded-[28px] border p-6 text-left transition-all ${paymentMethod === 'cod' ? 'border-[#28c8d7] bg-transparent' : 'border-[var(--glass-border)] bg-transparent'}`}
                                    onClick={() => setPaymentMethod('cod')}
                                    type="button"
                                >
                                    <p className={`font-display text-2xl font-light transition-all duration-300 ${paymentMethod === 'cod' ? 'text-[#28c8d7] [text-shadow:0_0_12px_rgba(40,200,215,0.6)]' : 'text-[var(--color-ink)]'}`}>Cash on Delivery</p>
                                    <p className="mt-2 text-sm text-[var(--text-muted)]">Pay when the package reaches the selected address.</p>
                                </button>
                            </div>

                            {error ? <p className="rounded-2xl border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">{error}</p> : null}

                            <div className="flex flex-col gap-3 sm:flex-row">
                                <button
                                    className="inline-flex items-center justify-center rounded-full border border-[var(--glass-border)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                                    onClick={() => setStep('address')}
                                    type="button"
                                >
                                    Change Address
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
