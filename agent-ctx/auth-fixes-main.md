# Task: Fix Authentication Issues in MyZipVault

## Summary of Changes

### Issue 1: Forgot Password
**Status**: Already working — no changes needed

The forgot-password page at `src/app/forgot-password/page.tsx` already:
- Calls `/api/auth/forgot-password` with POST and `{ email }` body
- Handles errors with toast notifications
- Shows a "Check your email" success state after submission
- The API route generates a token, stores it in PlatformSetting, and sends a reset email
- The reset-password page at `src/app/reset-password/page.tsx` properly handles the token and password reset

No "coming soon" toast was found in the current code — it appears this was already fixed.

### Issue 2: TOS/Privacy Links
**Status**: Already using proper `<Link>` components — no changes needed

Both signup pages already use `<Link>` from `next/link`:
- `src/app/signup/page.tsx` (lines 229-235): `<Link href="/terms">` and `<Link href="/privacy">`
- `src/app/agency-signup/page.tsx` (lines 468-474): `<Link href="/terms">` and `<Link href="/privacy">`

No `<span>` elements were found for these links — they were already properly implemented.

### Issue 3: Email Verification (CRITICAL BUG FIXED)
**Status**: Fixed — 3 files changed

**Root Cause**: The `/verify-email` route was missing from the middleware's `publicRoutes` array. This meant unauthenticated users (e.g., clicking a verification link from their email) were redirected to `/login` instead of being able to verify their email.

**Changes Made**:

1. **`src/middleware.ts`**: Added `"/verify-email"` to the `publicRoutes` array so the page is accessible without authentication.

2. **`src/app/signup/page.tsx`**: 
   - Removed auto sign-in after signup (`signIn("credentials", ...)`)
   - Removed unused `signIn` import from `next-auth/react`
   - After successful signup, now redirects to `/verify-email?email=...&signup=true` with a toast telling the user to check their email
   - This ensures users know they need to verify their email before signing in

3. **`src/app/verify-email/page.tsx`**:
   - Added `"signup_success"` to the `VerifyState` type
   - Reads `email` and `signup` query params from the URL
   - Pre-fills the email field from the `email` query param
   - When `?signup=true` is present (and no token), shows a new `"signup_success"` state with:
     - "Check your email" heading
     - The user's email address highlighted
     - Info card explaining the verification process and 24-hour expiry
     - "Resend Verification Email" button
     - "Back to Sign In" button
