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
    if (userRole !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: parseInt(userId, 10) },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        account_status: true,
        last_activity_at: true,
        created_at: true,
        must_change_pass: true,
        is_approved: true,
        organization_id: true,
        organization: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get checklist requests sent by this user
    const checklistRequests = await db.checklistRequest.findMany({
      where: { client_user_id: user.id },
      orderBy: { created_at: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        created_at: true,
        candidate_user: {
          select: { first_name: true, last_name: true },
        },
        checklist_template: {
          select: { name: true },
        },
      },
    });

    // Get unlocked documents by this user
    const unlockedDocuments = await db.unlockedDocument.findMany({
      where: { client_user_id: user.id },
      orderBy: { unlocked_at: "desc" },
      take: 20,
      select: {
        id: true,
        entity_type: true,
        credit_cost: true,
        unlocked_at: true,
      },
    });

    // Get audit logs for this user (recent actions)
    const auditLogs = await db.auditLog.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        entity_type: true,
        details: true,
        created_at: true,
      },
    });

    // Compute summary stats
    const totalChecklistsSent = await db.checklistRequest.count({
      where: { client_user_id: user.id },
    });
    const totalDocumentsUnlocked = await db.unlockedDocument.count({
      where: { client_user_id: user.id },
    });

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        accountStatus: user.account_status,
        lastActivityAt: user.last_activity_at,
        createdAt: user.created_at,
        mustChangePass: user.must_change_pass,
        isApproved: user.is_approved,
        organization: user.organization,
      },
      stats: {
        totalChecklistsSent,
        totalDocumentsUnlocked,
      },
      activity: {
        checklistRequests: checklistRequests.map((r) => ({
          id: r.id,
          type: "checklist_request",
          status: r.status,
          description: `Sent "${r.checklist_template.name}" to ${r.candidate_user.first_name} ${r.candidate_user.last_name}`,
          date: r.created_at,
        })),
        unlockedDocuments: unlockedDocuments.map((d) => ({
          id: d.id,
          type: "document_unlock",
          description: `Unlocked ${d.entity_type} document`,
          creditCost: d.credit_cost,
          date: d.unlocked_at,
        })),
        auditLogs: auditLogs.map((a) => ({
          id: a.id,
          type: "audit",
          action: a.action,
          description: a.details,
          date: a.created_at,
        })),
      },
    });
  } catch (error) {
    console.error("Superadmin Member Profile GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch member profile" },
      { status: 500 }
    );
  }
}
