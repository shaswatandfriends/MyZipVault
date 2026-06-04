# Task 14 + 20: Storage Library & Next.js Security Headers

## Summary

Completed security improvements for the storage library and Next.js configuration.

## Changes Made

### 1. `src/lib/storage.ts`
- **Changed `getSignedUrl()` default `expiresIn`** from `3600` (1 hour) to `900` (15 minutes) — reduces the window of exposure for signed URLs.
- **Added `BUCKET_INVOICES` constant** — `const BUCKET_INVOICES = "invoice-pdfs"` for invoice PDF storage.
- **Updated `STORAGE_BUCKETS` export** — Added `INVOICES: BUCKET_INVOICES` to the bucket constants object.
- **Note**: No separate script needed for bucket creation since `uploadFile()` already auto-creates buckets when they don't exist (lines 37-42).

### 2. `next.config.ts`
Added a `headers()` function returning security headers applied to all routes (`source: '/(.*)'`):
- `X-Frame-Options: DENY` — Prevents clickjacking via iframes
- `X-Content-Type-Options: nosniff` — Prevents MIME-type sniffing
- `X-XSS-Protection: 1; mode=block` — Enables browser XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` — Limits referrer information leakage
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — Enforces HTTPS (~2 year max-age with preload)
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — Disables sensitive browser APIs
- `Content-Security-Policy` — Restricts resource loading to 'self' and allowlisted domains (Supabase, Brevo)

## Verification
- ESLint passed with zero errors
