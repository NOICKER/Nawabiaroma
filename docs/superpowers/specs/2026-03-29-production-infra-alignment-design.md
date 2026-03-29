# Production Infra Alignment Design

Date: 2026-03-29
Project: Nawabi Aroma
Scope: Align the existing codebase with the finalized production infrastructure without changing the chosen platform architecture.

## Goal

Prepare the current React/Vite frontend and Node/Express backend to run cleanly on:

- Frontend: Cloudflare Pages
- Backend: Railway
- Database: Supabase PostgreSQL
- Storage: Cloudflare R2
- CDN/DNS: Cloudflare
- Payments: Razorpay
- Email: Resend

The implementation must preserve the existing Node/Express backend, keep PostgreSQL as the source of truth, and avoid unnecessary architectural changes.

## Current State Summary

The codebase already includes:

- a Vite frontend with `VITE_API_BASE_URL`
- a TypeScript Express backend that builds to `dist/server/index.js`
- Supabase-compatible Postgres connection handling
- Razorpay order creation and webhook/payment verification
- Resend-based order confirmation emails
- S3-compatible storage code used for product images

The main gaps relative to the finalized infrastructure are:

- environment variable naming is still AWS/S3-oriented instead of R2-oriented
- upload handling is product-image specific rather than a generalized media flow
- article cover images are manual URL fields instead of uploaded media
- there is no dedicated `media` table for cross-entity asset tracking
- deletion cleanup is incomplete for product/article lifecycle events
- the webhook route path does not match the finalized `/api/webhooks/razorpay` endpoint

## Recommended Implementation Strategy

Use a compatibility-first migration:

1. Add new production-facing configuration and APIs.
2. Keep existing product image behavior operational while moving it onto the new media model.
3. Migrate article image handling to the same upload pipeline.
4. Add deletion cleanup for media records and R2 objects.

This approach minimizes regression risk while still producing the desired final deployment model.

## Backend Design

### 1. Environment Configuration

Backend configuration will support the finalized variable names:

- `DATABASE_URL`
- `DATABASE_POOLER_URL`
- `JWT_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`
- `CORS_ORIGIN`

Compatibility rules:

- Existing database resolution logic will continue to support the current direct/pooler model, but it will accept `DATABASE_POOLER_URL` as the canonical pooled connection alias.
- Existing S3/AWS-oriented storage config will be migrated to R2-specific names while preserving the same S3-compatible client behavior.

### 2. Generalized Media Storage Service

The storage service will be generalized around R2:

- generate presigned `PUT` URLs
- validate allowed content types
- enforce a maximum upload size contract at API level
- generate object keys by entity type and timestamp
- expose helpers for:
  - create upload URL
  - derive object key from public URL or record
  - delete object by `object_key`

Supported entity types:

- `product`
- `article`
- `page`

Allowed upload content types:

- `image/jpeg`
- `image/png`
- `image/webp`

The final API will be:

- `POST /api/admin/media/upload-url`

Request body:

- `filename`
- `contentType`
- `entityType`
- optional `entityId`

Response body:

- `uploadUrl`
- `publicUrl`
- `objectKey`
- `expiresInSeconds`

### 3. Media Table

Add a new `media` table with:

- `id`
- `object_key`
- `public_url`
- `entity_type`
- `entity_id`
- `alt_text`
- `created_at`

Design decisions:

- `object_key` is the durable deletion handle
- `public_url` is stored for frontend rendering
- `entity_type + entity_id` provide lightweight polymorphic association
- the table is used for both product and article media

The existing `product_images` table will remain for product gallery ordering and primary-image behavior. Product image records will additionally map to `media` rows so object lifecycle is centrally tracked.

### 4. Media Persistence Flow

The final upload flow will be:

1. Admin requests upload URL from backend.
2. Backend validates admin auth and upload metadata.
3. Backend returns presigned R2 `PUT` URL plus public URL and object key.
4. Frontend uploads directly to R2.
5. Frontend calls the relevant backend mutation to save the entity record.
6. Backend writes:
   - entity-level record (`product_images` or article `cover_image_url`)
   - `media` record with `object_key` and `public_url`

### 5. Media Deletion Rules

When a product image is deleted:

- remove `product_images` row
- remove linked `media` row
- delete R2 object by `object_key`

When a product is deleted:

- fetch all linked product image/media rows first
- delete product-related media records
- delete all corresponding R2 objects
- then delete the product row

When an article is deleted:

- remove article-linked media records
- delete corresponding R2 objects
- then delete the article row

If an article cover image is replaced:

- create the new media record
- update `cover_image_url`
- best effort delete the previous media record/object if it belonged to managed storage

### 6. CORS and Security

Production CORS will allow only:

- `https://www.nawabiaroma.com`
- `https://nawabiaroma.com`

Other security requirements:

- admin routes remain protected by JWT auth
- upload URL generation requires admin auth
- only JPEG/PNG/WEBP are accepted
- upload payload includes a file size limit contract of 5 MB
- secrets remain backend-only

The frontend will never receive:

- database credentials
- Resend key
- Razorpay secret
- R2 secret credentials
- webhook secret

### 7. Razorpay and Webhooks

Existing payment logic is mostly usable and will be aligned to the final route contract.

Required finalized routes:

- create order / checkout route remains in current checkout flow
- verify payment remains in current order creation flow
- webhook endpoint becomes `POST /api/webhooks/razorpay`

Webhook behavior:

- verify Razorpay signature against raw request body
- deduplicate event processing through `webhook_events`
- on `payment.captured`:
  - create/update order
  - insert payment record
  - decrement inventory
  - send payment/order confirmation email

### 8. Email Templates

Resend support will be expanded into explicit template builders for:

- order confirmation
- COD confirmation
- payment success
- shipping notification placeholder

The implementation will keep the current send path but separate template generation so future shipping notifications can be added without reworking order logic.

### 9. Logging

Structured logging will be kept and extended for:

- media upload URL creation
- media persistence
- media deletion
- Razorpay webhook receipt and processing
- order creation
- email send success/failure
- errors and validation failures

## Frontend Design

### 1. Frontend Environment

Frontend configuration will rely on:

- `VITE_API_BASE_URL=https://api.nawabiaroma.com`
- `VITE_RAZORPAY_KEY_ID=...`

The app already centralizes API URL generation through `buildApiUrl`, so the main work is making Razorpay key usage explicit and consistent.

### 2. Product Admin Upload UX

The current product admin screen already uploads via a presigned URL flow. It will be updated to:

- call `/api/admin/media/upload-url`
- pass `entityType: 'product'`
- upload only supported file types
- include client-side size validation for 5 MB
- save the returned public URL/object metadata through the product image mutation path

### 3. Article Admin Upload UX

The article admin screen will move from manual URL entry to managed upload:

- add upload button/input
- call `/api/admin/media/upload-url` with `entityType: 'article'`
- upload directly to R2
- save returned public URL as `coverImageUrl`
- create linked `media` row on the backend

The manual URL text field will be removed or demoted to a fallback only if needed for backward compatibility.

## Data Model Impact

New database objects:

- `media` table
- supporting indexes on:
  - `entity_type, entity_id`
  - `object_key`

Existing tables reused:

- `product_images`
- `articles`
- `orders`
- `payments`
- `webhook_events`

No major schema rewrite is required.

## Testing Strategy

Tests will be added before implementation for:

- env parsing for new database/R2 aliases
- upload URL validation behavior
- media deletion behavior
- webhook route path and signature handling

Verification after implementation:

- backend TypeScript build
- frontend Vite build
- existing tests
- targeted new tests

## Rollout Order

1. Add failing tests for env/media behavior.
2. Add new migration for `media`.
3. Update env parsing/config aliases.
4. Implement generalized R2 media service and admin upload route.
5. Add backend media persistence/deletion logic.
6. Update product admin upload flow.
7. Update article admin upload flow.
8. Align webhook route path.
9. Expand email templates and logging.
10. Run builds/tests and verify.

## Risks and Mitigations

### Risk: Breaking existing product image behavior

Mitigation:

- keep `product_images` intact
- layer `media` support beside it
- only remove old assumptions after tests/builds pass

### Risk: Orphaned R2 objects during partial failures

Mitigation:

- store `object_key`
- perform DB lookup before destructive actions
- treat object deletion as best effort when DB state has already been committed
- log cleanup failures for manual follow-up

### Risk: Admin article workflow regressions

Mitigation:

- preserve current article CRUD while replacing only the cover image input path
- keep `cover_image_url` as the rendered field to avoid frontend ripple effects

## Out of Scope

- changing deployment platforms
- rewriting backend to serverless
- adding background job queues
- introducing image resizing/transformation services
- redesigning checkout or order flows

## Success Criteria

The work is successful when:

- production env variables map cleanly to Railway, Supabase, R2, Razorpay, and Resend
- admin users can upload product and article images directly to R2
- uploaded media is tracked in Postgres through a dedicated `media` table
- deleting products/articles cleans up related DB records and R2 objects
- webhook route matches `/api/webhooks/razorpay`
- frontend and backend production builds succeed
- no secrets are exposed to the browser
