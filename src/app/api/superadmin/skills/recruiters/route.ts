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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const companyId = searchParams.get("companyId") || "";

    // Find all client_admin and client_recruiter users who have sent checklist requests
    const recruiters = await db.user.findMany({
      where: {
        role: { in: ["client_admin", "client_recruiter"] },
        account_status: "active",
        ...(search
          ? {
              OR: [
                { first_name: { contains: search, mode: "insensitive" } },
                { last_name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(companyId ? { organization_id: parseInt(companyId) } : {}),
        checklist_requests_as_client: { some: {} },
      },
      include: {
        organization: { select: { id: true, name: true } },
        checklist_requests_as_client: {
          include: {
            checklist_template: { select: { profession: true, specialty: true, name: true } },
            candidate_user: { select: { id: true, first_name: true, last_name: true, email: true } },
          },
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { last_activity_at: "desc" },
    });

    // Stats
    const totalActiveRecruiters = recruiters.length;
    const totalRequestsAll = recruiters.reduce((sum, r) => sum + r.checklist_requests_as_client.length, 0);
    const avgRequests = totalActiveRecruiters > 0 ? Math.round(totalRequestsAll / totalActiveRecruiters) : 0;

    // Top recruiters by request count
    const topRecruiters = [...recruiters]
      .sort((a, b) => b.checklist_requests_as_client.length - a.checklist_requests_as_client.length)
      .slice(0, 5)
      .map((r) => ({
        id: r.id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        requestCount: r.checklist_requests_as_client.length,
        companyName: r.organization?.name || "No Company",
      }));

    return NextResponse.json({
      recruiters: recruiters.map((r) => {
        const requests = r.checklist_requests_as_client;
        const completed = requests.filter((req) => req.status === "completed").length;
        const pending = requests.filter((req) => req.status !== "completed").length;
        const lastActivity = requests.length > 0 ? requests[0].created_at : null;

        return {
          id: r.id,
          email: r.email,
          firstName: r.first_name,
          lastName: r.last_name,
          role: r.role,
          companyName: r.organization?.name || "No Company",
          companyId: r.organization_id,
          totalRequests: requests.length,
          completed,
          pending,
          lastActivity,
          requestHistory: requests.map((req) => ({
            id: req.id,
            status: req.status,
            completionPct: req.completion_pct,
            createdAt: req.created_at,
            template: req.checklist_template
              ? {
                  profession: req.checklist_template.profession,
                  specialty: req.checklist_template.specialty,
                  name: req.checklist_template.name,
                }
              : null,
            candidate: req.candidate_user
              ? {
                  id: req.candidate_user.id,
                  firstName: req.candidate_user.first_name,
                  lastName: req.candidate_user.last_name,
                  email: req.candidate_user.email,
                }
              : null,
          })),
        };
      }),
      stats: {
        totalActiveRecruiters,
        avgRequestsPerRecruiter: avgRequests,
        topRecruiters,
      },
    });
  } catch (error) {
    console.error("Skills Recruiters GET error:", error);
    return NextResponse.json({ error: "Failed to fetch recruiters data" }, { status: 500 });
  }
}
