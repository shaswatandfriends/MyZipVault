import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
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
    const userId = parseInt(id);

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        phone: true,
        account_status: true,
        must_change_pass: true,
        is_approved: true,
        last_activity_at: true,
        deletion_requested_at: true,
        created_at: true,
        tos_accepted_at: true,
        organization: {
          select: { id: true, name: true },
        },
        candidate_profile: {
          select: { profile_completion_pct: true },
        },
        admin_permissions: true,
        _count: {
          select: {
            credentials: true,
            resumes: true,
            candidate_references: true,
            notifications: true,
            consent_shares_as_candidate: true,
            audit_logs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[SUPERADMIN_USER_DETAIL_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

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
    const userId = parseInt(id);
    const body = await request.json();
    const { action } = body;

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (action === "suspend") {
      await db.user.update({
        where: { id: userId },
        data: { account_status: "suspended" },
      });
    } else if (action === "unsuspend") {
      await db.user.update({
        where: { id: userId },
        data: { account_status: "active" },
      });
    } else if (action === "ban") {
      await db.user.update({
        where: { id: userId },
        data: { account_status: "banned" },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'suspend', 'unsuspend', or 'ban'" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_USER_DETAIL_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const userId = parseInt(id);

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete all related data then the user
    await db.candidateProfile.deleteMany({ where: { user_id: userId } });
    await db.skillRating.deleteMany({
      where: { checklist_response: { candidate_user_id: userId } },
    });
    await db.candidateChecklistResponse.deleteMany({ where: { candidate_user_id: userId } });
    await db.referenceResponse.deleteMany({
      where: { candidate_reference: { candidate_user_id: userId } },
    });
    await db.candidateReference.deleteMany({ where: { candidate_user_id: userId } });
    await db.credential.deleteMany({ where: { candidate_user_id: userId } });
    await db.resume.deleteMany({ where: { candidate_user_id: userId } });
    await db.consentShare.deleteMany({ where: { candidate_user_id: userId } });
    await db.consentShare.deleteMany({ where: { client_user_id: userId } });
    await db.notification.deleteMany({ where: { user_id: userId } });
    await db.adminPermission.deleteMany({ where: { user_id: userId } });
    await db.pendingReminder.deleteMany({ where: { target_user_id: userId } });

    // Delete the user record last
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_USER_DETAIL_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
