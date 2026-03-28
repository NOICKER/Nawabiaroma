import type { AddressFormState } from './addressFormState';

interface AddressFormFieldsProps {
    value: AddressFormState;
    onChange: <TField extends keyof AddressFormState>(field: TField, nextValue: AddressFormState[TField]) => void;
    showDefaultToggle?: boolean;
}

function inputClassName(span = false) {
    return [
        'rounded-2xl border border-[var(--glass-border)] bg-transparent px-4 py-3.5 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-ink)]',
        span ? 'sm:col-span-2' : '',
    ].join(' ');
}

export function AddressFormFields({ value, onChange, showDefaultToggle = true }: AddressFormFieldsProps) {
    return (
        <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-2 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Address label</span>
                <input
                    className={inputClassName(true)}
                    onChange={(event) => onChange('label', event.target.value)}
                    placeholder="Home, Studio, Gift for Mom"
                    value={value.label}
                />
            </label>

            <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Recipient name</span>
                <input
                    className={inputClassName()}
                    onChange={(event) => onChange('name', event.target.value)}
                    required
                    value={value.name}
                />
            </label>

            <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Phone number</span>
                <input
                    className={inputClassName()}
                    onChange={(event) => onChange('phone', event.target.value)}
                    required
                    value={value.phone}
                />
            </label>

            <label className="block space-y-2 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Address line 1</span>
                <input
                    className={inputClassName(true)}
                    onChange={(event) => onChange('addressLine1', event.target.value)}
                    required
                    value={value.addressLine1}
                />
            </label>

            <label className="block space-y-2 sm:col-span-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Address line 2</span>
                <input
                    className={inputClassName(true)}
                    onChange={(event) => onChange('addressLine2', event.target.value)}
                    placeholder="Apartment, landmark, floor"
                    value={value.addressLine2}
                />
            </label>

            <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">City</span>
                <input
                    className={inputClassName()}
                    onChange={(event) => onChange('city', event.target.value)}
                    required
                    value={value.city}
                />
            </label>

            <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">State</span>
                <input
                    className={inputClassName()}
                    onChange={(event) => onChange('state', event.target.value)}
                    required
                    value={value.state}
                />
            </label>

            <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Postal code</span>
                <input
                    className={inputClassName()}
                    onChange={(event) => onChange('postalCode', event.target.value)}
                    required
                    value={value.postalCode}
                />
            </label>

            <label className="block space-y-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">Country</span>
                <input
                    className={inputClassName()}
                    onChange={(event) => onChange('country', event.target.value)}
                    required
                    value={value.country}
                />
            </label>

            {showDefaultToggle ? (
                <label className="flex items-start gap-3 rounded-2xl border border-[var(--glass-border)] bg-transparent px-4 py-3 sm:col-span-2">
                    <input
                        checked={value.setAsDefault}
                        className="mt-1 h-4 w-4 rounded border-[var(--glass-border)]"
                        onChange={(event) => onChange('setAsDefault', event.target.checked)}
                        type="checkbox"
                    />
                    <span>
                        <span className="block text-sm text-[var(--color-ink)]">Make this my default delivery address</span>
                        <span className="mt-1 block text-xs text-[var(--text-muted)]">
                            Useful for your own orders while keeping extra gift addresses ready in the same book.
                        </span>
                    </span>
                </label>
            ) : null}
        </div>
    );
}
