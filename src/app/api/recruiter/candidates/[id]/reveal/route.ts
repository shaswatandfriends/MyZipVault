import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCreditAccess, deductCredits, getCreditsRequiredAsync } from "@/lib/credit-gating";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/recruiter/candidates/[id]/reveal
 *
 * Recruiter pays credits to reveal a candidate's contact info (email + phone).
 *
 * Behavior:
 *   - If already revealed (within 90-day reveal window): return the contact
 *     info without charging again.
 *   - If not revealed: check credits via checkCreditAccess, deduct, create
 *     CandidateContactReveal record (valid 90 days), return contact info.
 *
 * Ownership window interaction:
 *   - If candidate is in another recruiter's EXCLUSIVE phase: BLOCKED.
 *     (Can't reveal contact info that's not yours to see.)
 *   - If candidate is in RESIDUAL phase: allowed.
 *   - If candidate is platform_pool: always allowed.
 *
 * Returns:
 *   - All contact info (email + phone, with full history)
 *   - reveal_id (for reference)
 *   - credits_charged
 *   - expires_at
 *
 * Credit cost: configurable via PlatformSetting ('credit_cost.reveal_email'
 * and 'credit_cost.reveal_phone'). Default: 2 each (4 total).
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
    if (!["client_recruiter", "client_admin"].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = parseInt(session.user.id as string, 10);
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | undefined;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const { id } = await params;
    const candidateRecordId = parseInt(id, 10);
    if (isNaN(candidateRecordId)) {
      return NextResponse.json({ error: "Invalid candidate ID" }, { status: 400 });
    }

    // Verify candidate exists
    const candidate = await db.candidateRecord.findUnique({
      where: { id: candidateRecordId },
      include: {
        ownership_windows: {
          where: { is_active: true },
          take: 1,
        },
        contact_info: {
          where: { deleted_at: null },
          orderBy: { added_at: "desc" },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // ─── Ownership window check ──────────────────────────────────────
    const activeOwnership = candidate.ownership_windows[0];
    if (
      activeOwnership &&
      activeOwnership.recruiter_user_id !== userId &&
      activeOwnership.current_phase === "exclusive"
    ) {
      return NextResponse.json({
        error: "This candidate is in another recruiter's exclusive ownership window. Contact info is locked until the 90-day exclusive period ends.",
        ownership_end: activeOwnership.exclusive_window_end,
      }, { status: 403 });
    }

    // ─── Check if already revealed (within 90-day reveal window) ──────
    const now = new Date();
    const existingReveal = await db.candidateContactReveal.findFirst({
      where: {
        candidate_record_id: candidateRecordId,
        recruiter_user_id: userId,
        is_expired: false,
        expires_at: { gte: now },
      },
      select: { id: true, expires_at: true, revealed_at: true, credits_charged: true },
    });

    if (existingReveal) {
      // Already revealed — return contact info without charging again
      return NextResponse.json({
        success: true,
        already_revealed: true,
        reveal_id: existingReveal.id,
        revealed_at: existingReveal.revealed_at,
        expires_at: existingReveal.expires_at,
        credits_charged: existingReveal.credits_charged,
        contact_info: candidate.contact_info.map((ci) => ({
          type: ci.type,
          value: ci.value,
          is_primary: ci.is_primary,
          added_at: ci.added_at,
          added_by_candidate: ci.added_by_candidate,
        })),
      });
    }

    // ─── Need to charge credits ───────────────────────────────────────
    // Get credit costs from PlatformSetting (cached 60s)
    const emailCost = await getCreditsRequiredAsync("reveal_email");
    const phoneCost = await getCreditsRequiredAsync("reveal_phone");
    const totalCost = emailCost + phoneCost;

    // Check credits
    const accessResult = await checkCreditAccess(organizationId, "reveal_email");
    if (!accessResult.allowed) {
      return NextResponse.json({
        error: accessResult.reason || "Insufficient credits",
        credits_required: totalCost,
        current_balance: accessResult.currentBalance,
      }, { status: 403 });
    }

    // Also check phone credits (if candidate has phone)
    const hasPhone = candidate.contact_info.some((ci) => ci.type === "phone");
    if (hasPhone && phoneCost > 0) {
      const phoneAccess = await checkCreditAccess(organizationId, "reveal_phone");
      if (!phoneAccess.allowed) {
        return NextResponse.json({
          error: phoneAccess.reason || "Insufficient credits for phone reveal",
          credits_required: totalCost,
          current_balance: phoneAccess.currentBalance,
        }, { status: 403 });
      }
    }

    // Deduct credits in a transaction with the reveal record
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    let newBalance: number = accessResult.currentBalance;

    try {
      const result = await db.$transaction(async (tx) => {
        // Deduct email credits
        if (emailCost > 0) {
          const emailDeduct = await tx.organization.updateMany({
            where: { id: organizationId, credits_balance: { gte: emailCost } },
            data: { credits_balance: { decrement: emailCost } },
          });
          if (emailDeduct.count === 0) {
            throw new Error("Race condition — credits depleted between check and deduct");
          }
          await tx.creditTransaction.create({
            data: {
              organization_id: organizationId,
              transaction_type: "deduction",
              credit_amount: -emailCost,
              description: `Reveal email for candidate #${candidateRecordId} (by user #${userId})`,
            },
          });
        }

        // Deduct phone credits (if has phone)
        if (hasPhone && phoneCost > 0) {
          const phoneDeduct = await tx.organization.updateMany({
            where: { id: organizationId, credits_balance: { gte: phoneCost } },
            data: { credits_balance: { decrement: phoneCost } },
          });
          if (phoneDeduct.count === 0) {
            throw new Error("Race condition — credits depleted between check and deduct (phone)");
          }
          await tx.creditTransaction.create({
            data: {
              organization_id: organizationId,
              transaction_type: "deduction",
              credit_amount: -phoneCost,
              description: `Reveal phone for candidate #${candidateRecordId} (by user #${userId})`,
            },
          });
        }

        // Create the reveal record
        const reveal = await tx.candidateContactReveal.create({
          data: {
            candidate_record_id: candidateRecordId,
            recruiter_user_id: userId,
            organization_id: organizationId,
            credits_charged: totalCost,
            revealed_at: now,
            expires_at: expiresAt,
            is_expired: false,
          },
          select: { id: true },
        });

        // Get the new balance
        const updatedOrg = await tx.organization.findUnique({
          where: { id: organizationId },
          select: { credits_balance: true },
        });

        return { reveal, newBalance: updatedOrg?.credits_balance ?? 0 };
      });

      newBalance = result.newBalance;

      // Audit log
      try {
        await logAudit({
          userId,
          role: userRole,
          action: "recruiter_revealed_contact_info",
          entityType: "candidate_record",
          entityId: candidateRecordId,
          details: `Revealed contact info for ${candidate.first_name ?? ""} ${candidate.last_name ?? ""} (candidate #${candidateRecordId}) — ${totalCost} credits charged. Valid 90 days. New balance: ${newBalance}`,
        });
      } catch (auditErr) {
        console.error("[AUDIT_LOG] Failed to log reveal:", auditErr);
      }

      return NextResponse.json({
        success: true,
        already_revealed: false,
        reveal_id: result.reveal.id,
        revealed_at: now,
        expires_at: expiresAt,
        credits_charged: totalCost,
        new_balance: newBalance,
        contact_info: candidate.contact_info.map((ci) => ({
          type: ci.type,
          value: ci.value,
          is_primary: ci.is_primary,
          added_at: ci.added_at,
          added_by_candidate: ci.added_by_candidate,
        })),
      }, { status: 201 });
    } catch (txErr) {
      console.error("[REVEAL_TRANSACTION]", txErr);
      return NextResponse.json({
        error: "Failed to deduct credits — race condition or insufficient balance",
      }, { status: 409 });
    }
  } catch (error) {
    console.error("[RECRUITER_REVEAL]", error);
    return NextResponse.json({ error: "Failed to reveal contact info" }, { status: 500 });
  }
}
