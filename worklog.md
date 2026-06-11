---
Task ID: 1-3
Agent: Main Agent
Task: Fix three critical VaultSign bugs - PDF rendering, Word format preservation, and PDF export spinner

Work Log:
- Analyzed all three screenshots using VLM to understand the exact issues
- Screenshot 1: Original document with proper formatting (colors, fonts, spacing)
- Screenshot 2: PDF signer showing "Failed to render PDF" with "Page 1 of 0"
- Screenshot 3: Word editor with stripped formatting + "Failed to export PDF" + stuck "Generating PDF..." spinner
- Created enhanced docx-to-html converter (/src/lib/vaultsign/docx-to-html.ts) that parses .docx XML to preserve formatting (colors, fonts, sizes, spacing, alignment, tables)
- Updated upload API (/src/app/api/vaultsign/documents/upload/route.ts) to use the new converter instead of mammoth
- Fixed editor page (/src/app/(recruiter)/recruiter/vaultsign/editor/[id]/page.tsx) to properly handle HTML content and fix the PDF export spinner (toast.loading/toast.dismiss pattern)
- Added htmlToPdfmake function to tiptap-to-pdfmake.ts for converting HTML content to PDF when tiptap_content is HTML format
- Completely rewrote PDF signer page (/src/app/(recruiter)/recruiter/vaultsign/signer/[id]/page.tsx) with:
  - Multi-strategy PDF URL resolution (signed-url API → export-pdf → fallback to stored URL)
  - Proper pdfjs-dist loading with data URL and HTTP URL handling
  - Canvas rendering with cancellation support and error recovery
  - Error/loading/empty states with retry button
  - Rendering indicator overlay
- Created new signed-url API endpoint (/src/app/api/vaultsign/documents/[id]/signed-url/route.ts) for lightweight PDF URL signing
- Rewrote export-pdf API to handle both TipTap JSON and HTML content formats
- Fixed TypeScript errors in all modified files
- Verified successful build

Stage Summary:
- Three critical bugs fixed:
  1. PDF rendering: Multi-strategy URL resolution + proper pdfjs-dist loading + error states
  2. Word format: New docx-to-html XML parser preserves colors, fonts, sizes, spacing
  3. PDF export spinner: Fixed toast.loading pattern with proper dismiss, + HTML content support
- New files created: docx-to-html.ts, signed-url/route.ts
- Modified files: upload/route.ts, editor/[id]/page.tsx, signer/[id]/page.tsx, export-pdf/route.ts, tiptap-to-pdfmake.ts
