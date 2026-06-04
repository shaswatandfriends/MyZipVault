# Task 16+17: SMS Toggle Validation & Email Template Variable Preview

## Summary

Implemented both Part A (SMS Toggle Validation + Coming Soon Badges) and Part B (Email Template Variable Preview) for MyZipVault.

## Part A: SMS Toggle Validation + Coming Soon Badges

### A-1: Backend Validation (route.ts)
- **File**: `src/app/api/superadmin/feature-flags/route.ts`
- Updated error message to match spec: "Cannot enable SMS notifications: Twilio API keys not configured in the API Vault"
- Validation already existed in the PUT handler; error message was refined

### A-2: Feature Flags Page UI
- **File**: `src/app/(superadmin)/superadmin/feature-flags/page.tsx`
- Added `Info` icon import and `Tooltip` component imports
- Added computed variables: `isSmsFlag`, `twilioConfigured`, `smsDisabled`
- **"Setup Required" badge**: Shown next to SMS toggle when Twilio is not configured (amber styling with AlertTriangle icon, wraps in Tooltip with explanation)
- **"SMS Off" badge**: Only shown when Twilio IS configured but SMS is disabled (replaces old badge that showed regardless)
- **Info text**: "Requires Twilio API keys in API Vault" shown below SMS toggle when Twilio not configured
- **Disabled toggle**: Switch is disabled + has opacity-50 when Twilio keys not configured, with Tooltip explaining why
- **Row highlighting**: SMS row gets `bg-muted/30` background when Twilio not configured
- **Icon color change**: SMS icon turns amber when Twilio not configured

### A-3: Candidate Settings
- **File**: `src/app/(candidate)/settings/page.tsx`
- No SMS notification setting exists on this page — no changes needed per spec

## Part B: Email Template Variable Preview

### B-1: Enhanced Template Editor Page
- **File**: `src/app/(superadmin)/superadmin/templates/page.tsx`
- Complete rewrite with significant enhancements:

#### Variable Extraction from Template Body
- Added `extractVariables()` function using regex `/\{\{(\w+)\}\}/g` to find all `{{variable_name}}` patterns
- `detectedSubjectVars`, `detectedBodyVars`, `allDetectedVars` computed via `useMemo`
- New **"Detected Variables"** card shows only variables actually used in the current template
- Each detected variable chip shows the variable name plus sample data preview (e.g., `{{candidate_name}} → Jane Nurse`)

#### Clickable Variable Chips for Cursor Insert
- Variables now **insert at cursor position** instead of just copying to clipboard
- Uses `useRef` for both subject input and body textarea to track cursor position
- `cursorTarget` state tracks which field (subject/body) is focused
- Clicking a variable chip inserts `{{var_name}}` at the current cursor position in the active field
- Current target field shown as badge in Detected Variables card

#### Collapsible Variable Reference
- "Available Variables" panel is now collapsible (chevron toggle)
- Variables detected in the template are highlighted with violet styling and "used" badge
- Undetected variables use teal styling

#### Updated Template Variables
- Added new variables per spec: `organization_name`, `client_name`, `document_name`, `invite_link`, `login_link`, `reset_link`, `purchase_link`, `manager_name`, `nurse_name`, `review_notes`, `credits_remaining`, `deletion_date`
- Total of 22 available variables

#### Updated Sample Data
- Matches spec exactly:
  - candidate_name → "Jane Nurse"
  - organization_name → "Acme Staffing"
  - client_name → "Sarah Recruiter"
  - checklist_name → "ICU Nurse Skills Checklist"
  - document_name → "BLS Certification"
  - invite_link → "https://myzipvault.com/onboard?token=abc123"

#### Enhanced Preview Dialog
- Shows variable preview mapping at bottom (which variables → which sample values)
- Unknown variables flagged as "No sample data" in amber
- Body preview has max height with scroll

#### Send Test Email
- New "Send Test" button in editor header
- Opens dialog with recipient email pre-filled from session user
- Shows sample data mapping that will be used
- Loading state with spinner

### B-2: Send Test Email API Route
- **File**: `src/app/api/superadmin/templates/send-test/route.ts`
- POST endpoint for super_admin only
- Replaces template variables with sample data
- Prepends `[TEST]` prefix to subject line
- Adds visual test email banner at top of HTML
- Falls back to console logging if Brevo API key not configured
- Creates audit log entry for test email action
- Unknown variables replaced with `[var_name]` placeholder

## Files Modified
1. `src/app/api/superadmin/feature-flags/route.ts` — Updated error message
2. `src/app/(superadmin)/superadmin/feature-flags/page.tsx` — UI enhancements for SMS toggle
3. `src/app/(superadmin)/superadmin/templates/page.tsx` — Complete template editor enhancement
4. `src/app/api/superadmin/templates/send-test/route.ts` — New API route (created)

## Lint Status
✅ All files pass ESLint cleanly
