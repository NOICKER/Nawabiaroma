CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'expire-abandoned-carts',
    '*/10 * * * *',
    $$
    UPDATE carts
    SET status = 'abandoned',
        updated_at = NOW()
    WHERE status = 'active'
      AND expires_at <= NOW();
    $$
);

SELECT cron.schedule(
    'expire-inventory-reservations',
    '*/2 * * * *',
    $$
    WITH expired_reservations AS (
        UPDATE inventory_reservations
        SET status = 'expired'
        WHERE status = 'active'
          AND expires_at <= NOW()
        RETURNING inventory_id, quantity
    ),
    released_inventory AS (
        SELECT inventory_id, SUM(quantity) AS quantity_to_release
        FROM expired_reservations
        GROUP BY inventory_id
    )
    UPDATE inventory AS i
    SET quantity_allocated = GREATEST(i.quantity_allocated - released_inventory.quantity_to_release, 0)
    FROM released_inventory
    WHERE i.id = released_inventory.inventory_id;
    $$
);
