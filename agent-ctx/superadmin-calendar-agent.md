# Task: Superadmin Calendar Section Page

## Summary
Built the Superadmin Calendar page with 3 tabs and supporting API route.

## Files Created/Modified

### 1. API Route: `/home/z/my-project/src/app/api/superadmin/calendar/route.ts`
- GET handler that returns:
  - `dailyCallCounts`: Array of { date, scheduled, completed, missed } for the current month
  - `recruiterStats`: Array of { recruiterId, name, organization, activeLeads, callsToday, callsWeek, overdueCalls }
  - `pipelineOverview`: Array of { stage, label, count } for each pipeline stage
  - `recruiterWeeklyCalls`: (optional) Array of weekly calls when recruiterId param is provided
- Checks super_admin role authorization
- Supports query params: month (YYYY-MM), companyId, recruiterId

### 2. Page: `/home/z/my-project/src/app/(superadmin)/superadmin/calendar/page.tsx`
- **Tab 1 - Overview**: Monthly calendar grid with color-coded call counts (blue=scheduled, green=completed, red=missed/overdue). Day click shows summary panel. Month navigation with prev/next buttons. Summary cards at top.
- **Tab 2 - Recruiters**: Table of all recruiters with stats (Name, Organization, Active Leads, Calls Today, Calls This Week, Overdue). Click to expand shows weekly calls detail. Company filter dropdown.
- **Tab 3 - Pipeline Overview**: Horizontal bar chart showing lead distribution across 9 pipeline stages. Filter by company. Stage cards with progress bars.

### Patterns Followed
- Uses PageHeader component
- Green/emerald/teal color scheme matching other superadmin pages
- Card-based layout with hover:shadow-md transitions
- Loading skeletons for all data sections
- Toast notifications from sonner for errors
- Icons from @/lib/icons (never from lucide-react directly)
- Same auth pattern as other superadmin API routes
- Custom scrollbar styling with max-height overflow
