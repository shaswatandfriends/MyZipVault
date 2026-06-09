import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

// GET /api/superadmin/references/forms — Get form configuration (questions grouped by employment status)
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

    const questions = await db.referenceQuestion.findMany({
      orderBy: { sort_order: "asc" },
    });

    // Group by employment status
    const grouped: Record<string, typeof questions> = {
      current: questions.filter((q) => q.employment_status === "current"),
      ending_contract: questions.filter((q) => q.employment_status === "ending_contract"),
      past: questions.filter((q) => q.employment_status === "past"),
    };

    return NextResponse.json({
      questions,
      grouped,
      employmentStatuses: ["current", "ending_contract", "past"],
    });
  } catch (error) {
    console.error("Superadmin references forms GET error:", error);
    return NextResponse.json({ error: "Failed to fetch form configuration" }, { status: 500 });
  }
}

// PUT /api/superadmin/references/forms — Update form configuration (reorder, toggle questions)
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { updates } = body as {
      updates: Array<{
        id: number;
        sort_order?: number;
        employment_status?: string;
        question_text?: string;
        response_type?: string;
      }>;
    };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Updates array is required" }, { status: 400 });
    }

    // Perform updates in a transaction
    await db.$transaction(
      updates.map((update) =>
        db.referenceQuestion.update({
          where: { id: update.id },
          data: {
            ...(update.sort_order !== undefined && { sort_order: update.sort_order }),
            ...(update.employment_status !== undefined && { employment_status: update.employment_status }),
            ...(update.question_text !== undefined && { question_text: update.question_text }),
            ...(update.response_type !== undefined && { response_type: update.response_type }),
          },
        })
      )
    );

    // Audit log
    const userId = (session.user as Record<string, unknown>).id as number;
    await logAudit({
      userId,
      role: "super_admin",
      action: "reference_question_updated",
      entityType: "reference_question",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
    });

    // Return updated configuration
    const questions = await db.referenceQuestion.findMany({
      orderBy: { sort_order: "asc" },
    });

    const grouped: Record<string, typeof questions> = {
      current: questions.filter((q) => q.employment_status === "current"),
      ending_contract: questions.filter((q) => q.employment_status === "ending_contract"),
      past: questions.filter((q) => q.employment_status === "past"),
    };

    return NextResponse.json({
      questions,
      grouped,
      employmentStatuses: ["current", "ending_contract", "past"],
    });
  } catch (error) {
    console.error("Superadmin references forms PUT error:", error);
    return NextResponse.json({ error: "Failed to update form configuration" }, { status: 500 });
  }
}
