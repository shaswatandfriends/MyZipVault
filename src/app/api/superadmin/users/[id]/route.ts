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

    if (action === "approve") {
      // Approve a pending recruiter/agency account — sets is_approved=true
      // and account_status=active so they can log in immediately
      await db.user.update({
        where: { id: userId },
        data: {
          is_approved: true,
          account_status: "active",
        },
      });
    } else if (action === "suspend") {
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
        { error: "Invalid action. Use 'approve', 'suspend', 'unsuspend', or 'ban'" },
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
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deleting super_admin accounts (safety guard)
    if (user.role === "super_admin") {
      return NextResponse.json(
        { error: "Cannot delete a super admin account. Remove super_admin role first." },
        { status: 403 }
      );
    }

    const actionerId = parseInt((session.user as Record<string, unknown>).id as string, 10);

    // Delete all related data then the user — all in a transaction so
    // we never end up with orphaned records if a step fails.
    await db.$transaction(async (tx) => {
      // Audit log FIRST (before user is deleted, so we capture their info)
      await tx.auditLog.create({
        data: {
          user_id: actionerId,
          role: "super_admin",
          action: "delete_user",
          entity_type: "user",
          entity_id: userId,
          details: `Permanently deleted ${user.role} user ${user.email}`,
        },
      });

      await tx.candidateProfile.deleteMany({ where: { user_id: userId } });
      await tx.skillRating.deleteMany({
        where: { checklist_response: { candidate_user_id: userId } },
      });
      await tx.candidateChecklistResponse.deleteMany({ where: { candidate_user_id: userId } });
      await tx.referenceResponse.deleteMany({
        where: { candidate_reference: { candidate_user_id: userId } },
      });
      await tx.candidateReference.deleteMany({ where: { candidate_user_id: userId } });
      await tx.credential.deleteMany({ where: { candidate_user_id: userId } });
      await tx.resume.deleteMany({ where: { candidate_user_id: userId } });
      await tx.consentShare.deleteMany({ where: { candidate_user_id: userId } });
      await tx.consentShare.deleteMany({ where: { client_user_id: userId } });
      await tx.notification.deleteMany({ where: { user_id: userId } });
      await tx.adminPermission.deleteMany({ where: { user_id: userId } });
      await tx.pendingReminder.deleteMany({ where: { target_user_id: userId } });

      // Delete the user record last
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_USER_DETAIL_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
