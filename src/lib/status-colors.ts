/**
 * Shared status color maps for VaultSign, badges, priority indicators, etc.
 * Uses design system tokens so dark mode works automatically.
 *
 * Usage:
 *   import { vaultSignStatusColors, priorityColors } from "@/lib/status-colors";
 *   const colors = vaultSignStatusColors["draft"];
 *   <span className={cn(colors.text, colors.bg)}>{colors.label}</span>
 */

// ─── VaultSign Document Status Colors ────────────────────────────────────
export const vaultSignStatusColors: Record<string, { label: string; text: string; bg: string }> = {
  draft: { label: "Draft", text: "text-text-secondary", bg: "bg-surface-2" },
  sent: { label: "Sent", text: "text-status-blue", bg: "bg-status-blue-bg" },
  viewed: { label: "Viewed", text: "text-status-blue", bg: "bg-status-blue-bg" },
  signed: { label: "Signed", text: "text-primary", bg: "bg-primary-light" },
  completed: { label: "Completed", text: "text-primary", bg: "bg-primary-light" },
  declined: { label: "Declined", text: "text-status-red", bg: "bg-status-red-bg" },
  expired: { label: "Expired", text: "text-status-amber", bg: "bg-status-amber-bg" },
  cancelled: { label: "Cancelled", text: "text-text-muted", bg: "bg-surface-2" },
  voided: { label: "Voided", text: "text-text-muted", bg: "bg-surface-2" },
  pending: { label: "Pending", text: "text-status-amber", bg: "bg-status-amber-bg" },
  in_progress: { label: "In Progress", text: "text-status-blue", bg: "bg-status-blue-bg" },
  partially_signed: { label: "Partially Signed", text: "text-status-amber", bg: "bg-status-amber-bg" },
};

// ─── VaultSign Signer Status Colors ──────────────────────────────────────
export const signerStatusColors: Record<string, { label: string; text: string; bg: string }> = {
  pending: { label: "Pending", text: "text-status-amber", bg: "bg-status-amber-bg" },
  sent: { label: "Awaiting Signature", text: "text-status-blue", bg: "bg-status-blue-bg" },
  viewed: { label: "Viewed", text: "text-status-amber", bg: "bg-status-amber-bg" },
  signed: { label: "Signed", text: "text-primary", bg: "bg-primary-light" },
  declined: { label: "Declined", text: "text-status-red", bg: "bg-status-red-bg" },
};

// ─── Priority / Severity Colors ──────────────────────────────────────────
export const priorityColors: Record<string | number, { label: string; text: string; bg: string }> = {
  1: { label: "Critical", text: "text-status-red", bg: "bg-status-red-bg" },
  2: { label: "High", text: "text-status-amber", bg: "bg-status-amber-bg" },
  3: { label: "Medium", text: "text-status-blue", bg: "bg-status-blue-bg" },
  4: { label: "Low", text: "text-text-secondary", bg: "bg-surface-2" },
  critical: { label: "Critical", text: "text-status-red", bg: "bg-status-red-bg" },
  high: { label: "High", text: "text-status-amber", bg: "bg-status-amber-bg" },
  medium: { label: "Medium", text: "text-status-blue", bg: "bg-status-blue-bg" },
  low: { label: "Low", text: "text-text-secondary", bg: "bg-surface-2" },
};

// ─── Generic Status Badge Colors ─────────────────────────────────────────
export const badgeStatusColors: Record<string, { text: string; bg: string }> = {
  active: { text: "text-primary", bg: "bg-primary-light" },
  inactive: { text: "text-text-muted", bg: "bg-surface-2" },
  approved: { text: "text-primary", bg: "bg-primary-light" },
  rejected: { text: "text-status-red", bg: "bg-status-red-bg" },
  pending: { text: "text-status-amber", bg: "bg-status-amber-bg" },
  completed: { text: "text-primary", bg: "bg-primary-light" },
  failed: { text: "text-status-red", bg: "bg-status-red-bg" },
  warning: { text: "text-status-amber", bg: "bg-status-amber-bg" },
  info: { text: "text-status-blue", bg: "bg-status-blue-bg" },
  success: { text: "text-primary", bg: "bg-primary-light" },
};

// ─── Calendar Event Category Colors ──────────────────────────────────────
export const calendarEventColors: Record<string, { bg: string; border: string; text: string }> = {
  available: { bg: "bg-primary-light", border: "border-primary/30", text: "text-primary" },
  booked: { bg: "bg-status-blue-bg", border: "border-status-blue/30", text: "text-status-blue" },
  blocked: { bg: "bg-status-red-bg", border: "border-status-red/30", text: "text-status-red" },
  tentative: { bg: "bg-status-amber-bg", border: "border-status-amber/30", text: "text-status-amber" },
  interview: { bg: "bg-badge-green-bg", border: "border-badge-green/30", text: "text-badge-green" },
  shift: { bg: "bg-badge-blue-bg", border: "border-badge-blue/30", text: "text-badge-blue" },
};

// ─── Destructive / Delete Dialog Colors ──────────────────────────────────
export const destructiveColors = {
  text: "text-status-red",
  bg: "bg-status-red-bg",
  border: "border-status-red-border",
  hoverBg: "hover:bg-status-red-bg",
  buttonBg: "bg-status-red hover:bg-status-red-hover",
  buttonText: "text-white",
} as const;
