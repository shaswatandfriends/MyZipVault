# Task: Core Candidate Flow for MyZipVault

## Summary

Built the complete Core Candidate Flow for MyZipVault — a healthcare credential verification SaaS. All pages and API routes are production-quality with proper loading states, error handling, and responsive design using teal/emerald brand colors.

## Files Modified

### Configuration & Schema
- `prisma/schema.prisma` — Added InviteToken and ShareRequest models, updated User and Organization relations
- `src/app/globals.css` — Updated to teal/emerald primary brand color scheme
- `src/app/layout.tsx` — Added ThemeProvider and Sonner Toaster

### Authentication & Core
- `src/lib/auth.ts` — Added suspended_deleting account status check

### Pages (Frontend)
- `src/app/login/page.tsx` — Full login page with email/password, validation, role-based redirect, forgot password link
- `src/app/signup/page.tsx` — Full signup with password requirements, T&C checkbox, auto sign-in
- `src/app/onboard/page.tsx` — Token-based onboarding with invite validation, dynamic messaging
- `src/app/(candidate)/dashboard/page.tsx` — Dashboard with profile completion, status cards, thank you state, notifications
- `src/app/(candidate)/checklists/page.tsx` — Checklist list + form view with skill ratings, attestation, signature
- `src/app/(candidate)/vault/credentials/page.tsx` — Credentials vault with upload dialog, status badges, filtering
- `src/app/(candidate)/references/page.tsx` — References with request dialog, expandable details
- `src/app/(candidate)/sharing/page.tsx` — Sharing & consent with approve/deny per item, expiry selection
- `src/app/(candidate)/settings/page.tsx` — Change password, delete account with confirmation dialog

### API Routes
- `src/app/api/auth/signup/route.ts` — POST: candidate signup with password validation
- `src/app/api/auth/onboard/route.ts` — GET: validate token / POST: create account from invite
- `src/app/api/candidate/dashboard/route.ts` — GET: dashboard data aggregation
- `src/app/api/checklists/route.ts` — GET: list checklists/skills/ratings
- `src/app/api/checklists/rate/route.ts` — POST: auto-save skill rating
- `src/app/api/checklists/submit/route.ts` — POST: submit checklist with signature
- `src/app/api/credentials/route.ts` — GET: list credentials with status recalculation
- `src/app/api/credentials/upload/route.ts` — POST: upload credential with file as base64
- `src/app/api/references/route.ts` — GET: list references with responses
- `src/app/api/references/request/route.ts` — POST: create reference request
- `src/app/api/sharing/route.ts` — GET: list share requests and active shares
- `src/app/api/sharing/approve/route.ts` — POST: approve sharing with expiry
- `src/app/api/sharing/deny/route.ts` — POST: deny sharing request
- `src/app/api/users/change-password/route.ts` — POST: change password
- `src/app/api/users/delete-account/route.ts` — POST: soft-delete account

### Sidebar
- `src/components/sidebars/candidate-sidebar.tsx` — Updated active state logic for nested routes

## Design Decisions
- Teal/emerald primary color palette for healthcare feel
- Sonner for toast notifications (instead of shadcn toast)
- Linear/Vercel-inspired clean, modern design
- All pages fully responsive (mobile, tablet, desktop)
- Proper loading skeletons, error states, empty states
- All API routes have auth checks with proper error codes
