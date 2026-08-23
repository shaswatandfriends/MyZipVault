import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPlacementCheckoutSession, isStripeConfigured } from "@/lib/stripe";

/**
 * POST /api/employer/submissions/[id]/pay
 *
 * Initiates a Stripe Checkout session for the placement fee of a
 * submitted candidate. Only callable when:
 *   - The submission belongs to one of the employer's jobs
 *   - The submission status is 'placed' (so placement_fee is set)
 *   - No prior successful payment exists for this submission (idempotency)
 *
 * On success, returns a Stripe Checkout URL the client should redirect to.
 * The webhook at /api/stripe/webhook handles the actual payment confirmation
 * and payout allocation (recruiter_payout, original_owner_residual).
 */
export async function POST(
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

    const userId = Number((session.user as Record<string, unknown>).id);
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    const userEmail = session.user.email || "";
    const { id } = await params;
    const submissionId = parseInt(id, 10);
    if (isNaN(submissionId)) {
      return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
    }

    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: "Payments are not available at this time. Please contact support." },
        { status: 503 }
      );
    }

    if (!organizationId) {
      return NextResponse.json({ error: "No organization found for this employer account." }, { status: 400 });
    }

    // Fetch submission with payout info + ownership window
    const submission = await db.candidateSubmission.findUnique({
      where: { id: submissionId },
      include: {
        candidate_record: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            ownership_windows: {
              where: { is_active: true },
              take: 1,
              select: { recruiter_user_id: true },
            },
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            posted_by_user_id: true,
            organization_id: true,
          },
        },
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Verify employer owns the job
    const ownsJob =
      submission.job.posted_by_user_id === userId ||
      (organizationId !== null && submission.job.organization_id === organizationId);
    if (!ownsJob) {
      return NextResponse.json({ error: "Forbidden — this submission is not for one of your jobs" }, { status: 403 });
    }

    // Must be in 'placed' status (so placement_fee is set)
    if (submission.status !== "placed") {
      return NextResponse.json({
        error: `Cannot pay for submission in status '${submission.status}'. Mark as 'placed' first.`,
      }, { status: 400 });
    }

    if (submission.placement_fee === null) {
      return NextResponse.json({ error: "Placement fee is not set on this submission." }, { status: 400 });
    }

    const placementFee = Number(submission.placement_fee);
    if (placementFee <= 0) {
      return NextResponse.json({ error: "Placement fee must be greater than 0." }, { status: 400 });
    }

    // Idempotency check — has this submission already been paid?
    try {
      const paidInvoice = await db.invoice.findFirst({
        where: {
          AND: [
            { pdf_url: { startsWith: "placement_paid:" } },
            { pdf_url: { endsWith: `:${submissionId}` } },
          ],
        },
        select: { id: true, total_price: true },
      });
      if (paidInvoice) {
        return NextResponse.json({
          error: "This placement has already been paid.",
          alreadyPaid: true,
        }, { status: 409 });
      }
    } catch {
      // Ignore — proceed with creating a new payment session
    }

    // Get organization name for the Stripe product description
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });

    const candidateName = [
      submission.candidate_record.first_name,
      submission.candidate_record.last_name,
    ].filter(Boolean).join(" ") || `Candidate #${submission.candidate_record.id}`;

    const recruiterPayout = submission.recruiter_payout !== null ? Number(submission.recruiter_payout) : 0;
    const platformPayout = submission.platform_payout !== null ? Number(submission.platform_payout) : 0;
    const originalOwnerResidual = submission.original_owner_residual !== null ? Number(submission.original_owner_residual) : 0;
    const payoutSplitPhase = submission.payout_split_phase ?? "open";

    // Determine original owner user id from the active ownership window
    const originalOwnerUserId = submission.candidate_record.ownership_windows[0]?.recruiter_user_id ?? null;

    // Build success/cancel URLs
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/employer/submissions/${submissionId}?payment=success`;
    const cancelUrl = `${baseUrl}/employer/submissions/${submissionId}?payment=canceled`;

    // Create the Stripe Checkout session
    const checkoutSession = await createPlacementCheckoutSession({
      organizationId,
      organizationName: org?.name || "Unknown Organization",
      submissionId,
      jobTitle: submission.job.title,
      candidateName,
      placementFee,
      customerEmail: userEmail,
      successUrl,
      cancelUrl,
      recruiterUserId: submission.recruiter_user_id,
      recruiterPayout,
      platformPayout,
      originalOwnerUserId,
      originalOwnerResidual,
      payoutSplitPhase,
    });

    if (!checkoutSession) {
      return NextResponse.json({ error: "Failed to create payment session. Please try again." }, { status: 500 });
    }

    // Create a pending Invoice record (so we can match the webhook to this submission).
    // The pdf_url stores both the stripe session id and the submission id:
    //   "placement_session:<session_id>:<submission_id>"
    // When the webhook confirms payment, it updates this to "placement_paid:<session_id>:<submission_id>"
    const invoice = await db.invoice.create({
      data: {
        organization_id: organizationId,
        credit_amount: 0, // placement payments don't grant credits
        total_price: placementFee,
        pdf_url: `placement_session:${checkoutSession.sessionId}:${submissionId}`,
      },
    });

    // Audit log
    try {
      await db.auditLog.create({
        data: {
          user_id: userId,
          role,
          action: "placement_payment_initiated",
          entity_type: "candidate_submission",
          entity_id: submissionId,
          details: `Employer initiated placement payment of $${placementFee.toFixed(2)} for submission #${submissionId} (candidate: ${candidateName}, job: "${submission.job.title}"). Stripe session: ${checkoutSession.sessionId}. Invoice #${invoice.id}.`,
        },
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log placement payment initiation:", auditErr);
    }

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      checkoutUrl: checkoutSession.sessionUrl,
      sessionId: checkoutSession.sessionId,
      invoiceId: invoice.id,
      placementFee,
      recruiterPayout,
      platformPayout,
      originalOwnerResidual,
    });
  } catch (error) {
    console.error("[EMPLOYER_SUBMISSION_PAY]", error);
    return NextResponse.json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}
