# Task 6: Invoice PDF Generation Flow

## Summary
Implemented the complete Invoice PDF generation flow for MyZipVault, including both recruiter and superadmin API routes and frontend download buttons.

## Files Created

### 1. `/home/z/my-project/src/app/api/recruiter/billing/invoice-pdf/route.ts`
- GET handler with `?invoiceId=` query param
- Requires `client_admin` or `client_recruiter` role
- Fetches invoice from DB with organization relation
- Ensures invoice belongs to the user's organization (authorization check)
- If invoice already has `pdf_url`, generates a signed URL and returns it
- If no PDF exists, generates one using `generateInvoicePdf` from `@/lib/pdf`
  - Invoice number format: `INV-{id.toString().padStart(5, '0')}`
  - Gets `credit_price_per_unit` from platform_settings
  - Falls back to $2.99 if not set
- Uploads PDF to Supabase Storage (invoice-pdfs bucket)
- Updates the invoice record with the `pdf_url`
- Returns signed URL (or base64 data URL if Supabase not configured)

### 2. `/home/z/my-project/src/app/api/superadmin/compliance/invoice-pdf/route.ts`
- Same logic as recruiter route but requires `super_admin` role
- No organization ownership check (superadmin can access any invoice)

## Files Modified

### 3. `/home/z/my-project/src/app/api/recruiter/billing/route.ts`
- Updated invoice response to use camelCase field names (`creditAmount`, `totalPrice`, `pdfUrl`, `createdAt`) matching the frontend interface

### 4. `/home/z/my-project/src/app/(recruiter)/recruiter/billing/page.tsx`
- Added `Invoice` interface with camelCase fields
- Added `invoices` field to `BillingData` interface
- Added `FileText` and `Download` icon imports
- Added `downloadingInvoiceId` state for loading indicator
- Added `handleDownloadInvoice` function that:
  - Fetches `/api/recruiter/billing/invoice-pdf?invoiceId=X`
  - Handles both base64 data URLs (converts to blob) and signed URLs
  - Opens PDF in new tab
- Added new "Invoices" card section with:
  - Empty state with FileText icon
  - Loading skeletons
  - Table with Invoice #, Date, Credits, Total, PDF columns
  - Download PDF button with loading spinner per invoice

### 5. `/home/z/my-project/src/app/(superadmin)/superadmin/compliance/page.tsx`
- Added `Loader2` icon import
- Added `downloadingInvoiceId` state
- Added `handleDownloadInvoicePdf` function (same logic as recruiter)
- Updated the invoice table PDF column button to be functional:
  - Calls `handleDownloadInvoicePdf(inv.id)` on click
  - Shows Loader2 spinner while downloading
  - Removed the conditional "Pending" text — button always available

## Key Design Decisions
- PDF generation is lazy: only generated on first download request
- Generated PDFs are stored in Supabase Storage and the URL is saved to the invoice record for subsequent requests
- Falls back to base64 data URL storage if Supabase is not configured
- Frontend handles both base64 and signed URL responses gracefully
- Both routes use consistent patterns matching existing API routes in the codebase
