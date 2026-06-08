# Task: Build Missing Superadmin and Platform Admin Features

## Summary

All four features have been implemented successfully. No lint errors were introduced (only 2 pre-existing warnings in unrelated files). Dev server compiles and runs correctly.

## Changes Made

### 1. Company Filter in Superadmin Users Page
**File:** `src/app/(superadmin)/superadmin/users/page.tsx`
- Added a Company/Organization filter dropdown in the **header area** (next to the search bar), so it's always visible without expanding the advanced filters
- The dropdown uses the `Building2` icon and shows "All Companies" + all organizations from the database
- The existing company filter in the advanced filters section is still present
- When a company is selected, the `companyFilter` state is updated, which triggers a refetch via the `fetchUsers` callback with the `organizationId` query parameter

**File:** `src/app/api/superadmin/users/route.ts`
- Added support for `companyId` as an alias for `organizationId` query parameter: `searchParams.get("organizationId") || searchParams.get("companyId") || "all"`

### 2. Landing Page Editor Persistence
**File:** `src/app/api/superadmin/landing-page/route.ts`
- **Replaced** the in-memory storage with database persistence using `PlatformSetting` model
- `GET` now reads from `PlatformSetting` where `setting_key = "landing_page_content"`, falling back to defaults
- `POST` now requires super_admin auth, uses `upsert` on `PlatformSetting`, and logs to `AuditLog`
- Returns `savedAt` timestamp on successful save

**File:** `src/app/(superadmin)/superadmin/landing-page-editor/page.tsx`
- Added `loadContent()` callback that fetches from the API on mount
- Added `loading` state with skeleton UI during initial load
- Added `hasUnsavedChanges` state that tracks when content has been modified
- Added auto-save indicator in the header showing:
  - "Unsaved changes" (amber dot) when content is modified
  - "Saving…" (spinner) during save
  - "Saved at [time]" (green checkmark) after successful save
  - "Loaded from server" (green checkmark) on initial load
- Updated `handleDiscard()` to reload from server instead of just resetting to defaults
- All `update*` helpers now set `hasUnsavedChanges = true`

### 3. Platform Admin View Profile Action
**File:** `src/app/(admin)/admin/users/page.tsx`
- Added `useRouter` from `next/navigation`
- Added `User` icon import from `@/lib/icons`
- Changed the "View Profile" dropdown item from a no-op to `router.push(\`/admin/users/${user.id}\`)`

**New File:** `src/app/api/admin/users/[id]/route.ts`
- `GET` endpoint that returns comprehensive user profile data:
  - Basic info: name, email, role, status, phone, approval, last activity, created date
  - Organization info
  - If candidate: credentials, references, checklists, consent shares
  - If recruiter/client_admin: organization details (credits, BAA status, seat limit)
- Requires `platform_admin` or `super_admin` role

**New File:** `src/app/(admin)/admin/users/[id]/page.tsx`
- Full user profile page with:
  - Profile header card (avatar, name, role badge, status badge, approval badge, must-reset-password badge)
  - Info grid: email, phone, organization, last activity, joined date, profile completion (for candidates)
  - Candidate-specific sections: Credentials table, References table, Checklists table, Recent Shares table
  - Recruiter/Client Admin: Organization details card (name, credits, BAA status, seat limit)
  - Back button to return to users list
  - Loading skeleton and error states

### 4. Announcements Email Campaigns Enhancement
**File:** `src/app/api/superadmin/announcements/route.ts`
- Added `send_campaign` action to the POST handler
- Takes `{ announcementId, targetRoles, sendEmail, emailTemplate }`
- Supports segment types: `all_candidates`, `all_recruiters`, `expiring_credentials`, `inactive_users`, or specific role arrays
- Finds matching users from the database
- Sends emails in batches of 10 using `sendEmail()` from `@/lib/email`
- Creates in-app notifications for all target users via `notification.createMany()`
- Logs the campaign to `AuditLog`
- Returns `{ sentCount, failedCount, totalTargets, notificationsCreated }`

**File:** `src/app/(superadmin)/superadmin/announcements/page.tsx`
- Replaced the placeholder "Send" button with functional campaign sending
- Added "Attach Announcement" dropdown to link an active announcement to the campaign
- Added `sendingCampaign` loading state with spinner
- Shows campaign result card after sending (emails sent, notifications created, failures)
- Toast notifications on success (with counts) or partial failure (warning)
- Error handling for failed campaigns
