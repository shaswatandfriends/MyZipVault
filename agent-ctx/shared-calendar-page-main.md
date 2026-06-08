# Task: Shared Calendar Public Page

## Agent: Main Developer

## Summary
Created a publicly accessible shared calendar page for the MyZipVault healthcare staffing platform. When candidates share their calendar with recruiters via a token-based link, the recruiter can view the candidate's availability without logging in.

## Files Created

### 1. `/src/app/api/shared/calendar/[token]/route.ts`
- **GET** handler — public API endpoint (no auth required)
- Takes the share token from the URL params
- Finds the `CalendarShare` record by `share_token`
- Checks if the share is revoked (returns 410 with `REVOKED` code)
- Checks if the share is expired (returns 410 with `EXPIRED` code)
- Returns 404 with `NOT_FOUND` code if token doesn't exist
- If valid, returns: candidate name/info, share metadata, all availability slots, and derived preferences (availability status, min notice hours, shift duration preferences)

### 2. `/src/app/shared/calendar/[token]/page.tsx`
- **Public page** — no authentication required
- Client component (`'use client'`) with 5 states: loading, error, revoked, expired, valid
- **Loading state**: Skeleton placeholders matching the page layout
- **Error/Revoked/Expired states**: Clear icon + message cards explaining the issue
- **Valid state** displays:
  - **Header**: MyZipVault branding + "Shared Calendar Availability" subtitle
  - **Candidate Info Card**: Name, availability status badge (Actively Looking / Open / Not Available), preferences row (min notice hours, shift duration, link expiry)
  - **Monthly Calendar Grid**: Navigable month view with day cells showing:
    - Green highlighting for available days
    - Red highlighting for blocked days
    - Amber for mixed availability
    - Override indicators (amber dot) and recurring indicators (green dot)
    - Today's date highlighted with green ring
    - Click any day to see detailed slot info
  - **Day Detail Panel**: Shows specific availability/blocked slots for a selected day with times, labels, and recurring badges
  - **Right Sidebar**:
    - Recurring Weekly Schedule card
    - Date Overrides card
    - Privacy Notice card
    - "View-only access · Powered by MyZipVault" footer
- Professional healthcare-themed styling (green #166534 palette)
- Fully responsive (mobile-first with sm/md/lg breakpoints)
- Uses shadcn/ui components: Card, Badge, Button, Skeleton, ScrollArea, Separator
- Uses icons from `@/lib/icons`

### 3. `/src/middleware.ts` (updated)
- Added `/shared/` and `/api/shared/` to the `publicPrefixes` array
- These routes are now publicly accessible without authentication

## Verification
- ESLint passes with 0 errors (only 2 pre-existing warnings in unrelated files)
- Dev server compiles the page successfully (200 response confirmed)
- API route returns proper JSON error responses when database is unreachable
- Page compiles in ~3.5s with Turbopack
