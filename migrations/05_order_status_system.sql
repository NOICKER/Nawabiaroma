DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'order_status'
    ) AND NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'order_status_new'
    ) THEN
        CREATE TYPE order_status_new AS ENUM (
            'draft',
            'awaiting_payment',
            'paid',
            'failed_payment',
            'cancelled',
            'processing',
            'shipped',
            'delivered'
        );
    END IF;
END $$;

UPDATE orders
SET status = 'awaiting_payment'
WHERE status::text = 'pending';

ALTER TABLE orders
    ALTER COLUMN status DROP DEFAULT;

ALTER TABLE orders
    ALTER COLUMN status TYPE order_status_new
    USING (
        CASE
            WHEN status::text = 'pending' THEN 'awaiting_payment'
            ELSE status::text
        END
    )::order_status_new;

ALTER TABLE orders
    ALTER COLUMN status SET DEFAULT 'awaiting_payment';

DROP TYPE IF EXISTS order_status;

ALTER TYPE order_status_new RENAME TO order_status;
