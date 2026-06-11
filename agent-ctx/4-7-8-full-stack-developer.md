# Worklog: Task 4-7-8

**Agent**: full-stack-developer
**Date**: 2024-03-05

## Summary of Changes

Modified `/home/z/my-project/src/app/(recruiter)/recruiter/vaultsign/editor/[id]/page.tsx` to implement three issues.

## Issue #4: Header & Footer Settings UI Panel

### State Variables Added
- `headerConfig` state with defaults: `show_logo: true`, `show_company_name: true`, `show_contact: true`, `show_address: true`, `show_document_title: true`
- `footerConfig` state with defaults: `show_rights_reserved: true`, `show_powered_by: true`, `show_page_numbers: true`

### Parsing on Fetch
- In `fetchDocument()`, added parsing of `data.header_config` and `data.footer_config` from the API response, handling both string (JSON) and object types with try/catch.

### Save Payload
- In `handleAutoSave()`, added `header_config: headerConfig` and `footer_config: footerConfig` to the JSON body sent to `/api/vaultsign/documents/${docId}/save-draft`.

### UI Panel
- Added a "Header & Footer" collapsible section in the right sidebar (`signersPanelContent`) ABOVE the Signers section.
- 5 header toggles: Show Logo, Show Company Name, Show Contact, Show Address, Show Doc Title
- 1 Separator between header and footer
- 3 footer toggles: Show Rights Reserved, Show Powered by, Show Page Numbers
- Each toggle uses a custom rounded button with a sliding dot indicator, styled with green (#166534) for on and gray (#D1D5DB) for off.

## Issue #7: Send for Signature Button

### State
- Added `sending` state variable (boolean, default false)

### Handler
- Added `handleSendForSignature()` function that:
  1. Saves the document first via `handleSave()`
  2. POSTs to `/api/vaultsign/documents/${docId}/send`
  3. On success: shows success toast and redirects to `/recruiter/vaultsign/${docId}`
  4. On failure: shows error toast with message

### Button
- Added green "Send for Signature" button in the top bar after the "Export PDF" button
- Uses `Send` icon (already imported from `@/lib/icons`)
- Shows loading spinner (`Loader2`) when `sending` is true
- Disabled when `sending` is true or `document?.status !== "draft"`
- Text hidden on small screens with `hidden sm:inline`

## Issue #8: Mobile Toolbar

The mobile toolbar already existed in the file (lines 1198-1258 approximately), implemented identically to the superadmin template editor pattern. It includes:
- Bold, Italic, Underline, Strikethrough buttons
- Separator
- Align Left, Center, Bullet List, Numbered List buttons
- Separator
- Undo, Redo buttons
- More dropdown with: Align Right, Justify, Page Break, Insert Table, Insert Image

No changes were needed for this issue as it was already implemented.

## Verification
- Ran `bun run lint` - no errors in the modified file
- Dev server running successfully with no compilation errors
