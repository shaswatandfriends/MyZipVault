import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/candidate/jobs/[id]/apply
 *
 * Candidate applies directly to a public job. This creates a
 * CandidateSubmission with submission_type='self_apply' and
 * recruiter_user_id=null. The platform keeps 100% of any placement fee
 * (no recruiter to pay).
 *
 * FIRST-SUBMISSION-WINS still applies — only ONE submission per
 * (candidate, job) is allowed, enforced by the unique constraint.
 *
 * The candidate must:
 *   - Be authenticated as role='candidate'
 *   - Have a claimed CandidateRecord (via email match at signup)
 *     OR have a CandidateRecord created on-the-fly from their profile
 *   - The job must be public + open + not closed
 *
 * Body (optional):
 *   - cover_note: short message from candidate (max 2000 chars)
 *
 * Audit logged. Notification sent to candidate (confirmation).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden — only candidates can apply to jobs" }, { status: 403 });
    }

    const { id } = await params;
    const jobId = parseInt(id, 10);
    if (isNaN(jobId)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const userId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    const userEmail = (session.user as Record<string, unknown>).email as string;

    // Optional cover note
    let coverNote: string | null = null;
    try {
      const body = await request.json();
      if (body.cover_note && typeof body.cover_note === "string") {
        coverNote = body.cover_note.trim().substring(0, 2000);
      }
    } catch {
      // No body — that's fine, cover note is optional
    }

    // Verify the job exists and is open + public
    const job = await db.jobPosting.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        is_public: true,
        status: true,
        close_date: true,
        applications_count: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!job.is_public || job.status !== "open") {
      return NextResponse.json({ error: "This job is no longer accepting applications" }, { status: 400 });
    }
    if (job.close_date && new Date(job.close_date) < new Date()) {
      return NextResponse.json({ error: "This job posting has closed" }, { status: 400 });
    }

    // Find the candidate's CandidateRecord (claimed via email match at signup)
    let candidateRecord = await db.candidateRecord.findFirst({
      where: { claimed_by_user_id: userId },
      select: { id: true, first_name: true, last_name: true, specialty: true },
    });

    // If no claimed record, try to find by email match (in case the user signed
    // up before the self-claim feature was added, or if claim failed)
    if (!candidateRecord) {
      const normalizedEmail = userEmail.trim().toLowerCase();
      const existingContact = await db.candidateContactInfo.findFirst({
        where: {
          type: "email",
          value_normalized: normalizedEmail,
          deleted_at: null,
        },
        select: { candidate_record_id: true },
      });

      if (existingContact) {
        // Claim it now
        await db.candidateRecord.update({
          where: { id: existingContact.candidate_record_id },
          data: { claimed_by_user_id: userId, claimed_at: new Date() },
        });
        candidateRecord = await db.candidateRecord.findUnique({
          where: { id: existingContact.candidate_record_id },
          select: { id: true, first_name: true, last_name: true, specialty: true },
        });
      }
    }

    // If STILL no record, create one fresh from the user's profile
    if (!candidateRecord) {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { first_name: true, last_name: true, email: true, phone: true },
      });

      if (!user) {
        return NextResponse.json({ error: "User account not found" }, { status: 404 });
      }

      candidateRecord = await db.candidateRecord.create({
        data: {
          first_name: user.first_name,
          last_name: user.last_name,
          source: "self_signup",
          claimed_by_user_id: userId,
          claimed_at: new Date(),
        },
        select: { id: true, first_name: true, last_name: true, specialty: true },
      });

      // Add the user's email as primary contact info
      const normalizedEmail = user.email.trim().toLowerCase();
      await db.candidateContactInfo.create({
        data: {
          candidate_record_id: candidateRecord.id,
          type: "email",
          value: user.email,
          value_normalized: normalizedEmail,
          is_primary: true,
          added_by_candidate: true,
        },
      });

      if (user.phone) {
        // Phone normalization (import inline to avoid circular dep)
        const { normalizePhone, formatPhoneDisplay } = await import("@/lib/phone-normalize");
        const normalizedPhone = normalizePhone(user.phone);
        if (normalizedPhone) {
          await db.candidateContactInfo.create({
            data: {
              candidate_record_id: candidateRecord.id,
              type: "phone",
              value: formatPhoneDisplay(normalizedPhone),
              value_normalized: normalizedPhone,
              is_primary: true,
              added_by_candidate: true,
            },
          });
        }
      }
    }

    // Check if already applied (defensive — unique constraint would catch this too,
    // but we want a cleaner error message)
    const existing = await db.candidateSubmission.findUnique({
      where: {
        candidate_record_id_job_id: {
          candidate_record_id: candidateRecord.id,
          job_id: jobId,
        },
      },
      select: { id: true, status: true, submitted_at: true },
    });

    if (existing) {
      return NextResponse.json({
        error: "You have already applied to this job",
        existing_application: {
          id: existing.id,
          status: existing.status,
          submitted_at: existing.submitted_at,
        },
      }, { status: 409 });
    }

    // Create the submission — millisecond precision for tiebreak
    const submittedAtMs = BigInt(Date.now());
    const submittedAt = new Date();

    const submission = await db.candidateSubmission.create({
      data: {
        candidate_record_id: candidateRecord.id,
        job_id: jobId,
        recruiter_user_id: null, // self-apply — no recruiter
        submission_type: "self_apply",
        submitted_at_ms: submittedAtMs,
        submitted_at: submittedAt,
        status: "submitted",
        recruiter_notes: coverNote, // store cover note here for now
        payout_split_phase: "open", // 100% to platform
      },
      select: { id: true },
    });

    // Increment job applications count (fire-and-forget)
    db.jobPosting.update({
      where: { id: jobId },
      data: { applications_count: { increment: 1 } },
    }).catch((err) => console.error("[JOB_APPLICATION_INCREMENT]", err));

    // Audit log
    try {
      await logAudit({
        userId,
        role: "candidate",
        action: "candidate_self_applied_to_job",
        entityType: "candidate_submission",
        entityId: submission.id,
        details: `Applied to "${job.title}" (job #${jobId}) as a self-submission — 100% to platform`,
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log self-apply:", auditErr);
    }

    // Send confirmation notification to candidate
    try {
      const { createNotification } = await import("@/lib/notifications/create");
      await createNotification({
        userId,
        category: "status",
        priority: "info",
        title: "Application submitted ✓",
        message: `Your application for "${job.title}" has been received. The employer will review and reach out if there's a fit.`,
        actionUrl: `/jobs/${jobId}`,
        actionLabel: "View application",
      });
    } catch (notifErr) {
      console.error("[NOTIF] Failed to send application confirmation:", notifErr);
    }

    return NextResponse.json({
      success: true,
      submission_id: submission.id,
      message: `Applied to "${job.title}"`,
    }, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (race condition — two apps in same ms)
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({
        error: "You have already applied to this job (race condition caught)",
      }, { status: 409 });
    }
    console.error("[CANDIDATE_APPLY]", error);
    return NextResponse.json({ error: "Failed to submit application" }, { status: 500 });
  }
}
