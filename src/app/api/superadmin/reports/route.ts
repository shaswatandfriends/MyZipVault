import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/superadmin/reports — list all recruiter reports
 * PUT /api/superadmin/reports/[id] — resolve a report
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

    const reports = await db.recruiterReport.findMany({
      where,
      include: {
        recruiter: { select: { id: true, first_name: true, last_name: true, email: true } },
        reporter: { select: { id: true, first_name: true, last_name: true, email: true } },
      },
      orderBy: [{ priority: "desc" }, { created_at: "desc" }],
      take: 100,
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[REPORTS_LIST]", error);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}
