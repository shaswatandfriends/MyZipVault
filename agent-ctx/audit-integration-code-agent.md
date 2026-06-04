# Task: Integrate Audit Logging Across API Routes

## Summary
Added audit logging from `@/lib/audit` to 9 API routes that lacked it. Lint passes cleanly.

## Changes Made

### 1. `/src/app/api/admin/documents/[id]/verify/route.ts`
- **Added import**: `logDocumentApproved` from `@/lib/audit`
- **Added call**: `await logDocumentApproved(adminUserId, "platform_admin", credentialId)` after credential update and profile recalculation succeed

### 2. `/src/app/api/recruiter/candidates/[id]/unlock/route.ts`
- **Added import**: `logRecruiterUnlocked` from `@/lib/audit`
- **Added call**: `await logRecruiterUnlocked(userId, entityType, entityId)` after unlocked document creation succeeds

### 3. `/src/app/api/sharing/approve/route.ts`
- **Added import**: `logCandidateShared` from `@/lib/audit`
- **Captured** return value of `db.consentShare.create` as `const consentShare`
- **Added call**: `await logCandidateShared(userId, consentShare.id)` after consent share creation

### 4. `/src/app/api/account/restore/route.ts`
- **Added import**: `logAccountRestored` from `@/lib/audit`
- **Added call**: `await logAccountRestored(userId, userId)` after account restore succeeds (self-restore, so userId is both actor and target)

### 5. `/src/app/api/superadmin/compliance/purge/[userId]/route.ts`
- **Added import**: `logAccountPurged` from `@/lib/audit`
- **Replaced** raw `db.auditLog.create({ action: "compliance_purge" })` with `await logAccountPurged(adminUserId, targetUserId)`

### 6. `/src/app/api/recruiter/baa/route.ts`
- **Added import**: `logBaaSigned` from `@/lib/audit`
- **Replaced** raw `db.auditLog.create({ action: "baa_signed" })` with `await logBaaSigned(userId, organizationId)`

### 7. `/src/app/api/recruiter/send-request/route.ts`
- **Added import**: `logCreditsDeducted` from `@/lib/audit`
- **Added call**: `await logCreditsDeducted(userId, organizationId, totalCredits)` inside the credit deduction block, after the credit transaction is created

### 8. `/src/app/api/superadmin/proxy-login/route.ts`
- **Added import**: `logProxyLogin` from `@/lib/audit`
- **Replaced** raw `db.auditLog.create({ action: "proxy_login" })` with `await logProxyLogin(superadminUserId, "super_admin", targetUserId)`

### 9. `/src/app/api/superadmin/proxy-login/exit/route.ts`
- **Added import**: `logProxyExit` from `@/lib/audit`
- **Replaced** raw `db.auditLog.create({ action: "proxy_login_exit" })` with `await logProxyExit(userId, userRole)`

## Key Decisions
- For routes that already had raw `db.auditLog.create` calls (routes 5, 6, 8, 9), the raw calls were **replaced** with the typed helper functions to avoid duplicate logging
- For route 3 (sharing/approve), the `db.consentShare.create` return value was captured to pass the `consentShare.id` as the `shareId` parameter
- For route 4 (account/restore), since it's a self-restore, `userId` is passed as both the actor and target
- All audit calls are placed **after** the action succeeds to ensure we only log successful operations
