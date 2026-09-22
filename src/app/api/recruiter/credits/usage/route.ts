import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCreditUsage, checkCreditLimit } from "@/lib/credit-limits";

/**
 * GET /api/recruiter/credits/usage
 *
 * Returns the recruiter's current credit usage + limits.
 * Used by the frontend to show usage bars + trigger popups.
 *
 * Response: {
 *   isVerified: boolean,
 *   dailyUsed: number,
 *   monthlyUsed: number,
 *   dailyLimit: number,
 *   monthlyLimit: number,
 *   dailyRemaining: number,
 *   monthlyRemaining: number,
 *   verificationStatus: string
 * }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const usage = await getCreditUsage(userId);
    if (!usage) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(usage, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[CREDITS_USAGE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch credit usage" }, { status: 500 });
  }
}

/**
 * POST /api/recruiter/credits/usage
 *
 * Check if the recruiter can spend `amount` credits.
 * Body: { amount: number }
 *
 * Response: {
 *   allowed: boolean,
 *   reason?: 'daily_limit' | 'monthly_limit',
 *   popupTitle?: string,
 *   popupMessage?: string,
 *   remainingDaily: number,
 *   remainingMonthly: number
 * }
 *
 * The frontend uses this to show a popup when the recruiter tries to
 * do something that costs credits but they've hit their limit.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = Number((session.user as Record<string, unknown>).id);
    const role = (session.user as Record<string, unknown>).role as string;
    if (!["client_recruiter", "client_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const amount = Math.max(1, parseInt(body.amount, 10) || 1);

    const check = await checkCreditLimit(userId, amount);

    return NextResponse.json(check, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("[CREDITS_USAGE_CHECK]", error);
    return NextResponse.json({ error: "Failed to check credits" }, { status: 500 });
  }
}
