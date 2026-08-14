import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { logDocumentApproved } from "@/lib/audit";
import { recalcProfileCompletion } from "@/lib/profile-completion";

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
    const adminUserId = Number(session.user.id);

    if (userRole !== "super_admin" && userRole !== "platform_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const credentialId = parseInt(id);

    const credential = await db.credential.findUnique({
      where: { id: credentialId },
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // Set verification_status = "verified", reviewed_by
    await db.credential.update({
      where: { id: credentialId },
      data: {
        verification_status: "verified",
        reviewed_by: adminUserId,
      },
    });

    // Recalculate profile_completion_pct for the candidate
    await recalcProfileCompletion(credential.candidate_user_id);

    // Audit log — include the document name for richer context
    await logDocumentApproved(adminUserId, userRole, credentialId);
    try {
      await db.auditLog.create({
        data: {
          user_id: adminUserId,
          role: userRole,
          action: "superadmin_approved_document",
          entity_type: "credential",
          entity_id: credentialId,
          details: `Approved "${credential.document_name}" for candidate #${credential.candidate_user_id}`,
        },
      });
    } catch (auditErr) {
      console.error("[AUDIT_LOG] Failed to log document approval:", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPERADMIN_DOCUMENT_VERIFY]", error);
    return NextResponse.json(
      { error: "Failed to verify credential" },
      { status: 500 }
    );
  }
}

