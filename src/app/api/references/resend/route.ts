import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = Number(session.user.id);
    const userRole = (session.user as Record<string, unknown>).role;
    if (userRole !== "candidate") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { referenceId } = body;

    if (!referenceId) {
      return NextResponse.json(
        { error: "Reference ID is required" },
        { status: 400 }
      );
    }

    // Find the reference and verify ownership
    const reference = await db.candidateReference.findFirst({
      where: {
        id: referenceId,
        candidate_user_id: userId,
      },
    });

    if (!reference) {
      return NextResponse.json(
        { error: "Reference not found" },
        { status: 404 }
      );
    }

    if (reference.status !== "pending_request" && reference.status !== "expired") {
      return NextResponse.json(
        { error: "Only pending or expired references can be resent" },
        { status: 400 }
      );
    }

    // Update the requested_at timestamp and reset status to pending_request (for expired refs)
    const updated = await db.candidateReference.update({
      where: { id: referenceId },
      data: {
        requested_at: new Date(),
        ...(reference.status === "expired" ? { status: "pending_request" } : {}),
      },
    });

    // Create notification about the resend
    const { createNotification } = await import("@/lib/notifications/create");
    await createNotification({
      userId,
      category: "compliance",
      priority: "important",
      title: "Reference request resent",
      message: `Reference request resent to ${reference.manager_email} at ${reference.facility_name}`,
      relatedEntityId: referenceId,
      relatedEntityType: "reference",
    });

    return NextResponse.json({
      message: "Reference request resent successfully",
      reference: updated,
    });
  } catch (error) {
    console.error("[REFERENCES_RESEND] Error:", error);
    return NextResponse.json(
      { error: "Failed to resend reference request" },
      { status: 500 }
    );
  }
}
