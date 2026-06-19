/**
 * BOB (Book of Business) — Shared Types & Constants
 *
 * Used by both the status engine and the API routes / frontend.
 * Keep this file dependency-free (no Prisma imports) so it can be
 * imported from client components too.
 */

// ─── Status Taxonomy (12 statuses, all manually overridable) ────────
export type CandidateStatus =
  | "new_lead"
  | "doc_pending"
  | "interested"
  | "submitted"
  | "interview_stage"
  | "offer_sent"
  | "offer_accepted"
  | "onboarding"
  | "on_assignment"
  | "inactive"
  | "not_interested"
  | "blacklisted";

export type CandidateTag = "hot" | "warm" | "cold" | "inactive";

export type ActivityType =
  | "lead_created"
  | "rtr_sent"
  | "rtr_signed"
  | "rtr_denied"
  | "doc_requested"
  | "doc_uploaded"
  | "doc_shared"
  | "doc_denied"
  | "status_changed"
  | "tag_changed"
  | "note_added"
  | "call_logged"
  | "interview_scheduled"
  | "offer_sent"
  | "offer_signed"
  | "offer_accepted"
  | "onboarding_started"
  | "assignment_started"
  | "blacklisted"
  | "reactivated"
  | "moved_to_company_pool"
  | "claimed_from_company_pool"
  | "next_action_set";

export type ActorType = "recruiter" | "admin" | "candidate" | "system";

export interface ActivityMetadata {
  document_id?: number;
  document_name?: string;
  document_type?: string;
  old_status?: CandidateStatus;
  new_status?: CandidateStatus;
  old_tag?: CandidateTag;
  new_tag?: CandidateTag;
  reason?: string;
  scheduled_for?: string;
  denial_count?: number;
  start_date?: string;
  [key: string]: unknown;
}

// ─── Constants ──────────────────────────────────────────────────────
export const ALL_STATUSES: CandidateStatus[] = [
  "new_lead",
  "doc_pending",
  "interested",
  "submitted",
  "interview_stage",
  "offer_sent",
  "offer_accepted",
  "onboarding",
  "on_assignment",
  "inactive",
  "not_interested",
  "blacklisted",
];

/** Leads in any of these statuses are in the "Company Pool" — any recruiter can claim them. */
export const COMPANY_POOL_STATUSES: CandidateStatus[] = [
  "inactive",
  "not_interested",
  "blacklisted",
];

export const RTR_DENIAL_THRESHOLD = 5;
export const INACTIVITY_THRESHOLD_DAYS = 30;
/** Days before inactivity to send warning notifications. */
export const INACTIVITY_WARNING_DAYS = [5, 3, 1];

// ─── Status Display Metadata (for UI) ───────────────────────────────
export const STATUS_META: Record<
  CandidateStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: string;
    description: string;
    /** Order in the Kanban board (left to right). */
    kanbanOrder: number;
    /** Whether this status counts toward "active pipeline" metrics. */
    isActive: boolean;
  }
> = {
  new_lead:        { label: "New Lead",        color: "#1D4ED8", bgColor: "#DBEAFE", borderColor: "#93C5FD", icon: "✨", description: "Just added, no action yet",                        kanbanOrder: 1,  isActive: true },
  doc_pending:     { label: "Doc Pending",     color: "#B45309", bgColor: "#FEF3C7", borderColor: "#FCD34D", icon: "📄", description: "Documents requested, awaiting response",          kanbanOrder: 2,  isActive: true },
  interested:      { label: "Interested",      color: "#047857", bgColor: "#D1FAE5", borderColor: "#6EE7B7", icon: "✅", description: "Candidate agreed to work with you",                kanbanOrder: 3,  isActive: true },
  submitted:       { label: "Submitted",       color: "#6D28D9", bgColor: "#EDE9FE", borderColor: "#C4B5FD", icon: "📤", description: "Profile submitted to a facility",                  kanbanOrder: 4,  isActive: true },
  interview_stage: { label: "Interview Stage", color: "#0E7490", bgColor: "#CFFAFE", borderColor: "#67E8F9", icon: "📅", description: "Interview scheduled",                               kanbanOrder: 5,  isActive: true },
  offer_sent:      { label: "Offer Sent",      color: "#C2410C", bgColor: "#FFEDD5", borderColor: "#FDBA74", icon: "✉️", description: "Offer letter sent via VaultSign",                   kanbanOrder: 6,  isActive: true },
  offer_accepted:  { label: "Offer Accepted",  color: "#15803D", bgColor: "#DCFCE7", borderColor: "#86EFAC", icon: "🎉", description: "Candidate signed the offer",                        kanbanOrder: 7,  isActive: true },
  onboarding:      { label: "Onboarding",      color: "#0284C7", bgColor: "#E0F2FE", borderColor: "#7DD3FC", icon: "🔑", description: "Compliance in progress",                            kanbanOrder: 8,  isActive: true },
  on_assignment:   { label: "On Assignment",   color: "#166534", bgColor: "#BBF7D0", borderColor: "#4ADE80", icon: "💼", description: "Contract started — actively working",               kanbanOrder: 9,  isActive: true },
  inactive:        { label: "Inactive",        color: "#4B5563", bgColor: "#F3F4F6", borderColor: "#D1D5DB", icon: "⏸️", description: "No activity 30+ days — in Company Pool",            kanbanOrder: 10, isActive: false },
  not_interested:  { label: "Not Interested",  color: "#B91C1C", bgColor: "#FEE2E2", borderColor: "#FCA5A5", icon: "❌", description: "Candidate declined — in Company Pool",              kanbanOrder: 11, isActive: false },
  blacklisted:     { label: "Blacklisted",     color: "#7F1D1D", bgColor: "#FECACA", borderColor: "#F87171", icon: "🚫", description: "Do not contact — prompt on any activity",           kanbanOrder: 12, isActive: false },
};

export const TAG_META: Record<
  CandidateTag,
  { label: string; emoji: string; color: string; description: string }
> = {
  hot:      { label: "Hot",      emoji: "🔥", color: "#DC2626", description: "Active in last 7 days" },
  warm:     { label: "Warm",     emoji: "🌡️", color: "#F59E0B", description: "Active in last 8-14 days" },
  cold:     { label: "Cold",     emoji: "❄️", color: "#3B82F6", description: "No activity 15-30 days" },
  inactive: { label: "Inactive", emoji: "⏸️", color: "#6B7280", description: "No activity 30+ days" },
};

// ─── Source options (dropdown + Other) ──────────────────────────────
export const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "cold_call", label: "Cold Call" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "indeed", label: "Indeed" },
  { value: "vivian", label: "Vivian" },
  { value: "nursefly", label: "NurseFly" },
  { value: "careerbuilder", label: "CareerBuilder" },
  { value: "monster", label: "Monster" },
  { value: "ziprecruiter", label: "ZipRecruiter" },
  { value: "flexjobs", label: "FlexJobs" },
  { value: "hospital_website", label: "Hospital Website" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

// ─── Helpers (pure functions, safe for client use) ──────────────────
export function isCompanyPoolStatus(status: string): boolean {
  return (COMPANY_POOL_STATUSES as string[]).includes(status);
}

export function computeTagFromActivity(lastActivityAt: Date | string): CandidateTag {
  const now = new Date();
  const diffMs = now.getTime() - new Date(lastActivityAt).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return "hot";
  if (diffDays <= 14) return "warm";
  if (diffDays <= 30) return "cold";
  return "inactive";
}

export function getStatusLabel(status: string): string {
  return STATUS_META[status as CandidateStatus]?.label ?? status;
}

export function getSourceLabel(source: string): string {
  return SOURCE_OPTIONS.find((s) => s.value === source)?.label ?? source;
}
