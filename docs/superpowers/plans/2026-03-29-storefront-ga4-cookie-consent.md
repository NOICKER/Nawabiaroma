# Storefront GA4 Cookie Consent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add storefront-only Google Analytics 4 tracking gated behind a cookie consent banner in `aroma-ui`.

**Architecture:** Keep consent state and GA4 initialization centralized in the storefront app shell so analytics never runs on admin routes. Use `localStorage` for persisted consent, a small analytics helper for one-time GA4 initialization plus pageview tracking, and a reusable bottom-fixed banner component styled with the existing glass theme.

**Tech Stack:** React 19, Vite, TypeScript, react-router-dom, react-ga4, node:test

---

### Task 1: Add Environment and Analytics Plumbing

**Files:**
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\package.json`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\package-lock.json`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\vite-env.d.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\.env.example`
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\lib\analytics.ts`

- [ ] Install `react-ga4`
- [ ] Add `VITE_GA_MEASUREMENT_ID` to frontend env typing and `.env.example`
- [ ] Create a focused analytics helper that:
  - reads the measurement ID from `import.meta.env`
  - initializes `react-ga4` at most once
  - sends pageviews only when initialization has happened

### Task 2: Add Consent State and a Storefront Banner

**Files:**
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\components\CookieConsentBanner.tsx`
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\lib\cookieConsent.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\index.css`

- [ ] Add a small consent helper around one `localStorage` key with values `accepted`, `declined`, or unset
- [ ] Build a bottom-fixed banner with Accept and Decline buttons using the existing storefront glass styling
- [ ] Hide the banner once a choice has been stored

### Task 3: Wire Consent-Gated GA4 into the Storefront App Shell

**Files:**
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\src\App.tsx`

- [ ] Keep all consent UI and analytics behavior off `/admin`
- [ ] On accepted consent, initialize GA4 and immediately track the current storefront page
- [ ] On storefront route changes after consent, track pageviews
- [ ] On declined consent, do not initialize GA4

### Task 4: Cover the New Behavior and Verify

**Files:**
- Create: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\tests\cookieConsent.test.ts`
- Modify: `C:\Users\Shubhi Mishra\Desktop\aroma\aroma-ui\package.json`

- [ ] Add a focused `node:test` file for consent persistence and safe storefront-only analytics helper behavior
- [ ] Run the targeted test file
- [ ] Run a fresh production build with `npm run build`
- [ ] Summarize the exact Vercel env var additions needed for GA4
