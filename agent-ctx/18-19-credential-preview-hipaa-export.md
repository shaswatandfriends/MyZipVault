# Task 18 + 19: Credential Thumbnail Preview & HIPAA Data Export ZIP

## Task 18 - Credential Thumbnail Preview (Admin Document Verification)

### What was done:
- Modified `/home/z/my-project/src/app/(admin)/admin/documents/page.tsx`

### Changes:
1. **Added file type detection**: `detectFileType()` helper that classifies files as "pdf", "image", or "unknown" based on URL patterns and base64 data URL prefixes.

2. **Added signed URL helper**: `getSignedUrl()` client-side function that POSTs to `/api/storage/signed-url` with `{ bucket: 'credentials', filePath: fileUrl }` and returns the signed URL.

3. **Added filename extraction**: `getFileNameFromUrl()` to display PDF filenames in thumbnails.

4. **Thumbnail preview in card**:
   - For **images**: Shows a small `<img>` thumbnail with `object-cover` styling
   - For **PDFs**: Shows a red PDF icon (FileIcon) with truncated filename below
   - For **unknown**: Falls back to generic FileText icon
   - Hover overlay with Eye icon indicating click-to-preview

5. **Preview button**: Added an "Preview" button (Eye icon) next to Verify/Reject buttons for all documents.

6. **Preview dialog/modal**:
   - Full-size dialog (max-w-4xl)
   - Loading spinner while signed URL is fetched
   - **PDF**: rendered in `<iframe>` for in-browser viewing
   - **Image**: rendered as centered `<img>` with max-height constraint
   - **Unknown**: shows "Preview not available" fallback message
   - Shows document name, uploader info, and upload date

7. **Thumbnail preloading**: useEffect that prefetches signed URLs for all image-type documents when the document list loads, storing them in `thumbnailUrls` state.

### New imports: Eye, Loader2, ImageIcon, FileIcon from lucide-react

---

## Task 19 - HIPAA Data Export ZIP

### What was done:
1. Created `/home/z/my-project/src/app/api/superadmin/compliance/hipaa-export/route.ts`
2. Modified `/home/z/my-project/src/app/(superadmin)/superadmin/compliance/page.tsx`

### API Endpoint Details:
- **Route**: `GET /api/superadmin/compliance/hipaa-export?userId=X`
- **Auth**: Requires super_admin role
- **Output**: Downloads a ZIP file containing:

| File | Contents |
|------|----------|
| `manifest.json` | Export metadata (date, user, files list) |
| `profile.json` | User record + CandidateProfile |
| `credentials/credentials.json` | All credentials with signed file URLs |
| `resumes/resumes.json` | All resumes with signed file URLs and parsed data |
| `checklists/checklists.json` | Checklist responses with skill ratings |
| `references/references.json` | References with question/response data |
| `shares/consent-shares.json` | Consent share records with client info |
| `notifications/notifications.json` | Full notification history |
| `audit-log.json` | Complete audit trail for user |

- Signed URLs are generated for credential and resume files via `getSignedUrl()`
- Creates an audit log entry for the export action
- ZIP filename format: `hipaa-export-{email}-{date}.zip`

### Frontend Changes:
1. **Deletion Queue tab**: Added "Export (HIPAA)" button with Download icon next to each user's Restore and Purge buttons. Shows loading spinner during export.

2. **HIPAA Export tab**: Replaced the stub "Generate Export ZIP" + disabled "Download" buttons with a single "Download Export ZIP" button that directly downloads the ZIP from the new API endpoint.

3. **State**: Added `hipaaExportingId` to track which queue item is being exported.

### Lint: Clean (0 errors, 0 warnings)
