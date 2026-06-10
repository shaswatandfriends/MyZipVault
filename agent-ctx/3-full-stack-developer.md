---
Task ID: 3
Agent: full-stack-developer
Task: Rewrite VaultSign PDF editor with TipTap rich text approach

Work Log:
- Read the existing page.tsx (2195 lines) and worklog.md to understand the current broken PDF editor
- Installed TipTap packages: @tiptap/react, @tiptap/starter-kit, @tiptap/extension-text-align, @tiptap/extension-underline, @tiptap/extension-highlight, @tiptap/extension-text-style, @tiptap/extension-color, @tiptap/extension-font-family, @tiptap/extension-placeholder, @tiptap/core
- Installed html2canvas-pro for capturing editor content as image when saving
- Created custom FontSize TipTap extension since there's no official one
- Wrote convertTextContentToHtml() function to convert pdfjs-dist extracted text to HTML
- Created PdfPageEditor component using TipTap with full extension set
- Created PdfEditorToolbar component with Word-like formatting controls
- Removed old TextAnnotation, ExtractedTextItem interfaces, EditorTool type, fontFamilies/fontSizes constants
- Removed old saveEditedPdf function, DraggableTextAnnotation component, EditablePdfPageRenderer component, EditablePdfViewer component
- Removed old toolbar (select/text/draw/highlight/shape/eraser buttons + format bar)
- Removed old annotation state management (annotations, selectedAnnotation, activeTool, drawingData, undo/redo stacks)
- Removed old annotation handlers (handleAddAnnotation, handleAddAnnotationAt, handleMoveAnnotation, handleRemoveAnnotation, handleUpdateAnnotation, handleApplyFormat, handleDrawEnd, pushUndo, handleUndo, handleRedo)
- Added new state variables: editedPages, originalPages, pageImages, pageDimensions, totalPages, isExtracting, extractionError, editorMode, activeEditorPage
- Added PDF extraction effect using pdfjs-dist to render pages as images and extract text
- Added new save function using html2canvas-pro + pdf-lib to capture edited pages and overlay on PDF
- Kept all of Step 2 (Document Details & Signers) UI and logic intact
- Kept all of Step 3 (Place Fields) UI and logic intact
- Kept all of Step 4 (Review & Send) UI and logic intact
- Kept DraggableField component, handleSubmit function, navigation buttons, step indicator, upload area
- Added Edit/Preview mode toggle
- Added zoom controls that scale page containers via CSS
- Fixed TypeScript errors: TextStyle named import, StarterKit config, pdfjs render type cast, Uint8Array to BlobPart cast
- Verified: npx tsc --noEmit shows no errors for our file, npx next build succeeds

Stage Summary:
- Completely replaced the broken canvas-based annotation system with a TipTap rich text editor approach
- The new Step 1 flow: Upload PDF → pdfjs renders pages as background images + extracts text → TipTap editors overlay each page with extracted text → users can freely edit text → save uses html2canvas-pro to capture editors as images + pdf-lib to embed on PDF
- All Steps 2, 3, 4 remain intact and functional
- Build compiles successfully with zero TypeScript errors in our file
