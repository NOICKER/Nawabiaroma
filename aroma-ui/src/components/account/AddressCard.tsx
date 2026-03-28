import type { SavedAddress } from '../../context/types';

interface AddressCardProps {
    address: SavedAddress;
    selected?: boolean;
    onSelect?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onMakeDefault?: () => void;
    selectionLabel?: string;
}

function buildAddressLines(address: SavedAddress) {
    return [
        address.addressLine1,
        address.addressLine2,
        `${address.city}, ${address.state} ${address.postalCode}`,
        address.country,
    ].filter(Boolean);
}

export function AddressCard({
    address,
    selected = false,
    onSelect,
    onEdit,
    onDelete,
    onMakeDefault,
    selectionLabel = 'Deliver here',
}: AddressCardProps) {
    return (
        <article
            className={`rounded-[28px] border p-5 transition ${
                selected ? 'border-[var(--color-ink)] bg-transparent shadow-[0_18px_38px_rgba(0,0,0,0.08)]' : 'border-[var(--glass-border)] bg-transparent'
            }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-[var(--glass-border)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {address.label || 'Saved address'}
                    </span>
                    {address.isDefault ? (
                        <span className="rounded-full bg-[var(--color-ink)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-canvas)]">
                            Default
                        </span>
                    ) : null}
                    {selected ? (
                        <span className="rounded-full bg-[var(--color-primary)]/12 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary)]">
                            Selected
                        </span>
                    ) : null}
                </div>

                {onSelect ? (
                    <button
                        className="inline-flex items-center justify-center rounded-full bg-[var(--color-ink)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-canvas)] transition hover:opacity-85"
                        onClick={onSelect}
                        type="button"
                    >
                        {selectionLabel}
                    </button>
                ) : null}
            </div>

            <div className="mt-4 space-y-2">
                <p className="font-display text-2xl font-light text-[var(--color-ink)]">{address.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{address.phone || 'Phone not saved'}</p>
                <div className="space-y-1 text-sm text-[var(--text-muted)]">
                    {buildAddressLines(address).map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
                {onEdit ? (
                    <button
                        className="rounded-full border border-[var(--glass-border)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                        onClick={onEdit}
                        type="button"
                    >
                        Edit
                    </button>
                ) : null}
                {onMakeDefault && !address.isDefault ? (
                    <button
                        className="rounded-full border border-[var(--glass-border)] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--color-ink)] transition hover:bg-[var(--color-ink)]/5"
                        onClick={onMakeDefault}
                        type="button"
                    >
                        Make default
                    </button>
                ) : null}
                {onDelete ? (
                    <button
                        className="rounded-full border border-red-500/20 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.24em] text-red-500 transition hover:bg-red-500/5"
                        onClick={onDelete}
                        type="button"
                    >
                        Delete
                    </button>
                ) : null}
            </div>
        </article>
    );
}
