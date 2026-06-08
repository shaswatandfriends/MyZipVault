# Task: Fix Candidate-Side Features in MyZipVault

## Summary

Reviewed and fixed candidate-side features across three areas: References, Sharing, and Settings.

## Changes Made

### 1. Candidate References: Re-send/Reminder + Cancel/Delete

**Findings:**
- The Resend button for `pending_request` references was already implemented and working correctly
- The Cancel button for `pending_request` references was already implemented and working correctly
- The Delete Request button for `completed`/`cancelled` references was already implemented and working correctly
- **BUG FOUND**: Expired references (`expired` status) had NO action buttons — candidates couldn't resend or delete them

**Fixes Applied:**

1. **`/src/app/api/references/resend/route.ts`** — Extended the resend API to also accept expired references:
   - Changed status check from `pending_request` only to `pending_request || expired`
   - When resending an expired reference, the status is reset back to `pending_request` and `requested_at` is updated
   - Updated error message to reflect the new allowed statuses

2. **`/src/app/(candidate)/references/page.tsx`** — Added UI for expired reference actions:
   - Added `isExpired` variable for cleaner conditionals
   - Added "Re-request" button for expired references (calls the same `handleResend` API)
   - Extended delete request button to show for expired references (alongside completed/cancelled)
   - Updated delete dialog to display "Expired" status properly
   - Updated icon styling for expired references to use red tint (matching the badge color)

### 2. Candidate Sharing: Revoke access + Modify expiry

**Findings:**
- The Revoke button with AlertDialog confirmation was already properly implemented → calls `POST /api/sharing/revoke`
- The Modify Expiry button ("Edit") with dialog was already properly implemented → calls `PUT /api/sharing/modify-expiry`
- Both API routes were correct and functional
- **No changes needed** — features working as expected

### 3. Candidate Settings: Profile editing + Notification preferences

**Findings:**
- Profile editing form (first name, last name, phone) was already properly implemented → calls `PUT /api/candidate/profile`
- Notification preferences (email, SMS, reminder toggles) were already properly implemented → calls `PUT /api/candidate/profile`
- Profile data is fetched from `GET /api/candidate/profile` on mount
- Notification preferences are correctly parsed from JSON string in the API
- **No changes needed** — features working as expected

## Lint Results

- 0 errors, 2 warnings (both pre-existing in unrelated file `checklists/[id]/page.tsx`)
