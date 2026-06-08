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
    if (userRole !== "platform_admin" && userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employmentStatus = searchParams.get("employment_status") || "current";

    if (!["current", "ending_contract", "past"].includes(employmentStatus)) {
      return NextResponse.json(
        { error: "Invalid employment_status. Must be: current, ending_contract, or past" },
        { status: 400 }
      );
    }

    const questions = await db.referenceQuestion.findMany({
      where: { employment_status: employmentStatus },
      orderBy: { sort_order: "asc" },
    });

    return NextResponse.json({
      employmentStatus,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        responseType: q.response_type,
        sortOrder: q.sort_order,
      })),
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error("[PREVIEW_REFERENCE_QUESTIONS_ERROR]", error);
    return NextResponse.json(
      { error: "Failed to fetch reference questions preview" },
      { status: 500 }
    );
  }
}
