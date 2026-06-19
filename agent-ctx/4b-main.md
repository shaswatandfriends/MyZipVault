# Task 4b — Fix hardcoded hex colors in VaultSign template editor

## Summary
Replaced all hardcoded hex color values in `/src/app/(superadmin)/superadmin/vaultsign/templates/[id]/page.tsx` with design system tokens.

## Changes Made

### Tailwind className replacements (12 types, multiple occurrences)
| Old | New | Context |
|-----|-----|---------|
| `bg-[#F0FDF4]` | `bg-primary-light` | Template/system variable buttons, font color active, highlight active |
| `bg-[#EFF6FF]` | `bg-status-blue-bg` | Custom variable buttons |
| `hover:bg-[#DBEAFE]` | `hover:bg-badge-blue-bg` | Custom variable hover |
| `text-[#1D4ED8]` | `text-status-blue-dark` | Custom variable text |
| `hover:text-[#DC2626]` | `hover:text-status-red` | Delete/remove buttons (3 places) |
| `bg-[#D1D5DB]` | `bg-surface-3` | Toggle off state |
| `hover:bg-[#F0FDF4]` | `hover:bg-primary-light` | Sign field buttons |
| `bg-[#F8F9FA]` | `bg-toolbar-bg` | Desktop toolbar |
| `bg-[#F3F4F6]` | `bg-surface-2` | Editor background |
| `shadow-[inset_0_0_0_1px_#166534/30]` | `ring-1 ring-primary/30` | Toolbar active state |
| `hover:bg-[#F3F4F6]` | `hover:bg-surface-2` | Toolbar button hover |

### CSS-in-JS `<style>` replacements (18 instances)
| Old | New | Context |
|-----|-----|---------|
| `color: #374151` | `color: var(--text-secondary)` | Paragraph text |
| `color: #111827` | `color: var(--foreground)` | h1, h2, h3 headings |
| `border: 1px solid #E5E7EB` | `border: 1px solid var(--border)` | Table cells |
| `background: #F3F4F6` | `background: var(--surface-2)` | Table headers |
| `color: #9CA3AF` | `color: var(--text-muted)` | Placeholder text |
| `#E5E7EB` in gradients | `var(--border)` | Page break ruler lines |
| `color: #166534` | `color: var(--status-green-dark)` | Page break label (2x) |
| `background: #F0FDF4` | `background: var(--primary-light)` | Page break label (2x) |
| `border: 1px solid #166534/30` | `border: 1px solid var(--status-green-dark)` | Page break label (2x, also fixed invalid CSS) |

### Exempt (kept as-is per rules)
- Color picker swatches in font color/highlight popups
- `#ffffff` in page break gradient (paper rendering)
- `SIGNER_COLORS` inline styles (functional colors)

### Status badge maps
- None found in this file — no changes needed

## Verification
- `eslint` passes with zero errors for the edited file
- All CSS variables confirmed to exist in `globals.css`
