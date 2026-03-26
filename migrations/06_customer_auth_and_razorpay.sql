ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
    ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
    ON orders(razorpay_order_id)
    WHERE razorpay_order_id IS NOT NULL;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
    ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
    ADD COLUMN IF NOT EXISTS signature TEXT,
    ADD COLUMN IF NOT EXISTS method TEXT,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT;

UPDATE payments
SET provider = COALESCE(provider, 'stripe');

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_payment_id
    ON payments(provider_payment_id)
    WHERE provider_payment_id IS NOT NULL;
