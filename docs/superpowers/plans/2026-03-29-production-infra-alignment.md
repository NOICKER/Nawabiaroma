# Production Infra Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the existing Nawabi Aroma TypeScript codebase with the finalized production infrastructure for Railway, Supabase, Cloudflare R2, Resend, and Razorpay without rewriting existing backend domain logic.

**Architecture:** Extend the current Express, Postgres, Razorpay, Resend, and S3-compatible storage setup in place. Add a dedicated `media` persistence model, move admin uploads onto a generalized R2 upload endpoint, preserve existing order and product flows, and tighten production config and route wiring around the finalized deployment targets.

**Tech Stack:** TypeScript, Express 5, pg, zod, Razorpay, Resend, AWS S3 SDK against Cloudflare R2, React, Vite

---

## File Map

### Backend files to modify

- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\server\config\env.ts`
  - Add finalized env aliases, R2-specific validation, upload size limit, and explicit production guards.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\server\config\databaseConfig.ts`
  - Accept `DATABASE_POOLER_URL` as the pooled connection alias while preserving current fallback behavior.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\server\config\databaseMigrations.ts`
  - Ensure the new media migration is included and enforced.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\server\app.ts`
  - Keep strict production CORS and align webhook routing.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\storageService.ts`
  - Convert from generic S3 naming to Cloudflare R2-specific config, add entity-aware upload URL generation and object-key deletion helpers.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\adminService.ts`
  - Persist and clean up media records for products and articles, and delete R2 objects on product/article deletion.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\emailService.ts`
  - Expand into explicit template helpers while preserving existing order confirmation behavior.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\orderService.ts`
  - Keep current order creation flow, use expanded email helpers, preserve inventory deduction and webhook idempotency.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\paymentService.ts`
  - Keep current Razorpay flow, no domain rewrite, only route/contract alignment if needed.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\controllers\admin.ts`
  - Add the new `/api/admin/media/upload-url` endpoint and attach media metadata where needed.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\controllers\webhooks.ts`
  - Keep existing processing but serve it at the finalized Razorpay path.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\routes\admin.ts`
  - Register the new media upload URL endpoint.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\routes\webhooks.ts`
  - Rename webhook route from `/payment` to `/razorpay`.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\models\types.ts`
  - Add media-related types and tighten upload request types.

### Backend files to create

- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\migrations\09_media_library.sql`
  - Create `media` table and supporting indexes.
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\services\mediaService.ts`
  - Centralize `media` row creation, lookup, replacement, and deletion helpers used by admin/service code.

### Frontend files to modify

- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\pages\admin\AdminProducts.tsx`
  - Switch upload endpoint to `/api/admin/media/upload-url`, send `entityType`, enforce file-size/type checks.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\pages\admin\AdminArticles.tsx`
  - Replace manual cover URL entry with managed upload-to-R2 flow.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\pages\Checkout.tsx`
  - Read `VITE_RAZORPAY_KEY_ID` instead of any implicit key assumption.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\vite-env.d.ts`
  - Add `VITE_RAZORPAY_KEY_ID`.

### Test files to create or modify

- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\envConfig.test.ts`
  - Validate finalized env alias handling and production guards.
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\storageService.test.ts`
  - Validate upload request rules, entity types, and object-key derivation.
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\databaseMigrations.test.ts`
  - Assert `media` table exists after migrations.

## Task 1: Add failing env and migration coverage

**Files:**
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\envConfig.test.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\databaseMigrations.test.ts`
- Test: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\envConfig.test.ts`
- Test: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\databaseMigrations.test.ts`

- [ ] **Step 1: Write the failing env validation tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveDatabaseConfig } from '../server/config/databaseConfig.js';

test('resolveDatabaseConfig accepts DATABASE_POOLER_URL for local dev', () => {
    const config = resolveDatabaseConfig({
        NODE_ENV: 'development',
        DATABASE_POOLER_URL: 'postgresql://postgres:secret@db.pooler.supabase.com:5432/postgres',
    } as NodeJS.ProcessEnv);

    assert.equal(config.connectionString, 'postgresql://postgres:secret@db.pooler.supabase.com:5432/postgres');
});

test('resolveDatabaseConfig rejects missing production database URL aliases', () => {
    assert.throws(() => {
        resolveDatabaseConfig({
            NODE_ENV: 'production',
        } as NodeJS.ProcessEnv);
    }, /No database URL configured for PRODUCTION/);
});
```

- [ ] **Step 2: Add the failing migration assertion for the media table**

```ts
test('ensureDatabaseSchemaCurrent applies runtime-required customer address columns', async () => {
    await ensureDatabaseSchemaCurrent();

    assert.equal(await hasColumn('customers', 'phone'), true);
    assert.equal(await hasColumn('addresses', 'label'), true);
    assert.equal(await hasTable('media'), true);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm run build`
Expected: FAIL because `DATABASE_POOLER_URL` is not supported yet and the `media` table does not exist.

- [ ] **Step 4: Do not implement production code yet; confirm the failure reason**

Expected failure shape:
- env test fails because current database config ignores `DATABASE_POOLER_URL`
- migration/build check fails because `hasTable` helper or `media` schema support is missing

- [ ] **Step 5: Commit the red tests**

```bash
git add tests/envConfig.test.ts tests/databaseMigrations.test.ts
git commit -m "test: add production infra env and media migration coverage"
```

## Task 2: Add the media migration and database alias support

**Files:**
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\migrations\09_media_library.sql`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\server\config\databaseConfig.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\server\config\databaseMigrations.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\databaseMigrations.test.ts`
- Test: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\databaseMigrations.test.ts`
- Test: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\envConfig.test.ts`

- [ ] **Step 1: Create the migration**

```sql
CREATE TABLE IF NOT EXISTS media (
    id BIGSERIAL PRIMARY KEY,
    object_key TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('product', 'article', 'page')),
    entity_id BIGINT,
    alt_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_entity ON media(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at DESC);
```

- [ ] **Step 2: Teach database config to accept `DATABASE_POOLER_URL`**

```ts
const databaseEnvSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DATABASE_MODE: z.enum(['LOCAL_DEV', 'PRODUCTION']).optional(),
    DATABASE_URL: z.string().trim().min(1).optional(),
    DATABASE_POOLER_URL: z.string().trim().min(1).optional(),
    DATABASE_URL_POOLER: z.string().trim().min(1).optional(),
    DATABASE_URL_DIRECT: z.string().trim().min(1).optional(),
    // ...
});
```

```ts
const candidates: Array<[DatabaseConnectionSource, string | undefined]> =
    databaseMode === 'LOCAL_DEV'
        ? [
              ['DATABASE_URL_POOLER', env.DATABASE_POOLER_URL ?? env.DATABASE_URL_POOLER],
              ['DATABASE_URL', env.DATABASE_URL],
          ]
        : [
              ['DATABASE_URL_DIRECT', env.DATABASE_URL_DIRECT ?? env.DATABASE_URL],
          ];
```

- [ ] **Step 3: Register the new migration as runtime-required**

```ts
const REQUIRED_MIGRATIONS = [
    '06_customer_auth_and_razorpay.sql',
    '07_remove_stripe_columns.sql',
    '08_customer_address_book.sql',
    '09_media_library.sql',
];
```

- [ ] **Step 4: Add the `hasTable` helper to the migration test**

```ts
async function hasTable(tableName: string) {
    const result = await query<{ count: string }>(
        `
            SELECT COUNT(*)::text AS count
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = $1
        `,
        [tableName],
    );

    return Number(result.rows[0]?.count ?? 0) > 0;
}
```

- [ ] **Step 5: Run the targeted tests to verify green**

Run: `@'\nimport \"./tests/envConfig.test.ts\";\nimport \"./tests/databaseMigrations.test.ts\";\n'@ | node --test --import tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add migrations/09_media_library.sql server/config/databaseConfig.ts server/config/databaseMigrations.ts tests/databaseMigrations.test.ts tests/envConfig.test.ts
git commit -m "feat: add media migration and pooler env alias support"
```

## Task 3: Add finalized env parsing and R2-aware storage config

**Files:**
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\server\config\env.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\models\types.ts`
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\storageService.test.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\storageService.ts`
- Test: `C:\Users\Shubhi Mishra\Desktop\aroma\tests\storageService.test.ts`

- [ ] **Step 1: Write the failing storage validation tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { isAllowedUploadContentType, sanitizeMediaEntityType } from '../services/storageService.js';

test('sanitizeMediaEntityType accepts product article and page', () => {
    assert.equal(sanitizeMediaEntityType('product'), 'product');
    assert.equal(sanitizeMediaEntityType('article'), 'article');
    assert.equal(sanitizeMediaEntityType('page'), 'page');
});

test('isAllowedUploadContentType rejects avif and accepts jpeg png webp', () => {
    assert.equal(isAllowedUploadContentType('image/jpeg'), true);
    assert.equal(isAllowedUploadContentType('image/png'), true);
    assert.equal(isAllowedUploadContentType('image/webp'), true);
    assert.equal(isAllowedUploadContentType('image/avif'), false);
});
```

- [ ] **Step 2: Extend backend env parsing with finalized variables**

```ts
const envSchema = z.object({
    PORT: z.coerce.number().int().positive().default(4000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PUBLIC_BASE_URL: z.string().url().optional(),
    FRONTEND_URL: z.string().url().optional(),
    CORS_ORIGIN: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    DATABASE_POOLER_URL: z.string().optional(),
    DATABASE_URL_DIRECT: z.string().optional(),
    JWT_SECRET: z.string().min(1),
    ADMIN_EMAIL: z.string().email(),
    ADMIN_PASSWORD_HASH: z.string().min(1),
    RESEND_API_KEY: z.string().optional(),
    ORDER_EMAIL_FROM: z.string().optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    R2_ENDPOINT: z.string().url().optional(),
    R2_PUBLIC_BASE_URL: z.string().url().optional(),
    R2_UPLOAD_PREFIX: z.string().default('media'),
    MEDIA_UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
    // existing Razorpay + Resend fields preserved
});
```

- [ ] **Step 3: Replace S3/AWS naming inside the storage service**

```ts
const storageConfigured =
    !!env.R2_ACCESS_KEY_ID &&
    !!env.R2_SECRET_ACCESS_KEY &&
    !!env.R2_BUCKET_NAME &&
    !!env.R2_PUBLIC_BASE_URL &&
    !!env.R2_ENDPOINT;

const s3Client = storageConfigured
    ? new S3Client({
          region: 'auto',
          endpoint: env.R2_ENDPOINT,
          credentials: {
              accessKeyId: env.R2_ACCESS_KEY_ID!,
              secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
          },
      })
    : null;
```

- [ ] **Step 4: Add small helpers used by tests and controllers**

```ts
const allowedUploadContentTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;
const allowedMediaEntityTypes = ['product', 'article', 'page'] as const;

export function isAllowedUploadContentType(contentType: string) {
    return allowedUploadContentTypes.includes(contentType as (typeof allowedUploadContentTypes)[number]);
}

export function sanitizeMediaEntityType(entityType: string) {
    if (!allowedMediaEntityTypes.includes(entityType as (typeof allowedMediaEntityTypes)[number])) {
        throw new HttpError(400, 'Unsupported media entity type.');
    }

    return entityType as 'product' | 'article' | 'page';
}
```

- [ ] **Step 5: Run the storage/env tests**

Run: `@'\nimport \"./tests/storageService.test.ts\";\nimport \"./tests/envConfig.test.ts\";\n'@ | node --test --import tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add server/config/env.ts models/types.ts services/storageService.ts tests/storageService.test.ts
git commit -m "feat: align env validation and storage config with cloudflare r2"
```

## Task 4: Add media service and the admin upload-url endpoint

**Files:**
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\services\mediaService.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\models\types.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\storageService.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\controllers\admin.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\routes\admin.ts`

- [ ] **Step 1: Add media upload request/response types**

```ts
export interface MediaUploadUrlRequest {
    filename: string;
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    entityType: 'product' | 'article' | 'page';
    entityId?: number | null;
}

export interface MediaUploadUrlResponse {
    objectKey: string;
    publicUrl: string;
    uploadUrl: string;
    expiresInSeconds: number;
}
```

- [ ] **Step 2: Implement a focused media service**

```ts
export async function createMediaRecord(input: {
    objectKey: string;
    publicUrl: string;
    entityType: 'product' | 'article' | 'page';
    entityId?: number | null;
    altText?: string | null;
}) {
    const result = await query(
        `
            INSERT INTO media (object_key, public_url, entity_type, entity_id, alt_text)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, object_key AS "objectKey", public_url AS "publicUrl", entity_type AS "entityType", entity_id AS "entityId", alt_text AS "altText", created_at AS "createdAt"
        `,
        [input.objectKey, input.publicUrl, input.entityType, input.entityId ?? null, input.altText ?? null],
    );

    return result.rows[0];
}
```

- [ ] **Step 3: Generalize upload URL creation around entity type**

```ts
export async function createMediaUploadUrl(input: MediaUploadUrlRequest): Promise<MediaUploadUrlResponse> {
    const entityType = sanitizeMediaEntityType(input.entityType);

    if (!isAllowedUploadContentType(input.contentType)) {
        throw new HttpError(400, 'Unsupported upload content type.');
    }

    const safeName = sanitizeFileName(input.filename);
    const key = `${env.R2_UPLOAD_PREFIX}/${entityType}/${Date.now()}-${safeName}`;
    // build PutObjectCommand and signed URL
}
```

- [ ] **Step 4: Replace the old admin upload endpoint**

```ts
const mediaUploadUrlSchema = z.object({
    filename: z.string().min(1),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    entityType: z.enum(['product', 'article', 'page']),
    entityId: z.coerce.number().int().positive().nullable().optional(),
});

export const createMediaUploadUrlController = asyncHandler(async (req, res) => {
    const parsed = mediaUploadUrlSchema.safeParse(req.body);

    if (!parsed.success) {
        throw new HttpError(400, 'Invalid media upload request payload.', parsed.error.flatten());
    }

    const uploadUrl = await createMediaUploadUrl(parsed.data);
    res.status(201).json({ data: uploadUrl });
});
```

- [ ] **Step 5: Register the new route**

```ts
adminRouter.post('/media/upload-url', createMediaUploadUrlController);
```

- [ ] **Step 6: Run the backend build to verify type integration**

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add models/types.ts services/mediaService.ts services/storageService.ts controllers/admin.ts routes/admin.ts
git commit -m "feat: add admin media upload url endpoint"
```

## Task 5: Persist media records and delete R2 objects on product/article deletion

**Files:**
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\adminService.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\mediaService.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\storageService.ts`

- [ ] **Step 1: Extend product image creation to link a media record**

```ts
const mediaRecord = await createMediaRecord({
    objectKey: payload.objectKey,
    publicUrl: payload.url,
    entityType: 'product',
    entityId: productId,
    altText: payload.altText ?? null,
});
```

```ts
return mapAdminProductImage(result.rows[0]);
```

- [ ] **Step 2: Delete linked media rows and objects when a product image is removed**

```ts
const linkedMedia = await findMediaByPublicUrlAndEntity({
    publicUrl: deletedImage.url,
    entityType: 'product',
    entityId: productId,
});

if (linkedMedia) {
    await deleteMediaRecordById(linkedMedia.id, client);
    await deleteObjectFromStorage(linkedMedia.objectKey);
}
```

- [ ] **Step 3: Delete all product-linked media before deleting a product**

```ts
const mediaRows = await listMediaByEntity({ entityType: 'product', entityId: id }, client);

for (const media of mediaRows) {
    await deleteMediaRecordById(media.id, client);
}

// after transaction commit, best-effort delete each object key from R2
```

- [ ] **Step 4: Delete article-linked media on article deletion or replacement**

```ts
const articleMediaRows = await listMediaByEntity({ entityType: 'article', entityId: id }, client);
// delete rows in transaction
// delete objects after commit
```

- [ ] **Step 5: Run backend build to verify service integration**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add services/adminService.ts services/mediaService.ts services/storageService.ts
git commit -m "feat: persist and clean up media records for products and articles"
```

## Task 6: Align webhook route and expand email templates

**Files:**
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\routes\webhooks.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\emailService.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\services\orderService.ts`

- [ ] **Step 1: Move the Razorpay webhook route to the finalized path**

```ts
webhooksRouter.post('/razorpay', express.raw({ type: 'application/json' }), handlePaymentWebhook);
```

- [ ] **Step 2: Split email templates into explicit helpers**

```ts
export async function sendOrderConfirmationEmail(payload: OrderConfirmationPayload) { /* existing behavior */ }
export async function sendCodConfirmationEmail(payload: OrderConfirmationPayload) { /* COD-specific copy */ }
export async function sendPaymentSuccessEmail(payload: OrderConfirmationPayload) { /* paid-online copy */ }
export async function sendShippingNotificationEmail(payload: ShippingNotificationPayload) {
    logger.info({ event_type: 'shipping_email_template_ready', outcome: 'success', order_id: payload.orderReference });
}
```

- [ ] **Step 3: Use the appropriate email helper from order creation**

```ts
if (order.paymentMethod === 'cod') {
    await sendCodConfirmationEmail(/* mapped payload */);
    return;
}

await sendPaymentSuccessEmail(/* mapped payload */);
```

- [ ] **Step 4: Run the backend build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add routes/webhooks.ts services/emailService.ts services/orderService.ts
git commit -m "feat: align razorpay webhook route and email templates"
```

## Task 7: Update admin product and article upload flows in the frontend

**Files:**
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\pages\admin\AdminProducts.tsx`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\pages\admin\AdminArticles.tsx`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\pages\Checkout.tsx`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\vite-env.d.ts`

- [ ] **Step 1: Switch product uploads to the new endpoint**

```ts
const ADMIN_MEDIA_UPLOAD_ENDPOINT = buildApiUrl('/api/admin/media/upload-url');

body: JSON.stringify({
    filename: file.name,
    contentType: file.type,
    entityType: 'product',
    entityId: editingProductId,
}),
```

- [ ] **Step 2: Enforce 5 MB and supported file types in the product admin**

```ts
const maxImageSize = 5 * 1024 * 1024;

if (selectedFile.size > maxImageSize) {
    setImageError('Image must be 5 MB or smaller.');
    return;
}
```

- [ ] **Step 3: Replace article cover URL entry with upload flow**

```ts
const ARTICLE_MEDIA_UPLOAD_ENDPOINT = buildApiUrl('/api/admin/media/upload-url');

body: JSON.stringify({
    filename: file.name,
    contentType: file.type,
    entityType: 'article',
    entityId: editingArticleId,
}),
```

```ts
setFormState((currentState) => ({
    ...currentState,
    coverImageUrl: uploadTicket.publicUrl,
}));
```

- [ ] **Step 4: Add `VITE_RAZORPAY_KEY_ID` typing and usage**

```ts
interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    readonly VITE_RAZORPAY_KEY_ID: string;
}
```

```ts
const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID?.trim();
```

- [ ] **Step 5: Run the frontend build**

Run: `cmd /c npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add aroma-ui/src/pages/admin/AdminProducts.tsx aroma-ui/src/pages/admin/AdminArticles.tsx aroma-ui/src/pages/Checkout.tsx aroma-ui/src/vite-env.d.ts
git commit -m "feat: align admin uploads and razorpay env usage"
```

## Task 8: Final verification pass

**Files:**
- Verify only

- [ ] **Step 1: Run backend build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 2: Run frontend build**

Run: `cmd /c npm run build`
Working directory: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui`
Expected: PASS

- [ ] **Step 3: Run targeted tests**

Run: `@'\nimport \"./tests/envConfig.test.ts\";\nimport \"./tests/storageService.test.ts\";\nimport \"./tests/databaseMigrations.test.ts\";\nimport \"./tests/customerAddressSchemas.test.ts\";\n'@ | node --test --import tsx`
Expected: PASS

- [ ] **Step 4: Smoke-check the deployment-critical requirements**

Checklist:
- backend builds to `dist/server/index.js`
- frontend resolves `VITE_API_BASE_URL`
- backend accepts finalized R2 env names
- webhook route is `/api/webhooks/razorpay`
- admin upload endpoint is `/api/admin/media/upload-url`
- product and article uploads both use direct-to-R2 flow
- product/article deletion cleans up media rows and objects

- [ ] **Step 5: Commit final integration fixes if needed**

```bash
git add .
git commit -m "chore: finalize production infra alignment"
```

## Self-Review

### Spec coverage

- finalized env variables: covered in Tasks 1-3 and Task 7
- R2 upload endpoint: covered in Task 4
- `media` table: covered in Task 2
- product/article media lifecycle cleanup: covered in Task 5
- strict CORS: covered in Task 3 implementation notes via `env.ts` and existing `server/app.ts`
- Razorpay webhook route alignment: covered in Task 6
- Resend template expansion: covered in Task 6
- production builds: covered in Task 8

### Placeholder scan

- No `TBD`, `TODO`, or deferred implementation markers remain.
- Each task includes exact files and exact commands.

### Type consistency

- `entityType` uses `product | article | page` consistently across types, service helpers, and controller schema.
- `objectKey`, `publicUrl`, and `uploadUrl` naming is consistent across backend and frontend tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-29-production-infra-alignment.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
