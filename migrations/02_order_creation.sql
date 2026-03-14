ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS cart_id BIGINT,
    ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10, 2);

UPDATE orders
SET subtotal_amount = total_amount
WHERE subtotal_amount IS NULL;

ALTER TABLE orders
    ALTER COLUMN subtotal_amount SET NOT NULL;

ALTER TABLE orders
    ALTER COLUMN shipping_address_json DROP NOT NULL;

ALTER TABLE orders
    ALTER COLUMN stripe_payment_intent_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_orders_cart_id'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT fk_orders_cart_id
            FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_cart_id ON orders(cart_id);
