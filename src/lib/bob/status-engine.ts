/**
 * BOB (Book of Business) — Status Engine
 *
 * Central library that enforces all candidate status transition rules.
 * Every state-changing operation in the app MUST go through this engine
 * to keep the data model consistent and the audit trail complete.
 *
 * ─── Status Taxonomy (12 statuses, all manually overridable) ────────
 *   1.  new_lead         — Just added, no action yet
 *   2.  doc_pending      — Documents requested, awaiting response
 *   3.  interested       — Candidate agreed (verbally or signed RTR)
 *   4.  submitted        — Recruiter submitted profile to facility
 *   5.  interview_stage  — Interview scheduled
 *   6.  offer_sent       — Offer letter sent via VaultSign
 *   7.  offer_accepted   — Candidate signed offer letter (auto)
 *   8.  onboarding       — Offer accepted, compliance in progress (auto)
 *   9.  on_assignment    — Contract start date reached (auto)
 *  10.  inactive         — No activity 30+ days (auto)
 *  11.  not_interested   — Candidate denied RTR 5x, or manual
 *  12.  blacklisted      — Manual only — prompts all recruiters
 *
 * ─── Tag System (auto-updated by last_activity_at) ──────────────────
 *   hot      — activity in last 7 days
 *   warm     — activity in last 8-14 days
 *   cold     — no activity in 15-30 days
 *   inactive — no activity 30+ days (also flips pipeline_stage)
 *
 * ─── Pool Mechanics ─────────────────────────────────────────────────
 *   Company Pool = leads with status inactive | not_interested | blacklisted
 *                  (any recruiter can claim)
 *   Recruiter BOB = leads with any other status (owned exclusively)
 *
 * ─── RTR Denial Rule ────────────────────────────────────────────────
 *   5 denials → auto-flip to not_interested → move to Company Pool
 *
 * ─── Blacklist Rule ─────────────────────────────────────────────────
 *   Any recruiter activity on a blacklisted lead → prompt:
 *   "This candidate was marked Not Interested on [date]. Reactivate?"
 *   If yes → status → interested, full history preserved, moves to BOB top
 *   If no  → action blocked
 */

import { db } from "@/lib/db";
import {
  type CandidateStatus,
  type CandidateTag,
  type ActivityType,
  type ActorType,
  type ActivityMetadata,
  isCompanyPoolStatus,
  computeTagFromActivity,
  RTR_DENIAL_THRESHOLD,
  INACTIVITY_THRESHOLD_DAYS,
  STATUS_META,
} from "./types";

// ─── Core: Log Activity (always called by other functions) ──────────
export async function logActivity(params: {
  leadId: number;
  activityType: ActivityType;
  description: string;
  actorUserId?: number;
  actorType?: ActorType;
  metadata?: ActivityMetadata;
}): Promise<void> {
  try {
    await db.recruiterLeadActivity.create({
      data: {
        lead_id: params.leadId,
        activity_type: params.activityType,
        description: params.description,
        actor_user_id: params.actorUserId ?? null,
        actor_type: params.actorType ?? "system",
        metadata: (params.metadata ?? {}) as any,
      },
    });
  } catch (err) {
    // Non-blocking — don't fail the main operation if logging fails
    console.error("[BOB] Failed to log activity:", err);
  }
}

// ─── Core: Update last_activity_at + recompute tag ──────────────────
async function touchLeadActivity(
  leadId: number,
  activityType: string,
): Promise<void> {
  const now = new Date();
  const newTag = computeTagFromActivity(now) as CandidateTag;

  await db.recruiterLead.update({
    where: { id: leadId },
    data: {
      last_activity_at: now,
      last_activity_type: activityType,
      tag: newTag,
      updated_at: now,
    },
  });
}

// ─── Core: Change status (with validation + audit trail) ────────────
export async function changeStatus(params: {
  leadId: number;
  newStatus: CandidateStatus;
  actorUserId?: number;
  actorType?: ActorType;
  reason?: string;
  skipActivityLog?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const lead = await db.recruiterLead.findUnique({
    where: { id: params.leadId },
    select: { id: true, pipeline_stage: true, recruiter_user_id: true, organization_id: true },
  });

  if (!lead) {
    return { success: false, error: "Lead not found" };
  }

  const oldStatus = lead.pipeline_stage as CandidateStatus;

  if (oldStatus === params.newStatus) {
    return { success: true }; // No-op
  }

  // Update the lead
  await db.recruiterLead.update({
    where: { id: params.leadId },
    data: {
      pipeline_stage: params.newStatus,
      updated_at: new Date(),
      // If moving to a Company Pool status, is_active becomes false
      is_active: !isCompanyPoolStatus(params.newStatus),
    },
  });

  // Touch activity (updates last_activity_at + tag)
  await touchLeadActivity(params.leadId, "status_changed");

  // Log the status change
  if (!params.skipActivityLog) {
    await logActivity({
      leadId: params.leadId,
      activityType: "status_changed",
      description: `Status changed: ${STATUS_META[oldStatus]?.label || oldStatus} → ${STATUS_META[params.newStatus].label}${params.reason ? ` — ${params.reason}` : ""}`,
      actorUserId: params.actorUserId,
      actorType: params.actorType ?? "recruiter",
      metadata: {
        old_status: oldStatus,
        new_status: params.newStatus,
        reason: params.reason,
      },
    });

    // Log pool movement if applicable
    const wasInPool = isCompanyPoolStatus(oldStatus);
    const nowInPool = isCompanyPoolStatus(params.newStatus);
    if (!wasInPool && nowInPool) {
      await logActivity({
        leadId: params.leadId,
        activityType: "moved_to_company_pool",
        description: `Moved to Company Pool (status: ${STATUS_META[params.newStatus].label})`,
        actorUserId: params.actorUserId,
        actorType: params.actorType ?? "system",
        metadata: { reason: params.reason, new_status: params.newStatus },
      });
    } else if (wasInPool && !nowInPool) {
      await logActivity({
        leadId: params.leadId,
        activityType: "claimed_from_company_pool",
        description: `Claimed from Company Pool (new status: ${STATUS_META[params.newStatus].label})`,
        actorUserId: params.actorUserId,
        actorType: params.actorType ?? "recruiter",
        metadata: { old_status: oldStatus, new_status: params.newStatus },
      });
    }
  }

  return { success: true };
}

// ─── Domain Events: Lead Created ────────────────────────────────────
export async function onLeadCreated(params: {
  leadId: number;
  actorUserId: number;
  source?: string;
}): Promise<void> {
  await logActivity({
    leadId: params.leadId,
    activityType: "lead_created",
    description: `Lead created${params.source ? ` (source: ${params.source})` : ""}`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { source: params.source },
  });

  await touchLeadActivity(params.leadId, "lead_created");
}

// ─── Domain Events: RTR Sent ────────────────────────────────────────
export async function onRtrSent(params: {
  leadId: number;
  documentId: number;
  documentName: string;
  actorUserId: number;
}): Promise<void> {
  const lead = await db.recruiterLead.findUnique({
    where: { id: params.leadId },
    select: { id: true, pipeline_stage: true, recruiter_user_id: true },
  });

  if (!lead) return;

  // If lead was in Company Pool, re-activate to "interested"
  if (isCompanyPoolStatus(lead.pipeline_stage)) {
    await changeStatus({
      leadId: params.leadId,
      newStatus: "interested",
      actorUserId: params.actorUserId,
      actorType: "recruiter",
      reason: `RTR sent: "${params.documentName}"`,
      skipActivityLog: true,
    });

    await logActivity({
      leadId: params.leadId,
      activityType: "reactivated",
      description: `Reactivated from Company Pool — RTR sent: "${params.documentName}"`,
      actorUserId: params.actorUserId,
      actorType: "recruiter",
      metadata: { document_id: params.documentId, document_name: params.documentName },
    });
  }

  // Log the RTR sent event
  await logActivity({
    leadId: params.leadId,
    activityType: "rtr_sent",
    description: `RTR sent via VaultSign: "${params.documentName}"`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: {
      document_id: params.documentId,
      document_name: params.documentName,
      document_type: "rtr",
    },
  });

  await touchLeadActivity(params.leadId, "rtr_sent");
}

// ─── Domain Events: RTR Signed ──────────────────────────────────────
export async function onRtrSigned(params: {
  leadId: number;
  documentId: number;
  documentName: string;
}): Promise<void> {
  await changeStatus({
    leadId: params.leadId,
    newStatus: "interested",
    actorType: "system",
    reason: `RTR signed: "${params.documentName}"`,
    skipActivityLog: true,
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "rtr_signed",
    description: `RTR signed: "${params.documentName}"`,
    actorType: "candidate",
    metadata: { document_id: params.documentId, document_name: params.documentName },
  });

  await touchLeadActivity(params.leadId, "rtr_signed");
}

// ─── Domain Events: RTR Denied ──────────────────────────────────────
export async function onRtrDenied(params: {
  leadId: number;
  documentId: number;
  documentName: string;
  reason?: string;
}): Promise<void> {
  const lead = await db.recruiterLead.findUnique({
    where: { id: params.leadId },
    select: { id: true, rtr_denial_count: true, pipeline_stage: true },
  });

  if (!lead) return;

  const newDenialCount = (lead.rtr_denial_count ?? 0) + 1;

  await db.recruiterLead.update({
    where: { id: params.leadId },
    data: { rtr_denial_count: newDenialCount, updated_at: new Date() },
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "rtr_denied",
    description: `RTR denied: "${params.documentName}" (denial ${newDenialCount}/${RTR_DENIAL_THRESHOLD})${params.reason ? ` — ${params.reason}` : ""}`,
    actorType: "candidate",
    metadata: {
      document_id: params.documentId,
      document_name: params.documentName,
      reason: params.reason,
      denial_count: newDenialCount,
    },
  });

  // Auto-flip to not_interested after 5 denials
  if (newDenialCount >= RTR_DENIAL_THRESHOLD && lead.pipeline_stage !== "not_interested") {
    await changeStatus({
      leadId: params.leadId,
      newStatus: "not_interested",
      actorType: "system",
      reason: `Auto-marked Not Interested after ${RTR_DENIAL_THRESHOLD} RTR denials`,
      skipActivityLog: true,
    });

    await logActivity({
      leadId: params.leadId,
      activityType: "status_changed",
      description: `Auto-marked Not Interested after ${RTR_DENIAL_THRESHOLD} RTR denials — moved to Company Pool`,
      actorType: "system",
      metadata: { reason: "rtr_denial_threshold_reached", denial_count: newDenialCount },
    });
  }

  await touchLeadActivity(params.leadId, "rtr_denied");
}

// ─── Domain Events: Doc Requested ───────────────────────────────────
export async function onDocRequested(params: {
  leadId: number;
  docType: string;
  actorUserId: number;
}): Promise<void> {
  await changeStatus({
    leadId: params.leadId,
    newStatus: "doc_pending",
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    reason: `Requested: ${params.docType}`,
    skipActivityLog: true,
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "doc_requested",
    description: `Document requested: ${params.docType}`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { document_type: params.docType },
  });

  await touchLeadActivity(params.leadId, "doc_requested");
}

// ─── Domain Events: Doc Uploaded ────────────────────────────────────
export async function onDocUploaded(params: {
  leadId: number;
  docType: string;
  docName: string;
}): Promise<void> {
  await logActivity({
    leadId: params.leadId,
    activityType: "doc_uploaded",
    description: `Document uploaded: ${params.docType} — "${params.docName}"`,
    actorType: "candidate",
    metadata: { document_type: params.docType, document_name: params.docName },
  });

  await touchLeadActivity(params.leadId, "doc_uploaded");
}

// ─── Domain Events: Interview Scheduled ─────────────────────────────
export async function onInterviewScheduled(params: {
  leadId: number;
  scheduledAt: Date;
  actorUserId: number;
}): Promise<void> {
  await changeStatus({
    leadId: params.leadId,
    newStatus: "interview_stage",
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    reason: `Interview scheduled for ${params.scheduledAt.toLocaleDateString()}`,
    skipActivityLog: true,
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "interview_scheduled",
    description: `Interview scheduled: ${params.scheduledAt.toLocaleString()}`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { scheduled_for: params.scheduledAt.toISOString() },
  });

  await touchLeadActivity(params.leadId, "interview_scheduled");
}

// ─── Domain Events: Offer Sent ──────────────────────────────────────
export async function onOfferSent(params: {
  leadId: number;
  documentId: number;
  documentName: string;
  actorUserId: number;
}): Promise<void> {
  await changeStatus({
    leadId: params.leadId,
    newStatus: "offer_sent",
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    reason: `Offer sent: "${params.documentName}"`,
    skipActivityLog: true,
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "offer_sent",
    description: `Offer letter sent via VaultSign: "${params.documentName}"`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { document_id: params.documentId, document_name: params.documentName, document_type: "offer" },
  });

  await touchLeadActivity(params.leadId, "offer_sent");
}

// ─── Domain Events: Offer Signed → Offer Accepted ───────────────────
export async function onOfferSigned(params: {
  leadId: number;
  documentId: number;
  documentName: string;
}): Promise<void> {
  // Auto-flip to offer_accepted
  await changeStatus({
    leadId: params.leadId,
    newStatus: "offer_accepted",
    actorType: "system",
    reason: `Offer signed: "${params.documentName}"`,
    skipActivityLog: true,
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "offer_accepted",
    description: `Offer accepted — candidate signed: "${params.documentName}"`,
    actorType: "candidate",
    metadata: { document_id: params.documentId, document_name: params.documentName },
  });

  // Auto-transition to onboarding (compliance checklist auto-created elsewhere)
  await changeStatus({
    leadId: params.leadId,
    newStatus: "onboarding",
    actorType: "system",
    reason: "Auto: offer accepted → onboarding started",
    skipActivityLog: true,
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "onboarding_started",
    description: "Onboarding started — compliance checklist created",
    actorType: "system",
    metadata: { trigger: "offer_signed" },
  });

  await touchLeadActivity(params.leadId, "offer_accepted");
}

// ─── Domain Events: Blacklist ───────────────────────────────────────
export async function blacklistLead(params: {
  leadId: number;
  reason: string;
  actorUserId: number;
}): Promise<void> {
  await db.recruiterLead.update({
    where: { id: params.leadId },
    data: {
      pipeline_stage: "blacklisted",
      blacklist_reason: params.reason,
      blacklisted_at: new Date(),
      blacklisted_by_user_id: params.actorUserId,
      is_active: false,
      updated_at: new Date(),
    },
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "blacklisted",
    description: `Blacklisted — reason: ${params.reason}`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { reason: params.reason },
  });

  await touchLeadActivity(params.leadId, "blacklisted");
}

// ─── Domain Events: Reactivate (from blacklist/not_interested) ──────
export async function reactivateLead(params: {
  leadId: number;
  actorUserId: number;
}): Promise<void> {
  await changeStatus({
    leadId: params.leadId,
    newStatus: "interested",
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    reason: "Reactivated by recruiter",
    skipActivityLog: true,
  });

  // Clear blacklist fields
  await db.recruiterLead.update({
    where: { id: params.leadId },
    data: {
      blacklist_reason: null,
      blacklisted_at: null,
      blacklisted_by_user_id: null,
    },
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "reactivated",
    description: "Reactivated from blacklist",
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { trigger: "manual_reactivation" },
  });

  await touchLeadActivity(params.leadId, "reactivated");
}

// ─── Domain Events: Assignment Start ────────────────────────────────
export async function onAssignmentStarted(params: {
  leadId: number;
  startDate: Date;
}): Promise<void> {
  await changeStatus({
    leadId: params.leadId,
    newStatus: "on_assignment",
    actorType: "system",
    reason: `Contract start date reached: ${params.startDate.toLocaleDateString()}`,
    skipActivityLog: true,
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "assignment_started",
    description: `Assignment started — contract start date: ${params.startDate.toLocaleDateString()}`,
    actorType: "system",
    metadata: { start_date: params.startDate.toISOString() },
  });

  await touchLeadActivity(params.leadId, "assignment_started");
}

// ─── Domain Events: Note Added ──────────────────────────────────────
export async function onNoteAdded(params: {
  leadId: number;
  noteText: string;
  actorUserId: number;
}): Promise<void> {
  await logActivity({
    leadId: params.leadId,
    activityType: "note_added",
    description: `Note: "${params.noteText.slice(0, 200)}${params.noteText.length > 200 ? "..." : ""}"`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { note: params.noteText },
  });

  await touchLeadActivity(params.leadId, "note_added");
}

// ─── Domain Events: Call Logged ─────────────────────────────────────
export async function onCallLogged(params: {
  leadId: number;
  callOutcome: string;
  actorUserId: number;
}): Promise<void> {
  await logActivity({
    leadId: params.leadId,
    activityType: "call_logged",
    description: `Call logged: ${params.callOutcome}`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { outcome: params.callOutcome },
  });

  await touchLeadActivity(params.leadId, "call_logged");
}

// ─── Domain Events: Next Action Set ─────────────────────────────────
export async function setNextAction(params: {
  leadId: number;
  action: string;
  when?: Date;
  actorUserId: number;
}): Promise<void> {
  await db.recruiterLead.update({
    where: { id: params.leadId },
    data: {
      next_action: params.action,
      next_action_at: params.when ?? null,
      updated_at: new Date(),
    },
  });

  await logActivity({
    leadId: params.leadId,
    activityType: "next_action_set",
    description: `Next action set: "${params.action}"${params.when ? ` — due ${params.when.toLocaleDateString()}` : ""}`,
    actorUserId: params.actorUserId,
    actorType: "recruiter",
    metadata: { action: params.action, due: params.when?.toISOString() },
  });
}

// ─── Cron: Check for inactive leads (run daily) ─────────────────────
// Sends notifications 5/3/1 days before inactivity, then flips to inactive
export async function checkInactiveLeads(): Promise<{
  warned: number;
  inactivated: number;
}> {
  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getTime() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  );

  // Find leads that should be flipped to inactive
  const toInactive = await db.recruiterLead.findMany({
    where: {
      is_active: true,
      pipeline_stage: {
        notIn: ["inactive", "not_interested", "blacklisted", "on_assignment"],
      },
      last_activity_at: { lt: thirtyDaysAgo },
    },
    select: {
      id: true,
      recruiter_user_id: true,
      first_name: true,
      last_name: true,
      organization_id: true,
    },
  });

  for (const lead of toInactive) {
    await changeStatus({
      leadId: lead.id,
      newStatus: "inactive",
      actorType: "system",
      reason: "No activity for 30 days",
      skipActivityLog: true,
    });

    await logActivity({
      leadId: lead.id,
      activityType: "status_changed",
      description:
        "Auto-marked Inactive — no activity for 30 days. Moved to Company Pool.",
      actorType: "system",
      metadata: {
        reason: "inactivity_threshold_reached",
        days_inactive: INACTIVITY_THRESHOLD_DAYS,
      },
    });

    // Send notification to the owning recruiter
    try {
      await db.notification.create({
        data: {
          user_id: lead.recruiter_user_id,
          title: "Candidate moved to Company Pool",
          message: `${lead.first_name} ${lead.last_name} has been inactive for 30 days and was moved to the Company Pool. Any recruiter can now claim them.`,
          type: "lead_stage_change",
          related_entity_id: lead.id,
          related_entity_type: "lead",
        },
      });
    } catch (err) {
      console.error("[BOB] Failed to send inactivity notification:", err);
    }
  }

  // TODO: Send 5/3/1-day warnings via Notification model (needs warning-state tracking)

  return { warned: 0, inactivated: toInactive.length };
}

// ─── Helper: Check if action is blocked (blacklist prompt) ──────────
export async function checkBlacklistBlock(leadId: number): Promise<{
  blocked: boolean;
  reason?: string;
  blacklistedAt?: Date;
  blacklistedByName?: string;
}> {
  const lead = await db.recruiterLead.findUnique({
    where: { id: leadId },
    select: {
      pipeline_stage: true,
      blacklist_reason: true,
      blacklisted_at: true,
      blacklisted_by_user_id: true,
      blacklisted_by: { select: { first_name: true, last_name: true, email: true } },
    },
  });

  if (!lead || lead.pipeline_stage !== "blacklisted") {
    return { blocked: false };
  }

  const blacklistedByName = lead.blacklisted_by
    ? `${lead.blacklisted_by.first_name ?? ""} ${lead.blacklisted_by.last_name ?? ""}`.trim() ||
      lead.blacklisted_by.email
    : "Unknown";

  return {
    blocked: true,
    reason: lead.blacklist_reason ?? "No reason provided",
    blacklistedAt: lead.blacklisted_at ?? undefined,
    blacklistedByName,
  };
}

// Re-export shared helpers for convenience
export {
  isCompanyPoolStatus,
  computeTagFromActivity,
  RTR_DENIAL_THRESHOLD,
  INACTIVITY_THRESHOLD_DAYS,
} from "./types";
