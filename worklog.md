# Worklog

---
Task ID: 1
Agent: Main Agent
Task: Fix VaultSign PDF text editor mapping, send document error, and signout issues

Work Log:
- Analyzed screenshots showing: (1) small box instead of full text overlays when Edit Text clicked, (2) "Failed to create document" error at Step 4 send, (3) signout not working
- Root cause #1: TextLayer API already outputs `left`/`top` as CSS percentages (e.g., "12.34%"), but code was double-converting them (treating percentage values as pixels, dividing by page width × 100), squishing all text items into top-left ~13% of page
- Root cause #2: `/api/vaultsign/documents/upload` route was MISSING entirely — PDF upload fails → document has no URL → send fails with "Document must have a PDF uploaded before sending"
- Root cause #3: Custom `/api/auth/signout/route.ts` intercepted NextAuth's built-in signout endpoint, preventing JWT cookie from being cleared
- Fixed text mapping: Removed double-conversion, now uses `parseFloat(style.left)` directly as percentage value
- Fixed font height: Stripped "px" suffix from `--font-height` CSS property that TextLayer adds
- Fixed HiDPI: Normalized `--scale-x` by dividing by `devicePixelRatio` on Retina displays
- Fixed text content: Always render text in divs (transparent when not editing) so divs have proper width for clicking
- Created missing upload API route at `/api/vaultsign/documents/upload/route.ts` with file upload, storage, and audit logging
- Fixed POST handler role check to include `client_admin` alongside `client_recruiter`
- Deleted custom signout route that blocked NextAuth's built-in signout
- Updated all sidebar signout buttons to use role-specific login redirect URLs

Stage Summary:
- Text mapping now correctly positions text items across the full PDF page
- Document upload route created — documents can now be uploaded and sent for signature
- Signout now properly clears NextAuth JWT session cookie
- All sidebar signout buttons redirect to role-specific login pages
- Build passes successfully
