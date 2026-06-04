# Task 10: Download Packet Feature Implementation

**Agent**: Main Developer  
**Status**: Completed

## Summary

Implemented the Download Packet feature for MyZipVault, enabling recruiters to download individual documents and bulk-download all unlocked documents as a ZIP file.

## Files Created

### `/src/app/api/recruiter/download-packet/route.ts`
- **GET handler** with query params: `?candidateId=X&format=zip` or `?candidateId=X&docType=checklist&docId=Y`
- **Auth**: Requires `client_admin` or `client_recruiter` role; verifies org-level access to the candidate
- **Individual download** (`docType` + `docId`):
  - `checklist`: Generates checklist PDF via `generateChecklistPdf`, returns as downloadable response
  - `credential`: Generates signed URL for the credential file, redirects
  - `resume`: Generates signed URL for the resume file, redirects
  - `reference`: Generates reference PDF via `generateReferencePdf`, returns as downloadable response
- **ZIP download** (`format=zip`):
  - Gathers all unlocked documents for the candidate
  - Generates PDFs for checklists and references
  - Fetches credential/resume files via signed URLs
  - Uses `archiver` to create a ZIP with organized folders (Checklists/, Credentials/, Resume/, References/)
  - Returns ZIP as downloadable response with proper headers
- **Helper functions**:
  - `buildChecklistPdfData()` - Fetches CandidateChecklistResponse with skills, groups by category
  - `buildReferencePdfData()` - Fetches CandidateReference with responses and questions
  - `requireRecruiter()` - Auth/role check
  - `sanitizeFileName()`, `getExtensionFromUrl()`, `streamToBuffer()` - Utilities

## Files Modified

### `/src/app/(recruiter)/recruiter/candidates/[id]/page.tsx`
- Added `FileDown`, `Archive` icon imports (replaced unused `Download` icon)
- Added state: `downloadingAll`, `downloadingDocId`
- Added `handleDownloadDoc()` - Downloads individual document via API, handles redirect (signed URL) vs blob (PDF) responses
- Added `handleDownloadAll()` - Downloads all unlocked docs as ZIP via API
- **Page Header**: Added "Download All (ZIP)" button (emerald, with Archive icon) shown only when accessible docs exist
- **Accessible Documents list**: Replaced placeholder download button with functional `FileDown` icon button per document, with loading spinner state

## Key Design Decisions
1. **PDF generation on-the-fly**: Checklist and reference PDFs are generated at download time, not stored, ensuring always-current content
2. **Signed URL redirect for credentials/resumes**: These are stored files, so the API redirects to a signed URL rather than proxying the content
3. **ZIP organization**: Files are organized in subfolders (Checklists/, Credentials/, Resume/, References/) for clarity
4. **Error resilience in ZIP**: Individual document failures are caught and logged, allowing the ZIP to still be generated with the remaining documents
5. **Access verification**: Every download checks the `UnlockedDocument` table to ensure the recruiter has actually unlocked the document
