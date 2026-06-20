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
  INACTIVITY_WARNING_DAYS,
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

// ─── Core: Notify the owning recruiter (non-blocking) ───────────────
// Sends an in-app notification AND an email for critical events.
// Used by domain events (RTR signed, doc uploaded, offer signed, etc.)
// so recruiters see real-time updates in their notification bell + inbox.
async function notifyRecruiter(params: {
  leadId: number;
  title: string;
  message: string;
  type?: string;
  sendEmail?: boolean;
  category?: "rtr" | "document" | "status" | "calendar" | "credit" | "compliance" | "system";
  priority?: "urgent" | "important" | "info";
  actionLabel?: string;
}): Promise<void> {
  try {
    const lead = await db.recruiterLead.findUnique({
      where: { id: params.leadId },
      select: {
        id: true,
        recruiter_user_id: true,
        first_name: true,
        last_name: true,
        recruiter_user: { select: { email: true, first_name: true, last_name: true } },
      },
    });
    if (!lead) return;

    // Use the centralized createNotification helper
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId: lead.recruiter_user_id,
      category: params.category || "status",
      priority: params.priority || "info",
      title: params.title,
      message: params.message,
      actionUrl: `/recruiter/candidates/${lead.id}`,
      actionLabel: params.actionLabel || "View profile",
      relatedEntityId: lead.id,
      relatedEntityType: "lead",
      forceEmail: params.sendEmail,
    });
  } catch (err) {
    console.error("[BOB] Failed to send notification:", err);
    // Non-blocking
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

  // Notify the owning recruiter
  await notifyRecruiter({
    category: "rtr",
    priority: "urgent",
    sendEmail: true,
    leadId: params.leadId,
    title: "RTR signed! 🎉",
    message: `Candidate signed the RTR: "${params.documentName}". Status moved to Interested.`,
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

  // Notify the owning recruiter about the denial
  await notifyRecruiter({
    category: "rtr",
    priority: "urgent",
    sendEmail: true,
    leadId: params.leadId,
    title: `RTR declined (${newDenialCount}/${RTR_DENIAL_THRESHOLD})`,
    message: `Candidate declined the RTR: "${params.documentName}"${params.reason ? ` — ${params.reason}` : ""}.${newDenialCount >= RTR_DENIAL_THRESHOLD ? " Auto-moved to Not Interested (5 denials reached)." : ""}`,
  });

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

  // Notify the owning recruiter
  await notifyRecruiter({
    category: "document",
    priority: "urgent",
    sendEmail: true,
    leadId: params.leadId,
    title: "Document uploaded 📄",
    message: `Candidate uploaded: ${params.docType} — "${params.docName}". Check the Documents tab.`,
  });

  await touchLeadActivity(params.leadId, "doc_uploaded");
}

// ─── Domain Events: Doc Denied (candidate declined to share) ────────
export async function onDocDenied(params: {
  leadId: number;
  docType: string;
}): Promise<void> {
  await logActivity({
    leadId: params.leadId,
    activityType: "doc_denied",
    description: `Document denied: ${params.docType} — candidate declined to share`,
    actorType: "candidate",
    metadata: { document_type: params.docType },
  });

  // Notify the owning recruiter
  await notifyRecruiter({
    category: "document",
    priority: "urgent",
    leadId: params.leadId,
    title: "Document denied ❌",
    message: `Candidate declined to share their ${params.docType}. You can request again later.`,
  });

  await touchLeadActivity(params.leadId, "doc_denied");
}

// ─── Domain Events: Doc Shared (candidate shared an existing doc) ───
export async function onDocShared(params: {
  leadId: number;
  docType: string;
  docName: string;
}): Promise<void> {
  await logActivity({
    leadId: params.leadId,
    activityType: "doc_shared",
    description: `Document shared: ${params.docType} — "${params.docName}"`,
    actorType: "candidate",
    metadata: { document_type: params.docType, document_name: params.docName },
  });

  // Notify the owning recruiter
  await notifyRecruiter({
    category: "document",
    priority: "urgent",
    leadId: params.leadId,
    title: "Document shared ✅",
    message: `Candidate shared their ${params.docType}: "${params.docName}". Check the Documents tab.`,
  });

  await touchLeadActivity(params.leadId, "doc_shared");
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

  // Auto-transition to onboarding
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
    description: "Onboarding started — compliance checklist should be created",
    actorType: "system",
    metadata: { trigger: "offer_signed" },
  });

  // ─── Auto-create compliance checklist (if candidate has a platform account) ───
  // When the offer is accepted, we try to find a matching checklist template
  // by the lead's specialty and auto-create a ChecklistRequest. If no template
  // matches or the candidate doesn't have a platform account, we set a
  // next_action reminder instead.
  try {
    const lead = await db.recruiterLead.findUnique({
      where: { id: params.leadId },
      select: {
        id: true,
        candidate_user_id: true,
        first_name: true,
        last_name: true,
        specialty: true,
        job_title: true,
        recruiter_user_id: true,
      },
    });

    if (lead) {
      if (lead.candidate_user_id) {
        // Try to find a matching checklist template by specialty
        let template: any = null;
        if (lead.specialty) {
          template = await db.checklistTemplate.findFirst({
            where: {
              specialty: { equals: lead.specialty, mode: "insensitive" },
              is_active: true,
            },
          });
        }
        // Fallback: any active template
        if (!template) {
          template = await db.checklistTemplate.findFirst({
            where: { is_active: true },
          });
        }

        if (template) {
          // Check if there's already an active checklist request for this candidate + template
          const existingRequest = await db.checklistRequest.findFirst({
            where: {
              candidate_user_id: lead.candidate_user_id,
              checklist_template_id: template.id,
              status: { notIn: ["declined", "cancelled"] },
            },
          });

          if (!existingRequest) {
            // Auto-create the checklist request
            await db.checklistRequest.create({
              data: {
                client_user_id: lead.recruiter_user_id,
                candidate_user_id: lead.candidate_user_id,
                checklist_template_id: template.id,
                status: "sent",
                completion_pct: 0,
              },
            });

            await logActivity({
              leadId: params.leadId,
              activityType: "onboarding_started",
              description: `Compliance checklist auto-created: "${template.name}" (template matched by specialty: ${lead.specialty || "default"})`,
              actorType: "system",
              metadata: {
                trigger: "offer_signed",
                template_id: template.id,
                template_name: template.name,
              },
            });

            console.log(`[BOB] Auto-created checklist (template: ${template.name}) for lead ${lead.id}`);
          } else {
            // Checklist already exists — just log it
            await logActivity({
              leadId: params.leadId,
              activityType: "onboarding_started",
              description: `Onboarding started — compliance checklist already exists (status: ${existingRequest.status})`,
              actorType: "system",
              metadata: { trigger: "offer_signed", existing_request_id: existingRequest.id },
            });
          }

          // Set next action to monitor checklist completion
          await db.recruiterLead.update({
            where: { id: params.leadId },
            data: {
              next_action: `Monitor compliance checklist completion for ${lead.first_name} ${lead.last_name}`,
              next_action_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Check in 3 days
            },
          });
        } else {
          // No template found — set next_action to manually send
          await db.recruiterLead.update({
            where: { id: params.leadId },
            data: {
              next_action: `No matching checklist template found for ${lead.specialty || "this specialty"}. Create one or send manually.`,
              next_action_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
        }
      } else {
        // No platform account — set next_action to wait
        await db.recruiterLead.update({
          where: { id: params.leadId },
          data: {
            next_action: `Wait for ${lead.first_name} ${lead.last_name} to set up their account, then send compliance checklist`,
            next_action_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  } catch (err) {
    console.error("[BOB] Failed to auto-create checklist after offer signed:", err);
  }

  // Notify the owning recruiter — offer accepted is a big deal!
  await notifyRecruiter({
    category: "rtr",
    priority: "urgent",
    sendEmail: true,
    leadId: params.leadId,
    title: "Offer accepted! 🎉",
    message: `Candidate signed the offer letter: "${params.documentName}". Status moved to Onboarding. Next: send compliance checklist.`,
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

// ─── Cron: Check for leads whose contract start date has arrived ───
// Run daily. Finds leads in 'onboarding' status with a contract_start_date
// that is today or in the past, and auto-flips them to 'on_assignment'.
export async function checkAssignmentStarts(): Promise<{ started: number }> {
  const now = new Date();

  const toStart = await db.recruiterLead.findMany({
    where: {
      pipeline_stage: "onboarding",
      contract_start_date: { lte: now },
      is_active: true,
    },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      contract_start_date: true,
      recruiter_user_id: true,
    },
  });

  for (const lead of toStart) {
    await onAssignmentStarted({
      leadId: lead.id,
      startDate: lead.contract_start_date!,
    });

    // Clear the contract_start_date so the cron doesn't re-trigger
    await db.recruiterLead.update({
      where: { id: lead.id },
      data: { contract_start_date: null },
    });
  }

  return { started: toStart.length };
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

  // ─── 1. Flip leads to inactive (30+ days no activity) ─────────
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

  // ─── 2. Send 5/3/1-day warnings BEFORE inactivity ─────────────
  // For each warning day (5, 3, 1), find leads that are exactly N days
  // away from the 30-day cutoff and send a warning notification.
  // We avoid duplicate warnings by checking if a notification with the
  // same message was already sent recently.
  let warnedCount = 0;
  for (const daysBefore of INACTIVITY_WARNING_DAYS) {
    // Lead is "daysBefore" days from going inactive:
    //   last_activity was (30 - daysBefore) days ago
    const targetAgeDays = INACTIVITY_THRESHOLD_DAYS - daysBefore;
    const windowStart = new Date(
      now.getTime() - (targetAgeDays + 0.5) * 24 * 60 * 60 * 1000,
    );
    const windowEnd = new Date(
      now.getTime() - (targetAgeDays - 0.5) * 24 * 60 * 60 * 1000,
    );

    const leadsToWarn = await db.recruiterLead.findMany({
      where: {
        is_active: true,
        pipeline_stage: {
          notIn: ["inactive", "not_interested", "blacklisted", "on_assignment"],
        },
        last_activity_at: {
          gte: windowStart,
          lt: windowEnd,
        },
      },
      select: {
        id: true,
        recruiter_user_id: true,
        first_name: true,
        last_name: true,
      },
    });

    for (const lead of leadsToWarn) {
      // Check if we already sent this exact warning (avoid duplicates
      // if cron runs multiple times in a day)
      const existingWarning = await db.notification.findFirst({
        where: {
          user_id: lead.recruiter_user_id,
          related_entity_id: lead.id,
          related_entity_type: "lead",
          type: "call_reminder", // reuse existing type
          message: {
            contains: `${daysBefore} day`,
          },
          created_at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
        select: { id: true },
      });

      if (existingWarning) continue; // Already warned today

      try {
        const warningTitle = `Candidate going inactive in ${daysBefore} day${daysBefore > 1 ? "s" : ""}`;
        const warningMessage = `${lead.first_name} ${lead.last_name} will be moved to the Company Pool in ${daysBefore} day${daysBefore > 1 ? "s" : ""} due to inactivity. Log an activity to keep them in your BOB.`;

        await db.notification.create({
          data: {
            user_id: lead.recruiter_user_id,
            title: warningTitle,
            message: warningMessage,
            type: "call_reminder",
            related_entity_id: lead.id,
            related_entity_type: "lead",
          },
        });

        // ─── Also send an email for the 1-day warning (most urgent) ───
        // We only email for 1-day warnings to avoid spamming for 5/3-day.
        if (daysBefore === 1) {
          try {
            const recruiter = await db.user.findUnique({
              where: { id: lead.recruiter_user_id },
              select: { email: true, first_name: true, last_name: true },
            });

            if (recruiter?.email) {
              const brevoApiKey = process.env.BREVO_API_KEY;
              const brevoSender = process.env.BREVO_SENDER_EMAIL || "noreply@myzipvault.com";
              const appUrl = process.env.NEXTAUTH_URL || "https://my-zip-vault.vercel.app";
              const leadUrl = `${appUrl}/recruiter/candidates/${lead.id}`;
              const recruiterName = `${recruiter.first_name ?? ""} ${recruiter.last_name ?? ""}`.trim() || "there";

              if (brevoApiKey) {
                fetch("https://api.brevo.com/v3/smtp/email", {
                  method: "POST",
                  headers: {
                    "api-key": brevoApiKey,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    sender: { email: brevoSender, name: "MyZipVault BOB" },
                    to: [{ email: recruiter.email }],
                    subject: `⚠️ ${lead.first_name} ${lead.last_name} goes inactive tomorrow`,
                    htmlContent: `
                      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                        <div style="background: #B91C1C; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                          <span style="color: #FECACA; font-weight: 600;">MyZipVault</span>
                          <span style="color: #fff; margin-left: 8px;">Inactivity Warning</span>
                        </div>
                        <div style="background: #FEF2F2; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #FECACA;">
                          <h2 style="color: #991B1B; margin: 0 0 12px;">⚠️ Action needed: ${lead.first_name} ${lead.last_name}</h2>
                          <p style="color: #1A1A1A; font-size: 15px; line-height: 1.6;">Hi ${recruiterName},</p>
                          <p style="color: #5B5A56; font-size: 15px; line-height: 1.6;">
                            <strong>${lead.first_name} ${lead.last_name}</strong> will be moved to the Company Pool
                            <strong>tomorrow</strong> due to 30 days of inactivity. Once in the Company Pool,
                            any recruiter in your organization can claim them.
                          </p>
                          <p style="color: #5B5A56; font-size: 15px; line-height: 1.6;">
                            To keep them in your BOB, log any activity (a call, a note, a status change) today.
                          </p>
                          <p style="margin: 24px 0;">
                            <a href="${leadUrl}" style="background: #B91C1C; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
                              View candidate profile
                            </a>
                          </p>
                        </div>
                      </div>
                    `,
                  }),
                }).catch((err) => {
                  console.error("[BOB] Failed to send inactivity warning email:", err);
                });
              }
            }
          } catch (emailErr) {
            console.error("[BOB] Failed to send inactivity warning email:", emailErr);
          }
        }

        warnedCount++;
      } catch (err) {
        console.error(`[BOB] Failed to send ${daysBefore}-day warning:`, err);
      }
    }
  }

  return { warned: warnedCount, inactivated: toInactive.length };
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
  INACTIVITY_WARNING_DAYS,
} from "./types";
