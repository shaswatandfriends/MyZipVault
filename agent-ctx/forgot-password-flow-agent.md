# Task: Build Complete Forgot Password Flow

## Summary
Built the complete forgot password flow for the MyZipVault project, replacing the stub "Password reset coming soon!" toast with a fully functional system.

## Files Created

### 1. `src/app/forgot-password/page.tsx`
- Split-panel layout matching the existing login page design (left decorative panel with ZV branding + trust points, right form panel)
- Email input with validation
- "Send Reset Link" button that POSTs to `/api/auth/forgot-password`
- Success state showing: "If an account with that email exists, we've sent a reset link."
- "Back to Sign In" link with ArrowLeft icon
- Mobile-responsive with mobile branding header

### 2. `src/app/reset-password/page.tsx`
- Same split-panel layout as forgot-password
- Reads `?token=` from URL via `useSearchParams()` (wrapped in Suspense boundary)
- Invalid/missing token state with error icon, "Request New Link" button, and "Back to Sign In" link
- New Password + Confirm Password inputs with show/hide toggle
- Password strength checker with 5-level bar (Weak → Very Strong) and requirement checklist:
  - At least 8 characters
  - Uppercase and lowercase letters
  - At least one number
  - At least one special character
- "Reset Password" button that POSTs to `/api/auth/reset-password`
- On success: shows toast and redirects to `/login`

### 3. `src/app/api/auth/forgot-password/route.ts`
- POST handler accepting `{ email }`
- Normalizes email to lowercase
- Finds user by email (silently — never reveals if email exists)
- Generates a 64-char hex token via `crypto.randomBytes(32)`
- Stores token in `PlatformSetting` with key `reset_${token}` and value containing `{ userId, email, expiresAt }` (1-hour expiry)
- Sends reset email using existing `sendPasswordResetEmail()` from `src/lib/email.ts`
- Reset link format: `{NEXTAUTH_URL}/reset-password?token={token}`
- Cleans up token if email delivery fails
- Always returns success response (security best practice)

### 4. `src/app/api/auth/reset-password/route.ts`
- POST handler accepting `{ token, newPassword }`
- Validates token exists in `PlatformSetting` and hasn't expired
- Parses stored token data (userId, email, expiresAt)
- Verifies user still exists
- Hashes new password with `bcryptjs` (cost factor 12)
- Updates user's `password_hash` and clears `must_change_pass`
- Deletes the used token
- Also invalidates any other outstanding reset tokens for the same user
- Returns appropriate error messages for invalid/expired tokens

## Files Modified

### 5. `src/app/login/page.tsx`
- Changed "Forgot password?" from a `<button>` with `onClick={() => toast.info("Password reset coming soon!")}` to a `<Link href="/forgot-password">` component

### 6. `src/app/agency-login/page.tsx`
- Same change as login page: button → Link to `/forgot-password`

## Additional Fixes
- Fixed Prisma schema datasource from `postgresql` to `sqlite` (matching the actual SQLite database)
- Removed `directUrl` env var requirement from schema
- Added `NEXTAUTH_URL` and `NEXTAUTH_SECRET` to `.env` file
- Added `DIRECT_URL` to `.env` file

## Design Decisions
- Token storage in `PlatformSetting` model follows the same pattern as the existing OTP storage for superadmin login
- Token stored as `reset_${token}` key with JSON value containing userId, email, and expiresAt — all in a single record for atomicity
- Always-return-success pattern prevents email enumeration attacks
- 1-hour token expiry balances security with usability
- Password strength checker provides real-time visual feedback
- Suspense boundary on reset-password page avoids Next.js `useSearchParams` hydration issues
