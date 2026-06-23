import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as Record<string, unknown>).role as string;
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const responseId = parseInt(id, 10);
    if (isNaN(responseId)) {
      return NextResponse.json({ error: "Invalid response ID" }, { status: 400 });
    }

    const body = await request.json();
    const { extendDays } = body;
    if (!extendDays || extendDays < 1 || extendDays > 365) {
      return NextResponse.json({ error: "Extend days must be between 1 and 365" }, { status: 400 });
    }

    let response: any = null;
try {
  db.candidateChecklistResponse.findUnique({
      where: { id: responseId },
    });;
} catch (e) { console.error("[SCHEMA_DRIFT] candidateChecklistResponse.findUnique failed:", e); }
    if (!response) {
      return NextResponse.json({ error: "Response not found" }, { status: 404 });
    }

    const newValidUntil = new Date(
      response.valid_until.getTime() + extendDays * 24 * 60 * 60 * 1000
    );

    await db.candidateChecklistResponse.update({
      where: { id: responseId },
      data: { valid_until: newValidUntil },
    });

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);
    await logAudit({
      userId: actionerId,
      role: "super_admin",
      action: "checklist_expiry_extended",
      entityType: "candidate_checklist_response",
      entityId: responseId,
    });

    return NextResponse.json({
      success: true,
      newValidUntil,
      message: `Expiry extended by ${extendDays} days`,
    });
  } catch (error) {
    console.error("Skills User Extend PUT error:", error);
    return NextResponse.json({ error: "Failed to extend expiry" }, { status: 500 });
  }
}
