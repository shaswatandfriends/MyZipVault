import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/referrals/status
 *
 * Returns the logged-in user's referral link + stats.
 *
 * The referral link uses the user's public_id (UUID) as the ref code:
 *   https://myzipvault.com/signup?ref=<public_id>
 *
 * Stats:
 *   - referral_link: full URL
 *   - total_referrals: count of users referred
 *   - qualified_referrals: count of referrals that completed qualifying actions
 *     (candidates: verified email; recruiters: approved + first submission;
 *     employers: posted first job with commission)
 *   - credits_earned: total credits granted to the referrer (or their org)
 *
 * Auth: any logged-in user (candidate, client_recruiter, client_admin, employer).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;

    // Fetch the user to get their public_id (referral code)
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        public_id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true,
        organization_id: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build the referral link — direct candidates to /signup, recruiters to
    // /agency-signup, employers to /employer-signup. We use ?ref= to make the
    // link shareable.
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const refCode = user.public_id;

    // We provide all three so the user can share whichever link is most
    // relevant to their network. The default signup link is /signup (candidates),
    // since candidates are the most common referral type.
    const referralLinks = {
      candidate: `${baseUrl}/signup?ref=${refCode}`,
      recruiter: `${baseUrl}/agency-signup?ref=${refCode}`,
      employer: `${baseUrl}/employer-signup?ref=${refCode}`,
    };

    // Count referrals — we store these in the AuditLog with action
    // 'referral_signup_credits_granted' (referral user_id = this user).
    // We also store 'referral_signup_recorded' for candidates who don't
    // receive credits.
    let totalReferrals = 0;
    try {
      totalReferrals = await db.auditLog.count({
        where: {
          OR: [
            { action: "referral_signup_credits_granted", user_id: userId },
            { action: "referral_signup_recorded", user_id: userId },
          ],
        },
      });
    } catch {
      // audit_log table may have legacy column names — fall back to 0
      totalReferrals = 0;
    }

    // Count qualified referrals — those that completed a qualifying action.
    // For now, "qualified" = the audit log action is 'referral_signup_credits_granted'
    // (credits granted means the referral did something worth rewarding).
    let qualifiedReferrals = 0;
    try {
      qualifiedReferrals = await db.auditLog.count({
        where: {
          action: "referral_signup_credits_granted",
          user_id: userId,
        },
      });
    } catch {
      qualifiedReferrals = 0;
    }

    // Credits earned — sum of credit_amount from CreditTransactions with
    // description containing 'referral'. Only applies to recruiters/employers
    // who have an organization_id. Candidates don't earn credits.
    let creditsEarned = 0;
    if (organizationId) {
      try {
        const referralTxns = await db.creditTransaction.findMany({
          where: {
            organization_id: organizationId,
            transaction_type: "referral_bonus",
          },
          select: { credit_amount: true },
        });
        creditsEarned = referralTxns.reduce((sum, t) => sum + t.credit_amount, 0);
      } catch {
        creditsEarned = 0;
      }
    }

    // Referral reward config — fixed amounts per role.
    // (Could be moved to PlatformSetting later if we want admins to tune it.)
    const rewardConfig = {
      candidate_verified: 5,    // per candidate who verifies email (ref = candidate gets bragging rights; ref = recruiter/employer gets 5 credits)
      recruiter_approved: 25,   // per recruiter approved + first submission
      employer_first_job: 50,   // per employer first job posted with commission
    };

    return NextResponse.json({
      referral_code: refCode,
      referral_links: referralLinks,
      stats: {
        total_referrals: totalReferrals,
        qualified_referrals: qualifiedReferrals,
        credits_earned: creditsEarned,
      },
      reward_config: rewardConfig,
      // Whether this user can earn credits from referrals (recruiters/employers only)
      can_earn_credits: organizationId !== null,
      user_role: userRole,
    });
  } catch (error) {
    console.error("[REFERRALS_STATUS]", error);
    return NextResponse.json({ error: "Failed to fetch referral status" }, { status: 500 });
  }
}
