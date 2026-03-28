DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'product_variants_stock_quantity_nonnegative'
    ) THEN
        ALTER TABLE product_variants
            ADD CONSTRAINT product_variants_stock_quantity_nonnegative
            CHECK (stock_quantity >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_subtotal_amount_nonnegative'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_subtotal_amount_nonnegative
            CHECK (subtotal_amount >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_total_amount_nonnegative'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_total_amount_nonnegative
            CHECK (total_amount >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'orders'
          AND column_name = 'payment_method'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'orders_payment_method_valid'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT orders_payment_method_valid
            CHECK (payment_method IS NULL OR payment_method IN ('online', 'cod'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payments_amount_positive'
    ) THEN
        ALTER TABLE payments
            ADD CONSTRAINT payments_amount_positive
            CHECK (amount > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'promo_codes_min_order_amount_nonnegative'
    ) THEN
        ALTER TABLE promo_codes
            ADD CONSTRAINT promo_codes_min_order_amount_nonnegative
            CHECK (min_order_amount IS NULL OR min_order_amount >= 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'promo_codes_max_uses_positive'
    ) THEN
        ALTER TABLE promo_codes
            ADD CONSTRAINT promo_codes_max_uses_positive
            CHECK (max_uses IS NULL OR max_uses > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'promo_codes_times_used_nonnegative'
    ) THEN
        ALTER TABLE promo_codes
            ADD CONSTRAINT promo_codes_times_used_nonnegative
            CHECK (times_used >= 0);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_order_created_at
    ON payments(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_provider_order_id
    ON payments(provider, provider_order_id)
    WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_cart_id_unique
    ON orders(cart_id)
    WHERE cart_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_carts_expires_at
    ON carts(expires_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_inventory_id
    ON inventory_reservations(inventory_id)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_promo_codes_lookup
    ON promo_codes(code, expires_at)
    WHERE is_active = TRUE;
