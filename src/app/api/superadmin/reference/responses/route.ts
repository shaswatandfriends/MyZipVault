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
    const employmentStatus = searchParams.get("employmentStatus") || undefined;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // We only want completed references (ones that have responses)
    const where: Record<string, unknown> = {
      status: "completed",
    };

    if (employmentStatus) {
      where.employment_status = employmentStatus;
    }

    if (from || to) {
      where.requested_at = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      };
    }

    const [references, total] = await Promise.all([
      db.candidateReference.findMany({
        where,
        orderBy: { requested_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          candidate_user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          manager_user: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
          reference_responses: {
            include: {
              question: {
                select: {
                  id: true,
                  question_text: true,
                  response_type: true,
                  employment_status: true,
                },
              },
            },
          },
        },
      }),
      db.candidateReference.count({ where }),
    ]);

    // Flatten responses for the table view
    const responses = references.flatMap((ref) => {
      const candidateName = ref.candidate_user
        ? `${ref.candidate_user.first_name || ""} ${ref.candidate_user.last_name || ""}`.trim()
        : "Unknown";

      const managerName = ref.manager_user
        ? `${ref.manager_user.first_name || ""} ${ref.manager_user.last_name || ""}`.trim()
        : null;

      // Get the overall comment and signature from any response that has it
      const responseWithComment = ref.reference_responses.find(
        (r) => r.overall_comment
      );
      const responseWithSignature = ref.reference_responses.find(
        (r) => r.digital_signature
      );
      const submittedAt = ref.reference_responses.find(
        (r) => r.submitted_at
      )?.submitted_at;

      return {
        id: ref.id,
        candidateReferenceId: ref.id,
        candidateName,
        managerEmail: ref.manager_email,
        managerName,
        managerPhone: ref.manager_phone,
        facilityName: ref.facility_name,
        employmentStatus: ref.employment_status,
        submittedAt,
        overallComment: responseWithComment?.overall_comment ?? null,
        digitalSignature: responseWithSignature?.digital_signature ?? null,
        signatureDate: responseWithSignature?.signature_date ?? null,
        answers: ref.reference_responses.map((resp) => ({
          id: resp.id,
          questionId: resp.question_id,
          questionText: resp.question.question_text,
          responseType: resp.question.response_type,
          answerText: resp.answer_text,
        })),
      };
    });

    return NextResponse.json({
      responses,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_RESPONSES_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch reference responses" },
      { status: 500 }
    );
  }
}
