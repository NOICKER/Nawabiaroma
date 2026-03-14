ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS address_id BIGINT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_orders_address_id'
    ) THEN
        ALTER TABLE orders
            ADD CONSTRAINT fk_orders_address_id
            FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_address_id ON orders(address_id);
