---
Task ID: 1
Agent: Main Agent
Task: Redesign VaultSign dashboard, create Upload PDF page, update wizard for template pre-selection

Work Log:
- Read and analyzed current VaultSign dashboard page at /src/app/(recruiter)/recruiter/vaultsign/page.tsx
- Read and analyzed current New Document wizard at /src/app/(recruiter)/recruiter/vaultsign/new/page.tsx
- Analyzed uploaded screenshot showing the current UI with PDF render error
- Redesigned dashboard page with two sections: "Start with a Template" (primary) and "Your Documents"
- Added "Upload Custom PDF" outlined button and "New Document" primary button to header
- Created template grid with 3-column layout, hover effects, type badges with emoji icons
- Added template loading skeleton and empty state with fallback buttons
- Created dedicated upload page at /src/app/(recruiter)/recruiter/vaultsign/upload/page.tsx (1310 lines)
- Upload page has 3-step wizard: Upload & Details, Add Signers & Place Fields, Review & Save
- Step 1: Drag-and-drop upload, document details form, PDF preview side by side
- Step 2: Signer management, field placement with DraggableField, PDF preview with overlays
- Step 3: Review summary with Save as Draft and Save & Send buttons
- Save flow: POST create → POST upload → PUT fields → POST send (if Save & Send)
- Updated New Document wizard to support ?template=ID URL parameter
- Added useSearchParams and Suspense wrapper for template pre-selection
- When template ID in URL: auto-selects template, hides mode selection buttons, shows template indicator
- Build passed successfully with no errors

Stage Summary:
- Dashboard now shows templates as primary view with "Upload Custom PDF" button at top right
- New upload page provides complete PDF upload → preview → edit → save flow
- Template cards link to /recruiter/vaultsign/new?template={id} for quick document creation
- Saved drafts appear in "Your Documents" section with Send action
- New Document wizard auto-selects template when coming from dashboard
