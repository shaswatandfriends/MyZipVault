# Task 3: Rewrite VaultSign PDF Editor Text Editing

## Summary
Successfully rewrote the text editing feature in `/home/z/my-project/src/app/(recruiter)/recruiter/vaultsign/upload/page.tsx` to remove the "whiteout" text-replace approach and implement direct inline contentEditable editing that preserves the original text format.

## Changes Made

### 1. Removed `text-replace` annotation type
- Removed `"text-replace"` from the `TextAnnotation` type union (line 81)
- Removed `originalText?` and `textItemId?` fields from `TextAnnotation` interface
- Removed `text-replace` rendering block from `PdfPageView` annotations section (was lines ~907-962)
- Removed `existingReplace` check when rendering text items (was line ~741-743)

### 2. Added `ModifiedTextItem` interface
- New interface at line 278-293 with fields: `textItemId`, `page`, `originalText`, `newText`, `fontFamily`, `fontSize`, `bold`, `italic`, `color`, `leftPct`, `topPct`, `widthPct`, `heightPct`

### 3. Updated `saveEditedPdf` function
- Added `modifiedTextItems: Map<string, ModifiedTextItem>` parameter
- Replaced `text-replace` block (was lines 351-383) with new `modifiedTextItems` iteration (lines 366-399)
- Uses `mod.leftPct`, `mod.topPct`, `mod.widthPct`, `mod.heightPct` for positioning
- Draws white rectangle to cover original text, then draws new text

### 4. Updated `PdfPageView` component
- Removed `onAddTextReplace` prop
- Added `modifiedTextItems: Map<string, ModifiedTextItem>` prop
- Added `onModifyTextItem: (mod: ModifiedTextItem) => void` prop
- Added `onModifyTextItemCancel: (textItemId: string) => void` prop

### 5. Rewrote text item rendering in `PdfPageView`
- Three visual states for text items:
  - **NOT editing and NOT modified**: Text transparent, dashed teal outline on hover, cursor: pointer
  - **NOT editing but IS modified**: Text visible in original format with tight `rgba(255,255,255,0.92)` background, subtle teal bottom-border, no whiteout block
  - **IS editing (contentEditable)**: Text visible, tight background, solid teal outline, cursor: text
- Uses `modified?.newText` for display text when modified
- Uses `modified?.fontFamily` and `modified?.fontSize` for display font when modified
- On blur: saves modification via `onModifyTextItem` if text changed, or calls `onModifyTextItemCancel` if unchanged
- On Escape: cancels editing

### 6. Updated `PdfEditorToolbar`
- Changed `isTextAnn` check from `selectedAnn?.type === "text" || selectedAnn?.type === "text-replace"` to just `selectedAnn?.type === "text"`

### 7. Updated main component state and handlers
- Added `modifiedTextItems` state: `Map<string, ModifiedTextItem>`
- Replaced `handleAddTextReplace` with `handleModifyTextItem` and `handleModifyTextItemCancel`
- Updated `hasEdits` check to include `modifiedTextItems.size > 0`
- Updated `handleSave` to pass `modifiedTextItems` to `saveEditedPdf`
- Updated `PdfPageView` usage to pass `modifiedTextItems`, `onModifyTextItem`, and `onModifyTextItemCancel`
- Updated edit count indicator to show text edits count

### No TypeScript errors in the vaultsign/upload page after changes.
