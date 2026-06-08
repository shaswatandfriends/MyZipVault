# Task: Print/Export Daily Call Sheet, Auto-Match, and Star Rating Enhancements

## Summary

Built three major features for the Recruiter Calendar page:

### 1. Print/Export Daily Call Sheet
- **API**: Created `/api/recruiter/calendar/daily-call-sheet/route.ts` — GET handler that returns today's scheduled calls with lead details, recruiter name, and organization name. Supports `date` query param.
- **UI**: Added "Call Sheet" dropdown button in MyCalendarTab header with two options:
  - **Print Call Sheet**: Opens a new window with a print-optimized HTML table view with @media print CSS, clean layout, recruiter/organization info header
  - **Export CSV**: Downloads today's call sheet data as CSV file

### 2. Auto-Match Feature
- **API**: Created `/api/recruiter/calendar/auto-match/route.ts` — GET handler that matches candidates' availability and specialties to recruiter's open leads using a scoring algorithm:
  - Specialty overlap (0-40 points)
  - Availability overlap (0-35 points) 
  - Pipeline proximity (0-25 points)
- **UI**: Added Auto-Match card section in CandidatesCalendarTab with:
  - "Find Matches" button
  - Match results grid showing: candidate name, specialty, match score %, matched lead, match reasons
  - "Schedule Call" and "Send Shift Request" buttons per match
  - Loading skeletons and empty state

### 3. Star Rating Enhancements
- **Leads List Tab**: Added inline editable star rating column — click to edit, uses StarRatingInput component, saves via API
- **Leads List Tab**: Added star rating filter dropdown (1-5 stars, no rating, all)
- **Lead Detail Dialog**: Added StarRatingDisplay in the dialog header next to the lead name
- **Pipeline/Kanban cards**: Already had StarRatingDisplay (confirmed existing)

## Files Modified
- `/home/z/my-project/src/lib/icons.ts` — Added `Printer` icon
- `/home/z/my-project/src/app/(recruiter)/recruiter/calendar/page.tsx` — Added all UI features

## Files Created
- `/home/z/my-project/src/app/api/recruiter/calendar/daily-call-sheet/route.ts` — Daily call sheet API
- `/home/z/my-project/src/app/api/recruiter/calendar/auto-match/route.ts` — Auto-match API
