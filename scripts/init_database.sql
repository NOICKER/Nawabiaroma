\set ON_ERROR_STOP on

\echo Applying baseline schema
\ir ../models/schema.sql

\echo Applying migration 01_ecommerce_infrastructure.sql
\ir ../migrations/01_ecommerce_infrastructure.sql

\echo Applying migration 02_order_creation.sql
\ir ../migrations/02_order_creation.sql

\echo Applying migration 03_addresses_session_support.sql
\ir ../migrations/03_addresses_session_support.sql

\echo Applying migration 04_orders_address_support.sql
\ir ../migrations/04_orders_address_support.sql

\echo Applying migration 05_order_status_system.sql
\ir ../migrations/05_order_status_system.sql

\echo Applying migration 06_customer_auth_and_razorpay.sql
\ir ../migrations/06_customer_auth_and_razorpay.sql

\echo Applying migration 07_production_safety.sql
\ir ../migrations/07_production_safety.sql
