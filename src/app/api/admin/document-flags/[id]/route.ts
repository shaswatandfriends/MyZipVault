import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// ─── PATCH: Review a document flag (approve/reject) ─────────────────
// Body: { status: "approved" | "rejected", review_notes?: string }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (!["super_admin", "platform_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const flagId = parseInt(id);
    if (isNaN(flagId)) {
      return NextResponse.json({ error: "Invalid flag ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const reviewerId = Number(session.user.id);

    const flag = await db.documentFlag.update({
      where: { id: flagId },
      data: {
        status,
        reviewed_by: reviewerId,
      },
      include: {
        credential: {
          select: {
            id: true,
            document_name: true,
            document_type: true,
            status: true,
            verification_status: true,
          },
        },
        reviewer: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    // If the flag is approved, update the credential status to "flagged"
    if (status === "approved") {
      await db.credential.update({
        where: { id: flag.credential_id },
        data: { status: "flagged" },
      });
    }

    // Log the review action
    await db.auditLog.create({
      data: {
        user_id: reviewerId,
        role,
        action: "review_document_flag",
        entity_type: "document_flag",
        entity_id: flagId,
      },
    });

    return NextResponse.json({ flag });
  } catch (error) {
    console.error("[DOCUMENT_FLAGS_PATCH]", error);
    return NextResponse.json(
      { error: "Failed to review document flag" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Remove a document flag ─────────────────────────────────
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = (session.user as Record<string, unknown>).role as string;
    if (!["super_admin", "platform_admin"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const flagId = parseInt(id);
    if (isNaN(flagId)) {
      return NextResponse.json({ error: "Invalid flag ID" }, { status: 400 });
    }

    await db.documentFlag.delete({
      where: { id: flagId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DOCUMENT_FLAGS_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete document flag" },
      { status: 500 }
    );
  }
}
