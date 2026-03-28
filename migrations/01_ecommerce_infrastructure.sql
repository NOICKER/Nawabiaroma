-- ENUMS
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'reservation_status'
    ) THEN
        CREATE TYPE reservation_status AS ENUM ('active', 'fulfilled', 'expired', 'cancelled');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'promo_code_type'
    ) THEN
        CREATE TYPE promo_code_type AS ENUM ('percentage', 'fixed_amount');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'cart_status'
    ) THEN
        CREATE TYPE cart_status AS ENUM ('active', 'abandoned', 'converted');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'delivery_status'
    ) THEN
        CREATE TYPE delivery_status AS ENUM ('scheduled', 'out_for_delivery', 'delivered', 'failed', 'returned');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'webhook_status'
    ) THEN
        CREATE TYPE webhook_status AS ENUM ('pending', 'processing', 'completed', 'failed');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'refund_status'
    ) THEN
        CREATE TYPE refund_status AS ENUM ('pending', 'succeeded', 'failed', 'rejected');
    END IF;
END $$;

-- 1. ADDRESSES
-- Extracts address logic out of the JSONB blob in orders to a normalized table.
CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    line1 TEXT NOT NULL,
    line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    phone TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INVENTORY & RESERVATIONS
-- Separates stock quantity from product_variants to support discrete tracking per warehouse/location.
CREATE TABLE IF NOT EXISTS inventory (
    id BIGSERIAL PRIMARY KEY,
    product_variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    location_id TEXT NOT NULL DEFAULT 'default', -- Could link to a warehouses table later
    quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
    quantity_allocated INTEGER NOT NULL DEFAULT 0 CHECK (quantity_allocated >= 0),
    last_restocked_at TIMESTAMPTZ,
    UNIQUE(product_variant_id, location_id)
);

-- Supports holding stock during checkout to prevent overselling.
CREATE TABLE IF NOT EXISTS inventory_reservations (
    id BIGSERIAL PRIMARY KEY,
    inventory_id BIGINT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL, -- Can be null for guest checkout
    session_id TEXT NOT NULL, -- Ties to the user's browser session or cart
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status reservation_status NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. PROMO CODES
CREATE TABLE IF NOT EXISTS promo_codes (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    type promo_code_type NOT NULL,
    value NUMERIC(10, 2) NOT NULL CHECK (value > 0),
    min_order_amount NUMERIC(10, 2),
    max_uses INTEGER,
    times_used INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CARTS (Persistent Carts)
CREATE TABLE IF NOT EXISTS carts (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL UNIQUE,
    status cart_status NOT NULL DEFAULT 'active',
    promo_code_id BIGINT REFERENCES promo_codes(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_variant_id BIGINT NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cart_id, product_variant_id)
);

-- 5. DELIVERY SCHEDULING
CREATE TABLE IF NOT EXISTS delivery_slots (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity >= 0),
    booked_count INTEGER NOT NULL DEFAULT 0 CHECK (booked_count >= 0 AND booked_count <= capacity),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(date, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS slot_reservations (
    id BIGSERIAL PRIMARY KEY,
    delivery_slot_id BIGINT NOT NULL REFERENCES delivery_slots(id) ON DELETE CASCADE,
    order_id BIGINT UNIQUE REFERENCES orders(id) ON DELETE CASCADE, -- Null until checkout completes
    session_id TEXT NOT NULL,
    status reservation_status NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_attempts (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status delivery_status NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    driver_notes TEXT,
    proof_of_delivery_url TEXT
);

-- 6. ORDER STATE & REFUNDS
CREATE TABLE IF NOT EXISTS order_state_transitions (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    from_status TEXT, -- Using TEXT to support arbitrary legacy values during transition
    to_status TEXT NOT NULL,
    reason TEXT,
    changed_by_user_id TEXT, -- Who made the change (admin ID, system, etc)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES payments(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    stripe_refund_id TEXT UNIQUE,
    status refund_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 7. WEBHOOKS / IDEMPOTENCY
CREATE TABLE IF NOT EXISTS webhook_events (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT NOT NULL, -- e.g., 'stripe'
    provider_event_id TEXT NOT NULL UNIQUE, -- Stripe's evt_... ID
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status webhook_status NOT NULL DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- INDEXES (for high-frequency queries)
CREATE INDEX IF NOT EXISTS idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_expires ON inventory_reservations(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_session ON inventory_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_carts_customer_id ON carts(customer_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_slot_reservations_expires ON slot_reservations(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_order_id ON delivery_attempts(order_id);
CREATE INDEX IF NOT EXISTS idx_order_transitions_order_id ON order_state_transitions(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status) WHERE status = 'pending';
