import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/superadmin/references/candidates — Candidates with reference stats
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const completionFilter = searchParams.get("completion") || undefined;
    const employmentStatus = searchParams.get("employment_status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Find candidates who have at least one reference request
    const candidateWhere: Record<string, unknown> = {
      role: "candidate",
      candidate_references: { some: {} },
    };

    if (search) {
      candidateWhere.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { first_name: { contains: search, mode: "insensitive" } },
        { last_name: { contains: search, mode: "insensitive" } },
        { candidate_profile: { first_name: { contains: search, mode: "insensitive" } } },
        { candidate_profile: { last_name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (employmentStatus) {
      candidateWhere.candidate_references = {
        some: { employment_status: employmentStatus },
      };
    }

    // Get candidates with their references
    const candidates = await db.user.findMany({
      where: candidateWhere,
      include: {
        candidate_profile: { select: { first_name: true, last_name: true, phone: true } },
        candidate_references: {
          include: {
            manager_user: { select: { first_name: true, last_name: true } },
            reference_responses: {
              include: {
                question: { select: { question_text: true, response_type: true, sort_order: true } },
              },
            },
            deletion_requests: { select: { id: true, status: true } },
          },
          orderBy: { requested_at: "desc" },
        },
      },
      orderBy: { last_activity_at: "desc" },
      skip,
      take: limit,
    });

    const total = await db.user.count({ where: candidateWhere });

    // Filter by completion status if specified
    let filteredCandidates = candidates as any[];
    if (completionFilter) {
      filteredCandidates = candidates.filter((c: Record<string, unknown>) => {
        const refs = (c as Record<string, unknown>).candidate_references as Array<Record<string, unknown>>;
        const totalRefs = refs?.length || 0;
        const completedRefs = refs?.filter((r) => r.status === "completed").length || 0;
        const rate = totalRefs > 0 ? completedRefs / totalRefs : 0;

        if (completionFilter === "complete" && rate === 1) return true;
        if (completionFilter === "partial" && rate > 0 && rate < 1) return true;
        if (completionFilter === "none" && rate === 0) return true;
        return false;
      });
    }

    // Stats
    const totalCandidates = await db.user.count({
      where: { role: "candidate", candidate_references: { some: {} } },
    });

    const allRefs = await db.candidateReference.findMany({
      select: { candidate_user_id: true, status: true, requested_at: true },
    });

    const avgRefsPerCandidate = totalCandidates > 0
      ? Math.round((allRefs.length / totalCandidates) * 10) / 10
      : 0;

    const totalCompleted = allRefs.filter((r) => r.status === "completed").length;
    const overallCompletionRate = allRefs.length > 0
      ? Math.round((totalCompleted / allRefs.length) * 100)
      : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const pendingOver7Days = allRefs.filter(
      (r) => r.status !== "completed" && new Date(r.requested_at) <= sevenDaysAgo
    ).length;

    return NextResponse.json({
      candidates: (filteredCandidates as any[]).map((c: any) => {
        const refs = c.candidate_references || [];
        const totalRefs = refs.length;
        const completedRefs = refs.filter((r: Record<string, unknown>) => r.status === "completed").length;
        const pendingRefs = totalRefs - completedRefs;
        const managers = [...new Set(refs.map((r: Record<string, unknown>) => {
            const mu = r.manager_user as Record<string, unknown> | null;
            if (mu?.first_name || mu?.last_name) {
              return `${mu.first_name || ""} ${mu.last_name || ""}`.trim();
            }
            if (r.manager_first_name || r.manager_last_name) {
              return `${r.manager_first_name || ""} ${r.manager_last_name || ""}`.trim();
            }
            return r.manager_email as string;
          }
        ))];

        return {
          id: c.id,
          email: c.email,
          name: c.candidate_profile
            ? `${c.candidate_profile.first_name || ""} ${c.candidate_profile.last_name || ""}`.trim() || c.email
            : `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email,
          phone: c.candidate_profile?.phone,
          totalReferences: totalRefs,
          completedReferences: completedRefs,
          pendingReferences: pendingRefs,
          managers,
          lastActivity: c.last_activity_at,
          references: refs.map((r: Record<string, unknown>) => ({
            id: r.id,
            managerEmail: r.manager_email,
            managerFirstName: r.manager_first_name,
            managerLastName: r.manager_last_name,
            managerName: (() => {
              const mu = r.manager_user as Record<string, unknown> | null;
              if (mu?.first_name || mu?.last_name) {
                return `${mu.first_name || ""} ${mu.last_name || ""}`.trim() || (r.manager_email as string);
              }
              if (r.manager_first_name || r.manager_last_name) {
                return `${r.manager_first_name || ""} ${r.manager_last_name || ""}`.trim() || (r.manager_email as string);
              }
              return r.manager_email as string;
            })(),
            facilityName: r.facility_name,
            employmentStatus: r.employment_status,
            status: r.status,
            requestedAt: r.requested_at,
            responseCount: (r.reference_responses as unknown[])?.length || 0,
            hasResponses: ((r.reference_responses as unknown[])?.length || 0) > 0,
            responses: ((r.reference_responses as Array<Record<string, unknown>>) || []).map((resp) => ({
              id: resp.id,
              questionText: (resp.question as Record<string, unknown>)?.question_text,
              responseType: (resp.question as Record<string, unknown>)?.response_type,
              answerText: resp.answer_text,
              overallComment: resp.overall_comment,
              digitalSignature: resp.digital_signature,
              signatureDate: resp.signature_date,
              submittedAt: resp.submitted_at,
            })),
            deletionRequests: r.deletion_requests,
          })),
        };
      }),
      stats: {
        totalCandidates,
        avgRefsPerCandidate,
        completionRate: overallCompletionRate,
        pendingOver7Days,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Superadmin references candidates GET error:", error);
    return NextResponse.json({ error: "Failed to fetch candidates" }, { status: 500 });
  }
}
