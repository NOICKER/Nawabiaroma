# Secure Admin Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single env-based admin login with a database-backed admin system that supports secure first-admin bootstrap, protected `/admin/*` routing, and easy creation of future admins.

**Architecture:** Keep the current Express + JWT admin API model, but move admin identity into PostgreSQL. Gate the first-admin bootstrap behind a server-only `ADMIN_BOOTSTRAP_SECRET`, keep frontend route redirects through `AdminRoute`, and reduce privileged token persistence from `localStorage` to `sessionStorage`.

**Tech Stack:** TypeScript, Express 5, PostgreSQL, Argon2, JWT, React 19, React Router 7, Vite, node:test

---

### Task 1: Add Admin Schema And Environment Contract

**Files:**
- Create: `migrations/09_admin_bootstrap.sql`
- Modify: `models/schema.sql`
- Modify: `scripts/init_database.sql`
- Modify: `server/config/databaseMigrations.ts`
- Modify: `server/config/env.ts`
- Modify: `.env.example`
- Test: `tests/databaseMigrations.test.ts`
- Test: `tests/envConfig.test.ts`

- [ ] **Step 1: Extend the migration coverage first**

Add assertions for the new admin schema and the new env contract.

```ts
// tests/databaseMigrations.test.ts
assert.equal(await hasColumn('admins', 'email'), true);
assert.equal(await hasColumn('admins', 'password_hash'), true);
assert.equal(await hasColumn('admins', 'last_login_at'), true);
```

```ts
// tests/envConfig.test.ts
test('env accepts ADMIN_BOOTSTRAP_SECRET without ADMIN_EMAIL/ADMIN_PASSWORD_HASH', async () => {
  process.env.ADMIN_BOOTSTRAP_SECRET = 'bootstrap-secret';
  // import env module in isolated context and assert no validation error
});
```

- [ ] **Step 2: Run the targeted tests and confirm they fail**

Run: `node --test tests/databaseMigrations.test.ts tests/envConfig.test.ts`

Expected:
- `databaseMigrations.test.ts` fails because `admins` does not exist
- `envConfig.test.ts` fails because `server/config/env.ts` still requires `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`

- [ ] **Step 3: Add the `admins` table to the baseline schema and migration path**

Add the new table to both the baseline schema and the forward migration.

```sql
CREATE TABLE IF NOT EXISTS admins (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    initials TEXT,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
```

Update:
- `models/schema.sql` so fresh databases get the table
- `migrations/09_admin_bootstrap.sql` so existing databases are upgraded
- `scripts/init_database.sql` so manual local init does not drift
- `server/config/databaseMigrations.ts` so `09_admin_bootstrap.sql` is recognized as a required runtime migration

- [ ] **Step 4: Replace env-based admin credentials with the bootstrap-secret contract**

Update `server/config/env.ts` and `.env.example`.

```ts
// server/config/env.ts
ADMIN_BOOTSTRAP_SECRET: z.string().min(1).optional(),
```

Remove:

```ts
ADMIN_EMAIL: z.string().email(),
ADMIN_PASSWORD_HASH: z.string().min(1),
```

Update `.env.example` to show:

```env
ADMIN_BOOTSTRAP_SECRET=replace-with-long-random-secret
```

- [ ] **Step 5: Re-run the targeted backend checks**

Run: `node --test tests/databaseMigrations.test.ts tests/envConfig.test.ts`

Expected: PASS

Run: `npm run build`

Expected: TypeScript build succeeds

- [ ] **Step 6: Commit the schema/env slice**

```bash
git add models/schema.sql migrations/09_admin_bootstrap.sql scripts/init_database.sql server/config/databaseMigrations.ts server/config/env.ts .env.example tests/databaseMigrations.test.ts tests/envConfig.test.ts
git commit -m "feat: add admin bootstrap schema and env contract"
```

### Task 2: Build Database-Backed Admin Auth On The Backend

**Files:**
- Create: `controllers/schemas/adminAuth.ts`
- Create: `services/adminAuthService.ts`
- Modify: `controllers/auth.ts`
- Modify: `routes/auth.ts`
- Modify: `models/types.ts`
- Test: `tests/adminAuthFlow.test.ts`

- [ ] **Step 1: Write backend auth tests before changing login behavior**

Cover:
- bootstrap succeeds when zero admins exist and the secret matches
- bootstrap fails when an admin already exists
- bootstrap fails when the secret is missing or wrong
- login succeeds with DB-backed credentials
- login fails for wrong password or inactive admin

```ts
test('bootstrap creates the first admin exactly once', async () => {
  // seed empty admins table
  // POST /api/auth/admin/bootstrap
  // assert token returned
  // assert row count becomes 1
});

test('login authenticates an existing admin from the database', async () => {
  // insert admin with Argon2 hash
  // POST /api/auth/admin/login
  // assert JWT payload role is admin
});
```

- [ ] **Step 2: Run the new backend auth tests and confirm they fail**

Run: `node --test tests/adminAuthFlow.test.ts`

Expected:
- route not found or controller mismatch because `/api/auth/admin/*` does not exist yet
- env-based login logic still blocks DB-backed auth

- [ ] **Step 3: Create a focused admin auth service**

Implement `services/adminAuthService.ts` with small, testable helpers:

```ts
export interface AdminProfile {
  id: number;
  email: string;
  initials: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export async function countAdmins(): Promise<number> {}
export async function createAdmin(input: CreateAdminInput): Promise<AdminProfile> {}
export async function loginAdmin(input: AdminLoginInput): Promise<string> {}
export async function listAdmins(): Promise<AdminProfile[]> {}
```

Use:
- lowercase normalization for email
- `hashPassword()` / `verifyPassword()` from `services/passwordService.ts`
- transactional creation for the first admin
- `jwt.sign(...)` with the existing `AuthTokenPayload`

- [ ] **Step 4: Split auth request validation into explicit schemas**

Create `controllers/schemas/adminAuth.ts`.

```ts
export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminBootstrapSchema = z.object({
  email: z.string().email(),
  initials: z.string().trim().min(1).max(8),
  password: z.string().min(8),
  bootstrapSecret: z.string().min(1),
});
```

- [ ] **Step 5: Replace the old env-based admin controller/routes**

Update `controllers/auth.ts` and `routes/auth.ts`.

```ts
authRouter.post('/admin/login', loginAdminController);
authRouter.post('/admin/bootstrap', bootstrapAdminController);
authRouter.post('/customer/register', registerCustomerController);
authRouter.post('/customer/login', loginCustomerController);
```

Controller behavior:
- `loginAdminController` calls the new admin auth service
- `bootstrapAdminController` checks `ADMIN_BOOTSTRAP_SECRET` and `countAdmins() === 0`
- both endpoints return the existing JSON shape:

```ts
res.status(200).json({ data: { token } });
```

- [ ] **Step 6: Re-run the backend auth checks**

Run: `node --test tests/adminAuthFlow.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS

- [ ] **Step 7: Commit the backend auth slice**

```bash
git add controllers/schemas/adminAuth.ts services/adminAuthService.ts controllers/auth.ts routes/auth.ts models/types.ts tests/adminAuthFlow.test.ts
git commit -m "feat: move admin auth to the database"
```

### Task 3: Add Dedicated Admin Auth Rate Limiting

**Files:**
- Modify: `middleware/rateLimit.ts`
- Modify: `routes/auth.ts`
- Test: `tests/adminRateLimit.test.ts`

- [ ] **Step 1: Add a failing limiter test**

Verify that repeated admin auth attempts hit a dedicated limiter instead of relying on the global `/api/` limiter.

```ts
test('admin login route is protected by a dedicated limiter', async () => {
  // repeatedly POST /api/auth/admin/login
  // assert a 429 response is eventually returned
});
```

- [ ] **Step 2: Run the limiter test and confirm it fails**

Run: `node --test tests/adminRateLimit.test.ts`

Expected: FAIL because `/api/auth/admin/*` is not rate-limited yet

- [ ] **Step 3: Create a dedicated admin-auth limiter**

Extend `middleware/rateLimit.ts`.

```ts
function createAdminAuthLimiter(windowMs: number, limit: number) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
      return email ? `${req.ip}:${email}` : req.ip ?? 'unknown';
    },
  });
}

export const adminAuthRateLimit = createAdminAuthLimiter(
  env.ADMIN_RATE_LIMIT_WINDOW_MS,
  env.ADMIN_RATE_LIMIT_MAX,
);
```

- [ ] **Step 4: Mount the limiter on both admin auth endpoints**

Apply `adminAuthRateLimit` in `routes/auth.ts`.

```ts
authRouter.post('/admin/login', adminAuthRateLimit, loginAdminController);
authRouter.post('/admin/bootstrap', adminAuthRateLimit, bootstrapAdminController);
```

- [ ] **Step 5: Re-run the limiter and build checks**

Run: `node --test tests/adminRateLimit.test.ts`

Expected: PASS

Run: `npm run build`

Expected: PASS

- [ ] **Step 6: Commit the limiter slice**

```bash
git add middleware/rateLimit.ts routes/auth.ts tests/adminRateLimit.test.ts
git commit -m "feat: rate limit admin auth endpoints"
```

### Task 4: Upgrade The Frontend Admin Login Flow

**Files:**
- Create: `aroma-ui/src/lib/adminAuth.ts`
- Modify: `aroma-ui/src/context/AdminAuthContext.tsx`
- Modify: `aroma-ui/src/pages/admin/AdminLogin.tsx`
- Test: `aroma-ui/tests/adminBootstrapMode.test.ts`
- Test: `aroma-ui/tests/adminSessionStorage.test.ts`

- [ ] **Step 1: Add frontend tests around bootstrap-mode parsing and session storage**

Extract the new behaviors into pure helpers so they can be covered by the existing `node:test` setup.

```ts
test('readBootstrapSecretFromHash returns the setup secret and clears noise', () => {
  assert.equal(readBootstrapSecretFromHash('#setup=abc123'), 'abc123');
});

test('admin auth storage uses sessionStorage instead of localStorage', () => {
  // assert helper reads/writes sessionStorage
});
```

- [ ] **Step 2: Run the frontend tests and confirm they fail**

Run: `cd aroma-ui; node --test tests/adminBootstrapMode.test.ts tests/adminSessionStorage.test.ts`

Expected:
- bootstrap helper test fails because no helper exists
- storage test fails because `AdminAuthContext.tsx` still uses `localStorage`

- [ ] **Step 3: Centralize the admin auth API calls and bootstrap-hash parsing**

Create `aroma-ui/src/lib/adminAuth.ts`.

```ts
export function readBootstrapSecretFromHash(hash: string): string | null {}
export async function submitAdminLogin(email: string, password: string): Promise<string> {}
export async function submitAdminBootstrap(input: {
  email: string;
  initials: string;
  password: string;
  bootstrapSecret: string;
}): Promise<string> {}
```

Use:
- `buildApiUrl('/api/auth/admin/login')`
- `buildApiUrl('/api/auth/admin/bootstrap')`

- [ ] **Step 4: Move admin token storage to `sessionStorage`**

Update `aroma-ui/src/context/AdminAuthContext.tsx`.

```ts
const storage = typeof window === 'undefined' ? null : window.sessionStorage;
```

Keep:
- the same `login()` / `logout()` API
- the same `isAuthenticated` behavior

- [ ] **Step 5: Update `AdminLogin.tsx` to support login mode and bootstrap mode**

Required behavior:
- default to normal login mode
- if `#setup=<secret>` exists on load:
  - store the secret in component state
  - show an `initials` field
  - call `history.replaceState` to clear the hash immediately
- submit to bootstrap endpoint only while a bootstrap secret is active
- if bootstrap returns “setup unavailable,” fall back to normal login mode

```tsx
const [bootstrapSecret, setBootstrapSecret] = useState<string | null>(null);
const isBootstrapMode = bootstrapSecret !== null;
```

- [ ] **Step 6: Re-run the frontend auth checks**

Run: `cd aroma-ui; node --test tests/adminBootstrapMode.test.ts tests/adminSessionStorage.test.ts`

Expected: PASS

Run: `cd aroma-ui; npm test`

Expected: all frontend tests pass

Run: `cd aroma-ui; cmd /c npm run build`

Expected: PASS

- [ ] **Step 7: Commit the frontend auth slice**

```bash
git add aroma-ui/src/lib/adminAuth.ts aroma-ui/src/context/AdminAuthContext.tsx aroma-ui/src/pages/admin/AdminLogin.tsx aroma-ui/tests/adminBootstrapMode.test.ts aroma-ui/tests/adminSessionStorage.test.ts
git commit -m "feat: add secure admin bootstrap login flow"
```

### Task 5: Preserve `/admin/*` Redirect Protection And Add Admin Management

**Files:**
- Modify: `routes/admin.ts`
- Modify: `controllers/admin.ts`
- Modify: `services/adminService.ts`
- Create: `aroma-ui/src/pages/admin/AdminUsers.tsx`
- Modify: `aroma-ui/src/components/admin/AdminLayout.tsx`
- Modify: `aroma-ui/src/components/admin/AdminRoute.tsx`
- Modify: `aroma-ui/src/App.tsx`
- Test: `aroma-ui/tests/adminRouteAccess.test.ts`
- Test: `tests/adminUsersApi.test.ts`

- [ ] **Step 1: Add failing coverage for route protection and admin-user creation**

Backend test:

```ts
test('POST /api/admin/users requires an authenticated admin', async () => {
  // call without bearer token
  // assert 401 or 403
});
```

Frontend helper test:

```ts
test('protected admin routes redirect to /admin/login when unauthenticated', () => {
  assert.equal(resolveAdminRedirect(false), '/admin/login');
  assert.equal(resolveAdminRedirect(true), null);
});
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run: `node --test tests/adminUsersApi.test.ts`

Run: `cd aroma-ui; node --test tests/adminRouteAccess.test.ts`

Expected: both fail because the new admin-user endpoint and redirect helper do not exist yet

- [ ] **Step 3: Add protected admin-user APIs on the backend**

Extend the existing admin surface.

```ts
// routes/admin.ts
adminRouter.get('/users', listAdminUsersController);
adminRouter.post('/users', createAdminUserController);
```

`controllers/admin.ts` delegates to `services/adminService.ts` or a new dedicated helper that:
- lists active admins without `password_hash`
- creates admins with normalized email + Argon2 hash
- rejects duplicate emails

- [ ] **Step 4: Add a small admin users page on the frontend**

Create `aroma-ui/src/pages/admin/AdminUsers.tsx` with:
- current-admin list
- add-admin form with `email`, `initials`, `password`
- fetches using the existing bearer-token pattern

Wire it up in:
- `aroma-ui/src/App.tsx`
- `aroma-ui/src/components/admin/AdminLayout.tsx`

```tsx
<Route path="/admin/users" element={<AdminUsers />} />
```

```ts
{ label: 'Admins', to: '/admin/users' }
```

- [ ] **Step 5: Keep the redirect behavior explicit and testable**

Refactor `AdminRoute.tsx` just enough to expose a pure helper without changing behavior.

```ts
export function resolveAdminRedirect(isAuthenticated: boolean) {
  return isAuthenticated ? null : '/admin/login';
}
```

Keep the component behavior:

```tsx
return isAuthenticated ? <Outlet /> : <Navigate replace to="/admin/login" />;
```

- [ ] **Step 6: Re-run the admin route and user-management checks**

Run: `node --test tests/adminUsersApi.test.ts`

Expected: PASS

Run: `cd aroma-ui; node --test tests/adminRouteAccess.test.ts`

Expected: PASS

Run: `cd aroma-ui; npm test`

Expected: all frontend tests pass

Run: `npm run build`

Expected: backend build succeeds

Run: `cd aroma-ui; cmd /c npm run build`

Expected: frontend build succeeds

- [ ] **Step 7: Commit the route-protection and admin-management slice**

```bash
git add routes/admin.ts controllers/admin.ts services/adminService.ts aroma-ui/src/pages/admin/AdminUsers.tsx aroma-ui/src/components/admin/AdminLayout.tsx aroma-ui/src/components/admin/AdminRoute.tsx aroma-ui/src/App.tsx tests/adminUsersApi.test.ts aroma-ui/tests/adminRouteAccess.test.ts
git commit -m "feat: add protected admin user management"
```

### Task 6: Final Verification And Deployment Handoff

**Files:**
- Modify if present: deployment notes or env docs touched during implementation

- [ ] **Step 1: Run the full backend verification**

Run: `node --test tests/*.test.ts`

Expected: all backend tests pass

Run: `npm run build`

Expected: PASS

- [ ] **Step 2: Run the full frontend verification**

Run: `cd aroma-ui; npm test`

Expected: all frontend tests pass

Run: `cd aroma-ui; cmd /c npm run build`

Expected: PASS

- [ ] **Step 3: Manual browser smoke-check the critical auth flows**

Verify:
- `/admin/login` shows normal login mode by default
- `/admin/login#setup=<secret>` shows the bootstrap mode once
- successful bootstrap logs in and lands on `/admin`
- after first admin exists, bootstrap can no longer create another first admin
- direct visit to `/admin/products` while logged out redirects to `/admin/login`
- logged-in admin can add another admin from `/admin/users`

- [ ] **Step 4: Update deployment environment values**

Railway:

```env
ADMIN_BOOTSTRAP_SECRET=<long-random-secret>
```

Remove after successful first-admin bootstrap:

```env
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
```

No new Vercel env vars are required for this feature.

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: ship secure admin bootstrap flow"
```
