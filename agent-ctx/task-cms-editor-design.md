# Task: Landing Page CMS Editor + Design System Redesign

## Summary
Completed both tasks:

### Task 1: Landing Page CMS Editor
- Created `/src/app/(superadmin)/superadmin/landing-page-editor/page.tsx` - Full CMS editor with:
  - 6 editor sections: Hero Content, Colors, Feature Cards, Privacy Section, How It Works, Footer
  - Split view: 60% editor form, 40% live preview
  - Desktop/mobile preview toggle
  - Real-time preview updates
  - Color pickers with hex display
  - Icon selector dropdowns (30 lucide icon options)
  - Save & Publish (POST to API) and Discard Changes functionality
  - Toast notifications via sonner
- Created `/src/app/api/superadmin/landing-page/route.ts` - API route with GET/POST
- Added "Landing Page" nav item to both sidebar components

### Task 2: Redesigned About, Privacy, Terms pages
- Applied new design system colors and typography throughout
- Header: `border-b border-[#E5E7EB] bg-[#F8F7F4]/80 backdrop-blur-lg`
- ZV logo: `bg-[#166534] text-white rounded-lg`, MyZipVault in Clash Display font
- H1: font-heading, 36px, text-[#111827]
- H2: font-heading, 24px, text-[#111827], mt-10
- Body text: text-[#6B7280], 16px, leading-relaxed
- "Back to MyZipVault" link: text-[#0D9488] with ArrowLeft icon
- About page cards: bg-white, border border-[#E5E7EB], rounded-2xl, p-6, icons in bg-[#DCFCE7] circles
- Sticky footer with mt-auto pattern
- All existing content/text preserved

## Files Modified/Created
- NEW: `/src/app/(superadmin)/superadmin/landing-page-editor/page.tsx`
- NEW: `/src/app/api/superadmin/landing-page/route.ts`
- EDITED: `/src/components/sidebars/superadmin-sidebar.tsx` (added Landing Page nav + PencilRuler icon)
- EDITED: `/src/components/layout/sidebar.tsx` (added Landing Page nav item)
- REWRITTEN: `/src/app/about/page.tsx` (new design system)
- REWRITTEN: `/src/app/privacy/page.tsx` (new design system)
- REWRITTEN: `/src/app/terms/page.tsx` (new design system)

## Verification
- ESLint: passes with no errors
- All pages return 200 status code
- Original landing page at / still works (200)
