import { useState, type FormEvent, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const CART_SESSION_STORAGE_KEY = 'cart_session_id';
const SHIPPING_FEE = 100;

interface CheckoutFormState {
    fullName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    saveAddress: boolean;
}

type FormFieldName = Exclude<keyof CheckoutFormState, 'saveAddress'>;
type FormErrors = Partial<Record<FormFieldName, string>>;

interface StripeCheckoutResponse {
    provider: 'stripe';
    clientSecret: string;
}

interface RazorpayCheckoutResponse {
    provider: 'razorpay';
    orderId: string;
    amount: number;
    currency: string;
    key: string;
}

type CheckoutResponseData = StripeCheckoutResponse | RazorpayCheckoutResponse;

interface CheckoutResponsePayload {
    data?: CheckoutResponseData;
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

const initialFormState: CheckoutFormState = {
    fullName: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    saveAddress: true,
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

function normalizeCustomerEmail(value: string) {
    return value.trim();
}

function validateForm(formState: CheckoutFormState) {
    const nextErrors: FormErrors = {};
    const customerEmail = normalizeCustomerEmail(formState.email);

    if (!formState.fullName.trim()) {
        nextErrors.fullName = 'Full name is required.';
    }

    if (!customerEmail) {
        nextErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        nextErrors.email = 'Enter a valid email address.';
    }

    if (!formState.phone.trim()) {
        nextErrors.phone = 'Phone number is required.';
    }

    if (!formState.addressLine1.trim()) {
        nextErrors.addressLine1 = 'Address line 1 is required.';
    }

    if (!formState.city.trim()) {
        nextErrors.city = 'City is required.';
    }

    if (!formState.state.trim()) {
        nextErrors.state = 'State is required.';
    }

    if (!formState.pincode.trim()) {
        nextErrors.pincode = 'Pincode is required.';
    }

    if (!formState.country.trim()) {
        nextErrors.country = 'Country is required.';
    }

    return nextErrors;
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
    try {
        const payload = (await response.json()) as {
            error?: string;
            message?: string;
        };

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

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label: string;
    note?: string;
}

function Field({ error, label, note, className = '', ...inputProps }: FieldProps) {
    return (
        <label className="block space-y-3">
            <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">{label}</span>
                {note ? <span className="text-[11px] text-[var(--text-muted)]">{note}</span> : null}
            </div>
            <input
                className={`w-full rounded-2xl border bg-white/70 px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10 ${
                    error ? 'border-[var(--color-primary)]' : 'border-[var(--glass-border)]'
                } ${className}`}
                {...inputProps}
            />
            {error ? <p className="text-sm text-[var(--color-primary)]">{error}</p> : null}
        </label>
    );
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    error?: string;
    label: string;
}

function TextAreaField({ error, label, className = '', ...textareaProps }: TextAreaFieldProps) {
    return (
        <label className="block space-y-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">{label}</span>
            <textarea
                className={`min-h-28 w-full rounded-2xl border bg-white/70 px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--text-muted)]/70 focus:border-[var(--color-ink)] focus:ring-2 focus:ring-[var(--color-ink)]/10 ${
                    error ? 'border-[var(--color-primary)]' : 'border-[var(--glass-border)]'
                } ${className}`}
                {...textareaProps}
            />
            {error ? <p className="text-sm text-[var(--color-primary)]">{error}</p> : null}
        </label>
    );
}

export default function Checkout() {
    const navigate = useNavigate();
    const { cartItems } = useCart();
    const [formState, setFormState] = useState<CheckoutFormState>(initialFormState);
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

    const subtotal = cartItems.reduce((runningTotal, item) => runningTotal + item.price * item.quantity, 0);
    const total = subtotal + SHIPPING_FEE;

    const updateField = <K extends keyof CheckoutFormState>(field: K, value: CheckoutFormState[K]) => {
        setFormState((currentState) => ({
            ...currentState,
            [field]: value,
        }));

        if (field !== 'saveAddress') {
            setFormErrors((currentErrors) => {
                const key = field as FormFieldName;

                if (!currentErrors[key]) {
                    return currentErrors;
                }

                const nextErrors = { ...currentErrors };
                delete nextErrors[key];
                return nextErrors;
            });
        }

        if (submitError) {
            setSubmitError(null);
        }

        if (submitSuccess) {
            setSubmitSuccess(null);
        }
    };

    const handlePayment = async (responseData: CheckoutResponseData) => {
        if (responseData.provider === 'stripe') {
            navigate('/order-success');
            return;
        }

        const isRazorpayLoaded = await loadRazorpayScript();
        const RazorpayConstructor = window.Razorpay;

        if (!isRazorpayLoaded || !RazorpayConstructor) {
            throw new Error('Unable to load Razorpay checkout right now.');
        }

        await new Promise<void>((resolve, reject) => {
            const razorpay = new RazorpayConstructor({
                key: responseData.key,
                amount: responseData.amount,
                currency: responseData.currency,
                name: 'Nawabi Aroma',
                description: 'Complete your Nawabi Aroma order',
                order_id: responseData.orderId,
                prefill: {
                    name: formState.fullName.trim(),
                    email: formState.email.trim(),
                    contact: formState.phone.trim(),
                },
                handler: () => {
                    navigate(`/order-success?orderId=${encodeURIComponent(responseData.orderId)}`);
                    resolve();
                },
                modal: {
                    ondismiss: () => {
                        reject(new Error('Payment was cancelled before completion.'));
                    },
                },
            });

            razorpay.on('payment.failed', (event) => {
                reject(new Error(event.error?.description ?? 'Payment failed. Please try again.'));
            });

            razorpay.open();
        });
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(null);

        if (cartItems.length === 0) {
            setSubmitError('Your cart is empty.');
            return;
        }

        const nextErrors = validateForm(formState);
        setFormErrors(nextErrors);

        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        const customerEmail = normalizeCustomerEmail(formState.email);

        if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
            setFormErrors((currentErrors) => ({
                ...currentErrors,
                email: !customerEmail ? 'Email is required.' : 'Enter a valid email address.',
            }));
            return;
        }

        const sessionId = getCartSessionId();

        if (!sessionId) {
            setSubmitError('Cart session not found. Refresh the page and try again.');
            return;
        }

        setIsSubmitting(true);

        try {
            const trimmedAddressLine2 = formState.addressLine2.trim();
            const shippingAddress = {
                fullName: formState.fullName.trim(),
                line1: formState.addressLine1.trim(),
                line2: trimmedAddressLine2 || undefined,
                city: formState.city.trim(),
                state: formState.state.trim(),
                postalCode: formState.pincode.trim(),
                country: formState.country.trim(),
                phone: formState.phone.trim() || undefined,
            };

            const addressResponse = await fetch('/api/addresses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId,
                    name: formState.fullName.trim(),
                    phone: formState.phone.trim(),
                    addressLine1: formState.addressLine1.trim(),
                    addressLine2: trimmedAddressLine2,
                    city: formState.city.trim(),
                    state: formState.state.trim(),
                    postalCode: formState.pincode.trim(),
                    country: formState.country.trim(),
                }),
            });

            if (!addressResponse.ok) {
                throw new Error(await getErrorMessage(addressResponse, 'Unable to save the shipping address.'));
            }

            await addressResponse.json();

            const checkoutResponse = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId,
                    customerEmail,
                    items: cartItems.map((item) => ({
                        variantId: item.variantId,
                        quantity: item.quantity,
                    })),
                    shippingAddress,
                }),
            });

            if (!checkoutResponse.ok) {
                throw new Error(await getErrorMessage(checkoutResponse, 'Unable to create the checkout session.'));
            }

            const checkoutPayload = (await checkoutResponse.json()) as CheckoutResponseData | CheckoutResponsePayload;
            const responseData = 'data' in checkoutPayload && checkoutPayload.data ? checkoutPayload.data : checkoutPayload;

            if (!('provider' in responseData)) {
                throw new Error('Unexpected checkout response.');
            }

            await handlePayment(responseData);
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'Unable to complete checkout right now.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (cartItems.length === 0) {
        return (
            <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-24 sm:px-8 lg:px-12">
                <div className="w-full rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/80 p-10 text-center shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-14">
                    <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Checkout</p>
                    <h1 className="mt-5 font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl">
                        Your cart is empty
                    </h1>
                    <p className="mx-auto mt-4 max-w-md text-base font-light leading-relaxed text-[var(--text-muted)]">
                        Build your order from the collection first, then return here to complete the delivery details.
                    </p>
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
            <div className="mx-auto max-w-3xl text-center lg:max-w-none lg:text-left">
                <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--text-muted)]">Checkout</p>
                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <h1 className="font-display text-4xl font-light tracking-tight text-[var(--color-ink)] sm:text-5xl lg:text-6xl">
                            Delivery details and final review
                        </h1>
                        <p className="mt-4 text-base font-light leading-relaxed text-[var(--text-muted)] sm:text-lg">
                            Complete the address details for your Nawabi Aroma order and review the selection before payment.
                        </p>
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                    </div>
                </div>
            </div>

            <form className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] xl:gap-10" onSubmit={handleSubmit}>
                <section className="rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/80 p-6 shadow-[0_24px_80px_rgba(15,15,15,0.06)] backdrop-blur-xl sm:p-8">
                    <div className="flex flex-col gap-3 border-b border-[var(--glass-border)] pb-8">
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Shipping address</p>
                        <h2 className="font-display text-3xl font-light tracking-tight text-[var(--color-ink)]">Where should we deliver?</h2>
                        <p className="max-w-2xl text-sm font-light leading-relaxed text-[var(--text-muted)] sm:text-base">
                            Enter the address details for this order. The email field is used for checkout confirmation with the current API.
                        </p>
                    </div>

                    <div className="mt-8 grid gap-6 sm:grid-cols-2">
                        <Field
                            autoComplete="name"
                            error={formErrors.fullName}
                            label="Full name"
                            onChange={(event) => updateField('fullName', event.target.value)}
                            placeholder="Recipient name"
                            required
                            value={formState.fullName}
                        />
                        <Field
                            autoComplete="email"
                            error={formErrors.email}
                            label="Email"
                            onChange={(event) => updateField('email', event.target.value)}
                            placeholder="you@example.com"
                            required
                            type="email"
                            value={formState.email}
                        />
                        <Field
                            autoComplete="tel"
                            error={formErrors.phone}
                            inputMode="tel"
                            label="Phone"
                            onChange={(event) => updateField('phone', event.target.value)}
                            placeholder="+91 98765 43210"
                            required
                            value={formState.phone}
                        />
                        <Field
                            autoComplete="country-name"
                            error={formErrors.country}
                            label="Country"
                            onChange={(event) => updateField('country', event.target.value)}
                            required
                            value={formState.country}
                        />
                    </div>

                    <div className="mt-6 grid gap-6">
                        <Field
                            autoComplete="address-line1"
                            error={formErrors.addressLine1}
                            label="Address line 1"
                            onChange={(event) => updateField('addressLine1', event.target.value)}
                            placeholder="House number, building, street"
                            required
                            value={formState.addressLine1}
                        />
                        <TextAreaField
                            autoComplete="address-line2"
                            label="Address line 2"
                            onChange={(event) => updateField('addressLine2', event.target.value)}
                            placeholder="Apartment, suite, landmark"
                            value={formState.addressLine2}
                        />
                    </div>

                    <div className="mt-6 grid gap-6 sm:grid-cols-3">
                        <Field
                            autoComplete="address-level2"
                            error={formErrors.city}
                            label="City"
                            onChange={(event) => updateField('city', event.target.value)}
                            required
                            value={formState.city}
                        />
                        <Field
                            autoComplete="address-level1"
                            error={formErrors.state}
                            label="State"
                            onChange={(event) => updateField('state', event.target.value)}
                            required
                            value={formState.state}
                        />
                        <Field
                            autoComplete="postal-code"
                            error={formErrors.pincode}
                            inputMode="numeric"
                            label="Pincode"
                            onChange={(event) => updateField('pincode', event.target.value)}
                            required
                            value={formState.pincode}
                        />
                    </div>

                    <label className="mt-8 flex items-start gap-3 rounded-2xl border border-[var(--glass-border)] bg-white/50 px-4 py-4">
                        <input
                            checked={formState.saveAddress}
                            className="mt-1 h-4 w-4 rounded border-[var(--glass-border)] text-[var(--color-ink)] focus:ring-[var(--color-ink)]"
                            onChange={(event) => updateField('saveAddress', event.target.checked)}
                            type="checkbox"
                        />
                        <span>
                            <span className="block font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink)]">
                                Save address
                            </span>
                            <span className="mt-1 block text-sm font-light leading-relaxed text-[var(--text-muted)]">
                                Keep this delivery information handy for faster checkout next time.
                            </span>
                        </span>
                    </label>
                </section>

                <aside className="lg:sticky lg:top-28 lg:self-start">
                    <div className="rounded-[32px] border border-[var(--glass-border)] bg-[var(--color-canvas)]/85 p-6 shadow-[0_24px_80px_rgba(15,15,15,0.08)] backdrop-blur-xl sm:p-8">
                        <div className="border-b border-[var(--glass-border)] pb-6">
                            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">Order summary</p>
                            <h2 className="mt-3 font-display text-3xl font-light tracking-tight text-[var(--color-ink)]">Review your selection</h2>
                        </div>

                        <div className="mt-6 space-y-4">
                            {cartItems.map((item) => {
                                const lineTotal = item.price * item.quantity;

                                return (
                                    <div
                                        key={`${item.id}-${item.variantId}`}
                                        className="flex gap-4 rounded-3xl border border-[var(--glass-border)] bg-white/60 p-4"
                                    >
                                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-ink)]/5">
                                            {item.image ? (
                                                <img alt={item.name} className="h-full w-full object-cover" src={item.image} />
                                            ) : (
                                                <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.12),_transparent_70%)]" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="font-display text-lg font-light text-[var(--color-ink)]">{item.name}</h3>
                                                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                                                        {item.size}
                                                    </p>
                                                </div>
                                                <div className="text-right font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                                    Qty {item.quantity}
                                                </div>
                                            </div>
                                            <div className="mt-4 flex items-end justify-between gap-4">
                                                <p className="font-mono text-sm text-[var(--text-muted)]">{formatPrice(item.price)} each</p>
                                                <p className="font-mono text-sm text-[var(--color-ink)]">{formatPrice(lineTotal)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 space-y-4 border-t border-[var(--glass-border)] pt-6">
                            <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                                <span>Subtotal</span>
                                <span className="font-mono text-[var(--color-ink)]">{formatPrice(subtotal)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
                                <span>Shipping</span>
                                <span className="font-mono text-[var(--color-ink)]">{formatPrice(SHIPPING_FEE)}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-[var(--glass-border)] pt-4">
                                <span className="font-display text-xl font-light text-[var(--color-ink)]">Total</span>
                                <span className="font-mono text-lg text-[var(--color-ink)]">{formatPrice(total)}</span>
                            </div>
                        </div>

                        {submitError ? (
                            <p aria-live="polite" className="mt-6 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 px-4 py-3 text-sm text-[var(--color-primary)]">
                                {submitError}
                            </p>
                        ) : null}

                        {submitSuccess ? (
                            <p aria-live="polite" className="mt-6 rounded-2xl border border-[var(--glass-border)] bg-white/60 px-4 py-3 text-sm text-[var(--color-ink)]">
                                {submitSuccess}
                            </p>
                        ) : null}

                        <button
                            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[var(--color-ink)] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--color-canvas)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={isSubmitting}
                            type="submit"
                        >
                            {isSubmitting ? 'Processing...' : 'Pay now'}
                        </button>

                        <p className="mt-4 text-center text-xs font-light leading-relaxed text-[var(--text-muted)]">
                            Payment gateway integration comes next. This step only creates the address and checkout request.
                        </p>
                    </div>
                </aside>
            </form>
        </main>
    );
}
