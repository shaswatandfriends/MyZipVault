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

    const where: Record<string, unknown> = {};
    if (employmentStatus) {
      where.employment_status = employmentStatus;
    }

    const questions = await db.referenceQuestion.findMany({
      where,
      orderBy: { sort_order: "asc" },
    });

    return NextResponse.json({
      questions: questions.map((q) => ({
        id: q.id,
        employmentStatus: q.employment_status,
        questionText: q.question_text,
        responseType: q.response_type,
        sortOrder: q.sort_order,
      })),
    });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_QUESTIONS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch reference questions" },
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
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ error: "Action is required" }, { status: 400 });
    }

    if (action === "create") {
      if (!data?.employmentStatus || !data?.questionText || !data?.responseType || data?.sortOrder === undefined) {
        return NextResponse.json(
          { error: "All fields are required" },
          { status: 400 }
        );
      }

      const question = await db.referenceQuestion.create({
        data: {
          employment_status: data.employmentStatus,
          question_text: data.questionText,
          response_type: data.responseType,
          sort_order: data.sortOrder,
        },
      });

      await db.auditLog.create({
        data: {
          user_id: Number((session.user as Record<string, unknown>).id),
          role: userRole,
          action: "CREATE_REFERENCE_QUESTION",
          entity_type: "ReferenceQuestion",
          entity_id: question.id,
        },
      });

      return NextResponse.json({
        question: {
          id: question.id,
          employmentStatus: question.employment_status,
          questionText: question.question_text,
          responseType: question.response_type,
          sortOrder: question.sort_order,
        },
      }, { status: 201 });
    }

    if (action === "update") {
      if (!data?.id) {
        return NextResponse.json(
          { error: "Question ID is required" },
          { status: 400 }
        );
      }

      const updateData: Record<string, unknown> = {};
      if (data.employmentStatus !== undefined) updateData.employment_status = data.employmentStatus;
      if (data.questionText !== undefined) updateData.question_text = data.questionText;
      if (data.responseType !== undefined) updateData.response_type = data.responseType;
      if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

      const question = await db.referenceQuestion.update({
        where: { id: data.id },
        data: updateData,
      });

      await db.auditLog.create({
        data: {
          user_id: Number((session.user as Record<string, unknown>).id),
          role: userRole,
          action: "UPDATE_REFERENCE_QUESTION",
          entity_type: "ReferenceQuestion",
          entity_id: question.id,
        },
      });

      return NextResponse.json({
        question: {
          id: question.id,
          employmentStatus: question.employment_status,
          questionText: question.question_text,
          responseType: question.response_type,
          sortOrder: question.sort_order,
        },
      });
    }

    if (action === "delete") {
      if (!data?.id) {
        return NextResponse.json(
          { error: "Question ID is required" },
          { status: 400 }
        );
      }

      // Delete associated responses first
      await db.referenceResponse.deleteMany({
        where: { question_id: data.id },
      });

      await db.referenceQuestion.delete({
        where: { id: data.id },
      });

      await db.auditLog.create({
        data: {
          user_id: Number((session.user as Record<string, unknown>).id),
          role: userRole,
          action: "DELETE_REFERENCE_QUESTION",
          entity_type: "ReferenceQuestion",
          entity_id: data.id,
        },
      });

      return NextResponse.json({ message: "Question deleted successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[SUPERADMIN_REFERENCE_QUESTIONS_POST]", error);
    return NextResponse.json(
      { error: "Failed to process reference question action" },
      { status: 500 }
    );
  }
}
