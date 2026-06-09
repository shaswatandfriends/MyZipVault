import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ─── Stats ───────────────────────────────────────────────────────
    const [
      totalTemplates,
      totalSkills,
      totalRequests,
      completedRequests,
      activeResponses,
      expiringResponses,
    ] = await Promise.all([
      db.checklistTemplate.count(),
      db.skill.count(),
      db.checklistRequest.count(),
      db.checklistRequest.count({ where: { status: "completed" } }),
      db.candidateChecklistResponse.count({ where: { status: "active" } }),
      db.candidateChecklistResponse.count({
        where: {
          valid_until: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
          status: "active",
        },
      }),
    ]);

    const completionRate = totalRequests > 0 ? Math.round((completedRequests / totalRequests) * 100) : 0;

    // ─── Recent Activity ─────────────────────────────────────────────
    const recentRequests = await db.checklistRequest.findMany({
      orderBy: { created_at: "desc" },
      take: 10,
      include: {
        client_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        candidate_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        checklist_template: { select: { id: true, profession: true, specialty: true, name: true } },
      },
    });

    // ─── Flags / Alerts ──────────────────────────────────────────────
    // Candidates with expiring checklists (within 7 days)
    const expiringChecklists = await db.candidateChecklistResponse.findMany({
      where: {
        valid_until: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: "active",
      },
      include: {
        candidate_user: { select: { id: true, first_name: true, last_name: true, email: true } },
        checklist_template: { select: { profession: true, specialty: true } },
      },
      take: 20,
    });

    // Templates with no skills
    const templatesWithNoSkills = await db.checklistTemplate.findMany({
      where: { skills: { none: {} } },
      select: { id: true, profession: true, specialty: true, name: true, is_active: true },
    });

    // Inactive templates that have pending requests
    const inactiveTemplatesWithPending = await db.checklistTemplate.findMany({
      where: {
        is_active: false,
        checklist_requests: { some: { status: { in: ["sent", "opened"] } } },
      },
      select: { id: true, profession: true, specialty: true, name: true },
    });

    // Recruiters sending excessive requests (same candidate >3 times)
    const allRequests = await db.checklistRequest.findMany({
      select: { client_user_id: true, candidate_user_id: true },
    });
    const requestPairs = new Map<string, { clientUserId: number; candidateUserId: number; count: number }>();
    for (const req of allRequests) {
      const key = `${req.client_user_id}-${req.candidate_user_id}`;
      const existing = requestPairs.get(key);
      if (existing) {
        existing.count++;
      } else {
        requestPairs.set(key, { clientUserId: req.client_user_id, candidateUserId: req.candidate_user_id, count: 1 });
      }
    }
    const excessiveRecruitersRaw = Array.from(requestPairs.values())
      .filter((p) => p.count > 3)
      .slice(0, 10);

    const excessiveRecruiterIds = [...new Set(excessiveRecruitersRaw.map((r) => r.clientUserId))];
    const excessiveRecruiterUsers = excessiveRecruiterIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: excessiveRecruiterIds as number[] } },
          select: { id: true, first_name: true, last_name: true, email: true, organization_id: true },
        })
      : [];

    // ─── Requests by Profession ──────────────────────────────────────
    const requestsByProfessionRaw = await db.checklistRequest.findMany({
      include: {
        checklist_template: { select: { profession: true } },
      },
    });
    const professionMap = new Map<string, number>();
    for (const req of requestsByProfessionRaw) {
      const prof = req.checklist_template.profession;
      professionMap.set(prof, (professionMap.get(prof) || 0) + 1);
    }
    const requestsByProfession = Array.from(professionMap.entries()).map(([profession, count]) => ({
      profession,
      count,
    }));

    return NextResponse.json({
      stats: {
        totalTemplates,
        totalSkills,
        totalRequests,
        completedRequests,
        completionRate,
        activeResponses,
        expiringSoon: expiringResponses,
      },
      recentRequests: recentRequests.map((r) => ({
        id: r.id,
        status: r.status,
        completionPct: r.completion_pct,
        createdAt: r.created_at,
        openedAt: r.opened_at,
        clientUser: {
          id: r.client_user.id,
          firstName: r.client_user.first_name,
          lastName: r.client_user.last_name,
          email: r.client_user.email,
        },
        candidateUser: {
          id: r.candidate_user.id,
          firstName: r.candidate_user.first_name,
          lastName: r.candidate_user.last_name,
          email: r.candidate_user.email,
        },
        checklistTemplate: {
          id: r.checklist_template.id,
          profession: r.checklist_template.profession,
          specialty: r.checklist_template.specialty,
          name: r.checklist_template.name,
        },
      })),
      flags: {
        expiringChecklists: expiringChecklists.map((e) => ({
          responseId: e.id,
          validUntil: e.valid_until,
          status: e.status,
          candidate: {
            id: e.candidate_user.id,
            firstName: e.candidate_user.first_name,
            lastName: e.candidate_user.last_name,
            email: e.candidate_user.email,
          },
          template: {
            profession: e.checklist_template.profession,
            specialty: e.checklist_template.specialty,
          },
        })),
        templatesWithNoSkills,
        inactiveTemplatesWithPending,
        excessiveRecruiters: excessiveRecruitersRaw.map((r) => {
          const user = excessiveRecruiterUsers.find((u) => u.id === r.clientUserId);
          return {
            recruiter: user
              ? { id: user.id, firstName: user.first_name, lastName: user.last_name, email: user.email }
              : { id: r.clientUserId, firstName: null, lastName: null, email: "Unknown" },
            candidateId: r.candidateUserId,
            requestCount: r.count,
          };
        }),
      },
      requestsByProfession,
    });
  } catch (error) {
    console.error("Skills Overview GET error:", error);
    return NextResponse.json({ error: "Failed to fetch overview data" }, { status: 500 });
  }
}
