# Task 11: Implement Real TOTP for Superadmin Login

## Summary
Implemented real TOTP (Time-based One-Time Password) authentication for the superadmin login flow using otplib v13.

## Key Findings
- **otplib v13 API** differs significantly from v12. There is NO `authenticator` export.
- Correct imports: `generateSecret`, `generateURI`, `verifySync`, `NobleCryptoPlugin`, `ScureBase32Plugin`
- The v13 API requires explicit crypto and base32 plugins to be passed to functions.

## Files Created/Modified

### 1. `/src/app/api/auth/totp/status/route.ts` (NEW)
- GET handler that checks if TOTP secret exists in platform_settings
- Requires super_admin role (authenticated via session)
- Returns `{ setup: boolean }`

### 2. `/src/app/api/auth/totp/setup/route.ts` (NEW)
- POST handler that generates TOTP secret (requires super_admin role)
- Uses `generateSecret({ crypto, base32 })` from otplib v13
- Stores secret in `platform_settings` with key `superadmin_totp_secret`
- Returns `{ secret, otpAuthUri }` using `generateURI()`

### 3. `/src/app/api/auth/totp/verify/route.ts` (NEW)
- POST handler that accepts email and token
- Uses `verifySync({ token, secret, crypto, base32 })` from otplib v13
- Fetches TOTP secret from platform_settings
- Returns success/failure

### 4. `/src/app/superadmin-login/page.tsx` (MODIFIED)
- Replaced random OTP toast with real TOTP flow:
  - Step 1: Enter email/password, verify credentials via signIn
  - After verifying super_admin role, checks TOTP status via GET `/api/auth/totp/status`
  - If no TOTP secret exists (first time), shows setup dialog with QR code and manual entry key
  - If TOTP secret exists, proceeds to step 2 (enter 6-digit code)
  - Step 2: Verify token via POST `/api/auth/totp/verify`
- QR code generated using `qrcode` package (installed as new dependency)
- Setup dialog includes copy-to-clipboard for manual secret entry

## Dependencies Added
- `qrcode` (v1.5.4) - QR code generation
- `@types/qrcode` (v1.5.6) - TypeScript types

## otplib v13 API Usage Pattern
```typescript
import { generateSecret, generateURI, verifySync, NobleCryptoPlugin, ScureBase32Plugin } from "otplib";

const crypto = new NobleCryptoPlugin();
const base32 = new ScureBase32Plugin();

// Generate secret
const secret = generateSecret({ crypto, base32 });

// Generate URI for QR code
const uri = generateURI({ secret, label: "user@email.com", issuer: "MyApp" });

// Verify token
const result = verifySync({ token, secret, crypto, base32 });
// result = { valid: boolean, delta: number, epoch: number, timeStep: number }
```

## Notes
- Database connectivity requires proper DATABASE_URL in .env (Supabase PostgreSQL)
- The TOTP secret is stored globally in platform_settings (shared for all super_admin logins)
- For production, consider per-user TOTP secrets by adding a totp_secret field to the User model
