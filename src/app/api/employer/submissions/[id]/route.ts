import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/employer/submissions/[id]
 *   Fetch full submission details for an employer. Only works if the
 *   submission's job was posted by THIS employer (or their organization).
 *
 *   Returns:
 *     - submission id, status, timestamps, recruiter_notes
 *     - candidate (name, specialty, profession, city, state, job_title — NO contact info)
 *     - job (id, title, profession, specialty, commission_amount, commission_type)
 *     - recruiter (ANONYMIZED: initials only, no email/phone, with recruiter_id for platform comms)
 *     - payout (placement_fee, recruiter_payout, platform_payout, original_owner_residual, payout_split_phase, placed_at)
 *     - payment_status: 'pending' | 'paid' — derived from whether a paid Invoice
 *       linked to this submission exists. (We store this in the Invoice.pdf_url
 *       with the format 'placement_paid:<session_id>:<submission_id>'.)
 *     - status_history (parsed JSON)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = Number(session.user.id);
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const { id } = await params;
    const submissionId = parseInt(id, 10);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
    }

    // Fetch submission, ensuring the job belongs to this employer
    const submission = await db.candidateSubmission.findUnique({
      where: { id: submissionId },
      include: {
        candidate_record: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            specialty: true,
            profession: true,
            city: true,
            state: true,
            job_title: true,
            ownership_windows: {
              where: { is_active: true },
              take: 1,
              select: {
                recruiter_user_id: true,
                current_phase: true,
                exclusive_window_end: true,
                residual_window_end: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            profession: true,
            specialty: true,
            commission_amount: true,
            commission_type: true,
            commission_percentage: true,
            salary_min: true,
            salary_max: true,
            posted_by_user_id: true,
            organization_id: true,
          },
        },
        recruiter: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify ownership: this employer must own the job
    const ownsJob =
      submission.job.posted_by_user_id === userId ||
      (organizationId !== null && submission.job.organization_id === organizationId);
    if (!ownsJob) {
      return NextResponse.json({ error: "Forbidden — this submission is not for one of your jobs" }, { status: 403 });
    }

    // Check if a placement payment has been made for this submission
    // (Invoice.pdf_url starts with 'placement_paid:')
    let paymentStatus: "pending" | "paid" = "pending";
    try {
      const paidInvoice = await db.invoice.findFirst({
        where: {
          AND: [
            { pdf_url: { startsWith: "placement_paid:" } },
            { pdf_url: { endsWith: `:${submissionId}` } },
          ],
        },
        select: { id: true, total_price: true, created_at: true },
      });
      if (paidInvoice) paymentStatus = "paid";
    } catch {
      // Ignore — default to 'pending'
    }

    // Anonymize recruiter (initials only)
    const recruiterInitials = submission.recruiter
      ? `${submission.recruiter.first_name?.[0] ?? ""}${submission.recruiter.last_name?.[0] ?? ""}`.toUpperCase()
      : null;

    const candidateName = [
      submission.candidate_record.first_name,
      submission.candidate_record.last_name,
    ].filter(Boolean).join(" ") || "—";

    // Parse status_history JSON safely
    let statusHistory: Array<{ status: string; changed_at: string; changed_by_user_id?: number; notes?: string | null }> = [];
    if (submission.status_history) {
      try {
        statusHistory = JSON.parse(submission.status_history);
      } catch {
        statusHistory = [];
      }
    }

    // Determine ownership window phase at placement time (re-evaluate in case cron hasn't run)
    let ownershipPhase: "exclusive" | "residual" | "expired" | "none" = "none";
    const ownershipWindow = submission.candidate_record.ownership_windows[0];
    if (ownershipWindow) {
      const now = new Date();
      if (now > ownershipWindow.residual_window_end) {
        ownershipPhase = "expired";
      } else if (now > ownershipWindow.exclusive_window_end) {
        ownershipPhase = "residual";
      } else {
        ownershipPhase = "exclusive";
      }
    }

    return NextResponse.json({
      submission: {
        id: submission.id,
        status: submission.status,
        submitted_at: submission.submitted_at,
        submission_type: submission.submission_type,
        recruiter_notes: submission.recruiter_notes,
        created_at: submission.created_at,
        updated_at: submission.updated_at,
        // Payout (only populated when status='placed')
        placement_fee: submission.placement_fee !== null ? Number(submission.placement_fee) : null,
        recruiter_payout: submission.recruiter_payout !== null ? Number(submission.recruiter_payout) : null,
        platform_payout: submission.platform_payout !== null ? Number(submission.platform_payout) : null,
        original_owner_residual: submission.original_owner_residual !== null ? Number(submission.original_owner_residual) : null,
        payout_split_phase: submission.payout_split_phase,
        placed_at: submission.placed_at,
        // Payment status (derived)
        payment_status: paymentStatus,
        // Candidate (no contact info)
        candidate: {
          id: submission.candidate_record.id,
          name: candidateName,
          specialty: submission.candidate_record.specialty,
          profession: submission.candidate_record.profession,
          city: submission.candidate_record.city,
          state: submission.candidate_record.state,
          job_title: submission.candidate_record.job_title,
        },
        // Job
        job: {
          id: submission.job.id,
          title: submission.job.title,
          profession: submission.job.profession,
          specialty: submission.job.specialty,
          commission_amount: submission.job.commission_amount !== null ? Number(submission.job.commission_amount) : null,
          commission_type: submission.job.commission_type,
          commission_percentage: submission.job.commission_percentage !== null ? Number(submission.job.commission_percentage) : null,
          salary_min: submission.job.salary_min !== null ? Number(submission.job.salary_min) : null,
          salary_max: submission.job.salary_max !== null ? Number(submission.job.salary_max) : null,
        },
        // ANONYMIZED recruiter
        recruiter: submission.recruiter
          ? {
              initials: recruiterInitials,
              recruiter_id: submission.recruiter.id,
            }
          : null,
        // Ownership info (for showing split preview)
        ownership_phase: ownershipPhase,
        // Status history
        status_history: statusHistory,
      },
    });
  } catch (error) {
    console.error("[EMPLOYER_SUBMISSION_GET]", error);
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
  }
}

/**
 * PUT /api/employer/submissions/[id]
 *   Update the status of a candidate submission. Only works if the
 *   submission's job was posted by THIS employer.
 *
 *   Mirrors the superadmin submission status update route, including the
 *   payout calculation when status='placed'.
 *
 * Body:
 *   - status: 'reviewing' | 'interview' | 'offer' | 'placed' | 'rejected' | 'withdrawn'
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
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
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

    // Fetch submission with relations needed for ownership check + payout calc
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

    // Verify ownership
    const ownsJob =
      submission.job.posted_by_user_id === userId ||
      (organizationId !== null && submission.job.organization_id === organizationId);
    if (!ownsJob) {
      return NextResponse.json({ error: "Forbidden — this submission is not for one of your jobs" }, { status: 403 });
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
      changed_by_user_id: userId,
      notes: notes || null,
    });
    updateData.status_history = JSON.stringify(existingHistory);

    // ─── If status is 'placed', calculate payouts (same logic as superadmin route) ───
    if (status === "placed") {
      updateData.placed_at = now;

      const job = submission.job;
      if (!job) {
        return NextResponse.json({ error: "Associated job not found" }, { status: 500 });
      }

      // Determine placement_fee based on commission_type
      let placementFee = 0;
      if (job.commission_type === "flat" && job.commission_amount) {
        placementFee = parseFloat(String(job.commission_amount));
      } else if (job.commission_type === "percentage" && job.commission_percentage) {
        const salaryBase = job.salary_max
          ? parseFloat(String(job.salary_max))
          : job.salary_min
            ? parseFloat(String(job.salary_min))
            : 0;
        placementFee = (parseFloat(String(job.commission_percentage)) / 100) * salaryBase;
      }

      // Determine payout split phase
      const ownershipWindow = submission.candidate_record.ownership_windows[0];
      let payoutSplitPhase = "open";
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
          payoutSplitPhase = "open";
        }
      }

      let recruiterPayout = 0;
      let platformPayout = 0;
      let originalOwnerResidual = 0;

      if (submission.submission_type === "self_apply" || !submission.recruiter_user_id) {
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
        recruiterPayout = (placementFee * openRecruiterPct) / 100;
        platformPayout = (placementFee * openPlatformPct) / 100;
        originalOwnerResidual = 0;
      }

      updateData.placement_fee = parseFloat(placementFee.toFixed(2));
      updateData.recruiter_payout = parseFloat(recruiterPayout.toFixed(2));
      updateData.platform_payout = parseFloat(platformPayout.toFixed(2));
      updateData.original_owner_residual = parseFloat(originalOwnerResidual.toFixed(2));
      updateData.payout_split_phase = payoutSplitPhase;
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

      let details = `Submission #${submissionId} status → ${status} (by ${recruiterName} for ${candidateName} on "${submission.job.title}") — updated by employer #${userId}`;
      if (status === "placed" && updated.placement_fee) {
        details += `. Placement fee: $${updated.placement_fee}. Recruiter payout: $${updated.recruiter_payout}. Platform payout: $${updated.platform_payout}. Original owner residual: $${updated.original_owner_residual}. Phase: ${updated.payout_split_phase}.`;
      }
      await logAudit({
        userId,
        role,
        action: `employer_submission_status_${status}`,
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
          reviewing: { title: "Submission under review", message: `${candidateName} for "${submission.job.title}" is now under review by the employer.`, priority: "info" },
          interview: { title: "Interview scheduled", message: `${candidateName} has been invited to interview for "${submission.job.title}".`, priority: "info" },
          offer: { title: "Offer extended ✓", message: `An offer has been extended for ${candidateName} on "${submission.job.title}".`, priority: "important" },
          placed: { title: "Placement confirmed! 🎉", message: `${candidateName} has been placed on "${submission.job.title}". Estimated payout: $${updated.recruiter_payout ?? 0} — payment pending from employer.`, priority: "urgent" },
          rejected: { title: "Submission rejected", message: `${candidateName} was not selected for "${submission.job.title}".`, priority: "info" },
          withdrawn: { title: "Submission withdrawn", message: `Submission for ${candidateName} on "${submission.job.title}" has been withdrawn.`, priority: "info" },
        };
        const config = statusLabels[status];
        if (config) {
          await createNotification({
            userId: submission.recruiter_user_id,
            category: "submission",
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

    return NextResponse.json({ success: true, submission: updated });
  } catch (error) {
    console.error("[EMPLOYER_SUBMISSION_PUT]", error);
    return NextResponse.json({ error: "Failed to update submission status" }, { status: 500 });
  }
}
