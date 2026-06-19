# Task 5d — Fix ALL hardcoded hex color values in VaultSign pages and error boundaries

## Summary
Replaced all hardcoded hex color values across 7 VaultSign-related files with design system tokens and shared status color utilities.

## Files Changed

### `/src/lib/status-colors.ts` (shared utility updates)
- Changed `partially_signed` label from "In Progress" to "Partially Signed"
- Added `sent` key to `signerStatusColors`
- Added `label` field to `signerStatusColors` type

### `/src/app/(recruiter)/recruiter/vaultsign/page.tsx`
- Removed local `STATUS_CONFIG` map → imported `vaultSignStatusColors`
- 14+ hex color replacements in Tailwind classes and inline styles
- `.color` → `.text` API migration

### `/src/app/(recruiter)/recruiter/vaultsign/[id]/page.tsx`
- Removed local `STATUS_CONFIG` + `SIGNER_STATUS_CONFIG` → imported shared utilities
- Created local `SIGNER_ICON_MAP` for icon-only mapping
- 6 hex color replacements

### `/src/app/(recruiter)/recruiter/vaultsign/signer/[id]/page.tsx`
- 7 hex color replacements (`#D1D5DB`, `#DC2626`, `#F0FDF4`)

### `/src/app/(candidate)/vaultsign/page.tsx`
- Removed `STATUS_CONFIG` + `DOC_STATUS_CONFIG` → imported shared utilities
- 12+ hex color replacements + `bg-[#F0FDF4]` → `bg-primary-light`

### `/src/components/vaultsign/signing-error-boundary.tsx`
- Full inline style → className conversion (all `#FEF3C7`, `#FEF2F2`, `#FECACA`, `#DC2626`, `#166534`, `#14532D`, `#374151`, `#E5E7EB`, `#FFFFFF` replaced)
- Removed all `onMouseOver`/`onMouseOut` handlers in favor of CSS hover classes

### `/src/components/vaultsign/vaultsign-error-boundary.tsx`
- Same comprehensive conversion as signing-error-boundary
- All inline hex styles → design token classNames

### `/src/app/sign/[token]/page.tsx`
- 6 hex color replacements (`#D97706`, `#DC2626`, `#FEF2F2`, `#F0FDF4`)

## Lint Status
- Zero new errors; only pre-existing errors in `pdfmake-server.ts` and `pdf.worker.min.mjs`
