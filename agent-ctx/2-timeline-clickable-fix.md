# Task ID: 2 - Timeline Clickable Steps Fix

## Summary
Fixed the VaultSign document detail page timeline to make steps clickable with clear labels and tooltips.

## Changes Made
**File**: `/home/z/my-project/src/app/(recruiter)/recruiter/vaultsign/[id]/page.tsx`

1. **Added Tooltip imports**: Imported `Tooltip`, `TooltipTrigger`, `TooltipContent` from `@/components/ui/tooltip`

2. **Extended TIMELINE_STEPS**: Added `description` field to each step for tooltip text:
   - draft → "Click to view Created documents"
   - sent → "Click to view Sent documents"
   - partially_signed → "Click to view In Progress documents"
   - completed → "Click to view Completed documents"

3. **Rewrote timeline step rendering**:
   - Wrapped each step (circle + label) in a `<button>` element with:
     - `cursor-pointer` class for clickable visual feedback
     - `hover:bg-[#F0FDF4]` for subtle hover background
     - `transition-colors` for smooth hover transition
     - `rounded-lg px-2 py-1.5` for larger clickable hit area
     - `focus-visible:ring-2` for keyboard accessibility
   - Added `hover:scale-110 transition-transform` to step circles for hover zoom effect
   - Increased circle size from `w-8 h-8` to `w-9 h-9` and font from `text-xs` to `text-sm`
   - Upgraded labels from `text-xs font-medium` to `text-sm font-semibold` for better prominence
   - Wrapped each step button in `<Tooltip>` / `<TooltipTrigger>` / `<TooltipContent>` with the step description
   - onClick navigates to `/recruiter/vaultsign?status=${step.key}`

## Verification
- No lint errors in the modified file
- Dev server running successfully
