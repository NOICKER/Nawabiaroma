CREATE TABLE IF NOT EXISTS wishlists (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id BIGINT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate variants from being saved by the same customer
CREATE UNIQUE INDEX IF NOT EXISTS unique_wishlist_customer_variant ON wishlists(customer_id, variant_id);
