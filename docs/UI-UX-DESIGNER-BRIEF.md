# MyZipVault — UI/UX Designer Brief

## What We're Building

MyZipVault is a healthcare credential verification SaaS platform. Two sides:
- **Candidates** (nurses, healthcare professionals) — free forever, store credentials in a secure vault
- **Agencies/Recruiters** — pay credits to request and unlock candidate compliance packets

The platform is **fully functional** — all features work. But the UI is inconsistent (some pages redesigned, some not) and needs a professional, unified design system.

## What We Need From You

### 1. Complete Design System (Figma)

A unified design system covering:

**Typography:**
- Heading font (currently Playfair Display — open to alternatives)
- Body font (currently Inter)
- Monospace font (for IDs, codes)
- Type scale: display, h1, h2, h3, h4, body, small, xs, label
- Font weights and line heights for each

**Color Palette:**
- Primary brand color (currently Navy #0B1F3A)
- Accent color (currently Gold #C9A961)
- Background colors (page, card, subtle, surface)
- Text colors (primary, secondary, muted, disabled)
- Status colors (success, warning, danger, info)
- Border colors (default, subtle, strong)

**Spacing System:**
- Base spacing unit
- Section spacing, block spacing, element spacing
- Padding and margin scales

**Component Library:**
- Buttons (primary, secondary, ghost, destructive — all states: default, hover, active, disabled)
- Input fields (text, password, email, textarea, select, checkbox, radio)
- Cards (default, elevated, outlined)
- Badges (success, warning, danger, info, neutral)
- Dialogs/Modals (confirm, form, full-screen)
- Tables (header, row, hover, selected, empty state)
- Tabs (horizontal, vertical)
- Navigation (sidebar, top bar, breadcrumbs)
- Toast notifications
- Loading states (skeleton, spinner, progress)
- Empty states (icon + title + description + CTA)
- Tooltips
- Dropdown menus

### 2. Page Designs (Figma — All Pages)

Design EVERY page in the platform. Here's the complete list:

#### Public Pages
1. Landing page (candidate view + recruiter toggle)
2. Login page
3. Signup page (candidate)
4. Agency login
5. Agency signup
6. Superadmin login (OTP flow)
7. Admin login
8. Forgot password
9. Reset password
10. Verify email
11. Onboard (invite flow)
12. Privacy policy
13. Terms of service
14. About page
15. Verify document (public)

#### Candidate Pages
16. Candidate dashboard
17. Checklists list
18. Checklist detail (complete checklist — 1-4 rating scale)
19. Checklist thank-you page
20. Credentials vault
21. Resume vault (upload + builder)
22. References (list + request form)
23. Sharing & consent
24. Recruiters list
25. Calendar
26. Settings
27. Profile completion
28. Notifications
29. VaultSign list
30. VaultSign detail

#### Recruiter Pages
31. Recruiter dashboard
32. Candidates list
33. Candidate detail (compliance packet view)
34. Send request (multi-step wizard)
35. Bundles (list + create/edit)
36. Pools (list + create)
37. Pool detail (candidates in pool)
38. Calendar (4 tabs: My Calendar, Candidates Calendar, Pipeline, Leads)
39. Billing
40. BAA (view + e-sign)
41. Team management (client admin only)
42. VaultSign list
43. VaultSign new (4-step wizard)
44. VaultSign editor (Word-style document editor — MOST COMPLEX PAGE)
45. VaultSign detail
46. VaultSign signer assignment
47. Notifications

#### Admin Pages
48. Admin dashboard
49. User management
50. User detail
51. Document verification queue
52. Content management
53. Reminders approval queue

#### Superadmin Pages
54. Superadmin dashboard
55. User management (god mode)
56. Company management (with member details)
57. Admin team management
58. Platform settings
59. API vault
60. Feature flags
61. Email/SMS template editor
62. Analytics
63. Announcements (banners + email campaigns)
64. Compliance tools
65. System error log
66. Audit logs
67. Reminders queue
68. Landing page editor (CMS)
69. Auth page editor (CMS)
70. Skills checklist management (overview, recruiters, companies, skills database, audit logs)
71. Reference management (overview, requests, responses, candidates, forms, audit logs)
72. VaultSign template editor

### 3. VaultSign Editor — Special Attention

The VaultSign editor (page #44) is the most complex page in the platform. It's a Word-style document editor where recruiters create documents (RTRs, offer letters, etc.) and place signature fields.

**What it needs:**
- Professional document editing area (like Google Docs / Notion)
- Clean toolbar with font controls, alignment, lists, tables, images
- Left panel: variables (insert candidate name, company name, etc.)
- Right panel: signers + signature field placement
- Live header/footer preview (company logo, name, contact)
- Edit mode vs Preview mode toggle
- Mobile-responsive toolbar
- Export to PDF
- "Send for Signature" flow

**This page alone needs 3-4 design screens** (edit mode, preview mode, mobile, signing view).

### 4. Mobile Responsive Designs

For ALL pages above, provide:
- Desktop (1440px)
- Tablet (768px)
- Mobile (375px)

### 5. Design Tokens

Export as:
- CSS variables (for Tailwind)
- Figma variables/styles
- JSON format (for programmatic use)

## Design Direction

**Current direction:** Editorial Premium (Navy + Cream + Gold + Playfair Display serif headlines)

**We're open to changing this** if the designer has a better vision. The key requirements:

1. **Professional and trustworthy** — healthcare clients need to feel their data is secure
2. **Clean and modern** — not cluttered, generous whitespace
3. **Not generic SaaS** — should NOT look like every other Vercel/Stripe clone
4. **Accessible** — WCAG 2.1 AA compliant
5. **Healthcare-appropriate** — serious but not clinical/boring

## Technical Constraints

- Built with Next.js 14 + Tailwind CSS 4 + Shadcn/UI
- Uses CSS variables for theming (already in `globals.css`)
- Shadcn/UI components can be restyled but not replaced
- Must work with the existing component library (`src/components/ui/`)

## Deliverables

1. **Figma file** with:
   - Design system page (colors, typography, spacing, components)
   - All 72+ page designs (desktop + mobile)
   - VaultSign editor (4 screens minimum)
   - Component states (hover, active, disabled, error)

2. **Design tokens** exported as:
   - CSS variables
   - Tailwind config
   - JSON

3. **Design handoff document** with:
   - Spacing rules
   - Component usage guidelines
   - Color usage rules
   - Typography hierarchy
   - Interaction patterns

## What to Give the Designer

### Access
- Live site URL: https://my-zip-vault.vercel.app/
- GitHub repo: https://github.com/shaswatandfriends/MyZipVault (read-only)
- Current globals.css (design tokens)
- Current component list

### Reference
- Current design system: Editorial Premium (Navy/Cream/Gold)
- Competitors: DocuSign, Bullhorn, Nursys, NurseFly

### Pages to Prioritize (If Time-Limited)
If the designer can't do all 72+ pages, prioritize in this order:
1. VaultSign editor (most complex, most visible)
2. Landing page (first impression)
3. Auth pages (login, signup — high visibility)
4. Candidate dashboard (most-used page)
5. Recruiter dashboard (money-making page)
6. Send Request wizard (core workflow)
7. Everything else

## Timeline

- **Week 1**: Design system + landing + auth pages
- **Week 2**: Candidate + recruiter pages
- **Week 3**: Admin + superadmin pages + VaultSign editor
- **Week 4**: Mobile responsive + handoff

## Budget Guidance

This is a 72+ page SaaS platform with a complex document editor. Expect:
- **Junior designer**: $2,000–$4,000, 6-8 weeks
- **Mid-level designer**: $4,000–$8,000, 4-6 weeks
- **Senior designer**: $8,000–$15,000, 3-4 weeks
- **Design agency**: $15,000–$30,000, 3-4 weeks

## How to Hire

### Where to Find Designers
- **Upwork**: Search "SaaS UI/UX designer Figma"
- **Fiverr Pro**: Search "web app design system"
- **Dribbble**: Search designers with "SaaS" or "healthcare" tags
- **Toptal**: Premium freelancers, pre-vetted
- **Referrals**: Ask in design communities

### What to Ask For in the Job Post

> "I need a UI/UX designer to create a complete design system and 72+ page designs for a healthcare SaaS platform. The platform is fully functional but needs a professional, unified design. Must deliver Figma files with design system, all page designs (desktop + mobile), and design tokens (CSS variables + Tailwind config). Experience with healthcare/SaaS/design systems required. The most complex page is a Word-style document editor (VaultSign) — please include examples of complex editor UIs in your portfolio."

### Portfolio Review Checklist
When reviewing designer portfolios, look for:
- ✅ Complex web app designs (not just landing pages)
- ✅ Design systems / component libraries
- ✅ Document editor interfaces (Google Docs, Notion, etc.)
- ✅ Healthcare or enterprise SaaS experience
- ✅ Mobile responsive designs
- ✅ Clean, professional aesthetic (not trendy/flashy)
- ❌ Avoid designers who only do landing pages
- ❌ Avoid designers who use generic templates
- ❌ Avoid designers with no SaaS experience

## Questions for the Designer

Before hiring, ask:
1. "Have you designed a document editor interface before?"
2. "How do you handle design systems for 70+ page applications?"
3. "Can you deliver CSS variables and Tailwind config, not just Figma?"
4. "What's your process for mobile responsive design?"
5. "How do you handle handoff to developers?"
6. "Can you show me a complex web app you've designed (not just a landing page)?"

---

**This document is saved at:**
- `/home/z/my-project/download/UI-UX-DESIGNER-BRIEF.md`
- Also committed to the repo at `docs/UI-UX-DESIGNER-BRIEF.md`

Give this to any designer you're considering hiring. It has everything they need to understand the scope and deliver what we need.
