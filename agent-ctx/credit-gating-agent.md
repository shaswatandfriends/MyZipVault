# Task: Credit Gating with Feature Toggles and Low Credits Popup

## Summary
Implemented credit gating per company with feature toggles and a "Low credits, contact sales" popup for the MyZipVault platform.

## Files Created/Modified

### 1. `/home/z/my-project/src/lib/credit-gating.ts` (NEW)
- `checkCreditAccess(organizationId, featureName)` — Checks if org has enough credits + feature flag enabled
- `getCreditsRequired(featureName)` — Returns credit cost per feature
- `getFeatureGate(featureName)` — Checks FeatureFlag table (defaults to enabled if no flag exists)
- `deductCredits(organizationId, amount, description, userId)` — Deducts credits + creates CreditTransaction
- `isLowCredits(currentBalance)` — Checks if balance ≤ 5
- Credit costs: unlock_candidate=1, view_credentials=1, view_references=1, view_resume=1, send_share_request=0, view_full_packet=3

### 2. `/home/z/my-project/src/components/credit-low-popup.tsx` (NEW)
- Dialog popup that shows when credits ≤ 5
- Displays current balance prominently
- "Buy Credits" button → /recruiter/billing
- "Contact Sales" button → mailto:sales@myzipvault.com
- "Dismiss for 24 hours" with localStorage persistence
- Auto-fetches balance from /api/recruiter/credits/balance on mount
- Green color scheme, friendly design with Coins icon

### 3. `/home/z/my-project/src/app/(recruiter)/layout.tsx` (MODIFIED)
- Added CreditLowPopup component
- Only renders for client_admin and client_recruiter roles

### 4. `/home/z/my-project/src/app/api/recruiter/credits/gate/route.ts` (NEW)
- POST handler accepting { featureName }
- Uses checkCreditAccess utility
- Returns { allowed, creditsRequired, currentBalance }
- Returns 403 with message if not allowed

### 5. `/home/z/my-project/src/app/api/recruiter/candidates/[id]/unlock/route.ts` (MODIFIED)
- Replaced inline credit checking with checkCreditAccess()
- Maps entity type to appropriate feature name (credential→view_credentials, resume→view_resume, etc.)
- Uses deductCredits() utility instead of inline balance update + transaction create
- Returns 403 with detailed message on insufficient credits
- Variable credit charge based on feature cost (was hardcoded to 1)

## Lint Status
✅ All new code passes ESLint (0 errors, 2 pre-existing warnings in unrelated files)
