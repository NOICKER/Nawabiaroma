-- 10_decouple_order_items.sql

-- 1. Add static columns to order_items
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS product_name TEXT,
ADD COLUMN IF NOT EXISTS variant_label TEXT,
ADD COLUMN IF NOT EXISTS sku TEXT;

-- 2. Backfill existing order_items
UPDATE order_items oi
SET 
    product_name = p.name,
    variant_label = pv.size_label,
    sku = pv.sku
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE oi.product_variant_id = pv.id
  AND oi.product_name IS NULL;

-- 3. Make column NOT NULL after backfill (assuming we only want new records to require them)
-- Wait, we might have some dead references. Best to just leave as NOT NULL if possible for new ones.
-- We will just make them NOT NULL but use a default for any weird edge cases or just set NOT NULL.
-- Since the backfill covers all, we can enforce NOT NULL:
ALTER TABLE order_items ALTER COLUMN product_name SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN variant_label SET NOT NULL;
ALTER TABLE order_items ALTER COLUMN sku SET NOT NULL;

-- 4. Relax the foreign key on order_items
ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_product_variant_id_fkey;
ALTER TABLE order_items ALTER COLUMN product_variant_id DROP NOT NULL;
ALTER TABLE order_items ADD CONSTRAINT order_items_product_variant_id_fkey 
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE SET NULL;

-- 5. Relax the foreign key on cart_items to ON DELETE CASCADE
ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_product_variant_id_fkey;
ALTER TABLE cart_items ADD CONSTRAINT cart_items_product_variant_id_fkey 
    FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) ON DELETE CASCADE;
