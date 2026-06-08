# Task: Build Candidate-Facing Missing Features

## Summary

All 6 features have been implemented successfully. Zero lint errors.

## Changes Made

### 1. Credential Edit Feature
- **API**: Added `PUT` handler to `/api/credentials/[id]/route.ts` supporting `document_name`, `expiration_date`, `reminder_enabled` fields with ownership verification
- **Frontend**: Added Pencil icon button on each credential card, opens an edit dialog with fields for document name, expiration date, and reminder toggle

### 2. Credential File Preview
- **Frontend**: Added Eye icon button on each credential card, opens a preview dialog
  - PDFs: Embedded iframe viewer
  - Images (JPG/PNG): img tag display
  - Other files: "Preview not available" message with download button
- Uses signed URL from `/api/storage/signed-url`

### 3. Reference Resend/Reminder
- **API**: Created `/api/references/resend/route.ts` - POST with `{ referenceId }`, verifies ownership + pending status, updates `requested_at` to now, creates notification
- **Frontend**: Added "Resend" button (RefreshCw icon) on pending references only

### 4. Reference Cancel/Delete
- **API**: Created `/api/references/cancel/route.ts` - POST with `{ referenceId }`, verifies ownership + pending status, sets status to "cancelled", creates notification
- **Frontend**: Added "Cancel" button (XCircle icon) with AlertDialog confirmation on pending references
- Added "cancelled" status badge styling

### 5. Notification Preferences
- **Schema**: Added `notification_preferences` (String/JSON) field to `CandidateProfile` model
- **API**: Updated `/api/candidate/profile/route.ts` GET to return parsed preferences, PUT to accept and save them
- **Frontend**: Added "Notification Preferences" Card section to settings page with:
  - Email notifications toggle (credential expiry, reference/sharing requests)
  - SMS notifications toggle (requires phone number)
  - Credential expiry reminders toggle

### 6. Sharing Modify Expiry
- **API**: Created `/api/sharing/modify-expiry/route.ts` - PUT with `{ consentShareId, newExpiresAt }`, validates ownership + future date
- **Frontend**: 
  - Added "Edit" button (Pencil icon) on active shares, opens dialog with 7d/14d/30d/custom options
  - Replaced `window.confirm` revoke with proper AlertDialog component

## Files Modified
- `prisma/schema.prisma` - Added notification_preferences field
- `src/app/api/credentials/[id]/route.ts` - Added PUT handler
- `src/app/api/references/resend/route.ts` - New file
- `src/app/api/references/cancel/route.ts` - New file
- `src/app/api/sharing/modify-expiry/route.ts` - New file
- `src/app/api/candidate/profile/route.ts` - Enhanced GET/PUT
- `src/app/(candidate)/vault/credentials/page.tsx` - Edit + Preview dialogs
- `src/app/(candidate)/references/page.tsx` - Resend + Cancel buttons
- `src/app/(candidate)/settings/page.tsx` - Notification preferences section
- `src/app/(candidate)/sharing/page.tsx` - Modify expiry + AlertDialog revoke
