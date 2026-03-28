ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE addresses
    ADD COLUMN IF NOT EXISTS label TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_default_per_customer
    ON addresses(customer_id)
    WHERE customer_id IS NOT NULL AND is_default = TRUE;
