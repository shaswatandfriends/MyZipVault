# Task 4 - All Recruiters Page for Skill Checklist

## Summary
Created the All Recruiters page for the Skill Checklist section with 4 API routes and a full-featured page component.

## Files Created

### API Routes
1. `/src/app/api/superadmin/skill-checklist/recruiters/route.ts` — GET: List all recruiters (client_recruiter, client_admin) with search, company filter, pagination
2. `/src/app/api/superadmin/skill-checklist/recruiters/[id]/password/route.ts` — GET: Return plain_password for a recruiter
3. `/src/app/api/superadmin/skill-checklist/recruiters/[id]/reset-password/route.ts` — POST: Reset password with bcrypt hashing, audit log
4. `/src/app/api/superadmin/skill-checklist/recruiters/[id]/toggle-status/route.ts` — POST: Toggle account_status between active/suspended, audit log

### Page Component
5. `/src/app/(superadmin)/superadmin/skill-checklist/recruiters/page.tsx` — Full page with search, company filter, table, and 4 action dialogs

## Key Features
- Search by name/email
- Company filter dropdown
- Table with Name, Email, Company, Status, Last Active, Actions
- View Password dialog (masked with Show/Hide toggle)
- Reset Password dialog (new + confirm, validation)
- Toggle switch (activate/suspend)
- Delete with confirmation
- Pagination
- Loading skeletons and empty states
- Toast notifications for all actions
- Audit logging for password resets and status changes

## Lint Status
All new files pass lint with zero errors.
