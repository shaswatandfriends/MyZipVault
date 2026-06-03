# Task: Create Critical Infrastructure Files for MyZipVault

## Summary

All 9 files/tasks were completed successfully with zero lint errors and the database already in sync.

## Files Created/Modified

### 1. `src/middleware.ts` — NEW
- NextAuth v4 middleware with `withAuth` for route protection
- Fixed `req.nexturl` → `req.nextUrl` typo from spec
- Public routes: `/`, `/login`, `/signup`, `/onboard`, `/admin-login`, `/superadmin-login`
- Public prefixes: `/reference/`, `/api/reference/`, `/api/auth/`, `/api/cron/`
- Role-based access: super_admin → `/superadmin`, platform_admin → `/admin`, client_admin/client_recruiter → `/recruiter`, candidate → `/dashboard`, `/checklists`, `/vault`, `/references`, `/sharing`, `/settings`
- API route protection follows the same role-based rules

### 2. `src/lib/encryption.ts` — NEW
- AES-256-CBC encryption using Node.js `crypto` module
- `encrypt(text)` → returns `iv:encrypted` hex format
- `decrypt(text)` → parses `iv:encrypted` and returns plaintext
- `maskValue(value)` → masks sensitive values like API keys (e.g., `sk_1***abcd`)
- ENCRYPTION_KEY from env, padded/truncated to 32 bytes

### 3. `src/lib/email.ts` — NEW
- Brevo (Sendinblue) transactional email service
- `sendEmail()` fetches templates from DB via `template_key`, replaces `{{variables}}`, converts plain text to HTML
- SMS feature flag check before email dispatch
- Console logging fallback when BREVO_API_KEY is not set
- 8 convenience functions: candidate invite, checklist email, manager invite, credential expiry, credential rejected, low credit alert, password reset, account suspension
- **Field name verified**: Prisma schema uses `template_key` (snake_case) — correctly used in `findUnique({ where: { template_key: templateKey } })`

### 4. `src/lib/auth-helpers.ts` — NEW
- `requireAuth()` — redirects to `/login` if no session
- `requireRole(role)` — redirects to role's dashboard if wrong role
- `requireAnyRole(roles[])` — redirects if user's role not in allowed list
- `getRoleDashboard(role)` — maps role to their dashboard path

### 5. `.env` — UPDATED
- Added `ENCRYPTION_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`, `AFFINDA_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### 6. `src/app/(superadmin)/superadmin/feature-flags/page.tsx` — NEW
- "use client" page with feature flag table
- 5 flags: sms_notifications, resume_builder, reference_engine, credit_upsell, document_verification_queue
- Each flag shows: icon, label, description, flag_name, warning (SMS off badge when disabled)
- Status badges: Enabled (emerald) / Disabled (slate)
- Toggle switches with loading state
- SMS enable pre-check: fetches API vault services, verifies Twilio keys exist; shows error toast if missing
- Fetches from `/api/superadmin/settings` + `/api/superadmin/api-vault`

### 7. `src/app/api/superadmin/feature-flags/route.ts` — NEW
- GET: lists all feature flags (super_admin only)
- PUT: toggles a feature flag with server-side Twilio key validation for sms_notifications
- Uses `upsert` to create flag if not in DB yet
- Audit log entry created on each toggle

### 8. `src/components/sidebars/superadmin-sidebar.tsx` — UPDATED
- Added `ToggleLeft` icon import from lucide-react
- Added "Feature Flags" nav item in systemNavItems between Settings and API Vault

## Key Decisions
- Email template field uses `template_key` (Prisma snake_case) — verified against schema
- Feature flag field uses `flag_name` / `is_enabled` (Prisma snake_case) — consistent with existing settings API
- The feature flags page is separate from the settings page for better UX (dedicated view with table layout)
- The API route validates Twilio keys on the server side as well (not just client-side check) for security
