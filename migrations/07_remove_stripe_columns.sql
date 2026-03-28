-- Migration: 07_remove_stripe_columns
-- Description: Removes legacy Stripe columns to transition completely to Razorpay
-- Generated to align database with code removal of Stripe integration

ALTER TABLE customers DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE orders DROP COLUMN IF EXISTS stripe_payment_intent_id;
ALTER TABLE payments DROP COLUMN IF EXISTS stripe_charge_id;
