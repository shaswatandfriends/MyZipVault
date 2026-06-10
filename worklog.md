# Task 1: Rewrite VaultSign PDF Editor Page

## Summary of Changes

### 1. PdfViewer Component Rewrite (lines 411-730)
- **Created `PdfPageLayer` sub-component** at module level with its own `useRef` for the page wrapper div
  - Renders: canvas + draw canvas overlay + annotation overlays per page
  - Receives callback refs for canvas and drawCanvas (set via Maps in parent)
  - Each page has its own annotation overlay with DraggableTextAnnotation components
- **Rewrote `PdfViewer` component** to render ALL pages in one scrollable gray container
  - Removed `currentPage` and `totalPages` props (no longer needed)
  - Loads PDF once and stores `PDFDocumentProxy` in `pdfDocRef` (not raw ArrayBuffer)
  - Uses `new Uint8Array(pdfData)` when calling `pdfjsLib.getDocument()` to prevent ArrayBuffer detachment
  - Uses `canvasRefsMap` and `drawCanvasRefsMap` (Map<number, HTMLCanvasElement>) for per-page canvas refs
  - Renders all pages vertically in a scrollable container with:
    - `maxHeight: "80vh"` and `overflow-y: auto`
    - Light gray background (`#F3F4F6`)
    - Pages centered with padding, each with white background + shadow
    - "Page X" label above each page
    - ~24px gap between pages
  - Drawing handlers now use `e.currentTarget` to identify which canvas is being drawn on
  - `activeDrawCanvasRef` tracks the canvas being drawn on (prevents cross-page drawing)

### 2. Removed `editorPage` State
- Removed `const [editorPage, setEditorPage] = useState(1);`
- Removed `setEditorPage(1);` from the remove file handler

### 3. Redesigned Step 1 Editor Toolbar
**A. Header Toolbar** (dark-themed, Word-like ribbon at top):
- Row 1: Tool buttons (Select, Text, Highlight, Shape, Draw, Eraser) | Undo/Redo | Page count | Zoom controls
- Row 2: Text formatting (font family, font size, Bold, Italic, Underline, Strikethrough, Color, Alignment) — only visible when a text annotation is selected
- Dark background (`#1F2937`) with teal (`#0D9488`) active states

**B. Floating Format Bar** (appears when any annotation is selected):
- Positioned at top of PDF viewer area with small triangle pointer
- Contains: Font, Size, Bold, Italic, Underline, Strikethrough, Color picker, Delete button
- White background with shadow, compact styling
- Only appears when `selectedAnn` is not null

### 4. Updated PdfViewer Usage
- Removed `currentPage={editorPage}` and `totalPages={editorTotalPages}` props

### 5. Lint/TS Fixes
- Fixed unused eslint-disable directives
- Added `onTotalPagesChange` to load effect dependencies
- Added proper deps to uploadedFile effect

## Files Changed
- `/home/z/my-project/src/app/(recruiter)/recruiter/vaultsign/upload/page.tsx`

## Pre-existing Issues (Not Modified)
- Line 917: TS2345 error in Step 3 field placement PDF render (pre-existing, unrelated to changes)
