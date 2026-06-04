# Task: Super Admin Dashboard Pages for MyZipVault

## Summary
Created 6 API routes and 6 full page implementations for the Super Admin section of MyZipVault healthcare credential verification SaaS.

## API Routes Created

### 1. `/api/superadmin/dashboard/route.ts`
- **GET**: Returns platform health data including users by role, revenue this month, credits purchased vs spent (today & month), pending admin approvals, error count today, active announcements, last 5 errors, last 5 signups, pending admin list.
- Auth: Verifies `super_admin` role via session.

### 2. `/api/superadmin/users/route.ts`
- **GET**: Full user list with filters (search, role, status, last login range, profile completion %). Paginated at 20/page.
- **POST**: Actions — `force-reset-password`, `suspend`, `ban`, `unsuspend`, `proxy-login`. Prevents actions on super_admin users (except password reset). Logs all actions to AuditLog.

### 3. `/api/superadmin/companies/route.ts`
- **GET**: All organizations with credit transaction ledgers and seat usage.
- **POST**: Actions — `create`, `edit`, `set-credits`, `set-seat-limit`, `set-baa-status`, `swap-email`, `delete`.

### 4. `/api/superadmin/admins/route.ts`
- **GET**: All platform_admin and super_admin users with their permissions.
- **POST**: Actions — `create` (with temp password generation), `set-permissions` (granular), `approve`, `reject`, `delete`. 10 permission types supported.

### 5. `/api/superadmin/settings/route.ts`
- **GET**: All platform settings and feature flags.
- **POST**: Two action types — `update-setting` and `toggle-feature-flag`. Uses upsert for both.

### 6. `/api/superadmin/api-vault/route.ts`
- **GET**: Lists 5 API services (Stripe, SendGrid, Twilio, Affinda, Supabase) with masked keys and status.
- **POST**: Save/update API key. Keys are stored in `encrypted_key` field (encrypted in production). Full key never exposed.

## Pages Created

### 1. Super Admin Dashboard (`/superadmin/dashboard`)
- Stats cards: Total Users, Revenue This Month, Credits Purchased Today, Active Errors
- Revenue snapshot: credits purchased vs spent (bar comparison with progress bars)
- Pending admin approvals queue
- Error log feed (last 5 errors with severity badges)
- Recent signups (last 5 with role badges)
- Quick actions grid + active announcements count

### 2. User Management — God Mode (`/superadmin/users`)
- Search by any field (email, name, phone)
- Advanced filters panel: Role (5 options), Account Status, Last Login range, Profile Completion %
- Users table with: Name, Email, Role, Organization, Status, Profile %, Last Login, Actions dropdown
- Actions: View Details, Force Password Reset, Suspend/Unsuspend, Ban, Proxy Login
- CSV Export with PII redaction toggle
- Paginated (20 per page) with navigation
- Confirmation dialogs for all destructive actions

### 3. Company Management (`/superadmin/companies`)
- Companies list with: Name, Credits Balance, BAA Status, Seat Usage, Created Date, Action buttons
- "Add Company" dialog with: Name, initial credits, seat limit, custom pricing notes
- Edit company dialog (name, pricing notes)
- Adjust credits dialog (add/deduct with description)
- Set seat limit dialog
- Set BAA status dialog (pending/signed/expired with signer info)
- Swap email dialog
- Expandable credit transaction ledger per company
- Delete company with confirmation

### 4. Admin Team Management (`/superadmin/admins`)
- Pending approvals queue (amber-themed card with Approve/Reject buttons)
- Active admins list with permission badges
- "Create Admin" dialog with email, name, and permission checkboxes
- Per-admin permission toggles dialog (10 granular permissions)
- Delete admin with confirmation
- Super admin accounts are protected from modification

### 5. Platform Settings (`/superadmin/settings`)
- Checklist validity window (days) — number input
- Share link expiry defaults — comma-separated text input
- Credit cost matrix — per item type (Resume, Credential, Reference, Checklist)
- Save button per section
- Feature flags with toggle switches
- All settings fetched from and posted to `/api/superadmin/settings`

### 6. API & Infrastructure Vault (`/superadmin/api-vault`)
- Security warning banner
- 5 API services listed: Stripe, SendGrid, Twilio, Affinda, Supabase
- Each shows: Service name, description, key status (Set/Not Set), masked key preview, last updated date
- "Update Key" button opens dialog with masked/hidden input
- Service status grid showing connectivity
- Never exposes full API key values

## Schema Changes
- Added `ApiKey` model to Prisma schema with fields: id, service_name (unique), encrypted_key, updated_by, updated_at
- Added `api_keys_updated` relation on User model
- Ran `bun run db:push` successfully

## Design Patterns Used
- Teal/emerald brand colors throughout
- shadcn/ui components (Card, Badge, Button, Dialog, Table, Select, etc.)
- Lucide React icons
- Loading skeletons for all data sections
- Toast notifications via sonner
- Responsive layouts (mobile-first with sm:, lg: breakpoints)
- Custom scrollbar styling on overflow containers
- Confirmation dialogs for destructive actions
- Audit logging on all admin actions
