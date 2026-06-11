# Task: VaultSign 2.0 Mobile Optimization & Skeleton Loading

## Summary
Added mobile optimization and skeleton loading states to all 6 VaultSign pages.

## Changes Made

### Icons (src/lib/icons.ts)
- Added `Menu`, `PanelRightIcon`, `MoreVertical` icons for mobile UI controls

### 1a. Word Editor Page (editor/[id]/page.tsx)
**Mobile Optimization:**
- Added `showVariablesPanel` and `showSignersPanel` state variables
- On mobile (< lg): left and right panels are hidden; toggle buttons (PanelLeftIcon, PanelRightIcon) appear in top bar
- Variables panel opens as a Sheet slide-over from the left on mobile
- Signers panel opens as a Sheet slide-over from the right on mobile
- Mobile toolbar shows essential formatting buttons (Bold, Italic, Underline, Strikethrough, alignment, lists, undo/redo) with a "More" dropdown (MoreVertical icon) containing advanced options (Align Right, Justify, Task List, Subscript, Superscript, Insert Image, Insert Table)
- Desktop toolbar remains full-featured
- Top bar: "Back" text hidden on mobile, "Word Document" badge hidden on mobile, "Saving..." text hidden on mobile
- Editor area takes full width on mobile with reduced margins

**Skeleton Loading:**
- Skeleton top bar with back button, doc name, and action buttons
- Skeleton toolbar with 14 button placeholders + font selector
- Skeleton 3-column layout: left panel (6 variable rows), center (document card with pulsing lines), right panel (3 signer cards)

### 1b. PDF Signer Page (signer/[id]/page.tsx)
**Mobile Optimization:**
- Added `showRightPanel` state variable
- Mobile toggle button (PanelRightIcon) in top bar opens right panel as bottom Sheet
- Right panel opens as a Sheet slide-over from the bottom on mobile (70vh height)
- Top bar: "Back" text hidden on small screens, "PDF Document — Read Only" badge hidden on small screens, button labels hidden on small screens
- Canvas padding reduced on mobile (p-4 → p-3 sm:p-4)
- Extracted `rightPanelContent` to be shared between inline desktop panel and mobile Sheet

**Skeleton Loading:**
- Skeleton top bar with back button, doc name, and action buttons
- Skeleton page navigation bar
- Skeleton PDF canvas area (full-width gray rectangle)
- Skeleton right panel (3 signer rows)

### 1c. Dashboard Page (vaultsign/page.tsx)
**Mobile Optimization:**
- Header stacks vertically on mobile (flex-col sm:flex-row), "New Document" button full width on mobile
- Search/filter stack vertically on mobile (flex-col sm:flex-row)
- Documents table: hidden on mobile (hidden md:block), replaced with card list view (md:hidden)
- Mobile card list shows: doc name, status badge, signer avatars, expiry date, and action menu
- Added Separator import

**Skeleton Loading:**
- 4 skeleton stat cards matching the real card layout (icon placeholder + number placeholder)
- Skeleton table header + 5 skeleton rows for desktop
- 5 skeleton mobile card items for mobile view
- Skeleton search/filter controls

### 1d. Document Detail Page (vaultsign/[id]/page.tsx)
**Mobile Optimization:**
- Header restructured: stacks back button + title on top, action buttons below (flex-col gap-3)
- Action buttons wrap properly with flex-wrap
- Timeline horizontally scrollable on mobile (overflow-x-auto, flex-shrink-0 on items, min-w on connectors)
- Grid already used grid-cols-1 lg:grid-cols-3 (confirmed correct)

**Skeleton Loading:**
- Skeleton header with back button, title, badge, and action buttons
- Skeleton timeline with 4 step circles and connectors
- Skeleton signer cards (3) with avatar, name, email, and status
- Skeleton details card (5 key-value pairs)
- Skeleton audit trail card (4 entries)

### 1e. New Document Page (vaultsign/new/page.tsx)
**Mobile Optimization:**
- Reduced padding on small screens (px-3 py-4 → sm:px-6 sm:py-6)
- "Back" text hidden on small screens, icon-only on mobile
- Progress steps: labels hidden on mobile, step numbers always visible, minimum width on connectors
- Signing Order / Expires In grid: changed from grid-cols-2 to grid-cols-1 sm:grid-cols-2
- Step label text size reduced on mobile (text-[10px] sm:text-xs)

### 1f. Public Signing Page (sign/[token]/page.tsx)
**Mobile Optimization:**
- Header: compact on mobile (reduced padding, smaller font sizes)
- Document info bar: compact, badge hidden on mobile, "Decline" button text shortened
- Page navigation: compact on mobile (smaller buttons, shorter page display "1/3" vs "Page 1 of 3")
- Right panel stacks below PDF on mobile (flex-col lg:flex-row), limited to max-h-[50vh] on mobile
- Added field progress badge on mobile (e.g., "2/5")
- Signature modal: full screen on mobile (w-[calc(100%-1rem)] h-[90vh]), scrollable with flex column layout
- Decline button text shortened to just "Decline" on mobile

## Lint Status
All source files pass lint with no errors. Pre-existing warnings in vendor files (pdf.worker.min.mjs) are unrelated.
