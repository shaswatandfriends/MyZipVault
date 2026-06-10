import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/admin/checklist-requests
 * Fetch all checklist requests with candidate, recruiter, and template info.
 * Supports filtering by status and pagination.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "25", 10);
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (status !== "all") {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      db.checklistRequest.findMany({
        where,
        select: {
          id: true,
          status: true,
          completion_pct: true,
          opened_at: true,
          created_at: true,
          checklist_template: {
            select: {
              id: true,
              name: true,
              profession: true,
              specialty: true,
            },
          },
          candidate_user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              candidate_profile: {
                select: { profile_completion_pct: true },
              },
            },
          },
          client_user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              organization: {
                select: { name: true },
              },
            },
          },
          candidate_response: {
            select: {
              id: true,
              status: true,
              submitted_at: true,
              valid_until: true,
              personal_info_collected: true,
            },
          },
        },
        orderBy: { created_at: "desc" },
        skip,
        take: pageSize,
      }),
      db.checklistRequest.count({ where }),
    ]);

    // Stats
    const [sentCount, openedCount, inProgressCount, completedCount] = await Promise.all([
      db.checklistRequest.count({ where: { status: "sent" } }),
      db.checklistRequest.count({ where: { status: "opened" } }),
      db.checklistRequest.count({ where: { status: "in_progress" } }),
      db.checklistRequest.count({ where: { status: "completed" } }),
    ]);

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        status: r.status,
        completionPct: r.completion_pct,
        openedAt: r.opened_at,
        createdAt: r.created_at,
        template: {
          id: r.checklist_template.id,
          name: r.checklist_template.name,
          profession: r.checklist_template.profession,
          specialty: r.checklist_template.specialty,
        },
        candidate: {
          id: r.candidate_user.id,
          firstName: r.candidate_user.first_name,
          lastName: r.candidate_user.last_name,
          email: r.candidate_user.email,
          profileCompletion: r.candidate_user.candidate_profile?.profile_completion_pct ?? 0,
        },
        recruiter: {
          id: r.client_user.id,
          firstName: r.client_user.first_name,
          lastName: r.client_user.last_name,
          organizationName: r.client_user.organization?.name || null,
        },
        response: r.candidate_response
          ? {
              id: r.candidate_response.id,
              status: r.candidate_response.status,
              submittedAt: r.candidate_response.submitted_at,
              validUntil: r.candidate_response.valid_until,
              personalInfoCollected: r.candidate_response.personal_info_collected,
            }
          : null,
      })),
      total,
      page,
      pageSize,
      stats: {
        sent: sentCount,
        opened: openedCount,
        inProgress: inProgressCount,
        completed: completedCount,
        total: sentCount + openedCount + inProgressCount + completedCount,
      },
    });
  } catch (error) {
    console.error("Admin Checklist Requests GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist requests" },
      { status: 500 }
    );
  }
}
