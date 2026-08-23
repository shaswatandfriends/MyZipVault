import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * PUT /api/superadmin/submissions/[id]/status
 *
 * Update the status of a candidate submission. When status moves to 'placed',
 * the payout is calculated based on the ownership window phase at the time
 * of placement.
 *
 * Status workflow:
 *   submitted → reviewing → interview → offer → placed (terminal)
 *                                            → rejected (terminal)
 *                          → withdrawn (terminal, by recruiter)
 *
 * PAYOUT CALCULATION (when status='placed'):
 *   - Read the candidate's ownership window (if any, active)
 *   - Read the job's commission_type:
 *     - 'flat' → placement_fee = commission_amount
 *     - 'percentage' → placement_fee = (commission_percentage / 100) * salary_max
 *   - Calculate the split based on payout_split_phase:
 *     - 'exclusive': 75% recruiter, 25% platform
 *     - 'residual': 68% recruiter, 30% platform, 2% original_owner
 *     - 'open': 70% recruiter, 30% platform
 *     - For 'self_apply' (no recruiter): 100% platform
 *   - Update submission with placement_fee, recruiter_payout, platform_payout,
 *     original_owner_residual, placed_at
 *
 * Body:
 *   - status (required): 'reviewing' | 'interview' | 'offer' | 'placed' | 'rejected' | 'withdrawn'
 *   - notes (optional)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminUserId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const { id } = await params;
    const submissionId = parseInt(id, 10);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status, notes } = body;

    const validStatuses = ["reviewing", "interview", "offer", "placed", "rejected", "withdrawn"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    // Fetch the submission with all relations needed for payout calc
    const submission = await db.candidateSubmission.findUnique({
      where: { id: submissionId },
      include: {
        candidate_record: {
          include: {
            ownership_windows: {
              where: { is_active: true },
              take: 1,
            },
          },
        },
        job: true,
        recruiter: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Validate status transition (can't move from terminal states)
    const terminalStatuses = ["placed", "rejected", "withdrawn"];
    if (terminalStatuses.includes(submission.status)) {
      return NextResponse.json({
        error: `Submission is already in terminal status '${submission.status}'. Cannot change.`,
      }, { status: 400 });
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      updated_at: now,
    };

    // Build status history (append to existing)
    const existingHistory = submission.status_history
      ? JSON.parse(submission.status_history)
      : [];
    existingHistory.push({
      status,
      changed_at: now.toISOString(),
      changed_by_user_id: adminUserId,
      notes: notes || null,
    });
    updateData.status_history = JSON.stringify(existingHistory);

    // ─── If status is 'placed', calculate payouts ──────────────────────
    if (status === "placed") {
      updateData.placed_at = now;

      // Read the job's commission info
      const job = submission.job;
      if (!job) {
        return NextResponse.json({ error: "Associated job not found" }, { status: 500 });
      }

      // Determine placement_fee based on commission_type
      let placementFee = 0;
      if (job.commission_type === "flat" && job.commission_amount) {
        placementFee = parseFloat(String(job.commission_amount));
      } else if (job.commission_type === "percentage" && job.commission_percentage) {
        // Use salary_max if available, else salary_min
        const salaryBase = job.salary_max
          ? parseFloat(String(job.salary_max))
          : job.salary_min
            ? parseFloat(String(job.salary_min))
            : 0;
        placementFee = (parseFloat(String(job.commission_percentage)) / 100) * salaryBase;
      }

      // Determine the payout split phase based on ownership window AT PLACEMENT TIME
      // (we re-evaluate the phase in case the cron hasn't run yet)
      const ownershipWindow = submission.candidate_record.ownership_windows[0];
      let payoutSplitPhase = "open"; // default for self_apply or expired
      let exclusiveRecruiterPct = 70;
      let exclusivePlatformPct = 30;
      let residualRecruiterPct = 70;
      let residualPlatformPct = 30;
      let residualOriginalPct = 0;
      let openRecruiterPct = 70;
      let openPlatformPct = 30;
      let isOwnerOfCandidate = false;
      let originalOwnerId: number | null = null;

      if (ownershipWindow) {
        // Re-evaluate current_phase (in case cron hasn't run yet)
        let currentPhase = ownershipWindow.current_phase;
        if (now > ownershipWindow.residual_window_end) {
          currentPhase = "expired";
        } else if (now > ownershipWindow.exclusive_window_end) {
          currentPhase = "residual";
        }

        exclusiveRecruiterPct = parseFloat(String(ownershipWindow.exclusive_recruiter_pct));
        exclusivePlatformPct = parseFloat(String(ownershipWindow.exclusive_platform_pct));
        residualRecruiterPct = parseFloat(String(ownershipWindow.residual_recruiter_pct));
        residualPlatformPct = parseFloat(String(ownershipWindow.residual_platform_pct));
        residualOriginalPct = parseFloat(String(ownershipWindow.residual_original_pct));
        openRecruiterPct = parseFloat(String(ownershipWindow.open_recruiter_pct));
        openPlatformPct = parseFloat(String(ownershipWindow.open_platform_pct));

        originalOwnerId = ownershipWindow.recruiter_user_id;
        isOwnerOfCandidate = ownershipWindow.recruiter_user_id === submission.recruiter_user_id;

        if (currentPhase === "exclusive" && isOwnerOfCandidate) {
          payoutSplitPhase = "exclusive";
        } else if (currentPhase === "residual") {
          payoutSplitPhase = "residual";
        } else if (currentPhase === "expired") {
          payoutSplitPhase = "open";
        } else {
          // Exclusive but not the owner — this shouldn't happen, but fall back to open
          payoutSplitPhase = "open";
        }
      }

      // Calculate payouts
      let recruiterPayout = 0;
      let platformPayout = 0;
      let originalOwnerResidual = 0;

      if (submission.submission_type === "self_apply" || !submission.recruiter_user_id) {
        // Self-apply: 100% to platform, no recruiter payout
        recruiterPayout = 0;
        platformPayout = placementFee;
        originalOwnerResidual = 0;
        payoutSplitPhase = "self_apply";
      } else if (payoutSplitPhase === "exclusive") {
        recruiterPayout = (placementFee * exclusiveRecruiterPct) / 100;
        platformPayout = (placementFee * exclusivePlatformPct) / 100;
        originalOwnerResidual = 0;
      } else if (payoutSplitPhase === "residual") {
        recruiterPayout = (placementFee * residualRecruiterPct) / 100;
        platformPayout = (placementFee * residualPlatformPct) / 100;
        originalOwnerResidual = (placementFee * residualOriginalPct) / 100;
      } else {
        // Open
        recruiterPayout = (placementFee * openRecruiterPct) / 100;
        platformPayout = (placementFee * openPlatformPct) / 100;
        originalOwnerResidual = 0;
      }

      updateData.placement_fee = parseFloat(placementFee.toFixed(2));
      updateData.recruiter_payout = parseFloat(recruiterPayout.toFixed(2));
      updateData.platform_payout = parseFloat(platformPayout.toFixed(2));
      updateData.original_owner_residual = parseFloat(originalOwnerResidual.toFixed(2));
      updateData.payout_split_phase = payoutSplitPhase;

      // If residual, also store the original owner ID for the audit trail
      // (already captured in ownership_window table)
    }

    // Update the submission
    const updated = await db.candidateSubmission.update({
      where: { id: submissionId },
      data: updateData,
      select: {
        id: true, status: true, placement_fee: true, recruiter_payout: true,
        platform_payout: true, original_owner_residual: true, payout_split_phase: true,
        placed_at: true,
      },
    });

    // Audit log
    try {
      const candidateName = [submission.candidate_record.first_name, submission.candidate_record.last_name]
        .filter(Boolean).join(" ") || `#${submission.candidate_record_id}`;
      const recruiterName = submission.recruiter
        ? `${submission.recruiter.first_name ?? ""} ${submission.recruiter.last_name ?? ""}`.trim() || submission.recruiter.email
        : "self-apply";

      let details = `Submission #${submissionId} status → ${status} (by ${recruiterName} for ${candidateName} on "${submission.job.title}")`;
      if (status === "placed" && updated.placement_fee) {
        details += `. Placement fee: $${updated.placement_fee}. Recruiter payout: $${updated.recruiter_payout}. Platform payout: $${updated.platform_payout}. Original owner residual: $${updated.original_owner_residual}. Phase: ${updated.payout_split_phase}.`;
      }
      await logAudit({
        userId: adminUserId,
        role: userRole,
        action: `submission_status_${status}`,
        entityType: "candidate_submission",
        entityId: submissionId,
        details,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log submission status update:", auditErr);
    }

    // Notify the recruiter (if any) about status change
    if (submission.recruiter_user_id) {
      try {
        const { createNotification } = await import("@/lib/notifications/create");
        const candidateName = [submission.candidate_record.first_name, submission.candidate_record.last_name]
          .filter(Boolean).join(" ") || `#${submission.candidate_record_id}`;
        const statusLabels: Record<string, { title: string; message: string; priority: string }> = {
          reviewing: { title: "Submission under review", message: `${candidateName} for "${submission.job.title}" is now under review.`, priority: "info" },
          interview: { title: "Interview scheduled", message: `${candidateName} has been invited to interview for "${submission.job.title}".`, priority: "info" },
          offer: { title: "Offer extended ✓", message: `An offer has been extended for ${candidateName} on "${submission.job.title}".`, priority: "important" },
          placed: { title: "Placement confirmed! 🎉", message: `${candidateName} has been placed on "${submission.job.title}". Your payout: $${updated.recruiter_payout ?? 0}.`, priority: "urgent" },
          rejected: { title: "Submission rejected", message: `${candidateName} was not selected for "${submission.job.title}".`, priority: "info" },
          withdrawn: { title: "Submission withdrawn", message: `Submission for ${candidateName} on "${submission.job.title}" has been withdrawn.`, priority: "info" },
        };
        const config = statusLabels[status];
        if (config) {
          await createNotification({
            userId: submission.recruiter_user_id,
            category: "status",
            priority: config.priority as "info" | "important" | "urgent",
            title: config.title,
            message: config.message,
            actionUrl: `/recruiter/candidates/search`,
            actionLabel: "View candidate",
          });
        }
      } catch (notifErr) {
        console.error("[NOTIF] Failed to notify recruiter of status change:", notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      submission: updated,
    });
  } catch (error) {
    console.error("[SUBMISSION_STATUS_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update submission status" }, { status: 500 });
  }
}
