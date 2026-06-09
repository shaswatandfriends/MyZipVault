import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/superadmin/references/responses — List all submitted reference responses
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
    const employmentStatus = searchParams.get("employment_status") || undefined;
    const facility = searchParams.get("facility") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Build where clause for CandidateReference
    const refWhere: Record<string, unknown> = {
      status: "completed",
      reference_responses: { some: { submitted_at: { not: null } } },
    };

    if (employmentStatus) {
      refWhere.employment_status = employmentStatus;
    }
    if (facility) {
      refWhere.facility_name = { contains: facility, mode: "insensitive" };
    }
    if (search) {
      refWhere.OR = [
        { candidate_user: { email: { contains: search, mode: "insensitive" } } },
        { candidate_user: { first_name: { contains: search, mode: "insensitive" } } },
        { candidate_user: { last_name: { contains: search, mode: "insensitive" } } },
        { manager_email: { contains: search, mode: "insensitive" } },
        { manager_user: { first_name: { contains: search, mode: "insensitive" } } },
        { manager_user: { last_name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const references = await db.candidateReference.findMany({
      where: refWhere,
      include: {
        candidate_user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            candidate_profile: { select: { first_name: true, last_name: true } },
          },
        },
        manager_user: {
          select: { first_name: true, last_name: true, email: true },
        },
        reference_responses: {
          include: {
            question: { select: { id: true, question_text: true, response_type: true, sort_order: true } },
          },
          orderBy: { question: { sort_order: "asc" } },
        },
      },
      orderBy: { requested_at: "desc" },
      skip,
      take: limit,
    });

    const total = await db.candidateReference.count({ where: refWhere });

    // Stats
    const totalResponses = await db.candidateReference.count({
      where: {
        status: "completed",
        reference_responses: { some: { submitted_at: { not: null } } },
      },
    });

    // Average rating
    const ratingResponses = await db.referenceResponse.findMany({
      where: {
        question: { response_type: "rating_1_4" },
        answer_text: { not: "" },
      },
      select: { answer_text: true },
    });
    const ratingValues = ratingResponses
      .map((r) => parseInt(r.answer_text))
      .filter((v) => !isNaN(v) && v >= 1 && v <= 4);
    const avgRating = ratingValues.length > 0
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10
      : 0;

    // By employment status
    const byEmploymentStatus = {
      current: await db.candidateReference.count({
        where: { status: "completed", employment_status: "current", reference_responses: { some: { submitted_at: { not: null } } } },
      }),
      ending_contract: await db.candidateReference.count({
        where: { status: "completed", employment_status: "ending_contract", reference_responses: { some: { submitted_at: { not: null } } } },
      }),
      past: await db.candidateReference.count({
        where: { status: "completed", employment_status: "past", reference_responses: { some: { submitted_at: { not: null } } } },
      }),
    };

    // Unique facilities
    const facilities = await db.candidateReference.findMany({
      where: { status: "completed" },
      select: { facility_name: true },
      distinct: ["facility_name"],
    });

    return NextResponse.json({
      responses: references.map((ref) => {
        const ratingAnswers = ref.reference_responses.filter(
          (r) => r.question.response_type === "rating_1_4" && r.answer_text
        );
        const ratingSum = ratingAnswers.reduce((sum, r) => sum + (parseInt(r.answer_text) || 0), 0);
        const ratingCount = ratingAnswers.length;
        const avgRefRating = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;

        const lastSubmitted = ref.reference_responses
          .filter((r) => r.submitted_at)
          .sort((a, b) => new Date(b.submitted_at!).getTime() - new Date(a.submitted_at!).getTime())[0]?.submitted_at;

        return {
          id: ref.id,
          candidateName: ref.candidate_user.candidate_profile
            ? `${ref.candidate_user.candidate_profile.first_name || ""} ${ref.candidate_user.candidate_profile.last_name || ""}`.trim() || ref.candidate_user.email
            : `${ref.candidate_user.first_name || ""} ${ref.candidate_user.last_name || ""}`.trim() || ref.candidate_user.email,
          candidateEmail: ref.candidate_user.email,
          managerName: ref.manager_user
            ? `${ref.manager_user.first_name || ""} ${ref.manager_user.last_name || ""}`.trim() || ref.manager_email
            : ref.manager_email,
          managerEmail: ref.manager_email,
          facility: ref.facility_name,
          employmentStatus: ref.employment_status,
          submittedDate: lastSubmitted,
          avgRating: avgRefRating,
          responses: ref.reference_responses.map((r) => ({
            id: r.id,
            questionId: r.question_id,
            questionText: r.question.question_text,
            responseType: r.question.response_type,
            answerText: r.answer_text,
            overallComment: r.overall_comment,
            digitalSignature: r.digital_signature,
            signatureDate: r.signature_date,
            submittedAt: r.submitted_at,
          })),
        };
      }),
      stats: {
        totalResponses,
        avgRating,
        byEmploymentStatus,
      },
      facilities: facilities.map((f) => f.facility_name),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Superadmin references responses GET error:", error);
    return NextResponse.json({ error: "Failed to fetch responses" }, { status: 500 });
  }
}
