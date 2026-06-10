import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    const dateFilter: Record<string, unknown> = {};
    if (from || to) {
      dateFilter.requested_at = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    // Counts by status
    const [totalRequests, pending, completed, sent, expired] =
      await Promise.all([
        db.candidateReference.count({ where: dateFilter }),
        db.candidateReference.count({
          where: { ...dateFilter, status: "pending_request" },
        }),
        db.candidateReference.count({
          where: { ...dateFilter, status: "completed" },
        }),
        db.candidateReference.count({
          where: { ...dateFilter, status: "sent" },
        }),
        db.candidateReference.count({
          where: { ...dateFilter, status: "expired" },
        }),
      ]);

    const responseRate =
      totalRequests > 0
        ? Math.round((completed / totalRequests) * 100)
        : 0;

    // Recent 10 requests
    const recentRequests = await db.candidateReference.findMany({
      where: dateFilter,
      orderBy: { requested_at: "desc" },
      take: 10,
      include: {
        candidate_user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalRequests,
        pending,
        completed,
        sent,
        expired,
        responseRate,
      },
      recentRequests: recentRequests.map((r) => ({
        id: r.id,
        candidateName: r.candidate_user
          ? `${r.candidate_user.first_name || ""} ${r.candidate_user.last_name || ""}`.trim()
          : "Unknown",
        candidateEmail: r.candidate_user?.email ?? "",
        managerEmail: r.manager_email,
        managerPhone: r.manager_phone,
        facilityName: r.facility_name,
        employmentStatus: r.employment_status,
        status: r.status,
        requestedAt: r.requested_at,
      })),
    });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_OVERVIEW_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch reference overview" },
      { status: 500 }
    );
  }
}
