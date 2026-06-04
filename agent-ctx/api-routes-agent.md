# API Routes Creation - MyZipVault Healthcare Credential Verification SaaS

## Task Summary
Created 31 API route files covering all 6 categories specified in the requirements.

## Routes Created

### 1. Cron Routes (4 files)
- `src/app/api/cron/reminders/route.ts` - GET: Generates pending reminders from automated rules (reference_reminder_3_day, credential_expiry_30_day), with CRON_SECRET verification, duplicate checking
- `src/app/api/cron/reminders/skip/route.ts` - POST: Auto-skips unapproved reminders from previous days
- `src/app/api/cron/purge/route.ts` - GET: Permanently deletes accounts past 30-day grace period (preserves audit_logs)
- `src/app/api/cron/status-update/route.ts` - GET: Updates credential and checklist statuses based on expiration dates

### 2. Account Routes (3 files)
- `src/app/api/account/delete/route.ts` - POST: Candidate account deletion request (sets suspended_deleting, soft-deletes consent shares, sends email)
- `src/app/api/account/restore/route.ts` - POST: Candidate account restoration (sets active, restores non-expired consent shares)
- `src/app/api/candidate/account-status/route.ts` - GET: Check if account is suspended

### 3. Candidate Routes (6 files)
- `src/app/api/candidate/notifications/route.ts` - GET: fetch notifications (limit 50); PUT: mark read by IDs or markAllRead
- `src/app/api/candidate/notifications/read-all/route.ts` - POST: mark all notifications as read
- `src/app/api/candidate/profile/route.ts` - GET: fetch profile; PUT: update profile (first_name, last_name, phone)
- `src/app/api/candidate/change-password/route.ts` - POST: change password (verify current, bcrypt hash new)
- `src/app/api/candidate/recruiters/route.ts` - GET: list recruiters who sent requests
- `src/app/api/candidate/credentials/route.ts` - GET: list credentials; POST: upload new credential (base64 file storage)

### 4. Recruiter Credit & Search Routes (6 files)
- `src/app/api/recruiter/credits/purchase/route.ts` - POST: purchase credits (placeholder, no Stripe yet)
- `src/app/api/recruiter/credits/balance/route.ts` - GET: fetch current credit balance
- `src/app/api/recruiter/credits/transactions/route.ts` - GET: paginated transaction history, filterable by type
- `src/app/api/recruiter/credits/invoices/route.ts` - GET: fetch invoices
- `src/app/api/recruiter/candidate-search/route.ts` - GET: search candidates by email/name (only authorized via consent share or checklist request)
- `src/app/api/recruiter/baa/status/route.ts` - GET: fetch BAA status; POST: sign BAA

### 5. Admin Detail Routes (8 files)
- `src/app/api/admin/users/[id]/route.ts` - GET: fetch user; PUT: suspend/unsuspend; DELETE: not implemented
- `src/app/api/admin/users/[id]/reset-password/route.ts` - POST: reset password to temp
- `src/app/api/admin/documents/[id]/verify/route.ts` - PUT: verify credential, recalculate profile_completion_pct
- `src/app/api/admin/documents/[id]/reject/route.ts` - PUT: reject credential, send rejection email
- `src/app/api/admin/reminders/[id]/approve/route.ts` - PUT: approve reminder, send email
- `src/app/api/admin/reminders/[id]/skip/route.ts` - PUT: skip reminder
- `src/app/api/admin/reminders/approve-all/route.ts` - PUT: approve all pending reminders
- `src/app/api/admin/content/checklist-templates/route.ts` - GET/POST: list/create checklist templates
- `src/app/api/admin/content/reference-questions/route.ts` - GET/POST: list/create reference questions
- `src/app/api/admin/content/skills/route.ts` - GET/POST: list/create skills

### 6. SuperAdmin Detail Routes (11 files)
- `src/app/api/superadmin/users/[id]/route.ts` - GET: fetch user; PUT: suspend/unsuspend/ban; DELETE: permanent delete
- `src/app/api/superadmin/admins/[id]/route.ts` - GET: fetch admin; PUT: update permissions; DELETE: delete admin
- `src/app/api/superadmin/admins/[id]/approve/route.ts` - PUT: approve pending admin
- `src/app/api/superadmin/companies/[id]/route.ts` - GET: fetch org; PUT: edit org; DELETE: delete org
- `src/app/api/superadmin/companies/[id]/credits/route.ts` - PUT: adjust organization credits
- `src/app/api/superadmin/reminders/[id]/approve/route.ts` - PUT: approve reminder
- `src/app/api/superadmin/reminders/[id]/skip/route.ts` - PUT: skip reminder
- `src/app/api/superadmin/reminders/approve-all/route.ts` - PUT: approve all pending reminders
- `src/app/api/superadmin/proxy-login/route.ts` - POST: create proxy session (audit log)
- `src/app/api/superadmin/proxy-login/exit/route.ts` - POST: exit proxy session (audit log)
- `src/app/api/superadmin/compliance/purge/[userId]/route.ts` - POST: immediate full purge
- `src/app/api/superadmin/compliance/purge-queue/route.ts` - GET: list users pending purge
- `src/app/api/superadmin/compliance/invoice/route.ts` - POST: generate compliance invoice

## Key Implementation Details
- All routes use `import { db } from '@/lib/db'` for database access
- All routes use `getServerSession(authOptions)` for authentication
- All routes use snake_case field names matching the Prisma schema
- Proper role-based authorization on all protected routes
- Try/catch error handling with appropriate HTTP status codes
- CRON_SECRET verification on cron endpoints
- Audit log creation for sensitive operations (proxy login, compliance purge)
- Profile completion recalculation on credential verification
