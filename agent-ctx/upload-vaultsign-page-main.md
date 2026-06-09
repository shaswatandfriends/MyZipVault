# Task: Create VaultSign Upload Custom PDF Page

## Summary
Created a new page at `/src/app/(recruiter)/recruiter/vaultsign/upload/page.tsx` that allows recruiters to upload a custom PDF, preview it with editing capabilities, and save it for future use.

## Implementation Details

### Page Structure
- 3-step wizard flow with step indicator at the top
- Step 1: Upload & Details (upload area + form fields + PDF preview side by side)
- Step 2: Add Signers & Place Fields (signer list + field placement on PDF)
- Step 3: Review & Save (summary + save/send buttons)

### Step 1: Upload & Details
- Drag-and-drop upload area with visual feedback
- File validation (PDF only, max 25MB)
- Green checkmark indicator when file is uploaded
- Document details form: Name (defaults to filename without extension), Type, Personal Message, Expiry Date, Signing Order
- PDF preview on the right side using pdfjs-dist
- Page navigation and zoom controls

### Step 2: Add Signers & Place Fields
- Party 1 (sender) shown as info card
- Add/remove signers with name, email, role fields
- Signer tabs for field placement
- 7 field types: Signature, Date Signed, Full Name, Initials, Email, Text Field, Checkbox
- DraggableField component with mouse and touch support (copied from existing new document page)
- Selected field properties panel (label, required toggle, assigned signer, delete)
- Placed fields list with navigation to field location

### Step 3: Review & Save
- Document details summary card
- Signers & fields summary with field counts
- PDF preview
- Three action buttons: Cancel, Save as Draft, Save & Send

### Save Flow
1. POST /api/vaultsign/documents (create document)
2. POST /api/vaultsign/documents/upload (upload PDF with FormData)
3. PUT /api/vaultsign/documents/{id}/fields (save sign fields)
4. If "Save & Send": POST /api/vaultsign/documents/{id}/send
5. Redirect to /recruiter/vaultsign/{id}

### Technical Details
- Uses same DraggableField component as existing new document page
- PDF rendering with pdfjs-dist (same approach)
- Debounced canvas dimension updates
- Object URL cleanup on unmount
- Percentage-based field positioning
- Party colors: ["#166534", "#0D9488", "#7C3AED", "#D97706"]
- Responsive design with lg:grid-cols-2 and lg:grid-cols-3 layouts

### Files Modified
- Created: `/src/app/(recruiter)/recruiter/vaultsign/upload/page.tsx`

### Lint Status
- No lint errors or warnings for the new page
