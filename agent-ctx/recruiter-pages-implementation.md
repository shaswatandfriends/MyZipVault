# Task: Implement 4 Recruiter Pages for MyZipVault

## Summary
Replaced 4 placeholder recruiter pages with full implementations:

### 1. Candidate Detail Page (`src/app/(recruiter)/recruiter/candidates/[id]/page.tsx`)
- Back button linking to /recruiter/dashboard
- Candidate info header with avatar initials, name, email, phone, specialty, and status badges
- Progress pipeline: Sent → Opened → In Progress (X%) → Completed with horizontal stepper
  - Completed steps = green with checkmark, current = amber with progress %, future = gray
  - Timestamps under each step
  - Connecting lines between steps (green for completed, gray for future)
- Documents section split into:
  - "Accessible Documents" — cards with download buttons, green "Accessible" badge
  - "Locked Documents" — cards with Lock icon, amber "Locked" badge, "Unlock for 1 Credit" button
  - On unlock: POST to /api/recruiter/candidates/[id]/unlock with { consentShareId }, then reload
- Checklist progress: overall percentage bar + category breakdown with individual progress bars
- Fetches from /api/recruiter/candidates/[id]
- Loading skeletons, error handling, responsive grid layout, shadcn/ui, lucide-react, teal/emerald colors

### 2. Billing Page (`src/app/(recruiter)/recruiter/billing/page.tsx`)
- Large credit balance card with emerald gradient accent, big number display
- Purchase credits section: 4 package cards (10, 25, 50, 100 credits)
  - Each shows credit amount, price per credit, total, "Buy" button
  - Discount badges for packages with savings (5%, 10%, 20%)
  - On buy click: toast "Stripe integration coming soon"
- Transaction history table: Date | Description (with type icon) | Credits (+green/-red) | Balance After
  - Paginated (10 per page) with Previous/Next buttons
  - Filter by type: All, Purchases, Deductions, Refunds (Select dropdown)
- Fetches from /api/recruiter/billing with page and type query params
- Responsive, loading skeletons, shadcn/ui

### 3. BAA Page (`src/app/(recruiter)/recruiter/baa/page.tsx`)
- Fetches BAA content and status from /api/recruiter/baa
- If baa_status = pending/expired AND baa is required:
  - Status warning alert (amber)
  - BAA text in scrollable container with professional legal styling (serif font, max-height, proper spacing)
  - Signature section: Full Legal Name input, Title input, Checkbox agreement, "Sign BAA" button
  - On sign: POST to /api/recruiter/baa with { action: 'sign', fullName, title, agreed }, then reload
- If already signed: show "BAA Signed" green badge with signer name, title, date, and viewable agreement text
- If not required: info message "BAA is not required at this time"
- Professional, clean design with legal document feel

### 4. Team Management Page (`src/app/(recruiter)/recruiter/team/page.tsx`)
- Seat usage header: "X of Y seats used" with progress bar, available badge
  - Warning messages at 80%+ and 100% capacity
- Seat cards in a grid (1/2/3 columns responsive):
  - Each card: Avatar/initials, Name, Email, Status badge (Admin/Active)
  - Activity summary: "X credits used, Y requests sent"
  - "Change Email" button for recruiters → Dialog with new email input + Save button
- Empty seat cards with dashed borders and "Add Recruiter" ghost button
- "Add Recruiter" button → Dialog with Email, First Name, Last Name inputs + "Send Invite" button
  - POST to /api/recruiter/team with action 'add_recruiter'
- Change email: POST to /api/recruiter/team with action 'change_email'
- Fetches from /api/recruiter/team
- Responsive, loading skeletons, shadcn/ui Dialog, Card, Button, Input, Badge, Progress

## Lint Result
All 4 files pass `bun run lint` with zero errors.

## Design Patterns Followed
- Consistent with existing dashboard and send pages
- Uses `toast` from `sonner` for notifications
- Uses `PageHeader` component for page titles
- Uses shadcn/ui components throughout
- Emerald/teal brand colors
- Loading skeletons for all data-dependent sections
- Responsive layouts with mobile-first approach
- Custom scrollbar styling for scrollable areas
