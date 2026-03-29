# Secure Admin Bootstrap Design

Date: 2026-03-29
Project: Nawabi Aroma
Scope: Replace the single env-based admin account with a secure database-backed admin system that supports first-admin bootstrap, normal login, protected admin routes, and future multi-admin growth.

## Goal

Make `/admin` safe and recoverable without leaving a public self-signup hole:

- the current env-based admin account is retired
- the first admin can be created from the existing `/admin/login` page only when a valid one-time bootstrap secret is supplied
- once one admin exists, public bootstrap is closed automatically
- unauthenticated visitors who hit any `/admin/*` page are redirected to `/admin/login`
- additional admins can be created later by an already logged-in admin

## Current State Summary

The codebase currently behaves like this:

- backend admin auth is hardcoded to `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` in env
- `POST /api/auth/login` is the admin login endpoint
- admin API routes under `/api/admin/*` already require a bearer token
- frontend admin pages are wrapped by `AdminRoute`, which redirects to `/admin/login` when no client-side token exists
- Vercel deep-link routing for `/admin/*` has already been fixed with `aroma-ui/vercel.json`
- the admin bearer token is currently stored in browser `localStorage`
- the current admin login endpoint is effectively unthrottled because `/api/auth` is mounted before the global `/api/` limiter

The main gaps are:

- only one admin can exist
- resetting the admin means changing Railway env vars manually
- there is no secure “first admin” workflow
- login brute-force protection is weaker than it should be
- admin token persistence is more durable than necessary for a privileged area

## Recommended Strategy

Use a database-backed multi-admin model with a bootstrap gate:

1. Add an `admins` table.
2. Replace env-based admin login with database lookup and Argon2 password verification.
3. Add a first-admin bootstrap endpoint that only works when:
   - there are zero admins, and
   - the request includes a valid `ADMIN_BOOTSTRAP_SECRET`.
4. Keep the public UI on `/admin/login`, but allow it to switch into one-time setup mode when the owner visits a private setup URL containing the bootstrap secret in the hash fragment.
5. After the first admin exists, disable bootstrap automatically and leave only normal login.
6. Add a protected admin-creation flow for future admins.

This keeps the UX close to the current site while avoiding the dangerous “whoever arrives first becomes admin” problem.

## Security Invariants

The implementation must preserve these rules:

- No public request can create an admin unless there are zero admins and the bootstrap secret is correct.
- The bootstrap secret must remain server-only and must never be bundled into the Vite frontend.
- The admin login/setup endpoints must be rate-limited.
- Passwords must be hashed with Argon2 and never stored or logged in plaintext.
- Frontend admin route protection is UX only; backend admin API protection remains mandatory.
- Direct navigation to `/admin/*` without a valid client auth state must redirect to `/admin/login`.
- Admin API requests without a valid bearer token must still fail with `401` or `403`.
- The bootstrap secret should be rotated or removed from Railway after first setup is complete.

## Backend Design

### 1. Admin Data Model

Add a new `admins` table through a migration:

- `id BIGSERIAL PRIMARY KEY`
- `email TEXT NOT NULL UNIQUE`
- `initials TEXT`
- `password_hash TEXT NOT NULL`
- `is_active BOOLEAN NOT NULL DEFAULT TRUE`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `last_login_at TIMESTAMPTZ`

Design notes:

- `email` is normalized to lowercase before persistence and lookup
- `initials` is lightweight display metadata, not an auth identifier
- `is_active` allows future disable/suspend behavior without deleting history
- the schema supports multiple admins from day one

### 2. Environment Configuration

Replace the env-based admin credentials model with a bootstrap-secret model:

- add `ADMIN_BOOTSTRAP_SECRET` as an optional backend env var
- stop requiring `ADMIN_EMAIL`
- stop requiring `ADMIN_PASSWORD_HASH`

Operational rules:

- `ADMIN_BOOTSTRAP_SECRET` must be configured on Railway before the first admin is created
- after first setup succeeds, the secret can be rotated or removed
- old `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` values should be removed from Railway after rollout so they do not create confusion

### 3. Auth Endpoints

Split the admin auth flow into explicit routes:

- `POST /api/auth/admin/login`
- `POST /api/auth/admin/bootstrap`

`POST /api/auth/admin/login`:

- validates `email` and `password`
- looks up the admin by normalized email
- rejects if no row exists or `is_active` is false
- verifies the Argon2 password hash
- updates `last_login_at`
- returns the existing admin JWT payload shape

`POST /api/auth/admin/bootstrap`:

- validates `email`, `password`, and `initials`
- reads the bootstrap secret from a dedicated request field or header
- rejects unless `ADMIN_BOOTSTRAP_SECRET` is present and matches exactly
- rejects unless the admin count is exactly zero
- creates the first admin row inside a transaction
- returns the same JWT response shape as login so the user lands in the admin area immediately

Failure behavior:

- bootstrap failures return generic auth-safe messages and must not leak secrets
- if an admin already exists, bootstrap returns a controlled “setup unavailable” error and does not create anyone

### 4. Protected Admin Management for Future Admins

Add protected admin-management routes behind `requireAdminAuth`:

- `POST /api/admin/users`
- `GET /api/admin/users`

`POST /api/admin/users`:

- only authenticated admins can call it
- accepts `email`, `password`, and `initials`
- creates another admin with the same hashing and normalization rules
- rejects duplicate emails

`GET /api/admin/users`:

- returns a minimal list of admins for visibility
- excludes password hashes

This keeps future admin creation easy without re-opening a public setup path.

### 5. Rate Limiting and Hardening

Add dedicated throttling for admin auth:

- mount a dedicated limiter on `/api/auth/admin/login`
- mount the same or stricter limiter on `/api/auth/admin/bootstrap`

Limiter behavior should combine:

- a per-IP window limit
- a per-IP-plus-email key when an email is present

This is stronger than the current setup, where the admin login route sits outside the global API limiter.

### 6. JWT and Authorization

Keep the current JWT-based admin API model for this iteration:

- admin login/bootstrap returns the same signed JWT structure already used by `/api/admin/*`
- backend `requireAdminAuth` continues to enforce bearer-token authorization on all admin API routes
- no admin privilege is ever granted by frontend routing alone

This avoids introducing cross-origin cookie auth complexity between Vercel and Railway during the auth redesign.

## Frontend Design

### 1. `/admin/login` Page Modes

Keep the current page and submit button, but allow two modes:

- login mode
- bootstrap mode

Login mode:

- default mode for normal visitors
- form fields: `email`, `password`

Bootstrap mode:

- enabled only when the URL contains a private hash fragment such as `#setup=<secret>`
- form fields: `email`, `initials`, `password`
- submit targets `POST /api/auth/admin/bootstrap`

Hash-fragment behavior:

- the fragment is read on page load
- the secret is kept in memory only for the submission flow
- the URL is immediately cleaned with `history.replaceState` so the secret does not linger in the address bar after load

If bootstrap fails because setup is no longer available:

- the page falls back to normal login mode
- the user sees a neutral error message

### 2. Admin Route Protection

The current redirect behavior is already the right UX and must be preserved:

- any visit to `/admin/*` without a valid client auth state redirects to `/admin/login`
- this includes direct attempts to visit `/admin`, `/admin/orders`, `/admin/products`, and any future admin page

Implementation expectations:

- keep `AdminRoute` as the shared frontend guard
- keep the Vercel SPA rewrite so deep links load the React app first
- add regression coverage for at least one direct `/admin/*` route and the shared route guard behavior

### 3. Admin Token Persistence

Reduce admin token persistence from `localStorage` to `sessionStorage`:

- the admin token should survive normal SPA navigation and refreshes within the active browser session
- the token should not survive a full browser close/reopen cycle

This is a pragmatic hardening step for a privileged area without forcing a backend cookie-auth rewrite.

### 4. Admin Creation UI

Add a small protected admin-management section inside the admin area:

- a minimal list of existing admin accounts
- a small form to add another admin by `email`, `initials`, and `password`

Rules:

- only logged-in admins can reach it
- it uses the protected `/api/admin/users` endpoint
- it does not expose password hashes or secrets

This satisfies the requirement that adding a new admin later should be easy.

## Data Flow

### First Admin Bootstrap

1. Owner visits a private setup URL like `/admin/login#setup=<bootstrap-secret>`.
2. Frontend reads the fragment and clears it from the URL.
3. Owner enters email, initials, and password.
4. Frontend sends the credentials plus bootstrap secret to `POST /api/auth/admin/bootstrap`.
5. Backend verifies:
   - the bootstrap secret matches
   - zero admins exist
6. Backend creates the first admin, signs a JWT, and returns it.
7. Frontend stores the token in `sessionStorage`, marks the user authenticated, and routes to `/admin`.

### Normal Login

1. Visitor opens `/admin/login`.
2. Frontend shows normal login mode.
3. User submits email and password to `POST /api/auth/admin/login`.
4. Backend verifies credentials and returns a JWT.
5. Frontend stores the token in `sessionStorage` and routes to `/admin`.

### Unauthenticated Direct Admin Visit

1. Visitor opens any `/admin/*` route directly.
2. Vercel rewrites the request to the SPA entry.
3. React loads.
4. `AdminRoute` checks for an authenticated admin token.
5. If absent, frontend redirects to `/admin/login`.

## Testing Strategy

Add tests before or alongside implementation for:

- admin bootstrap validation when zero admins exist
- bootstrap rejection when an admin already exists
- bootstrap rejection when the secret is missing or wrong
- admin login success and failure
- protected admin-user creation route
- admin auth limiter wiring
- frontend bootstrap mode detection from the hash fragment
- frontend redirect from protected `/admin/*` routes to `/admin/login`
- frontend token persistence using `sessionStorage`

Verification after implementation:

- backend TypeScript build succeeds
- frontend Vite build succeeds
- existing frontend tests still pass
- new backend and frontend auth tests pass

## Rollout Order

1. Add a migration for the `admins` table.
2. Add admin service helpers for lookup, creation, login verification, and listing.
3. Update env parsing to support `ADMIN_BOOTSTRAP_SECRET` and remove hard dependence on env-based admin credentials.
4. Replace the current admin auth controller/routes with explicit login and bootstrap routes.
5. Add dedicated admin auth rate limiters.
6. Update the frontend admin login page for bootstrap mode and `sessionStorage`.
7. Add protected admin-management UI and API integration.
8. Verify `/admin/*` redirect behavior still works on both SPA navigation and direct deep links.
9. Remove old admin credential env vars from Railway after deployment confidence is established.

## Risks and Mitigations

### Risk: Accidental public bootstrap exposure

Mitigation:

- require the bootstrap secret
- allow bootstrap only when admin count is zero
- use a private hash-fragment setup URL
- disable bootstrap automatically after first admin creation

### Risk: Brute-force attacks on admin login

Mitigation:

- dedicated login/bootstrap rate limiters
- Argon2 password hashing
- generic auth failure responses

### Risk: Losing current admin access during rollout

Mitigation:

- deploy code with `ADMIN_BOOTSTRAP_SECRET` already set on Railway
- complete first-admin setup immediately after deployment
- only remove legacy env admin values after the new flow is verified

### Risk: Shared-device persistence of admin auth

Mitigation:

- move admin token storage to `sessionStorage`
- keep JWT expiry bounded

## Out of Scope

- customer auth changes
- password reset and email recovery flows for admins
- role hierarchies beyond “admin”
- replacing JWT bearer auth with cross-origin cookies

## Success Criteria

The work is successful when:

- env-based admin login is no longer the source of truth
- the first admin can be created only by someone who has the bootstrap secret
- once one admin exists, no public bootstrap path remains
- unauthenticated users who hit any `/admin/*` page are redirected to `/admin/login`
- admin API routes still reject unauthenticated requests server-side
- adding another admin from the admin area is straightforward
- frontend and backend builds pass after the change
