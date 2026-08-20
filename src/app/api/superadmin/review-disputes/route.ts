import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/review-disputes — list all review disputes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = (session.user as Record<string, unknown>).role as string;
    if (role !== "super_admin" && role !== "platform_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;

    const disputes = await db.recruiterReviewDispute.findMany({
      where,
      include: {
        review: {
          select: {
            id: true,
            recruiter_user_id: true,
            reviewer_role: true,
            professionalism: true,
            communication: true,
            job_match: true,
            process_speed: true,
            post_placement: true,
            comment: true,
            is_anonymous: true,
            recruiter_reply: true,
            created_at: true,
          },
        },
        recruiter: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
      orderBy: [{ created_at: "desc" }],
      take: 100,
    });

    return NextResponse.json({ disputes });
  } catch (error) {
    console.error("[DISPUTES_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 });
  }
}
