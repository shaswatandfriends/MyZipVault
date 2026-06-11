# Task 4-superadmin: Header & Footer Settings UI

**Agent**: full-stack-developer  
**Date**: 2026-03-05

## What Was Done

Added a "Header & Footer Settings" section to the superadmin template editor page at `/home/z/my-project/src/app/(superadmin)/superadmin/vaultsign/templates/[id]/page.tsx`.

### Changes Made:

1. **Added state variables** for `headerConfig` and `footerConfig`:
   - `headerConfig` with fields: `show_logo`, `show_company_name`, `show_contact`, `show_address`, `show_document_title` (all default `true`)
   - `footerConfig` with fields: `show_rights_reserved`, `show_powered_by`, `show_page_numbers` (all default `true`)

2. **Added parsing logic in `fetchTemplate`** to read `header_config` and `footer_config` from the template data, with JSON.parse fallback for string values and try/catch for safety.

3. **Updated `handleAutoSave`** to include `header_config` and `footer_config` in the PATCH payload.

4. **Updated `handleSave`** (manual save) to include `header_config` and `footer_config` in the PATCH payload.

5. **Added Header & Footer Settings UI panel** in the right sidebar (`signersPanelContent`), positioned above the existing Signer Slots section. The panel includes:
   - A section header "Header & Footer Settings" with description text
   - **Header Settings** (5 toggle switches): Show Logo, Show Company Name, Show Contact / Phone+Email, Show Address, Show Document Title — each with a placeholder text showing what will appear (e.g., `{{company_name}}`, `{{company_phone}} | {{company_email}}`, `{{company_address}}`)
   - **Footer Settings** (3 toggle switches): Show Rights Reserved (`© 2025 {{company_name}}. All rights reserved.`), Show Powered by VaultSign (`Powered by VaultSign`), Show Page Numbers (`Page X of Y`)
   - Each toggle uses the custom switch pattern: green (`#166534`) when on, gray (`#D1D5DB`) when off, with a sliding white dot
   - A `Separator` divides the Header & Footer section from the Signer Slots section

### Files Modified:
- `/home/z/my-project/src/app/(superadmin)/superadmin/vaultsign/templates/[id]/page.tsx`

### Lint Status:
- No new lint errors introduced by the changes
- Dev server running successfully
