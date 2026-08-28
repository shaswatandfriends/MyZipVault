import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/employer/credits/balance
 *
 * Returns the employer's organization credit balance.
 *
 * Employers use the same credit system as recruiters — credits are spent
 * to reveal candidate contact info for direct sourcing (same as recruiters).
 *
 * Auth: employer role only.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "employer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const organizationId = (session.user as Record<string, unknown>).organizationId as number | null;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { credits_balance: true },
    });

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({ balance: org.credits_balance });
  } catch (error) {
    console.error("[EMPLOYER_CREDITS_BALANCE]", error);
    return NextResponse.json({ error: "Failed to fetch credit balance" }, { status: 500 });
  }
}
