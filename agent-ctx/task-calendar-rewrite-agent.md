# Task: Rewrite Candidate Calendar Page

## Summary
Completely rewrote `/home/z/my-project/src/app/(candidate)/calendar/page.tsx` with a comprehensive Calendar + Scheduler feature.

## What was done

### Frontend (page.tsx) - Full rewrite (~1886 lines)

**Tab 1: My Calendar**
1. **Availability Status Toggle** - Click-to-cycle card showing 🟢 Actively Looking / 🟡 Open to Opportunities / 🔴 Not Available Right Now with colored backgrounds and dot indicators
2. **Weekly Availability Grid** - 7-day Mon-Sun grid with hourly time slots (6AM-10PM), color-coded cells (green=available, red=blocked, gray=not set)
3. **Add Availability Dialog** - Full form with:
   - Day of week dropdown OR specific date picker (toggle with switch)
   - Start/End time pickers
   - Available/Not Available toggle with badge indicator
   - Recurring (weekly) toggle
   - Optional label field
4. **Quick Templates** - 4 button cards:
   - Morning Person (6AM-2PM, Mon-Fri) with Sun icon
   - Night Owl (10PM-6AM, Mon-Fri) with Moon icon
   - Weekends Only (8AM-8PM, Sat-Sun) with Calendar icon
   - Flexible (7AM-9PM, Mon-Sun) with Sparkles icon
5. **Block Out Dates** - Dialog with multi-select calendar to block specific dates
6. **Blocked Dates Preview** - Sidebar list of all blocked dates
7. **Preferences Card** - Minimum notice dropdown (12h/24h/48h/72h) and Shift duration preference (4hr min/8hr/12hr/No preference)
8. **Share Calendar Section** - Two dialogs:
   - Share with Recruiter: recruiter dropdown + expiry selection
   - Generate Share Link: expiry selection + generated link with copy button
9. **Active Shares List** - Each share shows recruiter name or "Link share", expiry, revoke button; expired shares shown dimmed
10. **Current Availability Slots List** - Scrollable list of all slots with day, time, labels, recurring badges, delete buttons
11. **Shift Requests Section** - Pending requests with Accept/Decline buttons, history section for responded requests

**Tab 2: Others Calendar**
1. **Recruiter Filter** - Dropdown to filter by specific recruiter
2. **Recruiter Availability Cards** - Each recruiter's weekly schedule displayed as a grid with time slots
3. **Request a Call Button** - Sends notification to recruiter
4. **Upcoming Calls & Meetings** - Lists accepted shift requests with upcoming dates

### API Endpoints Used
- GET/POST/PUT/DELETE `/api/candidate/calendar/availability` - All existing
- GET/POST/PUT `/api/candidate/calendar/shares` - All existing
- GET `/api/candidate/calendar/shared-availability` - All existing
- GET/PUT `/api/candidate/calendar/shift-requests` - All existing
- GET `/api/candidate/recruiters` - All existing
- POST `/api/candidate/notifications` - For call request feature

### Design Patterns
- Same patterns as other candidate pages (PageHeader, Card, Badge, Button)
- Color scheme: primary green #166534, teal #0D9488, backgrounds #F8F7F4
- Icons from @/lib/icons (lucide-react)
- shadcn/ui components: Tabs, Dialog, Select, Switch, Calendar, Popover, ScrollArea, Badge
- "use client" directive
- toast from sonner for notifications
- Responsive layout with grid (1 col mobile, 3 col desktop)

### Lint Results
- 0 errors, 0 warnings in the calendar page file
- Only 2 pre-existing warnings in checklists/[id]/page.tsx

### No Backend Changes Required
All API endpoints were already implemented and working.
