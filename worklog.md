---
Task ID: 1
Agent: Main Agent
Task: Fix AI Resume Assistant 502 error on Vercel

Work Log:
- Investigated root cause: `internal-api.z.ai` resolves to private IPs (172.25.x.x) that neither Vercel's serverless functions nor the user's browser can reach from the public internet
- Created `/api/ai/proxy` route — server-side proxy that forwards AI requests to ZAI API (works in local dev, gives clear error on Vercel)
- Updated `lib/ai-client.ts` — client now calls `/api/ai/proxy` instead of trying to reach `internal-api.z.ai` directly from the browser
- Flipped resume upload parsing order: Affinda is now PRIMARY (works on Vercel), ZAI Vision is fallback
- Enhanced `lib/affinda.ts` with skill suggestion and job title suggestion capabilities using Affinda's public API
- Created `/api/ai/affinda` route for Affinda-backed AI features (skill suggestions, job title suggestions) that work on Vercel
- Updated `/api/ai/resume/route.ts` to try Affinda first for skill suggestions, then fall back to ZAI
- Updated debug endpoint to show both ZAI and Affinda status, with private IP detection
- Updated CSP to include `https://api.affinda.com` and `https://*.affinda.com`
- Build verified successfully

Stage Summary:
- Resume PARSING now works on Vercel via Affinda (publicly accessible API)
- Skill SUGGESTIONS now work on Vercel via Affinda
- AI chat/generation (summaries, improvements, chat) requires ZAI API which is only reachable in local dev — on Vercel these features will show a clear error message
- The AFFINDA_API_KEY must be set on Vercel for these features to work

---
Task ID: companies-improvements
Agent: Main Agent
Task: Fix errors and implement major improvements to the Companies section

Work Log:
- Analyzed 2 screenshots showing errors: "Action failed - Failed to perform action" and "Failed to load member profile"
- Read all companies-related files (page.tsx, API routes, member route)
- Identified root causes: generic catch-all error messages, Swap Email requiring raw User ID input, missing member status indicators
- Rewrote entire companies page with comprehensive improvements
- Added suspend/activate member API actions with seat limit checks
- Improved API error messages (replaced generic "Failed to perform action" with specific error messages)
- Fixed seats counting to only count active members
- Built successfully with zero errors

Stage Summary:
- Fixed Swap Email dialog: replaced raw User ID input with member selection dropdown
- Fixed Member Profile error: added better error handling with retry button and specific error messages
- Fixed API error messages: replaced generic catch-all with specific error details
- Added search/filter bar with company name + member search and BAA status filter
- Added 4 summary stats cards (Companies, Total Credits, Seats Used, BAA Signed)
- Consolidated 7 icon-only action buttons into a "Manage" dropdown menu
- Added tooltips to member action buttons
- Added account status badges (Active/Suspended) for each member
- Added Suspend/Activate member functionality with confirmation dialog
- Added relative time display for last activity
- Added "Custom pricing" indicator for companies with pricing notes
- Added validation for BAA signed-by name when status is "Signed"
- Added seat limit validation (can't set below current usage)
- Added credit ledger balance display in header
- Added transaction type badges for admin_adjustment_add/deduct
- Added no-results state with clear filters button
- Improved company avatar: shows first 2 letters instead of just 1
---
Task ID: 1
Agent: Main
Task: Build all missing features: Superadmin Skills DB page, Superadmin Reference Questions page, Reference Questions Import/Export, Candidate Checklists page

Work Log:
- Added "Skills DB" and "Ref Questions" navigation items to superadmin sidebar
- Created /superadmin/skills/page.tsx with full Skills management (2 tabs: Professions & Specialties, Skills)
- Created /superadmin/references/page.tsx with full Reference Questions management + Import/Export/Delete All/Preview
- Created 4 new Reference Questions API endpoints: export-template, export-data, validate-import, import
- Added Reference Questions Import/Export UI to admin content page (Tab 3)
- Created /api/candidate/checklists/route.ts (GET - fetch all checklist requests)
- Created /api/candidate/checklists/submit/route.ts (POST - save ratings + submit with signature)
- Created /candidate/checklists/page.tsx with interactive checklist form, auto-save, digital signature
- Fixed TypeScript error in checklists page (added textValue to ExistingRating interface)

Stage Summary:
- All 4 missing items are now built:
  1. Superadmin Skills DB page at /superadmin/skills (full feature parity with admin)
  2. Superadmin Reference Questions page at /superadmin/references (with import/export/delete-all/preview)
  3. Reference Questions Import/Export backend + UI in both admin and superadmin
  4. Candidate /checklists page rebuilt with interactive form, auto-save, digital signature
- All TypeScript checks pass with zero new errors
