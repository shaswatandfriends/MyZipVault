import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/superadmin/references/overview — Stats for reference overview page
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Total references requested
    const totalRequested = await db.candidateReference.count();

    // Completed (status = 'completed')
    const completed = await db.candidateReference.count({
      where: { status: "completed" },
    });

    // Pending (all non-completed)
    const pending = await db.candidateReference.count({
      where: { status: { not: "completed" } },
    });

    // By status breakdown
    const byStatus = {
      pending_request: await db.candidateReference.count({ where: { status: "pending_request" } }),
      sent: await db.candidateReference.count({ where: { status: "sent" } }),
      opened: await db.candidateReference.count({ where: { status: "opened" } }),
      completed: completed,
    };

    // By employment status
    const byEmploymentStatus = {
      current: await db.candidateReference.count({ where: { employment_status: "current" } }),
      ending_contract: await db.candidateReference.count({ where: { employment_status: "ending_contract" } }),
      past: await db.candidateReference.count({ where: { employment_status: "past" } }),
    };

    // Avg response time (for completed references with responses)
    const completedRefs = await db.candidateReference.findMany({
      where: { status: "completed" },
      include: {
        reference_responses: {
          where: { submitted_at: { not: null } },
          orderBy: { submitted_at: "desc" },
          take: 1,
        },
      },
    });

    let avgResponseHours = 0;
    const responseTimes: number[] = [];
    for (const ref of completedRefs) {
      if (ref.reference_responses.length > 0 && ref.reference_responses[0].submitted_at) {
        const diff = new Date(ref.reference_responses[0].submitted_at).getTime() - new Date(ref.requested_at).getTime();
        const hours = diff / (1000 * 60 * 60);
        responseTimes.push(hours);
      }
    }
    if (responseTimes.length > 0) {
      avgResponseHours = Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10;
    }

    // Completion rate
    const completionRate = totalRequested > 0 ? Math.round((completed / totalRequested) * 100) : 0;

    // Deletion requests pending
    const deletionRequestsPending = await db.referenceDeletionRequest.count({
      where: { status: "pending" },
    });

    // References pending >7 days (no response)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const stalePending = await db.candidateReference.count({
      where: {
        status: { in: ["pending_request", "sent"] },
        requested_at: { lte: sevenDaysAgo },
      },
    });

    // Candidates with no references
    const candidatesWithRole = await db.user.findMany({
      where: { role: "candidate" },
      select: { id: true },
    });
    const candidateIds = candidatesWithRole.map((c) => c.id);
    const candidatesWithRefs = await db.candidateReference.findMany({
      where: { candidate_user_id: { in: candidateIds } },
      select: { candidate_user_id: true },
      distinct: ["candidate_user_id"],
    });
    const candidatesWithoutRefs = candidateIds.length - candidatesWithRefs.length;

    // Managers receiving excessive requests (more than 5)
    const managerRequestCounts = await db.candidateReference.groupBy({
      by: ["manager_email"],
      _count: { id: true },
      having: { id: { _count: { gt: 5 } } },
    });

    // Incomplete responses (references with status 'completed' but missing some answers)
    const incompleteResponses = await db.candidateReference.count({
      where: {
        status: "completed",
        reference_responses: { some: { answer_text: "" } },
      },
    });

    // Recent activity (latest 10 events)
    const recentRequests = await db.candidateReference.findMany({
      take: 5,
      orderBy: { requested_at: "desc" },
      include: {
        candidate_user: {
          select: { id: true, email: true, first_name: true, last_name: true, candidate_profile: { select: { first_name: true, last_name: true } } },
        },
      },
    });

    const recentSubmissions = await db.referenceResponse.findMany({
      take: 5,
      orderBy: { submitted_at: "desc" },
      where: { submitted_at: { not: null } },
      include: {
        candidate_reference: {
          include: {
            candidate_user: {
              select: { id: true, email: true, first_name: true, last_name: true, candidate_profile: { select: { first_name: true, last_name: true } } },
            },
          },
        },
      },
    });

    const recentDeletions = await db.referenceDeletionRequest.findMany({
      take: 5,
      orderBy: { created_at: "desc" },
      include: {
        candidate_user: {
          select: { id: true, email: true, first_name: true, last_name: true, candidate_profile: { select: { first_name: true, last_name: true } } },
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalRequested,
        completed,
        pending,
        avgResponseHours,
        completionRate,
        deletionRequestsPending,
      },
      byStatus,
      byEmploymentStatus,
      alerts: {
        stalePending,
        candidatesWithoutRefs,
        excessiveManagerRequests: managerRequestCounts.length,
        incompleteResponses,
      },
      recentActivity: {
        requests: recentRequests.map((r) => ({
          id: r.id,
          candidateName: r.candidate_user.candidate_profile
            ? `${r.candidate_user.candidate_profile.first_name || ""} ${r.candidate_user.candidate_profile.last_name || ""}`.trim() || r.candidate_user.email
            : `${r.candidate_user.first_name || ""} ${r.candidate_user.last_name || ""}`.trim() || r.candidate_user.email,
          facility: r.facility_name,
          status: r.status,
          requestedAt: r.requested_at,
        })),
        submissions: recentSubmissions.map((s) => ({
          id: s.id,
          candidateName: s.candidate_reference.candidate_user.candidate_profile
            ? `${s.candidate_reference.candidate_user.candidate_profile.first_name || ""} ${s.candidate_reference.candidate_user.candidate_profile.last_name || ""}`.trim() || s.candidate_reference.candidate_user.email
            : `${s.candidate_reference.candidate_user.first_name || ""} ${s.candidate_reference.candidate_user.last_name || ""}`.trim() || s.candidate_reference.candidate_user.email,
          submittedAt: s.submitted_at,
        })),
        deletions: recentDeletions.map((d) => ({
          id: d.id,
          candidateName: d.candidate_user.candidate_profile
            ? `${d.candidate_user.candidate_profile.first_name || ""} ${d.candidate_user.candidate_profile.last_name || ""}`.trim() || d.candidate_user.email
            : `${d.candidate_user.first_name || ""} ${d.candidate_user.last_name || ""}`.trim() || d.candidate_user.email,
          reason: d.reason,
          status: d.status,
          createdAt: d.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("Superadmin references overview GET error:", error);
    return NextResponse.json({ error: "Failed to fetch overview" }, { status: 500 });
  }
}
