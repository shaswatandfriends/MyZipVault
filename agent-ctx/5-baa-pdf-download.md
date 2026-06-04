# Task 5: BAA Signing PDF Generation & Download

## Summary
Updated the BAA signing flow to generate a PDF document, upload it to Supabase Storage, save the document URL, and allow downloading the signed PDF.

## Files Modified

### 1. `/src/lib/storage.ts`
- Added `BUCKET_INVOICES = "invoice-pdfs"` constant
- Added `INVOICES: BUCKET_INVOICES` to `STORAGE_BUCKETS` export

### 2. `/src/app/api/recruiter/baa/route.ts`
- **Imports**: Added `generateBaaPdf` from `@/lib/pdf` and `uploadFile, STORAGE_BUCKETS` from `@/lib/storage`
- **GET handler**: Added `baa_document_url` to the select query and returns `baaDocumentUrl` in the response
- **POST handler**: After updating org status to "signed":
  1. Fetches BAA content from `platform_settings`
  2. Generates a BAA PDF using `generateBaaPdf` with organization name, signer name/title, BAA content, and signed_at date
  3. Uploads the PDF buffer to Supabase Storage in the "baa-documents" bucket under `org-{id}/` folder
  4. Updates the organization record with `baa_document_url`
  5. PDF generation failure is non-fatal (wrapped in try/catch) — BAA signing still succeeds
  6. Returns `baaDocumentUrl` in the POST response

### 3. `/src/app/api/recruiter/baa/download/route.ts` (NEW)
- GET handler that:
  1. Authenticates user (client_recruiter or client_admin)
  2. Verifies BAA status is "signed"
  3. Checks that `baa_document_url` exists
  4. Generates a signed URL with 15-minute expiry via `getSignedUrl`
  5. For base64 URLs (Supabase not configured): returns JSON `{ url, isBase64: true }`
  6. For Supabase URLs: redirects to the signed URL

### 4. `/src/app/(recruiter)/recruiter/baa/page.tsx`
- Added `Download` icon import from lucide-react
- Added `baaDocumentUrl` to `BAAOrganization` interface
- Added `isDownloading` state and `handleDownload` function
- Added `hasDocumentUrl` computed property
- In the "BAA Already Signed" section, added a "Download BAA" button (shown only when `baaDocumentUrl` exists)
- Download button has loading state with spinner
- Handles both base64 data URLs and Supabase signed URLs
