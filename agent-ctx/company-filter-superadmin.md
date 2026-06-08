# Company Filter for SuperAdmin Users Page

## Task
Add a "Company" filter dropdown to the SuperAdmin Users page advanced filters panel, with API support for filtering by organization_id.

## Files Modified

### 1. `src/app/api/superadmin/users/route.ts`
- Added `organizationId` query parameter parsing (line 23)
- Added filter logic: when `organizationId` is not "all", adds `organization_id` to the Prisma `where` clause (lines 50-52)

### 2. `src/app/(superadmin)/superadmin/users/page.tsx`
- Added `Building2` icon import from `@/lib/icons`
- Added state: `companyFilter` (string, default "all"), `organizations` (array), `orgsLoading` (boolean)
- Added `fetchOrganizations()` callback that loads company list from `/api/superadmin/companies` API on mount
- Added `organizationId: companyFilter` to the URL search params sent to the users API
- Added `companyFilter` to the `fetchUsers` dependency array
- Added `companyFilter` to the page-reset effect dependency array
- Added `companyFilter !== "all"` check to `activeFilterCount`
- Added Company filter dropdown in the advanced filters panel (same UI pattern as Role and Status filters)
  - Label includes `Building2` icon
  - Select disabled while organizations are loading
  - Options dynamically populated from API response
- Added `setCompanyFilter("all")` to the Clear Filters button handler

## No New Files Created
All changes were made to existing files. The organization list is fetched from the existing `/api/superadmin/companies` endpoint.

## Company Name in User Table
Already present at line 558: `user.organization?.name ?? "—"`. No changes needed.

## Lint Result
0 errors, 2 pre-existing warnings (unrelated to this change).
