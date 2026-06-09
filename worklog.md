---
Task ID: 1
Agent: Main Agent
Task: Fix VaultSign PDF preview, signature field positioning, and multiple critical bugs

Work Log:
- Explored entire VaultSign codebase (29 files) and identified all critical bugs
- Fixed POST /api/vaultsign/documents: template-based documents now copy original_document_url from template
- Fixed GET /api/vaultsign/documents: added stats computation (pending, completed_this_month, declined, expiring_soon)
- Fixed GET /api/vaultsign/documents: added search support via "search" query param (OR filter on signer name + document name)
- Rewrote sign/[token]/page.tsx with proper PDF rendering using calculated scale and explicit wrapper dimensions
- Fixed signature field positioning by using explicit pixel dimensions on the wrapper div instead of inline-block
- Changed from single shared signature state to per-field signature storage (fieldSignatures map)
- Updated submit API to accept all_signatures per-field data with backward compatibility
- Updated pdf-sign.ts to use per-field signatures when generating final PDF (with legacy fallback)
- Fixed DraggableField component: added touch support (touchstart, touchmove, touchend)
- Fixed DraggableField delete button: changed from hover-only to always visible when selected
- Fixed party_number duplication bug when adding/removing signers
- Fixed allSigners mapping to use correct party_number from form
- Added Object URL memory leak cleanup on unmount
- Added canvasDims state tracking for accurate PDF overlay sizing in both editor and sign page

Stage Summary:
- VaultSign PDF preview now works for both template and uploaded documents
- Signature fields position correctly on PDF using percentage-based coordinates with explicit container sizing
- Each signature field now stores its own signature data independently
- Recruiter dashboard stats now display correctly
- Search functionality in recruiter dashboard works
- Touch support added for mobile field dragging
- Build compiles successfully with no errors
