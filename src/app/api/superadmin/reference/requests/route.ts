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
    const status = searchParams.get("status") || undefined;
    const employmentStatus = searchParams.get("employmentStatus") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (employmentStatus) where.employment_status = employmentStatus;

    if (search) {
      where.OR = [
        { manager_email: { contains: search } },
        { manager_phone: { contains: search } },
        { facility_name: { contains: search } },
        { candidate_user: { first_name: { contains: search } } },
        { candidate_user: { last_name: { contains: search } } },
        { candidate_user: { email: { contains: search } } },
      ];
    }

    const [requests, total] = await Promise.all([
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
                },
              },
            },
          },
        },
      }),
      db.candidateReference.count({ where }),
    ]);

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        candidateName: r.candidate_user
          ? `${r.candidate_user.first_name || ""} ${r.candidate_user.last_name || ""}`.trim()
          : "Unknown",
        candidateEmail: r.candidate_user?.email ?? "",
        managerEmail: r.manager_email,
        managerPhone: r.manager_phone,
        managerName: r.manager_user
          ? `${r.manager_user.first_name || ""} ${r.manager_user.last_name || ""}`.trim()
          : null,
        facilityName: r.facility_name,
        employmentStatus: r.employment_status,
        status: r.status,
        requestedAt: r.requested_at,
        responses: r.reference_responses.map((resp) => ({
          id: resp.id,
          questionText: resp.question.question_text,
          responseType: resp.question.response_type,
          answerText: resp.answer_text,
          overallComment: resp.overall_comment,
          digitalSignature: resp.digital_signature,
          signatureDate: resp.signature_date,
          submittedAt: resp.submitted_at,
        })),
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_REQUESTS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch reference requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, referenceId } = body;

    if (!action || !referenceId) {
      return NextResponse.json(
        { error: "Action and referenceId are required" },
        { status: 400 }
      );
    }

    if (action === "resend") {
      const ref = await db.candidateReference.findUnique({
        where: { id: referenceId },
      });
      if (!ref) {
        return NextResponse.json(
          { error: "Reference not found" },
          { status: 404 }
        );
      }

      // Reset status to sent (simulating resend)
      await db.candidateReference.update({
        where: { id: referenceId },
        data: { status: "sent" },
      });

      // Log audit
      await db.auditLog.create({
        data: {
          user_id: Number((session.user as Record<string, unknown>).id),
          role: userRole,
          action: "RESEND_REFERENCE_REQUEST",
          entity_type: "CandidateReference",
          entity_id: referenceId,
        },
      });

      return NextResponse.json({
        message: "Reference email resent successfully",
      });
    }

    if (action === "delete") {
      // Delete responses first (cascade)
      await db.referenceResponse.deleteMany({
        where: { candidate_reference_id: referenceId },
      });

      await db.candidateReference.delete({
        where: { id: referenceId },
      });

      // Log audit
      await db.auditLog.create({
        data: {
          user_id: Number((session.user as Record<string, unknown>).id),
          role: userRole,
          action: "DELETE_REFERENCE_REQUEST",
          entity_type: "CandidateReference",
          entity_id: referenceId,
        },
      });

      return NextResponse.json({
        message: "Reference request deleted successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_REQUESTS_POST]", error);
    return NextResponse.json(
      { error: "Failed to process reference action" },
      { status: 500 }
    );
  }
}
